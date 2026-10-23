import { listen } from "@tauri-apps/api/event";
import butterchurnModule from "butterchurn";
import butterchurnPresetsModule from "butterchurn-presets";

// Resolve CJS / ESM module interoperability correctly
const butterchurn: any =
  (butterchurnModule as any)?.default?.default ||
  (butterchurnModule as any)?.default ||
  butterchurnModule;

const butterchurnPresets: any =
  (butterchurnPresetsModule as any)?.default || butterchurnPresetsModule;

let canvas = document.getElementById("vis-canvas") as HTMLCanvasElement;
const presetTitle = document.getElementById("preset-title") as HTMLElement;
const btnNext = document.getElementById("btn-next-preset") as HTMLButtonElement;

let visualizer: any = null;
let audioContext: AudioContext | null = null;
let presets: Record<string, any> = {};
let presetKeys: string[] = [];
let currentPresetIndex = 0;
let isPlaying = false;
let currentPhase = 0;
let gainNode: GainNode | null = null;
let liveFftBands: number[] = [];
let isFallback = false;

function initButterchurn() {
  try {
    if (!butterchurn || typeof butterchurn.createVisualizer !== "function") {
      throw new Error("Butterchurn createVisualizer not found on resolved module");
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtx();

    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.0001;

    const dest = audioContext.createMediaStreamDestination();
    gainNode.connect(dest);

    // Initial resize to match window
    canvas.width = Math.max(300, window.innerWidth);
    canvas.height = Math.max(200, window.innerHeight - 36);

    visualizer = butterchurn.createVisualizer(audioContext, canvas, {
      width: canvas.width,
      height: canvas.height,
      pixelRatio: window.devicePixelRatio || 1,
      textureRatio: 1,
    });

    if (!visualizer) {
      throw new Error("createVisualizer returned null/undefined");
    }

    visualizer.connectAudio(gainNode);

    // Load presets safely
    if (typeof butterchurnPresets.getPresets === "function") {
      presets = butterchurnPresets.getPresets();
    } else if (typeof (butterchurnPresetsModule as any).getPresets === "function") {
      presets = (butterchurnPresetsModule as any).getPresets();
    } else {
      presets = {};
    }

    presetKeys = Object.keys(presets);
    console.log(`[Visualizer] Butterchurn initialized with ${presetKeys.length} presets`);

    if (presetKeys.length > 0) {
      loadPreset(Math.floor(Math.random() * presetKeys.length));
    } else {
      if (presetTitle) presetTitle.innerHTML = `Preset: <strong>Active Dynamic Visualizer</strong>`;
    }

    startRenderLoop();
  } catch (err) {
    console.warn("[Visualizer] Butterchurn WebGL initialization error, falling back to 2D spectrum:", err);
    initFallbackSpectrum();
  }
}

function loadPreset(index: number) {
  if (isFallback) {
    currentPresetIndex = (index + fallbackModes.length) % fallbackModes.length;
    if (presetTitle) {
      presetTitle.innerHTML = `Mode: <strong>${fallbackModes[currentPresetIndex]}</strong>`;
    }
    return;
  }

  if (!visualizer || presetKeys.length === 0) return;
  currentPresetIndex = (index + presetKeys.length) % presetKeys.length;
  const name = presetKeys[currentPresetIndex];
  const preset = presets[name];

  if (presetTitle) {
    presetTitle.innerHTML = `Preset: <strong>${name}</strong>`;
  }

  try {
    visualizer.loadPreset(preset, 2.0);
  } catch (e) {
    console.warn("Failed loading preset:", name, e);
  }
}

function nextPreset() {
  loadPreset(currentPresetIndex + 1);
}

btnNext?.addEventListener("click", nextPreset);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    nextPreset();
  }
});

window.addEventListener("resize", () => {
  if (!canvas) return;
  canvas.width = Math.max(300, window.innerWidth);
  canvas.height = Math.max(200, window.innerHeight - 36);
  if (visualizer) {
    visualizer.setRendererSize(canvas.width, canvas.height);
  }
});

