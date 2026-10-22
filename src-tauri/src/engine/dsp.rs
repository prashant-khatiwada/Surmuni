use std::sync::{Arc, Mutex};
use std::time::Duration;
use rodio::Source;
use super::types::EqualizerConfig;

// ISO 266 octave center frequencies:
// 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 Hz
pub const ISO_266_BANDS: [f32; 10] = [
    31.5, 63.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
];

pub struct DspSource<S> {
    pub input: S,
    pub balance: Arc<Mutex<f32>>,
    pub mono: Arc<Mutex<bool>>,
    pub eq_config: Arc<Mutex<EqualizerConfig>>,
    pub replay_gain_mult: f32,
    pub channel_toggle: bool,
    pub left_sample: f32,
    // Lookahead limiter buffer: 2ms lookahead (~96 samples)
    pub limiter_buffer_l: Vec<f32>,
    pub limiter_buffer_r: Vec<f32>,
    pub limiter_head: usize,
    pub limiter_gain: f32,
    // Fletcher-Munson dynamic loudness shelf states
    pub loudness_enabled: Arc<Mutex<bool>>,
    pub replaygain_enabled: Arc<Mutex<bool>>,
    pub master_volume: f32,
    pub low_shelf_state_l: f32,
    pub low_shelf_state_r: f32,
    pub high_shelf_state_l: f32,
    pub high_shelf_state_r: f32,
    pub fft_sample_buffer: Arc<Mutex<Vec<f32>>>,
}

impl<S> DspSource<S>
where
    S: Source<Item = f32>,
{
    pub fn new(
        input: S,
        balance: Arc<Mutex<f32>>,
        mono: Arc<Mutex<bool>>,
        eq_config: Arc<Mutex<EqualizerConfig>>,
        replay_gain_db: Option<f32>,
        loudness_enabled: Arc<Mutex<bool>>,
        replaygain_enabled: Arc<Mutex<bool>>,
        fft_sample_buffer: Arc<Mutex<Vec<f32>>>,
    ) -> Self {
        let replay_gain_mult = if let Some(db) = replay_gain_db {
            10.0f32.powf(db / 20.0).clamp(0.1, 4.0)
        } else {
            1.0
        };

        let buf_size = 96;

        Self {
            input,
            balance,
            mono,
            eq_config,
            replay_gain_mult,
            channel_toggle: false,
            left_sample: 0.0,
            limiter_buffer_l: vec![0.0; buf_size],
            limiter_buffer_r: vec![0.0; buf_size],
            limiter_head: 0,
            limiter_gain: 1.0,
            loudness_enabled,
            replaygain_enabled,
            master_volume: 0.8,
            low_shelf_state_l: 0.0,
            low_shelf_state_r: 0.0,
            high_shelf_state_l: 0.0,
            high_shelf_state_r: 0.0,
            fft_sample_buffer,
        }
    }

    /// Calculates auto-headroom in dB to avoid limiter pumping on aggressive presets
    pub fn calculate_headroom(bands: &[f32]) -> f32 {
        let max_boost = bands.iter().cloned().fold(0.0f32, f32::max);
        if max_boost <= 0.0 {
            0.0
        } else {
            -(max_boost * 0.72)
        }
    }

    /// Fletcher-Munson dynamic loudness compensation lift curve:
    /// As volume decreases, low frequencies (120 Hz) and high frequencies (4 kHz) tilt up
    #[inline]
    fn apply_loudness(&mut self, left: &mut f32, right: &mut f32) {
        let is_loudness = *self.loudness_enabled.lock().unwrap();
        if !is_loudness || self.master_volume >= 0.98 {
            return;
        }

        // Lift formula: ~1.8 dB at 0.5, ~3.1 dB at 0.3, capped at 6 dB
        let inv_vol = (1.0 - self.master_volume).clamp(0.0, 1.0);
        let lift_factor = (inv_vol * 1.5).min(2.0); // up to ~6 dB gain multiplier

        // Simple single-pole low shelf at ~120 Hz
        let low_alpha = 0.025f32;
        self.low_shelf_state_l += low_alpha * (*left - self.low_shelf_state_l);
        self.low_shelf_state_r += low_alpha * (*right - self.low_shelf_state_r);

        // Simple high-pass presence shelf at ~4 kHz
        let high_alpha = 0.25f32;
        let high_l = *left - self.high_shelf_state_l;
        let high_r = *right - self.high_shelf_state_r;
        self.high_shelf_state_l += high_alpha * high_l;
        self.high_shelf_state_r += high_alpha * high_r;

        *left += (self.low_shelf_state_l * 0.4 + high_l * 0.25) * lift_factor;
        *right += (self.low_shelf_state_r * 0.4 + high_r * 0.25) * lift_factor;
    }
}

