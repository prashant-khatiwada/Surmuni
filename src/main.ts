import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AudioService } from "./core/audio";
import { PlaylistManager } from "./core/playlist";
import { TrackMetadata } from "./core/types";
import { EqualizerManager } from "./components/equalizer";
import { Visualizer } from "./components/visualizer";
import { MilkdropEngine } from "./components/milkdrop";
import { MediaLibraryManager } from "./components/library";
import { WszSkinEngine } from "./skin/wsz_engine";
import { WinampFontEngine } from "./skin/font_engine";
import { SkinMuseumClient } from "./skin/museum";
import { I18nManager, SupportedLang } from "./core/i18n";
import { MagneticDockEngine } from "./core/dock";

// App Core
const playlist = new PlaylistManager();
let isSeeking = false;
let timeModeElapsed = true;
let isMono = false;
let currentSkin = "skin-classic";
let currentScale: 1 | 2 | 3 = 1;
let isAlwaysOnTop = false;
let isWayland = false;

// DOM Elements
const appContainer = document.getElementById("app") as HTMLElement;
const appWindow = getCurrentWindow();
const btnClose = document.getElementById("btn-close") as HTMLButtonElement;
const btnMinimize = document.getElementById("btn-minimize") as HTMLButtonElement;
const btnShade = document.getElementById("btn-shade") as HTMLButtonElement;
const btnPrefs = document.getElementById("btn-prefs") as HTMLButtonElement;
const btnPrefIcon = document.getElementById("btn-pref-icon") as HTMLElement;
const prefsWindow = document.getElementById("prefs-window") as HTMLElement;
const btnPrefsClose = document.getElementById("btn-prefs-close") as HTMLButtonElement;
const btnPrefsOk = document.getElementById("btn-prefs-ok") as HTMLButtonElement;
const btnPrefLoadWsz = document.getElementById("btn-pref-load-wsz") as HTMLButtonElement;
const btnPrefOpenMuseum = document.getElementById("btn-pref-open-museum") as HTMLButtonElement;
const prefCrossfadeSlider = document.getElementById("pref-crossfade-slider") as HTMLInputElement;
const prefCrossfadeVal = document.getElementById("pref-crossfade-val") as HTMLElement;
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
const mlWindow = document.getElementById("ml-window") as HTMLElement;
const milkdropWindow = document.getElementById("milkdrop-window") as HTMLElement;
const btnEqClose = document.getElementById("btn-eq-close") as HTMLButtonElement;
const btnPlClose = document.getElementById("btn-pl-close") as HTMLButtonElement;
const btnMlClose = document.getElementById("btn-ml-close") as HTMLButtonElement;
const btnMilkdropClose = document.getElementById("btn-milkdrop-close") as HTMLButtonElement;
const btnMilkdropPreset = document.getElementById("btn-milkdrop-preset") as HTMLButtonElement;
const museumWindow = document.getElementById("museum-window") as HTMLElement;
const btnMuseumClose = document.getElementById("btn-museum-close") as HTMLButtonElement;
const museumSearchInput = document.getElementById("museum-search-input") as HTMLInputElement;
const btnMuseumSearch = document.getElementById("btn-museum-search") as HTMLButtonElement;
const museumGrid = document.getElementById("museum-grid") as HTMLElement;

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

// Tag Editor DOM Elements
const tagWindow = document.getElementById("tag-window") as HTMLElement;
const btnTagClose = document.getElementById("btn-tag-close") as HTMLButtonElement;
const btnTagCancel = document.getElementById("btn-tag-cancel") as HTMLButtonElement;
const btnTagSave = document.getElementById("btn-tag-save") as HTMLButtonElement;
const tagFilePath = document.getElementById("tag-file-path") as HTMLInputElement;
const tagInputTitle = document.getElementById("tag-input-title") as HTMLInputElement;
const tagInputArtist = document.getElementById("tag-input-artist") as HTMLInputElement;
const tagInputAlbum = document.getElementById("tag-input-album") as HTMLInputElement;
const tagInputAlbumArtist = document.getElementById("tag-input-album-artist") as HTMLInputElement;
const tagInputGenre = document.getElementById("tag-input-genre") as HTMLInputElement;
const tagInputComment = document.getElementById("tag-input-comment") as HTMLInputElement;
const tagInputYear = document.getElementById("tag-input-year") as HTMLInputElement;
const tagInputTrack = document.getElementById("tag-input-track") as HTMLInputElement;

// Jump to File DOM Elements
const jumpWindow = document.getElementById("jump-window") as HTMLElement;
const btnJumpClose = document.getElementById("btn-jump-close") as HTMLButtonElement;
const jumpSearchInput = document.getElementById("jump-search-input") as HTMLInputElement;
const jumpResultsContainer = document.getElementById("jump-results-container") as HTMLElement;
const btnJumpPlay = document.getElementById("btn-jump-play") as HTMLButtonElement;
const btnJumpQueue = document.getElementById("btn-jump-queue") as HTMLButtonElement;
let jumpSelectedIndex = -1;
let currentJumpMatches: number[] = [];

// Components
const timerCanvasEl = document.getElementById("timer-canvas") as HTMLCanvasElement;
if (timerCanvasEl) {
  WinampFontEngine.init(timerCanvasEl);
}
const visualizer = new Visualizer(document.getElementById("vis-canvas") as HTMLCanvasElement);
const milkdropCanvas = document.getElementById("milkdrop-canvas") as HTMLCanvasElement;
const milkdropPresetName = document.getElementById("milkdrop-preset-name") as HTMLElement;
const milkdrop = new MilkdropEngine(milkdropCanvas, milkdropPresetName);