function startRenderLoop() {
  function render() {
    if (visualizer) {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      if (visualizer.audio) {
        const fftSize = visualizer.audio.fftSize || 1024;
        const timeL = new Uint8Array(fftSize);
        const timeR = new Uint8Array(fftSize);

        currentPhase += isPlaying ? 0.08 : 0.02;
        const bassEnergy = (liveFftBands[0] || 0.4) * 1.5;
        const midEnergy = (liveFftBands[5] || 0.35);

        for (let i = 0; i < fftSize; i++) {
          const t = i / fftSize;
          const wave =
            Math.sin(t * Math.PI * 12 + currentPhase) * (20 + bassEnergy * 40) +
            Math.sin(t * Math.PI * 28 + currentPhase * 1.5) * (15 + midEnergy * 25) +
            (Math.random() - 0.5) * (isPlaying ? 15 : 4);
          const sample = Math.max(0, Math.min(255, Math.floor(128 + wave)));
          timeL[i] = sample;
          timeR[i] = sample;
        }

        if (visualizer.audio.updateAudio) {
          visualizer.audio.updateAudio(timeL, timeL, timeR);
        }
      }

      try {
        visualizer.render();
      } catch (e) {}
    }
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

// Fallback Canvas 2D High-Definition Spectrum & Waveform Visualizer
const fallbackModes = ["Neon 64-Band Spectrum", "Oscilloscope Waveform", "Dual Aurora Peaks"];

function initFallbackSpectrum() {
  isFallback = true;
  // Replace canvas node cleanly to ensure a pure 2D context
  const oldCanvas = canvas;
  const newCanvas = document.createElement("canvas");
  newCanvas.id = "vis-canvas";
  newCanvas.style.flex = "1";
  newCanvas.style.width = "100%";
  newCanvas.style.height = "calc(100% - 36px)";
  newCanvas.style.display = "block";
  newCanvas.style.background = "#07070b";
  newCanvas.width = Math.max(300, window.innerWidth);
  newCanvas.height = Math.max(200, window.innerHeight - 36);

  if (oldCanvas && oldCanvas.parentNode) {
    oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
    canvas = newCanvas;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (presetTitle) {
    presetTitle.innerHTML = `Mode: <strong>${fallbackModes[currentPresetIndex]}</strong>`;
  }

  let phase = 0;
  function draw() {
    phase += isPlaying ? 0.06 : 0.015;
    ctx!.fillStyle = "#07070b";
    ctx!.fillRect(0, 0, canvas.width, canvas.height);

    const mode = currentPresetIndex % fallbackModes.length;

    if (mode === 0) {
      // 64-band Neon Spectrum with glowing peaks
      const bars = 64;
      const barW = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const liveVal = (liveFftBands[i % liveFftBands.length] || 0.15) * (isPlaying ? 1.0 : 0.12);
        const synthVal = Math.abs(Math.sin(phase + (i / bars) * Math.PI * 4)) * (isPlaying ? 0.35 : 0.08);
        const val = Math.min(1.0, liveVal + synthVal);
        const h = val * (canvas.height * 0.78) + 8;
        const hue = (i / bars) * 290 + 150;

        // Gradient bar
        const grad = ctx!.createLinearGradient(0, canvas.height, 0, canvas.height - h);
        grad.addColorStop(0, `hsla(${hue}, 100%, 45%, 0.95)`);
        grad.addColorStop(0.7, `hsla(${hue + 30}, 100%, 65%, 1)`);
        grad.addColorStop(1, `#ffffff`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(i * barW + 1, canvas.height - h, barW - 2, h);
      }
    } else if (mode === 1) {
      // High-resolution multi-line Oscilloscope
      ctx!.lineWidth = 2.5;
      for (let pass = 0; pass < 2; pass++) {
        ctx!.beginPath();
        const hue = pass === 0 ? 180 : 310;
        ctx!.strokeStyle = `hsla(${hue}, 100%, 65%, 0.85)`;
        const midY = canvas.height / 2 + (pass === 0 ? -15 : 15);

        for (let x = 0; x < canvas.width; x += 3) {
          const t = x / canvas.width;
          const bass = (liveFftBands[1] || 0.4) * (isPlaying ? 1.2 : 0.2);
          const y =
            midY +
            Math.sin(t * Math.PI * 8 + phase * (pass === 0 ? 1 : -1)) * (40 + bass * 60) +
            Math.sin(t * Math.PI * 22 + phase * 1.7) * 20;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      }
    } else {
      // Dual Aurora reactive waves
      ctx!.beginPath();
      ctx!.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x += 4) {
        const t = x / canvas.width;
        const y =
          canvas.height * 0.55 +
          Math.sin(t * Math.PI * 4 + phase) * (canvas.height * 0.22) +
          Math.cos(t * Math.PI * 7 - phase * 0.8) * 30;
        ctx!.lineTo(x, y);
      }
      ctx!.lineTo(canvas.width, canvas.height);
      ctx!.closePath();

      const grad = ctx!.createLinearGradient(0, canvas.height * 0.2, 0, canvas.height);
      grad.addColorStop(0, "rgba(0, 240, 255, 0.45)");
      grad.addColorStop(0.5, "rgba(147, 51, 234, 0.35)");
      grad.addColorStop(1, "rgba(10, 10, 18, 0.8)");
      ctx!.fillStyle = grad;
      ctx!.fill();
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

// Listen to playback heartbeat from main player
listen<any>("playback-tick", (event) => {
  const status = event.payload;
  if (status) {
    isPlaying = status.is_playing;
    if (status.fft_bands) {
      liveFftBands = status.fft_bands;
    }
  }
});

// Start
initButterchurn();
