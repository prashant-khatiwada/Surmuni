import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { sendNotification } from "@tauri-apps/plugin-notification";

import { AudioService } from "./core/audio";
import { PlaylistManager } from "./core/playlist";
import { TrackMetadata } from "./core/types";
import { SessionManager } from "./core/session";
import { I18nManager, SupportedLang } from "./core/i18n";

import { EqualizerManager } from "./components/equalizer";
import { Visualizer } from "./components/visualizer";
import { WszSkinEngine } from "./skin/wsz_engine";
import { WinampFontEngine } from "./skin/font_engine";

import { ChassisManager } from "./ui/chassis";
import { WinampMenuManager } from "./ui/menus";
import { registerKeyboardShortcuts } from "./ui/shortcuts";
import { bindMicroTooltip } from "./ui/tooltips";
import { showRetroToast } from "./ui/toast";

import { TagEditorModal } from "./modals/tag_editor";
import { JumpToFileModal } from "./modals/jump_dialog";
import { MuseumModal } from "./modals/museum_dialog";

// 1. Core State
const playlist = new PlaylistManager();
let isSeeking = false;
let timeModeElapsed = true;
let isMono = false;
let currentSkin = "skin-classic";
let isPlayingState = false;
let isLoudnessEnabled = true;
let isReplayGainEnabled = true;

// 2. DOM Elements
const appContainer = document.getElementById("app") as HTMLElement;
const appWindow = getCurrentWindow();
const mainWindow = document.querySelector(".main-window") as HTMLElement;

const timeBox = document.querySelector(".timer-box") as HTMLElement;
const timeModeLabel = document.getElementById("time-mode") as HTMLElement;
const timeDisplay = document.getElementById("time-display") as HTMLElement;
const trackTitleDisplay = document.getElementById("track-title-display") as HTMLElement;
const specKbps = document.getElementById("spec-kbps") as HTMLElement;
const specKhz = document.getElementById("spec-khz") as HTMLElement;
const specStereo = document.getElementById("spec-stereo") as HTMLElement;
const specMono = document.getElementById("spec-mono") as HTMLElement;

const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;
const balanceSlider = document.getElementById("balance-slider") as HTMLInputElement;
const seekSlider = document.getElementById("seek-slider") as HTMLInputElement;

const btnPlay = document.getElementById("btn-play") as HTMLButtonElement;
const btnStop = document.getElementById("btn-stop") as HTMLButtonElement;
const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement;
const btnNext = document.getElementById("btn-next") as HTMLButtonElement;
const btnEject = document.getElementById("btn-eject") as HTMLButtonElement;

const btnEqToggle = document.getElementById("btn-eq-toggle") as HTMLButtonElement;
const btnPlToggle = document.getElementById("btn-pl-toggle") as HTMLButtonElement;
const btnMlToggle = document.getElementById("btn-ml-toggle") as HTMLButtonElement;
const btnVisToggle = document.getElementById("btn-vis-toggle") as HTMLButtonElement;

const eqWindow = document.getElementById("eq-window") as HTMLElement;
const plWindow = document.getElementById("pl-window") as HTMLElement;
const btnEqClose = document.getElementById("btn-eq-close") as HTMLButtonElement;
const btnPlClose = document.getElementById("btn-pl-close") as HTMLButtonElement;

const btnShuffle = document.getElementById("btn-shuffle") as HTMLButtonElement;
const btnRepeat = document.getElementById("btn-repeat") as HTMLButtonElement;

const playlistContainer = document.getElementById("playlist-container") as HTMLElement;
const playlistSummary = document.getElementById("playlist-summary") as HTMLElement;
const btnAddFile = document.getElementById("btn-add-file") as HTMLButtonElement;
const btnAddUrl = document.getElementById("btn-add-url") as HTMLButtonElement;
const btnLoadM3u = document.getElementById("btn-load-m3u") as HTMLButtonElement;
const btnSaveM3u = document.getElementById("btn-save-m3u") as HTMLButtonElement;
const btnClearPl = document.getElementById("btn-clear-pl") as HTMLButtonElement;
const btnShufflePl = document.getElementById("btn-shuffle-pl") as HTMLButtonElement;

// 3. Initialize Sub-Controllers
const chassis = new ChassisManager();
chassis.onStateChanged = () => syncToggleButtons();