btnVisToggle?.addEventListener("click", () => {
  const isHidden = milkdropWindow.style.display === "none";
  milkdropWindow.style.display = isHidden ? "flex" : "none";
  if (isHidden) {
    milkdropWindow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  syncToggleButtons();
});

btnMilkdropClose?.addEventListener("click", () => {
  milkdropWindow.style.display = "none";
  syncToggleButtons();
});

btnMilkdropPreset?.addEventListener("click", () => {
  milkdrop.nextPreset();
});
const mediaLibrary = new MediaLibraryManager(
  mlWindow,
  document.getElementById("ml-search-input") as HTMLInputElement,
  document.getElementById("btn-ml-scan") as HTMLButtonElement,
  document.getElementById("ml-tracks-container") as HTMLElement,
  document.getElementById("ml-status") as HTMLElement,
  (track) => {
    playlist.addTrack(track);
    renderPlaylistView();
    playIndex(playlist.length - 1);
  }
);

btnMlToggle?.addEventListener("click", () => {
  mediaLibrary.toggle();
  syncToggleButtons();
});

btnMlClose?.addEventListener("click", () => {
  mlWindow.style.display = "none";
  syncToggleButtons();
});
const equalizer = new EqualizerManager(
  Array.from(document.querySelectorAll<HTMLInputElement>(".eq-band")),
  document.getElementById("eq-band-preamp") as HTMLInputElement,
  document.getElementById("eq-preset-select") as HTMLSelectElement,
  document.getElementById("eq-on") as HTMLButtonElement,
  document.getElementById("eq-auto") as HTMLButtonElement,
  document.getElementById("btn-save-eq") as HTMLButtonElement,
  document.getElementById("btn-load-eq") as HTMLButtonElement
);

// Magnetic Snapping & Detachable Windows setup
document.querySelectorAll<HTMLElement>(".winamp-window").forEach((winEl) => {
  MagneticDockEngine.enableSnapping(
    winEl,
    appContainer,
    () => {
      invoke("app_start_dragging").catch(() => appWindow.startDragging());
    },
    () => {
      saveSessionState();
    }
  );
});

// Fit Tauri OS Window to the exact docked vertical stack or detached canvas bounds
async function fitWindowToDockedStack() {
  if (MagneticDockEngine.isDetachedMode) {
    // In detached mode, provide ample canvas
    const detachedW = 1024 * currentScale;
    const detachedH = 768 * currentScale;
    try {
      await invoke("app_set_window_size", { width: detachedW, height: detachedH });
    } catch {
      await appWindow.setSize({ type: "Logical", width: detachedW, height: detachedH } as any).catch(() => {});
    }
    return;
  }

  // Calculate exact pixel dimensions of the docked stack
  const baseW = 275;
  let totalH = mainWindow.classList.contains("windowshade") ? 14 : 116;

  if (eqWindow && eqWindow.style.display !== "none") {
    totalH += eqWindow.classList.contains("windowshade") ? 14 : 116;
  }
  if (plWindow && plWindow.style.display !== "none") {
    totalH += plWindow.offsetHeight || 116;
  }
  if (mlWindow && mlWindow.style.display !== "none") {
    totalH += mlWindow.offsetHeight || 200;
  }
  if (milkdropWindow && milkdropWindow.style.display !== "none") {
    totalH += milkdropWindow.offsetHeight || 240;
  }

  const targetW = Math.max(baseW * currentScale, 275);
  const targetH = Math.max(totalH * currentScale, 116);

  try {
    await invoke("app_set_window_size", { width: targetW, height: targetH });
  } catch {
    await appWindow.setSize({ type: "Logical", width: targetW, height: targetH } as any).catch(() => {});
  }
}

function setAppScale(scale: 1 | 2 | 3) {
  currentScale = scale;
  appContainer.classList.remove("scale-1x", "scale-2x", "scale-3x");
  appContainer.classList.add(`scale-${scale}x`);

  // Update checkmarks in Main Menu
  document.getElementById("menu-scale-1x")?.classList.toggle("checked", scale === 1);
  document.getElementById("menu-scale-2x")?.classList.toggle("checked", scale === 2);
  document.getElementById("menu-scale-3x")?.classList.toggle("checked", scale === 3);

  fitWindowToDockedStack();
  saveSessionState();
}

async function setAlwaysOnTop(ontop: boolean) {
  isAlwaysOnTop = ontop;
  try {
    await invoke("app_set_always_on_top", { alwaysOnTop: ontop });
  } catch {
    await appWindow.setAlwaysOnTop(ontop).catch(() => {});
  }
  document.getElementById("menu-item-toggle-ontop")?.classList.toggle("checked", ontop);
  document.getElementById("clutter-a")?.classList.toggle("active", ontop);
}

function toggleWindowDetachedMode(detached: boolean) {
  if (isWayland && detached) {
    alert("Detached windows are disabled under Wayland compositors (Wayland protocol prohibits client window positioning).");
    return;
  }

  MagneticDockEngine.setDetachedMode(detached, appContainer);

  // Update radio buttons
  const radios = document.querySelectorAll<HTMLInputElement>("input[name='window-mode']");
  radios.forEach((r) => {
    r.checked = r.value === (detached ? "detached" : "docked");
  });

  // Update Main Menu checkmark
  document.getElementById("menu-item-toggle-detached")?.classList.toggle("checked", detached);

  fitWindowToDockedStack();
  saveSessionState();
}

document.querySelectorAll<HTMLInputElement>("input[name='window-mode']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const val = (e.target as HTMLInputElement).value;
    toggleWindowDetachedMode(val === "detached");
  });
});

// Window Dragging & Controls
btnClose.addEventListener("click", (e) => {
  e.stopPropagation();
  invoke("app_close").catch(() => appWindow.close());
});

btnMinimize.addEventListener("click", (e) => {
  e.stopPropagation();
  invoke("app_minimize").catch(() => appWindow.minimize());
});

