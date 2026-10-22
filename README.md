# Surmuni (सुरमुनि) ⚡ `v1.4.0`

> **High-Fidelity Retro & Modern Audio Player in Rust + Tauri v2**  
> *A tribute to the golden era of Winamp 2.x, modernized with audiophile DSP, WebGL MilkDrop 2, Internet Radio, Tracker synthesis, and lossless skinning.*

[![Version: 1.4.0](https://img.shields.io/badge/Version-1.4.0-brightgreen.svg)](https://github.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Built with Tauri v2](https://img.shields.io/badge/Tauri-v2-24C8DB.svg?logo=tauri)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2024_Edition-DEA584.svg?logo=rust)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

---

## ⚡ Overview

**Surmuni** is an ultra-fast, cross-platform desktop audio player engineered from scratch in Rust and modern TypeScript under **GNU GPLv3**. It reproduces the exact tactile experience and pixel grid of Winamp 2.x (authentic pixel-perfect `.wsz` skins, 10-band equalizer, mini-oscilloscopes, windowshade mode) while packing a modern high-performance engine: bit-perfect integer playback, RBJ biquad filters, Fletcher-Munson equal-loudness contours, embedded General MIDI synthesis, Lofty-powered metadata tag editing, live ICY radio streaming, recursive folder drop, and authentic **MilkDrop 2** visuals powered by **Butterchurn**.

---

## 🚀 Key Features

### 1. 🎛️ Unified Stack Architecture & Pixel-Perfect Skins
- **Authentic 275px Winamp Sizing:** Fixed 275×116px coordinate mapping (`main.bmp`, `eqmain.bmp`, `pledit.bmp`) with zero image stretching, repeating, or alignment distortion.
- **Single-Window & Detached Modes:** Switch effortlessly between a docked single unit and a free-floating magnetic canvas (`Alt+D`).
- **Clean Titlebars:** Only the main player displays the brand name `SURMUNI` and app icon; secondary windows use clean functional headers (`EQUALIZER`, `PLAYLIST`, `MEDIA LIBRARY`, `MILKDROP 2`, `PREFERENCES`).
- **Windowshade Mode:** Double-click the main player titlebar or click `▾` to collapse into a slim micro-bar ($24\text{ px}$).

### 2. 🔊 Audiophile Audio Engine & DSP
- **Format Support:** High-efficiency decoding of MP3, FLAC, OGG/Vorbis, WAV, AAC, M4A/MP4, AIFF, plus retro Amiga/Tracker formats (`.xm`, `.mod`, `.s3m`, `.it`) and General MIDI (`.mid`) using an embedded soundfont (`TimGM6mb.sf2`).
- **10-Band Equalizer:** ISO 266 octave centers (31.5 Hz, 63 Hz, 125 Hz, 250 Hz, 500 Hz, 1 kHz, 2 kHz, 4 kHz, 8 kHz, 16 kHz) with $\pm12\text{ dB}$ gain range, 16 documented presets with auto-headroom preamp calculation, click-free 10ms ramping, and double-click to reset.
- **Fletcher-Munson Loudness:** Dynamic loudness contour shelves compensating bass and treble perception at lower volume levels.
- **Limiter & ReplayGain:** 2ms lookahead 0 dBFS peak limiter and volume normalization.
- **Stereo Balance:** Winamp-style linear opposite-channel attenuation.

### 3. 🌌 MilkDrop 2 Visualizer (Butterchurn Engine)
- **Authentic MilkDrop 2 WebGL2:** Integrated WebGL2 implementation of Nullsoft MilkDrop 2 via `butterchurn`.
- **100+ Bundled Presets:** Includes legendary presets from Geiss, Rovastar, Flexi, Martin, Zylot, and Unchained via `butterchurn-presets`.
- **Real-Time Audio Reactivity:** Fed by audio analysis with continuous frame-blending ($2.5\text{s}$ crossfades).
- **Embedded Mini-Vis:** 4-mode faceplate visualizer cycling between **Spectrum Analyzer**, **Oscilloscope**, **Peak/RMS VU Meter** (with 1.7s peak decay), and **Off**.

### 4. 📻 Live Internet Radio & ICY Metadata
- Direct HTTP/HTTPS audio stream support (`Ctrl+L` or `🌐 + URL`).
- In-line ICY protocol parsing (`Icy-MetaData: 1` / `StreamTitle='Artist - Track'`) with real-time marquee title updates.

### 5. 🏷️ In-App ID3 Tag Editor (Lofty Engine)
- Right-click any playlist row to open the built-in **Tag Editor**.
- Edit `Title`, `Artist`, `Album`, `Album Artist`, `Genre`, `Year`, `Track #`, and `Comment` directly in place using the Rust `lofty` crate.
- Format support: ID3v1, ID3v2.3, ID3v2.4 (MP3), Vorbis Comments (FLAC, OGG), MP4 atoms (M4A/MP4), RIFF (WAV), APE. Cover art and auxiliary metadata remain untouched.
- In-place instant refresh with zero restart.

### 6. 📂 Playlist Management & Jump to File
- **Drag-and-Drop:** Drag files or folders directly into the app; background recursive scan traverses subdirectories asynchronously with **`Esc`** cancellation.
- **Jump to File (`J` or `F3`):** Search tracks instantly by typing a few words; press `Enter` to play or `Q` to queue.
- **Play-Next Priority Queue:** Alt+Right-Click any playlist row to toggle priority order with numbered badges (`#1`, `#2`).
- **Undo (`Ctrl+Z`):** 20-step undo history for additions, deletions, and shuffles.
- **Format Support:** Full `.m3u`, `.m3u8`, and `.pls` load and save.
- **Session Restore:** Persists tracks, seek position, audio volume/balance, and panel layout across restarts without auto-playing. Missing files are indicated with a dimmed state.

### 7. 🎨 Classic Winamp `.wsz` Skins & Museum
- **Surmuni Classic (1998 Retro Pixel):** Authentic metallic grooved sliders, pixel numbers, and classic viscolors.
- **Modern Themes:** *Kathmandu* (Crimson & Azure Slate) and *Neo-Surmuni 2026* (Modern Glass).
- **Winamp Skin Museum Browser:** Live GraphQL discovery and direct download from over 65,000+ classic skins via Webamp & Internet Archive.
- **Local Skin Drop:** Drop or load any standard `.wsz` or `.zip` skin archive.

### 8. 🌐 Trilingual Localization
- Instant language switching across **English**, **नेपाली (Nepali)**, and **हिन्दी (Hindi)**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+P` / `Cmd+P` | Open Preferences & Settings |
| `Ctrl+L` / `Cmd+L` | Stream Internet Radio / URL |
| `J` / `F3` | Jump to File Modal |
| `Q` | Add selected track to Play-Next Queue |
| `Alt+D` | Toggle Detached Windows Mode |
| `Ctrl+Z` | Undo Playlist Action |
| `Ctrl+Shift+K` | Toggle MilkDrop 2 WebGL Visualizer |
| `Space` | Play/Pause (or Next MilkDrop Preset when visualizer focused) |
| `Z` / `X` / `C` / `V` / `B` | Previous / Play / Pause / Stop / Next |
| `▾` / Double Click | Toggle Windowshade Mini-Mode |
| `Delete` / `Backspace` | Remove Selected Track from Playlist |

---

## 🛠️ Building & Development

### Prerequisites
- **Node.js** (v18+ recommended)
- **Rust** (2024 edition / stable toolchain)
- **Tauri CLI v2** (`@tauri-apps/cli`)

### Setup & Installation
```bash
# Clone the repository
git clone https://github.com/your-username/surmuni.git
cd surmuni

# Install dependencies
npm install

# Run development mode (Hot-reload UI + Rust backend)
npm run tauri dev
```

### Production Build
```bash
# Compile optimized frontend and Rust binary
npm run build
npx tauri build --no-bundle

# Binary output:
# src-tauri/target/release/surmuni
# src-tauri/target/release/bundle/macos/Surmuni.app (macOS)
```
```

---

## 📜 License

Surmuni is licensed under the **GNU General Public License v3.0 or later** ([GPL-3.0-or-later](LICENSE)).

### Third-Party Acknowledgments
- **Butterchurn** & **Butterchurn-Presets** (MIT License) - Jordan Berg
- **Lofty** (MIT / Apache-2.0) - Serial-ATA
- **Rodio**, **Symphonia**, **Rustysynth**, **Xmrs** (Open Source Audio Ecosystem)
- Winamp skin formats and classic viscolor palettes are preserved in homage to Nullsoft.