const timerCanvasEl = document.getElementById("timer-canvas") as HTMLCanvasElement;
if (timerCanvasEl) {
  WinampFontEngine.init(timerCanvasEl);
}
const visualizer = new Visualizer(document.getElementById("vis-canvas") as HTMLCanvasElement);

const sessionManager = new SessionManager(
  playlist,
  chassis,
  volumeSlider,
  balanceSlider,
  seekSlider,
  timeDisplay
);

const tagEditor = new TagEditorModal(playlist, (track) => {
  if (playlist.currentTrack && playlist.currentTrack.path === track.path) {
    updateTrackDisplay(track);
  }
  renderPlaylistView();
});

const jumpDialog = new JumpToFileModal(
  playlist,
  (idx) => playIndex(idx),
  () => renderPlaylistView()
);

const museumDialog = new MuseumModal((visColors) => {
  currentSkin = "skin-wsz";
  if (visColors && visColors.length > 0) {
    visualizer.visColors = visColors;
  }
});

// Clutter Bar shortcuts
document.getElementById("clutter-o")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  mainMenu.open(rect.left, rect.bottom + 2);
});
document.getElementById("clutter-a")?.addEventListener("click", (e) => {
  e.stopPropagation();
  chassis.setAlwaysOnTop(!chassis.isAlwaysOnTop);
});
document.getElementById("clutter-i")?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (playlist.currentTrack) tagEditor.open(playlist.currentTrack);
  else if (playlist.length > 0) tagEditor.open(playlist.items[0]);
});
document.getElementById("clutter-d")?.addEventListener("click", (e) => {
  e.stopPropagation();
  chassis.setAppScale(chassis.currentScale === 2 ? 1 : 2);
});
document.getElementById("clutter-v")?.addEventListener("click", (e) => {
  e.stopPropagation();
  visualizer.mode = (visualizer.mode + 1) % 4;
});

// Bolt icon also opens main menu
document.getElementById("btn-pref-icon")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  mainMenu.open(rect.left, rect.bottom + 4);
});

// 4. Preferences Window Opener (Native Dedicated Window)
async function openPreferencesWindow() {
  try {
    await invoke("app_open_preferences");
  } catch (err) {
    console.warn("Could not open native preferences window:", err);
  }
}
document.getElementById("btn-prefs")?.addEventListener("click", openPreferencesWindow);

// 5. Context Menu & Main Menu Integration
const mainMenu = new WinampMenuManager({
  onPlay: () => btnPlay.click(),
  onPause: () => {
    AudioService.pause();
    setPlayPauseUI(false);
  },
  onStop: () => btnStop.click(),
  onPrev: () => btnPrev.click(),
  onNext: () => btnNext.click(),
  onOpenFile: () => handleAddFiles(),
  onOpenUrl: () => handleAddUrl(),
  onClearPlaylist: () => btnClearPl.click(),
  onSetScale: (scale) => chassis.setAppScale(scale),
  onSetVisMode: (mode) => {
    visualizer.mode = mode;
  },
  onToggleVisWindow: () => btnVisToggle.click(),
  onToggleShade: () => chassis.toggleWindowshade(),
  onToggleEq: () => btnEqToggle.click(),
  onTogglePl: () => btnPlToggle.click(),
  onToggleDetached: () => chassis.setDetachedMode(true),
  onToggleAlwaysOnTop: () => chassis.setAlwaysOnTop(!chassis.isAlwaysOnTop),
  onOpenMuseum: () => museumDialog.open(),
  onOpenPrefs: () => openPreferencesWindow(),
  onToggleMono: () => toggleMono(),
  onToggleLoudness: () => {
    isLoudnessEnabled = !isLoudnessEnabled;
    document.getElementById("menu-item-loudness")?.classList.toggle("checked", isLoudnessEnabled);
    AudioService.setLoudness(isLoudnessEnabled);
  },
  onToggleReplayGain: () => {
    isReplayGainEnabled = !isReplayGainEnabled;
    document.getElementById("menu-item-replaygain")?.classList.toggle("checked", isReplayGainEnabled);
    AudioService.setReplayGain(isReplayGainEnabled);
  },
});

mainWindow?.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest("button") && !target.closest("input") && !target.closest("select")) {
    e.preventDefault();
    mainMenu.open(e.clientX, e.clientY);
  }
});