// Windowshade mode toggle (button or double-clicking main titlebar)
function toggleWindowshade() {
  mainWindow?.classList.toggle("windowshade");
  fitWindowToDockedStack();
}

btnShade?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleWindowshade();
});

document.querySelector(".main-window .window-titlebar")?.addEventListener("dblclick", (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest("button") && !target.closest("select")) {
    toggleWindowshade();
  }
});

// Allow dragging from titlebars to move windows freely, and remove Alt restriction
document.querySelectorAll(".main-window .titlebar-handle").forEach((el) => {
  el.addEventListener("mousedown", (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    if (mouseEvent.altKey && mouseEvent.button === 0 && !target.closest("button") && !target.closest("select")) {
      invoke("app_start_dragging").catch(() => appWindow.startDragging());
    }
  });
});

// Skin Selection & Museum
async function openSkinMuseum(query = "classic") {
  museumWindow.style.display = "flex";
  museumGrid.innerHTML = `<div class="empty-playlist-msg">Fetching 65k+ retro skins from Skin Museum...</div>`;
  const skins = await SkinMuseumClient.searchSkins(query);
  museumGrid.innerHTML = "";
  if (skins.length === 0) {
    museumGrid.innerHTML = `<div class="empty-playlist-msg">No skins found for "${query}". Try "classic", "neon", or "retro".</div>`;
    return;
  }
  skins.forEach((s) => {
    const card = document.createElement("div");
    card.className = "museum-card";
    card.innerHTML = `
      <img src="${s.screenshot_url}" class="museum-thumb" onerror="this.src='https://skins.webamp.org/static/media/screenshot.b0445d3e.png'" />
      <span class="museum-title">${s.name}</span>
    `;
    card.addEventListener("click", async () => {
      if (!s.download_url) {
        alert("This skin does not have a valid download link.");
        return;
      }
      const prevTitle = card.querySelector(".museum-title");
      if (prevTitle) prevTitle.textContent = "Downloading & Unpacking...";
      card.style.opacity = "0.5";
      card.style.pointerEvents = "none";

      const manifest = await WszSkinEngine.downloadAndApplySkin(s.download_url);
      
      card.style.opacity = "1";
      card.style.pointerEvents = "auto";
      if (prevTitle) prevTitle.textContent = s.name;

      if (manifest) {
        currentSkin = "skin-wsz";
        museumWindow.style.display = "none";
      }
    });
    museumGrid.appendChild(card);
  });
}

btnMuseumClose?.addEventListener("click", () => {
  museumWindow.style.display = "none";
});

btnMuseumSearch?.addEventListener("click", () => {
  openSkinMuseum(museumSearchInput.value);
});

museumSearchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") openSkinMuseum(museumSearchInput.value);
});

function togglePreferences() {
  const isHidden = prefsWindow.style.display === "none";
  prefsWindow.style.display = isHidden ? "flex" : "none";
}

// Clutterbar O A I D V Actions
const clutterO = document.getElementById("clutter-o");
const clutterA = document.getElementById("clutter-a");
const clutterI = document.getElementById("clutter-i");
const clutterD = document.getElementById("clutter-d");
const clutterV = document.getElementById("clutter-v");

clutterO?.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = clutterO.getBoundingClientRect();
  openMainMenu(rect.left, rect.bottom + 2);
});

clutterA?.addEventListener("click", (e) => {
  e.stopPropagation();
  setAlwaysOnTop(!isAlwaysOnTop);
});

clutterI?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (playlist.currentTrack) {
    openTagEditor(playlist.currentTrack);
  } else if (playlist.length > 0) {
    openTagEditor(playlist.items[0]);
  }
});

clutterD?.addEventListener("click", (e) => {
  e.stopPropagation();
  setAppScale(currentScale === 2 ? 1 : 2);
});

// Cycle visualizer mode (0 = Spectrum, 1 = Oscilloscope, 2 = VU Meter, 3 = Off)
clutterV?.addEventListener("click", (e) => {
  e.stopPropagation();
  visualizer.mode = (visualizer.mode + 1) % 4;
});

// Winamp Classic Cascading Main Menu
const winampMainMenu = document.getElementById("winamp-main-menu") as HTMLElement;

function openMainMenu(x: number, y: number) {
  if (!winampMainMenu) return;
  winampMainMenu.style.left = `${Math.max(0, Math.min(x, window.innerWidth - 180))}px`;
  winampMainMenu.style.top = `${Math.max(0, Math.min(y, window.innerHeight - 240))}px`;
  winampMainMenu.style.display = "block";
}

function closeMainMenu() {
  if (winampMainMenu) {
    winampMainMenu.style.display = "none";
  }
}

// Right-click on Main Window titlebar or empty chassis opens Main Menu
mainWindow?.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest("button") && !target.closest("input") && !target.closest("select")) {
    e.preventDefault();
    openMainMenu(e.clientX, e.clientY);
  }
});

// Bolt icon also opens Main Menu (classic Winamp behavior)
btnPrefIcon?.addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = btnPrefIcon.getBoundingClientRect();
  openMainMenu(rect.left, rect.bottom + 4);
});

// Gear preferences button
btnPrefs?.addEventListener("click", togglePreferences);
btnPrefsClose?.addEventListener("click", () => { prefsWindow.style.display = "none"; });

// Dismiss main menu when clicking anywhere outside
window.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest("#winamp-main-menu") && !target.closest("#clutter-o") && !target.closest("#btn-pref-icon")) {
    closeMainMenu();
  }
});

