import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { I18nManager, SupportedLang } from "./core/i18n";

// Navigation tabs
const navButtons = document.querySelectorAll<HTMLButtonElement>(".pref-nav-btn");
const panes = document.querySelectorAll<HTMLElement>(".pref-pane");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    panes.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    const targetId = btn.getAttribute("data-tab");
    if (targetId) {
      document.getElementById(targetId)?.classList.add("active");
    }
  });
});

// Close button
document.getElementById("btn-done")?.addEventListener("click", async () => {
  try {
    await invoke("app_close_preferences");
  } catch {
    window.close();
  }
});

// Crossfade Slider
const crossfadeSlider = document.getElementById("crossfade-slider") as HTMLInputElement;
const crossfadeVal = document.getElementById("crossfade-val") as HTMLElement;

crossfadeSlider?.addEventListener("input", (e) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  if (crossfadeVal) crossfadeVal.innerText = `${val.toFixed(1)}s`;
  emit("pref-crossfade-change", val);
});

// Audio DSP Toggles
const toggleReplayGain = document.getElementById("toggle-replaygain") as HTMLInputElement;
toggleReplayGain?.addEventListener("change", (e) => {
  emit("pref-replaygain-change", (e.target as HTMLInputElement).checked);
});

const toggleLoudness = document.getElementById("toggle-loudness") as HTMLInputElement;
toggleLoudness?.addEventListener("change", (e) => {
  emit("pref-loudness-change", (e.target as HTMLInputElement).checked);
});

// Window Mode (Docked vs Detached)
document.querySelectorAll<HTMLInputElement>("input[name='window-mode']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const isDetached = (e.target as HTMLInputElement).value === "detached";
    emit("pref-window-mode-change", isDetached);
  });
});

// Themes
document.querySelectorAll<HTMLInputElement>("input[name='theme-choice']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const skinName = (e.target as HTMLInputElement).value;
    emit("pref-skin-change", skinName);
  });
});

// Load WSZ & Browse Museum
document.getElementById("btn-load-wsz")?.addEventListener("click", () => {
  emit("pref-load-wsz", {});
});

document.getElementById("btn-browse-museum")?.addEventListener("click", () => {
  emit("pref-browse-museum", {});
});

// Language Switcher
const langSelect = document.getElementById("lang-select") as HTMLSelectElement;

function applyI18n(lang: SupportedLang) {
  I18nManager.setLang(lang);
}

langSelect?.addEventListener("change", (e) => {
  const lang = (e.target as HTMLSelectElement).value as SupportedLang;
  applyI18n(lang);
  emit("pref-lang-change", lang);
});

// Listen for sync from main player
listen<string>("sync-player-state", (event) => {
  try {
    const data = JSON.parse(event.payload);
    if (data.lang && langSelect) {
      langSelect.value = data.lang;
      applyI18n(data.lang);
    }
    if (data.crossfade !== undefined && crossfadeSlider) {
      crossfadeSlider.value = data.crossfade.toString();
      if (crossfadeVal) crossfadeVal.innerText = `${data.crossfade.toFixed(1)}s`;
    }
  } catch (e) {
    console.error("Failed to parse sync state:", e);
  }
});
