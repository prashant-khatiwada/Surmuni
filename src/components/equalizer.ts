import { AudioService } from "../core/audio";
import { EqualizerConfig } from "../core/types";

// ISO 266 / IEC 61260 Standard Center Frequencies
export const ISO_FREQUENCIES = [
  "31.5 Hz", "63 Hz", "125 Hz", "250 Hz", "500 Hz",
  "1 kHz", "2 kHz", "4 kHz", "8 kHz", "16 kHz"
];

export class EqualizerManager {
  private sliders: HTMLInputElement[];
  private preampSlider: HTMLInputElement;
  private selectDropdown: HTMLSelectElement;
  private onButton: HTMLButtonElement;
  public autoButton: HTMLButtonElement;
  public isEnabled: boolean = true;
  public isAuto: boolean = false;

  // 16 Built-In Documented Presets with Authentic Tuning Curves
  private presets: Record<string, number[]> = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    club: [0, 2, 4, 3, 2, 2, 1, 0, 1, 2],
    bass: [9, 8, 6, 3, 1, 0, 0, 0, 0, 0],
    treble: [-3, -2, -1, 0, 1, 3, 6, 8, 9, 9],
    vocal: [-2, -2, -1, 1, 4, 6, 5, 2, 0, -2], // Centered on 1-4 kHz vocal presence
    rock: [5, 4, 2, 0, -1, 1, 3, 5, 6, 6],
    techno: [6, 5, 2, 0, -2, 2, 4, 6, 6, 5],
    pop: [-1, 1, 3, 5, 4, 2, -1, -1, -2, -2],
    classical: [4, 3, 2, 2, -1, -1, 0, 2, 3, 4],
    metal: [7, 5, 2, 0, -2, 1, 3, 6, 7, 7],
    dance: [6, 7, 5, 1, 0, 2, 4, 5, 5, 0],
    reggae: [0, 0, -1, -5, 0, 5, 5, 0, -1, -2],
    soft: [3, 1, 0, -1, -1, 0, 2, 4, 5, 6],
    acoustic: [3, 2, 1, 1, 2, 2, 3, 3, 2, 1],
    laptop: [-1, 2, 3, 1, -1, -3, -2, 1, 3, 4], // Cuts 1-3 kHz honkiness
    party: [5, 5, 0, 0, 0, 0, 0, 0, 4, 5],
  };

  constructor(
    sliders: HTMLInputElement[],
    preampSlider: HTMLInputElement,
    selectDropdown: HTMLSelectElement,
    onButton: HTMLButtonElement,
    autoButton: HTMLButtonElement,
    saveButton: HTMLButtonElement,
    loadButton: HTMLButtonElement
  ) {
    this.sliders = sliders;
    this.preampSlider = preampSlider;
    this.selectDropdown = selectDropdown;
    this.onButton = onButton;
    this.autoButton = autoButton;

    this.bindEvents(saveButton, loadButton);
    this.loadCustomPresets();
  }

  private bindEvents(saveBtn: HTMLButtonElement, loadBtn: HTMLButtonElement) {
    this.onButton?.addEventListener("click", () => {
      this.isEnabled = !this.isEnabled;
      this.onButton.classList.toggle("active", this.isEnabled);
      this.sync();
    });

    this.autoButton?.addEventListener("click", () => {
      this.isAuto = !this.isAuto;
      this.autoButton.classList.toggle("active", this.isAuto);
      localStorage.setItem("surmuni_eq_auto", this.isAuto ? "true" : "false");
    });

    if (localStorage.getItem("surmuni_eq_auto") === "true") {
      this.isAuto = true;
      this.autoButton?.classList.add("active");
    }

    this.selectDropdown?.addEventListener("change", (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val !== "custom") this.applyPreset(val);
    });

    // Double-click Preamp to reset to 0 dB
    this.preampSlider?.addEventListener("dblclick", () => {
      this.preampSlider.value = "0";
      this.preampSlider.title = "Preamp: 0.0 dB";
      this.sync();
    });

    this.preampSlider?.addEventListener("input", () => {
      const val = parseFloat(this.preampSlider.value);
      this.preampSlider.title = `Preamp: ${val >= 0 ? "+" : ""}${val.toFixed(1)} dB`;
      this.sync();
    });

    // Double-click band slider to reset to 0 dB, update hover frequency and gain
    this.sliders.forEach((s, idx) => {
      const freq = ISO_FREQUENCIES[idx] || `${idx}`;
      s.title = `${freq}: 0.0 dB`;

      s.addEventListener("dblclick", () => {
        s.value = "0";
        s.title = `${freq}: 0.0 dB`;
        if (this.selectDropdown) this.selectDropdown.value = "custom";
        this.sync();
      });

      s.addEventListener("input", () => {
        const val = parseFloat(s.value);
        s.title = `${freq}: ${val >= 0 ? "+" : ""}${val.toFixed(1)} dB`;
        if (this.selectDropdown) this.selectDropdown.value = "custom";
        this.sync();
      });
    });

    saveBtn?.addEventListener("click", () => this.savePreset());
    loadBtn?.addEventListener("click", () => this.loadPreset());
  }

  applyPreset(name: string) {
    const vals = this.presets[name];
    if (!vals) return;

    this.sliders.forEach((slider, i) => {
      if (vals[i] !== undefined) {
        slider.value = vals[i].toString();
        const freq = ISO_FREQUENCIES[i] || `${i}`;
        slider.title = `${freq}: ${vals[i] >= 0 ? "+" : ""}${vals[i]} dB`;
      }
    });

    // Auto-calculate headroom so bass-heavy presets do not clip / pump limiter
    const maxBoost = Math.max(...vals, 0);
    if (this.preampSlider) {
      const autoHeadroom = maxBoost > 0 ? -(maxBoost * 0.72) : 0;
      this.preampSlider.value = autoHeadroom.toFixed(1);
      this.preampSlider.title = `Preamp: ${autoHeadroom.toFixed(1)} dB (Auto-Headroom)`;
    }

    this.sync();
  }

  autoLoadForTrack(trackPath: string) {
    if (!this.isAuto || !trackPath) return;
    try {
      const autoMap = JSON.parse(localStorage.getItem("surmuni_eq_automap") || "{}");
      const mappedPreset = autoMap[trackPath];
      if (mappedPreset && this.presets[mappedPreset]) {
        this.applyPreset(mappedPreset);
        if (this.selectDropdown) this.selectDropdown.value = mappedPreset;
      }
    } catch {}
  }

  saveAutoLoadForTrack(trackPath: string, presetName: string) {
    try {
      const autoMap = JSON.parse(localStorage.getItem("surmuni_eq_automap") || "{}");
      autoMap[trackPath] = presetName;
      localStorage.setItem("surmuni_eq_automap", JSON.stringify(autoMap));
    } catch {}
  }

  sync() {
    const bands = this.sliders.map((s) => parseFloat(s.value));
    const preamp = parseFloat(this.preampSlider?.value || "0");
    const config: EqualizerConfig = {
      enabled: this.isEnabled,
      preamp,
      bands,
    };
    AudioService.updateEqualizer(config);
  }

  private savePreset() {
    const name = prompt("Name for your custom EQ preset:", "My Custom Preset");
    if (!name) return;

    const currentValues = this.sliders.map((s) => parseFloat(s.value));
    const preampVal = parseFloat(this.preampSlider?.value || "0");
    const saved = JSON.parse(localStorage.getItem("surmuni_custom_eqs") || "{}");
    saved[name] = { preamp: preampVal, bands: currentValues };
    localStorage.setItem("surmuni_custom_eqs", JSON.stringify(saved));

    this.addDropdownOption(name, currentValues);
    this.sync();
  }

  private loadPreset() {
    const saved = JSON.parse(localStorage.getItem("surmuni_custom_eqs") || "{}");
    const names = Object.keys(saved);
    if (names.length === 0) return alert("No custom presets found.");

    const chosen = prompt(`Select preset to load:\n${names.join("\n")}`, names[0]);
    if (chosen && saved[chosen]) {
      const data = saved[chosen];
      if (this.preampSlider && data.preamp !== undefined) {
        this.preampSlider.value = data.preamp.toString();
      }
      data.bands.forEach((val: number, i: number) => {
        if (this.sliders[i]) {
          this.sliders[i].value = val.toString();
          const freq = ISO_FREQUENCIES[i] || `${i}`;
          this.sliders[i].title = `${freq}: ${val >= 0 ? "+" : ""}${val} dB`;
        }
      });
      this.addDropdownOption(chosen, data.bands);
      this.sync();
    }
  }

  private loadCustomPresets() {
    try {
      const saved = JSON.parse(localStorage.getItem("surmuni_custom_eqs") || "{}");
      Object.keys(saved).forEach((k) => this.addDropdownOption(k, saved[k].bands));
    } catch {}
  }

  private addDropdownOption(name: string, bands: number[]) {
    this.presets[`user_${name}`] = bands;
    let opt = Array.from(this.selectDropdown.options).find((o) => o.value === `user_${name}`);
    if (!opt) {
      opt = document.createElement("option");
      opt.value = `user_${name}`;
      opt.text = `Preset: ${name} (User)`;
      this.selectDropdown.appendChild(opt);
    }
    this.selectDropdown.value = opt.value;
  }
}