// 6. Micro-Tooltips
bindMicroTooltip(volumeSlider, () => `${I18nManager.t("tooltip_vol")}: ${volumeSlider.value}%`);
bindMicroTooltip(balanceSlider, () => {
  const b = parseInt(balanceSlider.value);
  if (b === 0) return `${I18nManager.t("tooltip_bal")}: Center`;
  return b < 0
    ? `${I18nManager.t("tooltip_bal")}: Left ${Math.abs(b)}%`
    : `${I18nManager.t("tooltip_bal")}: Right ${b}%`;
});
bindMicroTooltip(seekSlider, () => `${I18nManager.t("tooltip_seek")}: ${seekSlider.value}%`);
bindMicroTooltip(document.getElementById("btn-shade"), () => I18nManager.t("tooltip_shade"));
bindMicroTooltip(document.getElementById("btn-eq-shade"), () => I18nManager.t("tooltip_shade"));
bindMicroTooltip(document.getElementById("btn-pl-shade"), () => I18nManager.t("tooltip_shade"));

// 7. Keyboard Shortcuts Dispatcher
registerKeyboardShortcuts({
  onPlayPause: () => btnPlay.click(),
  onStop: () => btnStop.click(),
  onPrev: () => btnPrev.click(),
  onNext: () => btnNext.click(),
  onOpenPreferences: () => openPreferencesWindow(),
  onOpenRadioUrl: () => handleAddUrl(),
  onOpenJump: () => jumpDialog.open(),
  onToggleDetached: () => chassis.setDetachedMode(true),
  onToggleScale2x: () => chassis.setAppScale(chassis.currentScale === 2 ? 1 : 2),
  onToggleAlwaysOnTop: () => chassis.setAlwaysOnTop(!chassis.isAlwaysOnTop),
  onToggleEqualizer: () => btnEqToggle.click(),
  onTogglePlaylist: () => btnPlToggle.click(),
  onToggleVisualizer: () => btnVisToggle.click(),
  onUndoPlaylist: () => {
    if (playlist.undo()) renderPlaylistView();
  },
  onDeleteSelected: () => {
    if (playlist.selected !== -1) {
      const wasPlaying = playlist.remove(playlist.selected);
      if (wasPlaying) btnStop.click();
      renderPlaylistView();
    }
  },
});

// 8. Equalizer Component
const equalizer = new EqualizerManager(
  Array.from(document.querySelectorAll<HTMLInputElement>(".eq-band")),
  document.getElementById("eq-band-preamp") as HTMLInputElement,
  document.getElementById("eq-preset-select") as HTMLSelectElement,
  document.getElementById("eq-on") as HTMLButtonElement,
  document.getElementById("eq-auto") as HTMLButtonElement,
  document.getElementById("btn-save-eq") as HTMLButtonElement,
  document.getElementById("btn-load-eq") as HTMLButtonElement
);

// 9. Window Toggles & Synchronizations
function syncToggleButtons() {
  btnEqToggle?.classList.toggle("active", eqWindow?.style.display !== "none");
  btnPlToggle?.classList.toggle("active", plWindow?.style.display !== "none");

  document
    .getElementById("menu-item-toggle-eq")
    ?.classList.toggle("checked", eqWindow?.style.display !== "none");
  document
    .getElementById("menu-item-toggle-pl")
    ?.classList.toggle("checked", plWindow?.style.display !== "none");

  chassis.fitWindowToDockedStack();
}

btnEqToggle?.addEventListener("click", () => {
  eqWindow.style.display = eqWindow.style.display === "none" ? "flex" : "none";
  syncToggleButtons();
});
btnEqClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  eqWindow.style.display = "none";
  syncToggleButtons();
});

btnPlToggle?.addEventListener("click", () => {
  plWindow.style.display = plWindow.style.display === "none" ? "flex" : "none";
  syncToggleButtons();
});
btnPlClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  plWindow.style.display = "none";
  syncToggleButtons();
});

// Native Toggleable Visualizer & Media Library Windows
btnVisToggle?.addEventListener("click", async () => {
  try {
    const isVisible = await invoke<boolean>("app_toggle_visualizer");
    btnVisToggle.classList.toggle("active", isVisible);
  } catch (err) {
    console.warn("Could not toggle native visualizer window:", err);
  }
});