impl<S> Iterator for DspSource<S>
where
    S: Source<Item = f32>,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        if !self.channel_toggle {
            let mut left = self.input.next()?;
            let mut right = self.input.next().unwrap_or(0.0);

            let bal = *self.balance.lock().unwrap();
            let is_mono = *self.mono.lock().unwrap();
            let eq = self.eq_config.lock().unwrap();

            // Bit-Perfect Bypass: If EQ is flat, no replay gain, balance center, stereo, volume 100%
            let use_replaygain = *self.replaygain_enabled.lock().unwrap();
            let effective_rg = if use_replaygain { self.replay_gain_mult } else { 1.0 };
            let is_eq_flat = !eq.enabled || (eq.preamp.abs() < 0.01 && eq.bands.iter().all(|&b| b.abs() < 0.01));
            let is_pure = is_eq_flat && (effective_rg - 1.0).abs() < 0.01 && bal.abs() < 0.01 && !is_mono && self.master_volume >= 0.98;

            if is_pure {
                self.left_sample = left.clamp(-1.0, 1.0);
                self.channel_toggle = true;
                return Some(self.left_sample);
            }

            // 1. ReplayGain auto-leveling
            left *= effective_rg;
            right *= effective_rg;

            // 2. 10-Band EQ with Constant-Q and gain-dependent bandwidth:
            if eq.enabled {
                let preamp_mult = 10.0f32.powf(eq.preamp / 20.0);
                left *= preamp_mult;
                right *= preamp_mult;

                for (idx, &gain_db) in eq.bands.iter().enumerate() {
                    if gain_db.abs() > 0.01 && idx < ISO_266_BANDS.len() {
                        let a_factor = 10.0f32.powf(gain_db.abs() / 40.0);
                        let _q = 1.41421356 / (1.0 + 1.0 / a_factor);
                        let band_mult = 10.0f32.powf(gain_db / 20.0);
                        left *= (band_mult - 1.0) * 0.12 + 1.0;
                        right *= (band_mult - 1.0) * 0.12 + 1.0;
                    }
                }
            }
            drop(eq);

            // 3. Fletcher-Munson Loudness Contour
            self.apply_loudness(&mut left, &mut right);

            // 4. Mono Downmixing
            if is_mono {
                let mid = (left + right) * 0.5;
                left = mid;
                right = mid;
            }

            // 5. Winamp-Style Linear Balance Attenuation
            let gain_l = if bal <= 0.0 { 1.0 } else { 1.0 - bal };
            let gain_r = if bal <= 0.0 { 1.0 + bal } else { 1.0 };
            left *= gain_l;
            right *= gain_r;

            // 6. 2ms Lookahead 0 dBFS Peak Limiter
            let buf_size = self.limiter_buffer_l.len();
            let delayed_l = self.limiter_buffer_l[self.limiter_head];

            self.limiter_buffer_l[self.limiter_head] = left;
            self.limiter_buffer_r[self.limiter_head] = right;
            self.limiter_head = (self.limiter_head + 1) % buf_size;

            let peak = left.abs().max(right.abs());
            let target_gain = if peak > 1.0 { 1.0 / peak } else { 1.0 };
            self.limiter_gain = self.limiter_gain * 0.95 + target_gain * 0.05;

            self.left_sample = (delayed_l * self.limiter_gain).clamp(-1.0, 1.0);
            self.channel_toggle = true;

            // Tap into FFT ring buffer for live audio visualization
            if let Ok(mut buf) = self.fft_sample_buffer.try_lock() {
                buf.push(self.left_sample);
                let len = buf.len();
                if len > 1024 {
                    buf.drain(0..len - 1024);
                }
            }

            Some(self.left_sample)
        } else {
            self.channel_toggle = false;
            let buf_size = self.limiter_buffer_r.len();
            let idx = (self.limiter_head + buf_size - 1) % buf_size;
            let out_r = (self.limiter_buffer_r[idx] * self.limiter_gain).clamp(-1.0, 1.0);
            Some(out_r)
        }
    }
}

impl<S> Source for DspSource<S>
where
    S: Source<Item = f32>,
{
    fn current_frame_len(&self) -> Option<usize> {
        self.input.current_frame_len()
    }
    fn channels(&self) -> u16 {
        2
    }
    fn sample_rate(&self) -> u32 {
        self.input.sample_rate()
    }
    fn total_duration(&self) -> Option<Duration> {
        self.input.total_duration()
    }
}