// Wire Main Menu Items
document.getElementById("menu-item-play")?.addEventListener("click", () => { btnPlay.click(); closeMainMenu(); });
document.getElementById("menu-item-pause")?.addEventListener("click", () => { AudioService.pause(); setPlayPauseUI(false); closeMainMenu(); });
document.getElementById("menu-item-stop")?.addEventListener("click", () => { btnStop.click(); closeMainMenu(); });
document.getElementById("menu-item-prev")?.addEventListener("click", () => { btnPrev.click(); closeMainMenu(); });
document.getElementById("menu-item-next")?.addEventListener("click", () => { btnNext.click(); closeMainMenu(); });
document.getElementById("menu-item-open-file")?.addEventListener("click", () => { handleAddFiles(); closeMainMenu(); });
document.getElementById("menu-item-open-url")?.addEventListener("click", () => { handleAddUrl(); closeMainMenu(); });
document.getElementById("menu-item-clear-pl")?.addEventListener("click", () => { btnClearPl.click(); closeMainMenu(); });
document.getElementById("menu-item-quit")?.addEventListener("click", () => { invoke("app_close").catch(() => appWindow.close()); });

document.getElementById("menu-scale-1x")?.addEventListener("click", () => { setAppScale(1); closeMainMenu(); });
document.getElementById("menu-scale-2x")?.addEventListener("click", () => { setAppScale(2); closeMainMenu(); });
document.getElementById("menu-scale-3x")?.addEventListener("click", () => { setAppScale(3); closeMainMenu(); });

document.getElementById("menu-vis-spectrum")?.addEventListener("click", () => { visualizer.mode = 0; closeMainMenu(); });
document.getElementById("menu-vis-oscilloscope")?.addEventListener("click", () => { visualizer.mode = 1; closeMainMenu(); });
document.getElementById("menu-vis-vu")?.addEventListener("click", () => { visualizer.mode = 2; closeMainMenu(); });
document.getElementById("menu-vis-milkdrop")?.addEventListener("click", () => { btnVisToggle.click(); closeMainMenu(); });
document.getElementById("menu-vis-off")?.addEventListener("click", () => { visualizer.mode = 3; closeMainMenu(); });

document.getElementById("menu-item-shade")?.addEventListener("click", () => { toggleWindowshade(); closeMainMenu(); });
document.getElementById("menu-item-toggle-eq")?.addEventListener("click", () => { btnEqToggle.click(); closeMainMenu(); });
document.getElementById("menu-item-toggle-pl")?.addEventListener("click", () => { btnPlToggle.click(); closeMainMenu(); });
document.getElementById("menu-item-toggle-detached")?.addEventListener("click", () => {
  toggleWindowDetachedMode(!MagneticDockEngine.isDetachedMode);
  closeMainMenu();
});
document.getElementById("menu-item-toggle-ontop")?.addEventListener("click", () => {
  setAlwaysOnTop(!isAlwaysOnTop);
  closeMainMenu();
});
document.getElementById("menu-item-change-skin")?.addEventListener("click", () => { openSkinMuseum(); closeMainMenu(); });

document.getElementById("menu-item-crossfade")?.addEventListener("click", () => {
  const cur = parseFloat(prefCrossfadeSlider?.value || "2");
  const next = cur > 0 ? 0 : 2.0;
  if (prefCrossfadeSlider) prefCrossfadeSlider.value = next.toString();
  if (prefCrossfadeVal) prefCrossfadeVal.innerText = `${next.toFixed(1)}s`;
  AudioService.setCrossfade(next);
  closeMainMenu();
});
document.getElementById("menu-item-mono")?.addEventListener("click", () => {
  isMono = !isMono;
  AudioService.setMono(isMono);
  specStereo?.classList.toggle("active", !isMono);
  specMono?.classList.toggle("active", isMono);
  closeMainMenu();
});
document.getElementById("menu-item-loudness")?.addEventListener("click", () => {
  const item = document.getElementById("menu-item-loudness");
  item?.classList.toggle("checked");
  closeMainMenu();
});
document.getElementById("menu-item-replaygain")?.addEventListener("click", () => {
  const item = document.getElementById("menu-item-replaygain");
  item?.classList.toggle("checked");
  closeMainMenu();
});

document.getElementById("menu-item-prefs")?.addEventListener("click", () => { togglePreferences(); closeMainMenu(); });
document.getElementById("menu-item-shortcuts")?.addEventListener("click", () => {
  alert("Surmuni Keyboard Shortcuts:\n\n" +
    "Space / X: Play / Pause\n" +
    "C: Pause\n" +
    "V: Stop\n" +
    "Z: Previous Track\n" +
    "B: Next Track\n" +
    "J / F3: Jump to File\n" +
    "I: File Info / Tag Editor\n" +
    "Alt+D: Detached Windows\n" +
    "Ctrl+D: 2× Double Size\n" +
    "Ctrl+A: Always on Top\n" +
    "Alt+G: Toggle Equalizer\n" +
    "Alt+E: Toggle Playlist\n" +
    "Ctrl+Shift+K: MilkDrop 2 Visualizer\n" +
    "Ctrl+P: Preferences\n" +
    "Ctrl+L: Open Audio Stream URL\n" +
    "Ctrl+Z: Undo Playlist Action\n" +
    "Del / Backspace: Remove Selected Track\n" +
    "Esc: Cancel background folder scan");
  closeMainMenu();
});
document.getElementById("menu-item-about")?.addEventListener("click", () => {
  alert("Surmuni v1.2.0\nAuthentic, Bit-Perfect Winamp 2.x Experience\nDesktop parity with OneAmp & Classic Winamp\n\nBuilt with Rust, Tauri v2 & Web Audio API.\nLicensed under GNU GPLv3.");
  closeMainMenu();
});

// Platform detection initialization
async function initPlatformDetection() {
  try {
    const info = await invoke<{ os: string; is_wayland: boolean; detached_supported: boolean }>("get_platform_info");
    isWayland = info.is_wayland;
    MagneticDockEngine.isDetachedSupported = info.detached_supported;

    if (!info.detached_supported) {
      const detachedMenuItem = document.getElementById("menu-item-toggle-detached");
      if (detachedMenuItem) {
        detachedMenuItem.classList.add("disabled");
        detachedMenuItem.innerText = "Detached windows (disabled on Wayland)";
        detachedMenuItem.title = "Wayland compositors prohibit client-side window positioning";
      }
    }
  } catch (err) {
    console.warn("Could not query platform info:", err);
  }
}