btnMlToggle?.addEventListener("click", async () => {
  try {
    const isVisible = await invoke<boolean>("app_toggle_library");
    btnMlToggle.classList.toggle("active", isVisible);
  } catch (err) {
    console.warn("Could not toggle native media library window:", err);
  }
});

// 10. Time & Audio Specs Helpers
function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

timeBox?.addEventListener("click", () => {
  timeModeElapsed = !timeModeElapsed;
  timeModeLabel.innerText = timeModeElapsed ? "TIME" : "REMAIN";
});

function toggleMono() {
  isMono = !isMono;
  AudioService.setMono(isMono);
  specStereo?.classList.toggle("active", !isMono);
  specMono?.classList.toggle("active", isMono);
}
specStereo?.parentElement?.addEventListener("click", toggleMono);

function updateTrackDisplay(meta: TrackMetadata) {
  trackTitleDisplay.innerText = `${playlist.currentIndex + 1}. ${meta.artist} - ${meta.title} (${formatTime(
    meta.duration_secs
  )})`;
  specKbps.innerText = `${meta.bitrate || 320}`;
  specKhz.innerText = `${Math.round((meta.sample_rate || 44100) / 1000)}`;

  if (meta.channels === 1 || isMono) {
    specStereo.classList.remove("active");
    specMono.classList.add("active");
  } else {
    specStereo.classList.add("active");
    specMono.classList.remove("active");
  }
}

function setPlayPauseUI(isPlaying: boolean) {
  isPlayingState = isPlaying;
  if (btnPlay) {
    btnPlay.innerText = isPlaying ? "❚❚" : "►";
    btnPlay.title = isPlaying ? "Pause [C/Space]" : "Play [X/Space]";
    btnPlay.classList.toggle("is-playing", isPlaying);
  }
}

function notifyTrackChange(track: TrackMetadata) {
  const title = I18nManager.t("now_playing");
  const body = `${track.artist} - ${track.title}`;
  showRetroToast(`♫ ${body}`);

  try {
    sendNotification({ title, body });
  } catch (err) {
    console.debug("Desktop notification error:", err);
  }
}

// 11. Playback Engine Logic
async function playIndex(idx: number) {
  const meta = await playlist.play(idx);
  if (meta) {
    updateTrackDisplay(meta);
    renderPlaylistView();
    visualizer.isPlaying = true;
    setPlayPauseUI(true);
    equalizer.autoLoadForTrack(meta.path);
    notifyTrackChange(meta);
    saveSession();

    // Gapless Lookahead Preload
    const nextIdx = playlist.getNextIndex();
    if (nextIdx !== null && nextIdx < playlist.items.length) {
      const nextTrack = playlist.items[nextIdx];
      if (nextTrack && !nextTrack.path.startsWith("http")) {
        AudioService.preloadNext(nextTrack.path);
      }
    }
  }
}

function renderPlaylistView() {
  if (playlist.length === 0) {
    playlistContainer.innerHTML = `<div class="empty-playlist-msg">Drag & Drop audio files here or click "+ FILE" below</div>`;
    playlistSummary.innerText = "0 TRACKS [0:00]";
    return;
  }

  playlistContainer.innerHTML = "";
  let totalSecs = 0;

  playlist.items.forEach((item, idx) => {
    totalSecs += item.duration_secs || 0;
    const itemEl = document.createElement("div");
    itemEl.className = `playlist-item ${idx === playlist.currentIndex ? "selected" : ""} ${
      idx === playlist.selected ? "focused" : ""
    } ${item.is_missing ? "missing-track" : ""}`;
    const coverHtml = item.cover_art ? `<img src="${item.cover_art}" class="playlist-cover-art" />` : "";
    const displayTitle = PlaylistManager.formatTitle(item);
    const missingBadge = item.is_missing ? `<span class="missing-badge">[MISSING]</span> ` : "";
    const queuePos = playlist.isQueued(idx);
    const queueBadge = queuePos > 0 ? `<span class="queue-badge">#${queuePos}</span>` : "";

    itemEl.innerHTML = `
      <div style="display: flex; align-items: center;">
        ${coverHtml}
        <span>${idx + 1}. ${missingBadge}${displayTitle}${queueBadge}</span>
      </div>
      <span>${formatTime(item.duration_secs || 0)}</span>
    `;

    itemEl.addEventListener("click", () => {
      playlist.selected = idx;
      renderPlaylistView();
    });

    itemEl.addEventListener("dblclick", () => {
      if (item.is_missing) {
        alert(`File not found:\n${item.path}`);
        return;
      }
      playIndex(idx);
    });

    itemEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (e.shiftKey) {
        const curFmt = localStorage.getItem("surmuni_row_format") || "{artist} - {title}";
        const newFmt = prompt(
          "Edit playlist display format:\nTokens: {artist}, {title}, {album}, {filename}, {duration}",
          curFmt
        );
        if (newFmt !== null) {
          localStorage.setItem("surmuni_row_format", newFmt.trim());
          renderPlaylistView();
        }
      } else if (e.altKey) {
        if (playlist.isQueued(idx)) playlist.unqueue(idx);
        else playlist.queueNext(idx);
        renderPlaylistView();
      } else {
        tagEditor.open(item);
      }
    });

    playlistContainer.appendChild(itemEl);
  });

  playlistSummary.innerText = `${playlist.length} TRACKS [${formatTime(totalSecs)}]`;
}

