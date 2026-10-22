use std::fs::File;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use rodio::Source;
use rustysynth::{MidiFile, MidiFileSequencer, SoundFont, Synthesizer, SynthesizerSettings};
use xmrs::prelude::*;
use xmrsplayer::prelude::*;
use super::types::TrackMetadata;

pub struct MidiAudioSource {
    pub sequencer: MidiFileSequencer,
    sample_rate: u32,
    left_buf: Vec<f32>,
    right_buf: Vec<f32>,
    buf_idx: usize,
}

impl MidiAudioSource {
    pub fn new(midi_file: Arc<MidiFile>, soundfont: Arc<SoundFont>, sample_rate: u32) -> Result<Self, String> {
        let settings = SynthesizerSettings::new(sample_rate as i32);
        let synth = Synthesizer::new(&soundfont, &settings).map_err(|e| format!("{:?}", e))?;
        let mut sequencer = MidiFileSequencer::new(synth);
        sequencer.play(&midi_file, false);

        Ok(Self {
            sequencer,
            sample_rate,
            left_buf: vec![0.0; 256],
            right_buf: vec![0.0; 256],
            buf_idx: 256,
        })
    }
}

impl Iterator for MidiAudioSource {
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.buf_idx >= self.left_buf.len() * 2 {
            if self.sequencer.end_of_sequence() {
                return None;
            }
            self.sequencer.render(&mut self.left_buf, &mut self.right_buf);
            self.buf_idx = 0;
        }

        let is_left = self.buf_idx % 2 == 0;
        let sample_idx = self.buf_idx / 2;
        let sample = if is_left {
            self.left_buf[sample_idx]
        } else {
            self.right_buf[sample_idx]
        };

        self.buf_idx += 1;
        Some(sample)
    }
}

impl Source for MidiAudioSource {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }
    fn channels(&self) -> u16 {
        2
    }
    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
    fn total_duration(&self) -> Option<Duration> {
        None
    }
}

pub struct TrackerAudioSource {
    _module: Arc<Module>,
    player: XmrsPlayer<'static>,
    sample_rate: u32,
}

impl TrackerAudioSource {
    pub fn new(module: Arc<Module>, sample_rate: u32) -> Self {
        let module_ref: &'static Module = unsafe { &*Arc::into_raw(module.clone()) };
        let mut player = XmrsPlayer::new(module_ref, sample_rate, 0);
        player.set_max_loop_count(1);

        Self {
            _module: module,
            player,
            sample_rate,
        }
    }
}

impl Iterator for TrackerAudioSource {
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        self.player.next().map(|s| (s as f32) / 32768.0)
    }
}

impl Source for TrackerAudioSource {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }
    fn channels(&self) -> u16 {
        2
    }
    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
    fn total_duration(&self) -> Option<Duration> {
        None
    }
}

pub fn load_tracker_module(path: &Path, ext: &str) -> Result<Module, String> {
    let data = std::fs::read(path).map_err(|e| e.to_string())?;
    match ext {
        "xm" => Module::load_xm(&data).map_err(|e| format!("{:?}", e)),
        "mod" => Module::load_mod(&data).map_err(|e| format!("{:?}", e)),
        "s3m" => Module::load_s3m(&data).map_err(|e| format!("{:?}", e)),
        "it" => Module::load_it(&data).map_err(|e| format!("{:?}", e)),
        "sid" => Module::load_sid(&data).map_err(|e| format!("{:?}", e)),
        _ => Module::load(&data).map_err(|e| format!("{:?}", e)),
    }
}

pub fn extract_midi_metadata(path: &Path, filename: String) -> Result<TrackMetadata, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let duration = match MidiFile::new(&mut file) {
        Ok(midi) => midi.get_length(),
        Err(_) => 0.0,
    };

    Ok(TrackMetadata {
        title: filename,
        artist: "MIDI Synthesizer".to_string(),
        album: "General MIDI SoundFont".to_string(),
        duration_secs: duration,
        bitrate: 128,
        sample_rate: 44100,
        channels: 2,
        path: path.to_string_lossy().to_string(),
        replay_gain_db: None,
        cover_art: None,
    })
}