initPlatformDetection();

btnPrefsOk?.addEventListener("click", () => { prefsWindow.style.display = "none"; });

// Preferences Tabs
document.querySelectorAll(".prefs-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".prefs-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".prefs-pane").forEach((p) => { (p as HTMLElement).style.display = "none"; });
    tab.classList.add("active");
    const targetId = tab.getAttribute("data-target");
    if (targetId) {
      const pane = document.getElementById(targetId);
      if (pane) pane.style.display = "block";
    }
  });
});

// Preferences Skin Choice (Radio Buttons)
document.querySelectorAll("input[name='theme-choice']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const val = (e.target as HTMLInputElement).value;
    currentSkin = val;
    appContainer.className = `winamp-container ${currentSkin}`;
    visualizer.skin = currentSkin;
  });
});

btnPrefLoadWsz?.addEventListener("click", async () => {
  const manifest = await WszSkinEngine.pickAndLoadSkin();
  if (manifest) {
    currentSkin = "skin-wsz";
  }
});

btnPrefOpenMuseum?.addEventListener("click", () => {
  prefsWindow.style.display = "none";
  openSkinMuseum();
});

prefCrossfadeSlider?.addEventListener("input", (e) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  prefCrossfadeVal.innerText = `${val.toFixed(1)}s`;
  AudioService.setCrossfade(val);
});

// Preferences Language Selection
const prefLangSelect = document.getElementById("pref-lang-select") as HTMLSelectElement;
if (prefLangSelect) {
  prefLangSelect.value = I18nManager.getLang();
  prefLangSelect.addEventListener("change", (e) => {
    const lang = (e.target as HTMLSelectElement).value as SupportedLang;
    I18nManager.setLang(lang);
  });
}
I18nManager.init();

// Sync window states and toggle button active states
function syncToggleButtons() {
  btnEqToggle?.classList.toggle("active", eqWindow?.style.display !== "none");
  btnPlToggle?.classList.toggle("active", plWindow?.style.display !== "none");
  btnMlToggle?.classList.toggle("active", mlWindow?.style.display !== "none");
  btnVisToggle?.classList.toggle("active", milkdropWindow?.style.display !== "none");

  // Sync menu checkmarks
  document.getElementById("menu-item-toggle-eq")?.classList.toggle("checked", eqWindow?.style.display !== "none");
  document.getElementById("menu-item-toggle-pl")?.classList.toggle("checked", plWindow?.style.display !== "none");

  fitWindowToDockedStack();
}

// Window Toggles & Close handlers
btnEqToggle.addEventListener("click", () => {
  const isCurrentlyHidden = eqWindow.style.display === "none";
  eqWindow.style.display = isCurrentlyHidden ? "flex" : "none";
  syncToggleButtons();
});

btnEqClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  eqWindow.style.display = "none";
  syncToggleButtons();
});

btnPlToggle.addEventListener("click", () => {
  const isCurrentlyHidden = plWindow.style.display === "none";
  plWindow.style.display = isCurrentlyHidden ? "flex" : "none";
  syncToggleButtons();
});

btnPlClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  plWindow.style.display = "none";
  syncToggleButtons();
});

// Timer mode
timeBox?.addEventListener("click", () => {
  timeModeElapsed = !timeModeElapsed;
  timeModeLabel.innerText = timeModeElapsed ? "TIME" : "REMAIN";
});

// Mono/Stereo
specStereo?.parentElement?.addEventListener("click", () => {
  isMono = !isMono;
  AudioService.setMono(isMono);
  specStereo.classList.toggle("active", !isMono);
  specMono.classList.toggle("active", isMono);
});

// Shuffle / Repeat
btnShuffle.addEventListener("click", () => {
  playlist.isShuffle = !playlist.isShuffle;
  btnShuffle.classList.toggle("active", playlist.isShuffle);
  if (playlist.isShuffle) playlist.generateShuffleQueue(true);
});

btnRepeat.addEventListener("click", () => {
  playlist.isRepeat = !playlist.isRepeat;
  btnRepeat.classList.toggle("active", playlist.isRepeat);
});

btnShufflePl?.addEventListener("click", () => {
  playlist.randomizeInPlace();
  renderPlaylistView();
});

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function updateTrackDisplay(meta: TrackMetadata) {
  trackTitleDisplay.innerText = `${playlist.currentIndex + 1}. ${meta.artist} - ${meta.title} (${formatTime(meta.duration_secs)})`;
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

async function playIndex(idx: number) {
  const meta = await playlist.play(idx);
  if (meta) {
    updateTrackDisplay(meta);
    renderPlaylistView();
    visualizer.isPlaying = true;
    setPlayPauseUI(true);
    equalizer.autoLoadForTrack(meta.path);
    saveSessionState();
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
    itemEl.className = `playlist-item ${idx === playlist.currentIndex ? "selected" : ""} ${idx === playlist.selected ? "focused" : ""} ${item.is_missing ? "missing-track" : ""}`;
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

    // Right-click contextmenu: Tag Editor + Format Editor + Queue Next
    itemEl.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      if (e.shiftKey) {
        const curFmt = localStorage.getItem("surmuni_row_format") || "{artist} - {title}";
        const newFmt = prompt("Edit playlist display format:\nTokens: {artist}, {title}, {album}, {filename}, {duration}", curFmt);
        if (newFmt !== null) {
          localStorage.setItem("surmuni_row_format", newFmt.trim());
          renderPlaylistView();
        }
      } else if (e.altKey) {
        // Alt + Right Click toggles play-next queue
        if (playlist.isQueued(idx)) {
          playlist.unqueue(idx);
        } else {
          playlist.queueNext(idx);
        }
        renderPlaylistView();
      } else {
        openTagEditor(item);
      }
    });

    playlistContainer.appendChild(itemEl);
  });

  playlistSummary.innerText = `${playlist.length} TRACKS [${formatTime(totalSecs)}]`;
}