// 12. Transport Controls
btnPlay?.addEventListener("click", () => {
  if (isPlayingState) {
    AudioService.pause();
    visualizer.isPlaying = false;
    setPlayPauseUI(false);
  } else {
    if (playlist.currentIndex === -1 && playlist.length > 0) {
      playIndex(0);
    } else {
      AudioService.resume();
      visualizer.isPlaying = true;
      setPlayPauseUI(true);
    }
  }
});

btnStop?.addEventListener("click", () => {
  AudioService.stop();
  visualizer.isPlaying = false;
  setPlayPauseUI(false);
  timeDisplay.innerText = "00:00";
  WinampFontEngine.renderTime("00:00");
  seekSlider.value = "0";
});

btnNext?.addEventListener("click", () => {
  const next = playlist.getNextIndex();
  if (next !== null) playIndex(next);
  else btnStop?.click();
});

btnPrev?.addEventListener("click", () => {
  const prev = playlist.getPrevIndex();
  if (prev !== null) playIndex(prev);
});

btnShuffle?.addEventListener("click", () => {
  playlist.isShuffle = !playlist.isShuffle;
  btnShuffle.classList.toggle("active", playlist.isShuffle);
  if (playlist.isShuffle) playlist.generateShuffleQueue(true);
});

btnRepeat?.addEventListener("click", () => {
  playlist.isRepeat = !playlist.isRepeat;
  btnRepeat.classList.toggle("active", playlist.isRepeat);
});

btnShufflePl?.addEventListener("click", () => {
  playlist.randomizeInPlace();
  renderPlaylistView();
});

// File addition dialogs
async function handleAddFiles() {
  const paths = await AudioService.pickMediaFiles();
  if (paths.length === 0) return;

  for (const p of paths) {
    try {
      const meta = await invoke<TrackMetadata>("get_metadata", { path: p });
      playlist.addTrack(meta);
    } catch {
      const fileName = p.split(/[\/\\]/).pop() || "Audio File";
      playlist.addTrack({
        title: fileName,
        artist: "Unknown Artist",
        album: "Unknown",
        duration_secs: 0,
        bitrate: 320,
        sample_rate: 44100,
        channels: 2,
        path: p,
      });
    }
  }

  renderPlaylistView();
  if (playlist.currentIndex === -1 && playlist.length > 0) {
    playIndex(0);
  }
}
btnEject?.addEventListener("click", handleAddFiles);
btnAddFile?.addEventListener("click", handleAddFiles);

async function handleAddUrl() {
  const url = prompt("Enter Internet Radio / Podcast Audio URL (HTTP/HTTPS):");
  if (!url || !url.startsWith("http")) return;

  let streamTitle = "Connecting to Stream...";
  try {
    streamTitle = await invoke<string>("fetch_stream_title", { url });
  } catch {
    streamTitle = "Internet Radio Stream";
  }

  const radioTrack: TrackMetadata = {
    title: streamTitle,
    artist: "Online Broadcast",
    album: "Internet Radio",
    duration_secs: 0,
    bitrate: 128,
    sample_rate: 44100,
    channels: 2,
    path: url,
  };

  playlist.addTrack(radioTrack);
  renderPlaylistView();
  playIndex(playlist.length - 1);
}
btnAddUrl?.addEventListener("click", handleAddUrl);

