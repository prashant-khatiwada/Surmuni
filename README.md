# Surmuni (सुरमुनि) ⚡ `v1.5.0`

> **High-Fidelity Retro & Modern Audio Player in Rust + Tauri v2**  
> *A soulful tribute to the golden era of Winamp 2.x and OneAmp, modernized with audiophile DSP, standalone multi-window workspaces, WebGL MilkDrop 2, Internet Radio, Tracker synthesis, lossless skinning, and cross-platform native performance.*

[![Version: 1.5.0](https://img.shields.io/badge/Version-1.5.0-brightgreen.svg)](https://github.com/prashant-khatiwada/Surmuni)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Built with Tauri v2](https://img.shields.io/badge/Tauri-v2-24C8DB.svg?logo=tauri)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2024_Edition-DEA584.svg?logo=rust)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20iOS%20%26%20Android%20Ready-lightgrey.svg)]()
[![GitHub Actions CI/CD](https://github.com/prashant-khatiwada/Surmuni/actions/workflows/release.yml/badge.svg)](https://github.com/prashant-khatiwada/Surmuni/actions)

---

## ⚡ Overview & Inspiration

**Surmuni** is a cross-platform desktop audio player engineered from scratch with a high-performance **Rust** audio engine and a modern **TypeScript / WebGL** frontend orchestrated via **Tauri v2**. 

### 💡 Where the Ideas Came From
1. **Nullsoft Winamp 2.91 (1998–2003):** 
   - The iconic 275px modular stacked window chassis (`Main`, `Equalizer`, `Playlist`).
   - Bit-for-bit `.wsz` skin archive compatibility, bitmap font rasterization, and authentic color-index palette engines (`viscolor.txt`).
   - Tactile feel: draggable seekbars, 29px-stepped playlist resizing, windowshade micro-bars ($14\text{px}$ / $24\text{px}$), and instant keyboard navigation (`J`, `Z/X/C/V/B`, `Space`).
2. **OneAmp & XMPlay:**
   - Audiophile bit-perfect decoding, continuous 10-band ISO 266 RBJ biquad equalizers, auto-headroom calculation, and dynamic Fletcher-Munson equal-loudness contours.
   - Support for retro demoscene tracker modules (`.xm`, `.mod`, `.s3m`, `.it`) and General MIDI with SoundFont synthesis.
3. **MilkDrop 2 (Nullsoft / Ryan Geiss):**
   - High-definition WebGL visualizer with real-time waveform displacement, motion blur, and preset crossfading.
4. **Simple Desktop UI Design:**
   - Native macOS top menu bar integration (`App`, `File`, `Playback`, `View`, `Options`, `Help`) with keyboard accelerators.
   - Clean multi-window design: standalone **Preferences** (`Ctrl+P`), standalone **MilkDrop 2 Visualizer** (`VIS`), and standalone SQLite-powered **Media Library** (`LIB` / `J`), each with native window decorations, resizing, and IPC synchronization.

---

## 🚀 Key Features

### 1. 🎛️ Authentic 275px Modular Chassis & Lossless Skinning
- **Strict 275px Winamp Coordinate System:** Pixel-accurate rendering for `main.bmp`, `eqmain.bmp`, `pledit.bmp`, and `titlebar.bmp` without fractional pixel blurring or clipping.
- **Three Default Themes Out of the Box:**
  - **Classic 1998:** Iconic green-segmented LCD time displays, metallic knurled sliders, and retro LED peak meters.
  - **Kathmandu (काठमाडौँ):** Elegant Himalayan-inspired theme with deep crimson accents, azure slate panels, and clean amber glow indicators.
  - **Neo-Surmuni 2026:** Modern glass aesthetic with neon cyan/magenta styling, crisp pixel-art geometry, and high-contrast labels.
- **Winamp Skin Museum Browser:** Live GraphQL client searching and 1-click downloading over 65,000+ authentic retro skins from the Internet Archive and Webamp collection.
- **Local Skin Drop:** Drop any `.wsz` or `.zip` skin file into the app to unpack and hot-swap skins immediately without restarting.
- **Windowshade Mode:** Double-click any titlebar or press the collapse button to toggle compact micro-bars.

### 2. 🪟 Decoupled Multi-Window Workspace (Native Windows)
- **Main Chassis:** Frameless 275px docked unit with magnetic snapping and window stacking.
- **Dedicated Preferences Window (`Ctrl+P` / `Cmd+P`):** Native macOS/Windows/Linux window with tabbed controls for Audio output devices, Equalizer curves, Theme selection, 1x/2x/3x Pixel Scaling, and Language configuration.
- **Dedicated Visualizer Window (`VIS` button / `Ctrl+Shift+K`):** Independent floating visualizer running MilkDrop 2 presets or reactive HD Canvas 2D fallback spectrum/oscilloscope.
- **Dedicated Media Library Window (`LIB` button / `J`):** Fast SQLite-backed music management system with instant directory indexing, album search, and track queuing.

### 3. 🔊 Audiophile Audio Engine & DSP (Rust Engine)
- **Extensive Format Support:**
  - High-res Lossless: FLAC, WAV, AIFF, ALAC.
  - Compressed: MP3, OGG Vorbis, AAC, M4A/MP4.
  - Retro Tracker Chiptunes: Amiga ProTracker (`.mod`), FastTracker II (`.xm`), Scream Tracker 3 (`.s3m`), Impulse Tracker (`.it`).
  - General MIDI: Standard MIDI (`.mid`) with embedded soundfont (`TimGM6mb.sf2`) synthesis.
- **10-Band Graphic Equalizer:** ISO 266 center frequencies ($31.5\text{Hz}$, $63\text{Hz}$, $125\text{Hz}$, $250\text{Hz}$, $500\text{Hz}$, $1\text{kHz}$, $2\text{kHz}$, $4\text{kHz}$, $8\text{kHz}$, $16\text{kHz}$) with $\pm12\text{dB}$ gain range, auto-headroom preamp calculation, click-free parameter smoothing, and user preset import/export (`.eqf` & JSON).
- **Fletcher-Munson Equal-Loudness:** Dynamic psychoacoustic loudness contour compensation at quiet volume levels.
- **Peak Limiter & ReplayGain:** 2ms lookahead brickwall peak limiter to eliminate digital clipping.
- **Stereo Balance:** Real-time opposite-channel attenuation.

### 4. 🌌 MilkDrop 2 Visualizer (Butterchurn Engine)
- **Full WebGL2 Shader Pipeline:** Real-time preset compilation with motion blur and seamless $2.5\text{s}$ crossfades.
- **100+ Bundled Presets:** Works with classic presets from Geiss, Rovastar, Flexi, Martin, and Zylot.
- **Dual Pipeline with 2D Fallback:** Automatically detects GPU capabilities; seamlessly switches to a 64-band Neon Spectrum, Multi-pass Oscilloscope, or Aurora Peak Visualizer if WebGL2 is restricted.
- **Chassis Faceplate Mini-Vis:** Integrated 4-mode faceplate visualizer cycling between **Spectrum Analyzer**, **Oscilloscope**, **RMS/Peak VU Meter** (with $1.7\text{s}$ decay), and **Off**.

### 5. 📻 Internet Radio & ICY Stream Parsing
- Stream live HTTP/HTTPS radio stations (`Ctrl+L`).
- Real-time in-stream ICY metadata extraction (`Icy-MetaData: 1`) displaying current artist and song title in the main marquee.

### 6. 🏷️ In-App ID3 Tag Editor (Lofty Engine)
- Right-click any track in the playlist to inspect and edit tags in-place: Title, Artist, Album, Album Artist, Genre, Year, Track Number, and Comments.
- Native Rust engine via `lofty` supporting ID3v1, ID3v2.3, ID3v2.4, Vorbis Comments, MP4 atoms, and APE without altering existing cover art.

### 7. 📋 Playlist Management & Undo History
- **Recursive Directory Scan:** Drag and drop folders or storage drives; scanned in the background with `Esc` abort capability.
- **Jump to File (`J` or `F3`):** Substring fuzzy search across thousands of tracks with keyboard selection.
- **Play-Next Priority Queue:** Alt+Right-Click to mark queue order with badges (`#1`, `#2`, `#3`).
- **20-Level Undo (`Ctrl+Z`):** Revert accidental deletions, re-orderings, or playlist clears.
- **Playlist Formats:** Load and export `.m3u`, `.m3u8`, and `.pls`.

### 8. 🌐 Trilingual Localization
- Full user interface localization across **English**, **नेपाली (Nepali)**, and **हिन्दी (Hindi)** with immediate live switching.

---

## 🖥️ Platform Availability & Roadmap

| Platform | Status | Packaging / Distribution |
| :--- | :--- | :--- |
| **macOS** (Apple Silicon `aarch64` & Intel `x86_64`) | ✅ **Available Now** | Universal `.dmg`, `.app` bundle, native menu bar integration |
| **Windows** (x64, ARM64) | ✅ **Available Now** | Standalone `.exe`, `.msi` Windows installer |
| **Linux** (Debian, Ubuntu, Fedora, Arch) | ✅ **Available Now** | `.deb`, `.AppImage`, `.tar.gz` |
| **iOS / iPadOS** | 🚧 *In Progress (Phase 2)* | Single-screen responsive layout with CoreAudio backend & file picker |
| **Android** | 🚧 *In Progress (Phase 2)* | Oboe / AAudio native Rust audio sink with scoped storage provider |

---

## 📅 Project Timeline & Evolution

```
2026-Q1 ────► v1.0.0: Core Rust Engine & 275px Retro Winamp Stack
               - Bit-perfect playback, rodio audio pipeline, 10-band biquad EQ
               - Basic .wsz skin parser, playlist management, and window docking

2026-Q2 ────► v1.2.0: Audio Enhancement & MilkDrop 2 Integration
               - Fletcher-Munson loudness contours, tracker (.xm/.mod) support
               - TimGM6mb General MIDI synthesis
               - Butterchurn WebGL MilkDrop 2 visualizer integration

2026-Q3 ────► v1.3.0: Skin Museum & Demoscene Polishing
               - Live GraphQL integration with Winamp Skin Museum (65,000+ skins)
               - Lofty tag editor, ICY radio streaming marquee, and 20-step undo

2026-Q4 ────► v1.4.0: Modern Desktop Multi-Window Architecture
               - Independent Preferences window with IPC synchronization
               - Independent toggleable MilkDrop Visualizer and SQLite Media Library
               - Pixel-perfect skin-kathmandu & skin-neo2026 alignment (275px)
               - macOS top menu bar cascade and 2x/3x integer pixel scaling

Future  ────► v2.0.0: Mobile Expansion (iOS & Android)
               - Touch-friendly adaptive layouts, background audio playback
               - Cloud sync, ReplayGain 2.0, and DSP audio plug-ins
```

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+P` / `Cmd+P` | Open Dedicated Preferences Window |
| `Ctrl+L` / `Cmd+L` | Open Internet Radio Stream URL Dialog |
| `J` / `F3` | Jump to File / Quick Search Modal |
| `Q` | Enqueue track to Play-Next Priority Queue |
| `Alt+D` | Toggle Docked Stack / Detached Windows Mode |
| `Ctrl+Z` / `Cmd+Z` | Undo last playlist modification |
| `Ctrl+Shift+K` | Toggle MilkDrop 2 Visualizer Window |
| `Space` | Play/Pause (or Next Preset when Visualizer is focused) |
| `Z` / `X` / `C` / `V` / `B` | Previous / Play / Pause / Stop / Next |
| `▾` / Double-Click Titlebar | Toggle Windowshade Mini-Mode ($14\text{px}$ / $24\text{px}$) |
| `Delete` / `Backspace` | Remove selected track from playlist |

---

## 🛠️ Building the Application

Surmuni can be built locally or automatically using **GitHub Actions**.

### Option A: Automatic Cloud Builds with GitHub Actions 🚀
This repository includes a continuous integration and release pipeline at [`.github/workflows/release.yml`](.github/workflows/release.yml).
1. Fork or push to your repository.
2. Go to the **Actions** tab on GitHub.
3. Select **Release & Build Apps** and click **Run workflow**.
4. GitHub Actions will automatically compile native installer artifacts for **macOS**, **Windows**, and **Linux**, making them available under workflow artifacts or tagged GitHub Releases!

---

### Option B: Local Development Build

#### Prerequisites
- **Node.js** (v18 or v20 LTS recommended)
- **Rust Toolchain** (2024 edition, stable)
- **C/C++ Build Tools** (Xcode Command Line Tools on macOS, Build Tools for Visual Studio on Windows, `build-essential` on Linux)
- **Tauri CLI v2**

#### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/prashant-khatiwada/Surmuni.git
cd Surmuni

# Install frontend and module dependencies
npm install
```

#### 2. Run in Development Mode (Live Hot Reload)
```bash
# Runs the Vite frontend development server and compiles the Tauri Rust backend
npx tauri dev
```

#### 3. Build Production Binaries & Installers
```bash
# Build frontend web assets
npm run build

# Compile optimized native binary (no packaging bundle)
npx tauri build --no-bundle

# Or build complete platform installers (.dmg / .msi / .deb / .AppImage)
npx tauri build
```

Binary outputs:
- **macOS:** `src-tauri/target/release/bundle/dmg/Surmuni_1.0.0_universal.dmg` (or `surmuni` executable)
- **Windows:** `src-tauri/target/release/bundle/msi/Surmuni_1.0.0_x64_en-US.msi`
- **Linux:** `src-tauri/target/release/bundle/deb/surmuni_1.0.0_amd64.deb`

---

## 📜 License & Acknowledgments

Surmuni is licensed under the **GNU General Public License v3.0 or later** ([GPL-3.0-or-later](LICENSE)).

### Open Source Acknowledgments
- **Winamp & Nullsoft:** Dedicated with deep appreciation to the original creators of Winamp (Justin Frankel, Dmitry Boldyrev, and team) whose UI paradigms shaped computer audio history.
- **OneAmp:** Great inspiration for audiophile DSP ideas, replay gain concepts, and modern desktop integration.
- **Butterchurn** & **Butterchurn-Presets:** Jordan Berg (MIT License) for preserving MilkDrop 2 in WebGL.
- **Lofty:** Serial-ATA (MIT/Apache-2.0) for audio metadata tag manipulation.
- **Webamp & Winamp Skin Museum:** Jordan Eldredge for curating thousands of historical `.wsz` skins.