// Lofty Tag Editor Modal Functions
async function openTagEditor(track: TrackMetadata) {
  if (!tagWindow) return;
  tagFilePath.value = track.path;
  tagInputTitle.value = track.title || "";
  tagInputArtist.value = track.artist || "";
  tagInputAlbum.value = track.album || "";
  tagInputAlbumArtist.value = "";
  tagInputGenre.value = "";
  tagInputComment.value = "";
  tagInputYear.value = "";
  tagInputTrack.value = "";

  try {
    const loftyTags = await invoke<any>("read_track_tags", { path: track.path });
    if (loftyTags) {
      if (loftyTags.title) tagInputTitle.value = loftyTags.title;
      if (loftyTags.artist) tagInputArtist.value = loftyTags.artist;
      if (loftyTags.album) tagInputAlbum.value = loftyTags.album;
      if (loftyTags.album_artist) tagInputAlbumArtist.value = loftyTags.album_artist;
      if (loftyTags.genre) tagInputGenre.value = loftyTags.genre;
      if (loftyTags.comment) tagInputComment.value = loftyTags.comment;
      if (loftyTags.year) tagInputYear.value = loftyTags.year.toString();
      if (loftyTags.track_number) tagInputTrack.value = loftyTags.track_number.toString();
    }
  } catch (err) {
    console.warn("Could not read tags via lofty:", err);
  }

  tagWindow.style.display = "flex";
}

btnTagClose?.addEventListener("click", () => { tagWindow.style.display = "none"; });
btnTagCancel?.addEventListener("click", () => { tagWindow.style.display = "none"; });

btnTagSave?.addEventListener("click", async () => {
  const path = tagFilePath.value;
  if (!path) return;

  const tagsPayload = {
    path,
    title: tagInputTitle.value.trim() || null,
    artist: tagInputArtist.value.trim() || null,
    album: tagInputAlbum.value.trim() || null,
    album_artist: tagInputAlbumArtist.value.trim() || null,
    genre: tagInputGenre.value.trim() || null,
    year: parseInt(tagInputYear.value) || null,
    track_number: parseInt(tagInputTrack.value) || null,
    comment: tagInputComment.value.trim() || null,
  };

  try {
    await invoke("write_track_tags", { tags: tagsPayload });
    // Update track in memory
    const t = playlist.items.find((item) => item.path === path);
    if (t) {
      if (tagsPayload.title) t.title = tagsPayload.title;
      if (tagsPayload.artist) t.artist = tagsPayload.artist;
      if (tagsPayload.album) t.album = tagsPayload.album;
    }
    // Also update main display if this is the currently loaded track
    if (playlist.currentTrack && playlist.currentTrack.path === path) {
      updateTrackDisplay(playlist.currentTrack);
    }
    renderPlaylistView();
    tagWindow.style.display = "none";
  } catch (err) {
    alert("Failed to save tags: " + err);
  }
});

// Jump to File Window Functions (J / F3)
function openJumpToFile() {
  if (!jumpWindow) return;
  jumpWindow.style.display = "flex";
  jumpSearchInput.value = "";
  jumpSelectedIndex = -1;
  currentJumpMatches = [];
  renderJumpResults("");
  jumpSearchInput.focus();
}

function closeJumpToFile() {
  if (jumpWindow) jumpWindow.style.display = "none";
}

function renderJumpResults(query: string) {
  const q = query.trim().toLowerCase();
  currentJumpMatches = [];
  jumpResultsContainer.innerHTML = "";

  const words = q.split(/\s+/).filter(Boolean);

  playlist.items.forEach((track, idx) => {
    const text = `${track.artist} ${track.title} ${track.album || ""} ${track.path}`.toLowerCase();
    const matchesAll = words.every((w) => text.includes(w));
    if (matchesAll || words.length === 0) {
      currentJumpMatches.push(idx);
    }
  });

  if (currentJumpMatches.length === 0) {
    jumpResultsContainer.innerHTML = `<div class="empty-playlist-msg">No matching tracks in playlist.</div>`;
    jumpSelectedIndex = -1;
    return;
  }

  jumpSelectedIndex = 0;
  currentJumpMatches.forEach((trackIdx, matchIdx) => {
    const track = playlist.items[trackIdx];
    const itemEl = document.createElement("div");
    itemEl.className = `jump-item ${matchIdx === 0 ? "active" : ""}`;
    const queuePos = playlist.isQueued(trackIdx);
    const queueBadge = queuePos > 0 ? `<span class="queue-badge">#${queuePos}</span>` : "";

    itemEl.innerHTML = `
      <span>${trackIdx + 1}. ${track.artist} - ${track.title}${queueBadge}</span>
      <span>${formatTime(track.duration_secs || 0)}</span>
    `;

    itemEl.addEventListener("click", () => {
      jumpSelectedIndex = matchIdx;
      updateJumpActiveHighlight();
    });

    itemEl.addEventListener("dblclick", () => {
      playIndex(trackIdx);
      closeJumpToFile();
    });

    jumpResultsContainer.appendChild(itemEl);
  });
}

function updateJumpActiveHighlight() {
  const items = jumpResultsContainer.querySelectorAll(".jump-item");
  items.forEach((el, idx) => {
    el.classList.toggle("active", idx === jumpSelectedIndex);
    if (idx === jumpSelectedIndex) {
      el.scrollIntoView({ block: "nearest" });
    }
  });
}