// M3U / PLS Import & Export
btnSaveM3u?.addEventListener("click", () => {
  if (playlist.length === 0) {
    alert("Playlist is empty.");
    return;
  }
  const isPls = confirm("Click OK to save as M3U, or Cancel to save as PLS format.");
  const content = isPls ? playlist.exportM3U() : playlist.exportPLS();
  const mime = isPls ? "audio/x-mpegurl" : "audio/x-scpls";
  const filename = isPls ? "surmuni_playlist.m3u" : "surmuni_playlist.pls";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

btnLoadM3u?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".m3u,.m3u8,.pls";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const tracks = PlaylistManager.parsePlaylistFile(text);
    if (tracks.length > 0) {
      for (const t of tracks) playlist.addTrack(t);
      renderPlaylistView();
      if (playlist.currentIndex === -1) playIndex(0);
    }
  };
  input.click();
});

btnClearPl?.addEventListener("click", () => {
  btnStop?.click();
  playlist.clear();
  trackTitleDisplay.innerText = "SURMUNI - NO TRACK LOADED";
  renderPlaylistView();
});

// Sliders Event Handlers
volumeSlider?.addEventListener("input", (e) => {
  AudioService.setVolume(parseFloat((e.target as HTMLInputElement).value) / 100);
});

balanceSlider?.addEventListener("input", (e) => {
  AudioService.setBalance(parseFloat((e.target as HTMLInputElement).value) / 100);
});

seekSlider?.addEventListener("mousedown", () => {
  isSeeking = true;
});
seekSlider?.addEventListener("mouseup", () => {
  if (playlist.currentTrack) {
    const total = playlist.currentTrack.duration_secs || 100;
    const targetSec = (parseFloat(seekSlider.value) / 100) * total;
    AudioService.seek(targetSec);
  }
  isSeeking = false;
});

// 13. Audio Heartbeat & Auto-DJ
AudioService.onTick((status) => {
  if (!isSeeking && status.duration > 0) {
    seekSlider.value = ((status.position / status.duration) * 100).toFixed(1);
    const displayTime = timeModeElapsed
      ? formatTime(status.position)
      : `-${formatTime(status.duration - status.position)}`;
    timeDisplay.innerText = displayTime;
    WinampFontEngine.renderTime(displayTime);
  }

  visualizer.isPlaying = status.is_playing;
  setPlayPauseUI(status.is_playing);
  if (status.fft_bands) {
    visualizer.liveFft = status.fft_bands;
  }

  if (
    status.should_advance ||
    (!status.is_playing &&
      !status.is_paused &&
      status.duration > 0 &&
      status.position >= status.duration - 0.5)
  ) {
    btnNext?.click();
  }
});

