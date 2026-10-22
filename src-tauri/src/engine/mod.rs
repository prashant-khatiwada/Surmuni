pub mod types;
pub mod dsp;
pub mod synth;

use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use rodio::{Decoder, OutputStream, Sink, Source};
use rustysynth::{MidiFile, SoundFont};
pub use types::*;
pub use dsp::DspSource;
pub use synth::{load_tracker_module, MidiAudioSource, TrackerAudioSource};
use crate::database::metadata::extract_metadata;

const EMBEDDED_SOUNDFONT: &[u8] = include_bytes!("../../soundfonts/TimGM6mb.sf2");

pub fn start_audio_engine(
    status: Arc<Mutex<PlaybackStatus>>,
) -> (Sender<AudioCommand>, thread::JoinHandle<()>) {
    let (tx, rx) = channel::<AudioCommand>();

    let handle = thread::spawn(move || {
        let (_stream, stream_handle) = match OutputStream::try_default() {
            Ok(res) => res,
            Err(e) => {
                eprintln!("Failed to init rodio output stream: {}", e);
                return;
            }
        };

        let soundfont = match SoundFont::new(&mut std::io::Cursor::new(EMBEDDED_SOUNDFONT)) {
            Ok(sf) => Arc::new(sf),
            Err(e) => {
                eprintln!("Failed to load embedded soundfont: {:?}", e);
                return;
            }
        };

        let mut current_sink: Option<Sink> = None;
        let mut fading_sink: Option<Sink> = None;
        let mut current_path: Option<String> = None;
        let mut current_volume: f32 = 0.8;
        let mut crossfade_secs: f32 = 2.0;

        let dsp_balance = Arc::new(Mutex::new(0.0f32));
        let dsp_mono = Arc::new(Mutex::new(false));
        let dsp_loudness = Arc::new(Mutex::new(true));
        let dsp_replaygain = Arc::new(Mutex::new(true));
        let dsp_fft_buffer = Arc::new(Mutex::new(Vec::<f32>::with_capacity(1024)));
        let dsp_eq = Arc::new(Mutex::new(EqualizerConfig {
            enabled: true,
            preamp: 0.0,
            bands: vec![0.0; 10],
        }));

        loop {
            while let Ok(cmd) = rx.try_recv() {
                match cmd {
                    AudioCommand::Play(path) => {
                        // Hardware crossfade: fade out previous sink instead of abruptly killing it
                        if let Some(old) = current_sink.take() {
                            if crossfade_secs > 0.0 {
                                if let Some(fading) = fading_sink.take() {
                                    fading.stop();
                                }
                                fading_sink = Some(old);
                            } else {
                                old.stop();
                            }
                        }

                        let p = Path::new(&path);
                        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                        let meta = extract_metadata(&path).ok();
                        let replay_gain = meta.as_ref().and_then(|m| m.replay_gain_db);

                        if ["mod", "xm", "s3m", "it", "sid"].contains(&ext.as_str()) {
                            if let Ok(module) = load_tracker_module(p, &ext) {
                                let tracker_src = TrackerAudioSource::new(Arc::new(module), 44100);
                                let dsp_source = DspSource::new(
                                    tracker_src,
                                    Arc::clone(&dsp_balance),
                                    Arc::clone(&dsp_mono),
                                    Arc::clone(&dsp_eq),
                                    replay_gain,
                                    Arc::clone(&dsp_loudness),
                                    Arc::clone(&dsp_replaygain),
                                    Arc::clone(&dsp_fft_buffer),
                                );

                                if let Ok(sink) = Sink::try_new(&stream_handle) {
                                    sink.set_volume(current_volume);
                                    sink.append(dsp_source);
                                    sink.play();

                                    current_sink = Some(sink);
                                    current_path = Some(path.clone());

                                    let mut s = status.lock().unwrap();
                                    s.is_playing = true;
                                    s.is_paused = false;
                                    s.duration = 180.0;
                                    s.position = 0.0;
                                }
                            }
                        } else if ext == "mid" || ext == "midi" {
                            if let Ok(mut midi_file_reader) = File::open(&path) {
                                if let Ok(midi_file) = MidiFile::new(&mut midi_file_reader) {
                                    let midi_arc = Arc::new(midi_file);
                                    let duration = midi_arc.get_length();

                                    if let Ok(midi_source) = MidiAudioSource::new(midi_arc, Arc::clone(&soundfont), 44100) {
                                        let dsp_source = DspSource::new(
                                            midi_source,
                                            Arc::clone(&dsp_balance),
                                            Arc::clone(&dsp_mono),
                                            Arc::clone(&dsp_eq),
                                            replay_gain,
                                            Arc::clone(&dsp_loudness),
                                            Arc::clone(&dsp_replaygain),
                                            Arc::clone(&dsp_fft_buffer),
                                        );

                                        if let Ok(sink) = Sink::try_new(&stream_handle) {
                                            sink.set_volume(current_volume);
                                            sink.append(dsp_source);
                                            sink.play();

                                            current_sink = Some(sink);
                                            current_path = Some(path.clone());

                                            let mut s = status.lock().unwrap();
                                            s.is_playing = true;
                                            s.is_paused = false;
                                            s.duration = duration;
                                            s.position = 0.0;
                                        }
                                    }
                                }
                            }
                        } else if let Ok(file) = File::open(&path) {
                            let reader = BufReader::new(file);
                            if let Ok(source) = Decoder::new(reader) {
                                let dsp_source = DspSource::new(
                                    source.convert_samples(),
                                    Arc::clone(&dsp_balance),
                                    Arc::clone(&dsp_mono),
                                    Arc::clone(&dsp_eq),
                                    replay_gain,
                                    Arc::clone(&dsp_loudness),
                                    Arc::clone(&dsp_replaygain),
                                    Arc::clone(&dsp_fft_buffer),
                                );

                                if let Ok(sink) = Sink::try_new(&stream_handle) {
                                    sink.set_volume(current_volume);
                                    sink.append(dsp_source);
                                    sink.play();
                                    current_sink = Some(sink);
                                    current_path = Some(path.clone());

                                    let duration = extract_metadata(&path)
                                        .map(|m| m.duration_secs)
                                        .unwrap_or(0.0);

                                    let mut s = status.lock().unwrap();
                                    s.is_playing = true;
                                    s.is_paused = false;
                                    s.duration = duration;
                                    s.position = 0.0;
                                }
                            }
                        }
                    }
                    AudioCommand::Pause => {
                        if let Some(ref sink) = current_sink {
                            sink.pause();
                            let mut s = status.lock().unwrap();
                            s.is_paused = true;
                            s.is_playing = false;
                        }
                    }
                    AudioCommand::Resume => {
                        if let Some(ref sink) = current_sink {
                            sink.play();
                            let mut s = status.lock().unwrap();
                            s.is_paused = false;
                            s.is_playing = true;
                        }
                    }
                    AudioCommand::Stop => {
                        if let Some(old) = current_sink.take() {
                            old.stop();
                        }
                        current_path = None;
                        let mut s = status.lock().unwrap();
                        s.is_playing = false;
                        s.is_paused = false;
                        s.position = 0.0;
                    }
                    AudioCommand::Seek(seconds) => {
                        if let Some(ref path) = current_path {
                            let p = Path::new(path);
                            let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

                            if ext == "mid" || ext == "midi" {
                                if let Ok(mut midi_file_reader) = File::open(path) {
                                    if let Ok(midi_file) = MidiFile::new(&mut midi_file_reader) {
                                        let midi_arc = Arc::new(midi_file);
                                        if let Ok(mut midi_source) = MidiAudioSource::new(midi_arc, Arc::clone(&soundfont), 44100) {
                                            let samples_to_skip = (seconds * 44100.0) as usize;
                                            let block_size = 256;
                                            let blocks = samples_to_skip / block_size;
                                            let mut dummy_left = vec![0.0f32; block_size];
                                            let mut dummy_right = vec![0.0f32; block_size];
                                            for _ in 0..blocks {
                                                if midi_source.sequencer.end_of_sequence() {
                                                    break;
                                                }
                                                midi_source.sequencer.render(&mut dummy_left, &mut dummy_right);
                                            }

                                            if let Some(old) = current_sink.take() {
                                                old.stop();
                                            }
                                            let dsp_source = DspSource::new(
                                                midi_source,
                                                Arc::clone(&dsp_balance),
                                                Arc::clone(&dsp_mono),
                                                Arc::clone(&dsp_eq),
                                                None,
                                                Arc::clone(&dsp_loudness),
                                                Arc::clone(&dsp_replaygain),
                                                Arc::clone(&dsp_fft_buffer),
                                            );
                                            if let Ok(sink) = Sink::try_new(&stream_handle) {
                                                sink.set_volume(current_volume);
                                                sink.append(dsp_source);

                                                let mut s = status.lock().unwrap();
                                                if s.is_paused {
                                                    sink.pause();
                                                } else {
                                                    sink.play();
                                                }
                                                s.position = seconds;
                                                current_sink = Some(sink);
                                            }
                                        }
                                    }
                                }
                            } else if let Ok(file) = File::open(path) {
                                let reader = BufReader::new(file);
                                if let Ok(source) = Decoder::new(reader) {
                                    if let Some(old) = current_sink.take() {
                                        old.stop();
                                    }
                                    let dsp_source = DspSource::new(
                                        source.convert_samples(),
                                        Arc::clone(&dsp_balance),
                                        Arc::clone(&dsp_mono),
                                        Arc::clone(&dsp_eq),
                                        None,
                                        Arc::clone(&dsp_loudness),
                                        Arc::clone(&dsp_replaygain),
                                        Arc::clone(&dsp_fft_buffer),
                                    );
                                    if let Ok(sink) = Sink::try_new(&stream_handle) {
                                        sink.set_volume(current_volume);
                                        sink.append(dsp_source);
                                        let _ = sink.try_seek(Duration::from_secs_f64(seconds));

                                        let mut s = status.lock().unwrap();
                                        if s.is_paused {
                                            sink.pause();
                                        } else {
                                            sink.play();
                                        }
                                        s.position = seconds;
                                        current_sink = Some(sink);
                                    }
                                }
                            }
                        }
                    }
                    AudioCommand::SetVolume(vol) => {
                        let clamped = vol.clamp(0.0, 1.0);
                        current_volume = clamped;
                        if let Some(ref sink) = current_sink {
                            sink.set_volume(clamped);
                        }
                    }
                    AudioCommand::SetBalance(bal) => {
                        *dsp_balance.lock().unwrap() = bal.clamp(-1.0, 1.0);
                    }
                    AudioCommand::SetMono(is_mono) => {
                        *dsp_mono.lock().unwrap() = is_mono;
                    }
                    AudioCommand::SetEqualizer(config) => {
                        *dsp_eq.lock().unwrap() = config;
                    }
                    AudioCommand::SetCrossfadeSecs(secs) => {
                        crossfade_secs = secs.clamp(0.0, 10.0);
                    }
                    AudioCommand::SetLoudness(enabled) => {
                        *dsp_loudness.lock().unwrap() = enabled;
                    }
                    AudioCommand::SetReplayGain(enabled) => {
                        *dsp_replaygain.lock().unwrap() = enabled;
                    }
                }
            }

            if let Some(ref sink) = current_sink {
                let mut s = status.lock().unwrap();
                if !sink.empty() {
                    s.position = sink.get_pos().as_secs_f64();
                    if s.is_playing {
                        // Compute live 19-band FFT from real decoded audio samples
                        let mut live_bands = vec![0.0f32; 19];
                        if let Ok(mut buf) = dsp_fft_buffer.try_lock() {
                            if buf.len() >= 512 {
                                let mut fft_input = [0.0f32; 512];
                                for (i, val) in buf.iter().take(512).enumerate() {
                                    // Hann windowing
                                    let window = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / 511.0).cos());
                                    fft_input[i] = *val * window;
                                }
                                buf.clear();

                                let complex_fft = microfft::real::rfft_512(&mut fft_input);
                                // Map 256 complex frequency bins logarithmically to 19 Winamp bars
                                for (band_idx, band_val) in live_bands.iter_mut().enumerate() {
                                    let start_bin = (1.5f32.powf(band_idx as f32 * 0.42) as usize).clamp(1, 250);
                                    let end_bin = (start_bin + (band_idx / 2).max(1)).clamp(start_bin + 1, 256);
                                    let mut max_mag = 0.0f32;
                                    for bin in &complex_fft[start_bin..end_bin] {
                                        let mag = (bin.re * bin.re + bin.im * bin.im).sqrt();
                                        if mag > max_mag {
                                            max_mag = mag;
                                        }
                                    }
                                    // Scale to dB-like 0.0 .. 1.0
                                    let norm = (max_mag * 0.15).clamp(0.0, 1.0);
                                    *band_val = norm;
                                }
                            }
                        }

                        // Fallback smooth floor if silence or underrun
                        if live_bands.iter().all(|&v| v < 0.01) {
                            let pos = s.position;
                            for (i, val) in live_bands.iter_mut().enumerate() {
                                let factor = (i as f64 + 1.0) * 1.5;
                                *val = (((pos * factor).sin() * 0.2 + 0.2) as f32).clamp(0.05, 0.4);
                            }
                        }
                        s.fft_bands = live_bands;

                        // AutoDJ Smart Silence Trimming:
                        // Trigger early track transition if near song end (< 2.0s left) to avoid dead air
                        if s.duration > 2.0 && s.position >= s.duration - 1.5 {
                            s.should_advance = true;
                        } else {
                            s.should_advance = false;
                        }
                    } else {
                        s.fft_bands = vec![0.0; 19];
                        s.should_advance = false;
                    }
                } else if s.is_playing {
                    s.is_playing = false;
                    s.is_paused = false;
                    s.fft_bands = vec![0.0; 19];
                    s.should_advance = true;
                }
            }

            // Step crossfade decay for the fading track
            if let Some(ref fading) = fading_sink {
                let current_fade_vol = fading.volume();
                let decay_step = if crossfade_secs > 0.0 {
                    (current_volume / (crossfade_secs * 20.0)).max(0.01)
                } else {
                    current_volume
                };

                let new_fade_vol = (current_fade_vol - decay_step).max(0.0);
                if new_fade_vol <= 0.01 || fading.empty() {
                    fading.stop();
                    fading_sink = None;
                } else {
                    fading.set_volume(new_fade_vol);
                }
            }

            thread::sleep(Duration::from_millis(50));
        }
    });

    (tx, handle)
}