btnJumpClose?.addEventListener("click", closeJumpToFile);

jumpSearchInput?.addEventListener("input", () => {
  renderJumpResults(jumpSearchInput.value);
});

btnJumpPlay?.addEventListener("click", () => {
  if (jumpSelectedIndex >= 0 && jumpSelectedIndex < currentJumpMatches.length) {
    const trackIdx = currentJumpMatches[jumpSelectedIndex];
    playIndex(trackIdx);
    closeJumpToFile();
  }
});

btnJumpQueue?.addEventListener("click", () => {
  if (jumpSelectedIndex >= 0 && jumpSelectedIndex < currentJumpMatches.length) {
    const trackIdx = currentJumpMatches[jumpSelectedIndex];
    playlist.queueNext(trackIdx);
    renderPlaylistView();
    renderJumpResults(jumpSearchInput.value);
  }
});

jumpWindow?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.stopPropagation();
    closeJumpToFile();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (currentJumpMatches.length > 0) {
      jumpSelectedIndex = (jumpSelectedIndex + 1) % currentJumpMatches.length;
      updateJumpActiveHighlight();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (currentJumpMatches.length > 0) {
      jumpSelectedIndex = (jumpSelectedIndex - 1 + currentJumpMatches.length) % currentJumpMatches.length;
      updateJumpActiveHighlight();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    btnJumpPlay.click();
  } else if (e.key.toLowerCase() === "q" && (document.activeElement !== jumpSearchInput || e.ctrlKey || e.altKey)) {
    e.preventDefault();
    btnJumpQueue.click();
  }
});

// Internet Radio Streaming (Ctrl+L or +URL)
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

// Unified Play / Pause Toggle State
let isPlayingState = false;

function setPlayPauseUI(isPlaying: boolean) {
  isPlayingState = isPlaying;
  if (btnPlay) {
    btnPlay.innerText = isPlaying ? "❚❚" : "►";
    btnPlay.title = isPlaying ? "Pause [C/Space]" : "Play [X/Space]";
    btnPlay.classList.toggle("is-playing", isPlaying);
  }
}

// Transport
btnPlay.addEventListener("click", () => {
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

btnStop.addEventListener("click", () => {
  AudioService.stop();
  visualizer.isPlaying = false;
  setPlayPauseUI(false);
  timeDisplay.innerText = "00:00";
  WinampFontEngine.renderTime("00:00");
  seekSlider.value = "0";
});

btnNext.addEventListener("click", () => {
  const next = playlist.getNextIndex();
  if (next !== null) playIndex(next);
  else btnStop.click();
});

btnPrev.addEventListener("click", () => {
  const prev = playlist.getPrevIndex();
  if (prev !== null) playIndex(prev);
});

btnEject.addEventListener("click", handleAddFiles);
btnAddFile.addEventListener("click", handleAddFiles);

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
      for (const t of tracks) {
        playlist.addTrack(t);
      }
      renderPlaylistView();
      if (playlist.currentIndex === -1) {
        playIndex(0);
      }
    }
  };
  input.click();
});

btnClearPl.addEventListener("click", () => {
  btnStop.click();
  playlist.clear();
  trackTitleDisplay.innerText = "SURMUNI - NO TRACK LOADED";
  renderPlaylistView();
});

// Sliders
volumeSlider.addEventListener("input", (e) => {
  AudioService.setVolume(parseFloat((e.target as HTMLInputElement).value) / 100);
});

balanceSlider.addEventListener("input", (e) => {
  AudioService.setBalance(parseFloat((e.target as HTMLInputElement).value) / 100);
});

seekSlider.addEventListener("mousedown", () => { isSeeking = true; });
seekSlider.addEventListener("mouseup", () => {
  if (playlist.currentTrack) {
    const total = playlist.currentTrack.duration_secs || 100;
    const targetSec = (parseFloat(seekSlider.value) / 100) * total;
    AudioService.seek(targetSec);
  }
  isSeeking = false;
});

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  
  // Allow Ctrl+P or Cmd+P everywhere (even if an input had focus)
  if (key === "p" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    e.stopPropagation();
    togglePreferences();
    return;
  }

  // Ctrl+L or Cmd+L for Internet Radio URL
  if (key === "l" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    e.stopPropagation();
    handleAddUrl();
    return;
  }

  const activeTag = (document.activeElement?.tagName || "").toLowerCase();
  if (activeTag === "input" || activeTag === "select") return;

  if (key === "z") btnPrev.click();
  else if (key === "x" || key === "c" || e.code === "Space") {
    // If space pressed outside text inputs and not milkdrop, toggle play/pause
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag !== "input" && tag !== "textarea") {
      if (e.code === "Space" && milkdropWindow.style.display !== "none") {
        e.preventDefault();
        milkdrop.nextPreset();
      } else {
        e.preventDefault();
        btnPlay.click();
      }
    }
  }
  else if (key === "v") btnStop.click();
  else if (key === "b") btnNext.click();
  else if (key === "j" || e.key === "F3") {
    e.preventDefault();
    openJumpToFile();
  }
  else if (e.code === "Space" && milkdropWindow.style.display !== "none") {
    e.preventDefault();
    milkdrop.nextPreset();
  }
  else if (e.ctrlKey && e.shiftKey && key === "k") {
    e.preventDefault();
    btnVisToggle.click();
  }
  else if (e.altKey && key === "d") {
    e.preventDefault();
    toggleWindowDetachedMode(!MagneticDockEngine.isDetachedMode);
  }
  else if ((e.ctrlKey || e.metaKey) && key === "d") {
    e.preventDefault();
    setAppScale(currentScale === 2 ? 1 : 2);
  }
  else if ((e.ctrlKey || e.metaKey) && key === "a") {
    e.preventDefault();
    setAlwaysOnTop(!isAlwaysOnTop);
  }
  else if (e.altKey && key === "g") {
    e.preventDefault();
    btnEqToggle.click();
  }
  else if (e.altKey && key === "e") {
    e.preventDefault();
    btnPlToggle.click();
  }
  else if ((e.ctrlKey || e.metaKey) && key === "z") {
    e.preventDefault();
    if (playlist.undo()) {
      renderPlaylistView();
    }
  }
  else if (e.key === "Delete" || e.key === "Backspace") {
    if (playlist.selected !== -1) {
      const wasPlaying = playlist.remove(playlist.selected);
      if (wasPlaying) btnStop.click();
      renderPlaylistView();
    }
  }
});