// 14. IPC Listeners from System Tray, Menu Bar & Dedicated Windows
async function initIpcListeners() {
  listen("media-key-play-pause", () => btnPlay?.click());
  listen("media-key-next", () => btnNext?.click());
  listen("media-key-prev", () => btnPrev?.click());
  listen("menu-app-stop", () => btnStop?.click());
  listen("menu-app-open-file", () => handleAddFiles());
  listen("menu-app-open-url", () => handleAddUrl());
  listen("menu-app-vis", () => btnVisToggle?.click());
  listen("menu-app-lib", () => btnMlToggle?.click());
  listen("menu-app-scale-2x", () => chassis.setAppScale(chassis.currentScale === 2 ? 1 : 2));
  listen("menu-app-detached", () => chassis.setDetachedMode(true));
  listen("menu-app-eq", () => btnEqToggle?.click());
  listen("menu-app-pl", () => btnPlToggle?.click());
  listen("menu-app-prefs", () => openPreferencesWindow());

  listen<number>("pref-crossfade-change", (e) => AudioService.setCrossfade(e.payload));
  listen<boolean>("pref-replaygain-change", (e) => {
    isReplayGainEnabled = e.payload;
    AudioService.setReplayGain(e.payload);
  });
  listen<boolean>("pref-loudness-change", (e) => {
    isLoudnessEnabled = e.payload;
    AudioService.setLoudness(e.payload);
  });
  listen<boolean>("pref-window-mode-change", (e) => chassis.setDetachedMode(e.payload));
  listen<string>("pref-skin-change", (e) => {
    currentSkin = e.payload;
    appContainer.className = `winamp-container ${currentSkin}`;
    visualizer.skin = currentSkin;
  });
  listen("pref-load-wsz", async () => {
    const manifest = await WszSkinEngine.pickAndLoadSkin();
    if (manifest) currentSkin = "skin-wsz";
  });
  listen("pref-browse-museum", () => museumDialog.open());
  listen<SupportedLang>("pref-lang-change", (e) => I18nManager.setLang(e.payload));

  listen<TrackMetadata>("library-play-track", (e) => {
    if (e.payload) {
      playlist.addTrack(e.payload);
      renderPlaylistView();
      playIndex(playlist.length - 1);
    }
  });

  listen<string[]>("open-files-from-args", async (event) => {
    const paths = event.payload;
    if (paths && paths.length > 0) {
      for (const p of paths) {
        try {
          const meta = await invoke<TrackMetadata>("get_metadata", { path: p });
          playlist.addTrack(meta);
        } catch {
          const fileName = p.split(/[\/\\]/).pop() || "Audio File";
          playlist.addTrack({
            title: fileName,
            artist: "Unknown Artist",
            album: "Unknown",
            duration_secs: 0,
            bitrate: 320,
            sample_rate: 44100,
            channels: 2,
            path: p,
          });
        }
      }
      renderPlaylistView();
      if (playlist.currentIndex === -1 && playlist.length > 0) playIndex(0);
    }
  });

  try {
    await unregisterAll().catch(() => {});
    await register("MediaPlayPause", (event) => {
      if (event.state === "Pressed") btnPlay?.click();
    });
    await register("MediaTrackNext", (event) => {
      if (event.state === "Pressed") btnNext?.click();
    });
    await register("MediaTrackPrevious", (event) => {
      if (event.state === "Pressed") btnPrev?.click();
    });
    await register("MediaStop", (event) => {
      if (event.state === "Pressed") btnStop?.click();
    });
  } catch (err) {
    console.debug("Global shortcut registration notice:", err);
  }
}
initIpcListeners();

// 15. Background Drag-and-Drop Scanner
let isScanningDrop = false;
let cancelDropScan = false;

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isScanningDrop) {
    cancelDropScan = true;
    console.log("File/folder background scan canceled by user via Esc.");
  }
});

try {
  appWindow.onDragDropEvent(async (event) => {
    if (event.payload.type === "drop") {
      const paths = event.payload.paths;
      if (!paths || paths.length === 0) return;

      isScanningDrop = true;
      cancelDropScan = false;
      playlistSummary.innerText = "Scanning dropped files/folders in background (Esc to cancel)...";

      try {
        const scannedTracks = await invoke<TrackMetadata[]>("scan_dropped_paths", { paths });
        if (cancelDropScan) {
          playlistSummary.innerText = "Drop scan canceled.";
          renderPlaylistView();
          isScanningDrop = false;
          return;
        }

        if (scannedTracks && scannedTracks.length > 0) {
          for (const track of scannedTracks) {
            if (cancelDropScan) break;
            playlist.addTrack(track);
          }
          renderPlaylistView();
          if (playlist.currentIndex === -1 && playlist.length > 0) {
            playIndex(0);
          }
        }
      } catch (err) {
        console.warn("Error processing dropped paths:", err);
      } finally {
        isScanningDrop = false;
        renderPlaylistView();
      }
    }
  });
} catch (e) {
  console.warn("Native DragDropEvent registration error:", e);
}

// 16. Session State Helpers & Startup
function saveSession() {
  sessionManager.save(isMono, {
    eq: eqWindow?.style.display !== "none",
    pl: plWindow?.style.display !== "none",
    ml: false,
    vis: false,
  });
}
window.addEventListener("beforeunload", saveSession);

async function initStartup() {
  I18nManager.init();
  const restored = await sessionManager.restore(
    (track) => updateTrackDisplay(track),
    () => renderPlaylistView()
  );

  if (!restored) {
    try {
      const demo = await invoke<TrackMetadata | null>("get_default_demo_track");
      if (demo && playlist.length === 0) {
        playlist.addTrack(demo);
        renderPlaylistView();
        updateTrackDisplay(demo);
      }
    } catch {}
  }

  syncToggleButtons();
}

initStartup();