// Audio Heartbeat
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
  milkdrop.isPlaying = status.is_playing;

  // AutoDJ & Auto Advance
  if (status.should_advance || (!status.is_playing && !status.is_paused && status.duration > 0 && status.position >= status.duration - 0.5)) {
    btnNext.click();
  }
});

// Session Restore & State Persistence
function saveSessionState() {
  try {
    const session = {
      tracks: playlist.items,
      currentIndex: playlist.currentIndex,
      seekPosition: parseFloat(seekSlider.value) || 0,
      volume: parseFloat(volumeSlider.value) || 80,
      balance: parseFloat(balanceSlider.value) || 0,
      isMono,
      scale: currentScale,
      isAlwaysOnTop,
      isShuffle: playlist.isShuffle,
      isRepeat: playlist.isRepeat,
      isDetached: MagneticDockEngine.isDetachedMode,
      panels: {
        eq: eqWindow?.style.display !== "none",
        pl: plWindow?.style.display !== "none",
        ml: mlWindow?.style.display !== "none",
        vis: milkdropWindow?.style.display !== "none",
      },
    };
    localStorage.setItem("surmuni_session_state", JSON.stringify(session));
  } catch {}
}

async function restoreSessionState(): Promise<boolean> {
  try {
    const raw = localStorage.getItem("surmuni_session_state");
    if (!raw) return false;
    const session = JSON.parse(raw);

    // 1. Audio and Layout settings
    if (session.volume !== undefined && volumeSlider) {
      volumeSlider.value = session.volume.toString();
      AudioService.setVolume(session.volume / 100);
    }
    if (session.balance !== undefined && balanceSlider) {
      balanceSlider.value = session.balance.toString();
      AudioService.setBalance(session.balance / 100);
    }
    if (session.isMono !== undefined) {
      isMono = session.isMono;
      AudioService.setMono(isMono);
      specStereo?.classList.toggle("active", !isMono);
      specMono?.classList.toggle("active", isMono);
    }
    if (session.isShuffle) {
      playlist.isShuffle = true;
      btnShuffle.classList.add("active");
    }
    if (session.isRepeat) {
      playlist.isRepeat = true;
      btnRepeat.classList.add("active");
    }

    // 2. Window Panels visibility
    if (session.panels) {
      if (eqWindow) eqWindow.style.display = session.panels.eq ? "flex" : "none";
      if (plWindow) plWindow.style.display = session.panels.pl ? "flex" : "none";
      if (mlWindow) mlWindow.style.display = session.panels.ml ? "flex" : "none";
      if (milkdropWindow) milkdropWindow.style.display = session.panels.vis ? "flex" : "none";
      syncToggleButtons();
    }

    // 3. Detached vs Docked Mode & Scaling
    if (session.scale && (session.scale === 1 || session.scale === 2 || session.scale === 3)) {
      setAppScale(session.scale);
    }
    if (session.isDetached) {
      toggleWindowDetachedMode(true);
    }
    if (session.isAlwaysOnTop) {
      setAlwaysOnTop(true);
    }

    // 4. Playlist Tracks & Missing File Verification
    if (session.tracks && Array.isArray(session.tracks) && session.tracks.length > 0) {
      for (const t of session.tracks) {
        let exists = true;
        try {
          exists = await invoke<boolean>("check_file_exists", { path: t.path });
        } catch {
          exists = true;
        }
        playlist.addTrack({
          ...t,
          is_missing: !exists,
        });
      }

      if (session.currentIndex >= 0 && session.currentIndex < playlist.length) {
        playlist.currentIndex = session.currentIndex;
        playlist.selected = session.currentIndex;
        const currentItem = playlist.items[session.currentIndex];
        updateTrackDisplay(currentItem);

        // Restore playhead position visually without auto-playing
        if (session.seekPosition && currentItem.duration_secs > 0) {
          seekSlider.value = session.seekPosition.toString();
          const targetSecs = (session.seekPosition / 100) * currentItem.duration_secs;
          const displayTime = timeModeElapsed
            ? formatTime(targetSecs)
            : `-${formatTime(currentItem.duration_secs - targetSecs)}`;
          timeDisplay.innerText = displayTime;
          WinampFontEngine.renderTime(displayTime);
        }
      }

      renderPlaylistView();
      return true;
    }
  } catch (err) {
    console.warn("Failed restoring session state:", err);
  }
  return false;
}

// Window beforeunload session save
window.addEventListener("beforeunload", saveSessionState);

// Load Session State or Default Demo Track on Startup
async function initStartupTrack() {
  const restored = await restoreSessionState();
  if (restored) return;

  try {
    const demo = await invoke<TrackMetadata | null>("get_default_demo_track");
    if (demo && playlist.length === 0) {
      playlist.addTrack(demo);
      renderPlaylistView();
      updateTrackDisplay(demo);
    }
  } catch (e) {
    console.warn("Could not load default demo track:", e);
  }
}

// Background Native Drag & Drop with Esc Cancellation
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
    if (event.payload.type === "over") {
      // Visual feedback can be displayed if desired
    } else if (event.payload.type === "drop") {
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

initStartupTrack();
syncToggleButtons();
