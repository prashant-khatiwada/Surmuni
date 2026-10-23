import { listen } from "@tauri-apps/api/event";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";

const canvas = document.getElementById("vis-canvas") as HTMLCanvasElement;
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

function initButterchurn() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtx();

    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.0001;

    const dest = audioContext.createMediaStreamDestination();
    gainNode.connect(dest);

    // Initial resize to match window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 36;

    visualizer = butterchurn.createVisualizer(audioContext, canvas, {
      width: canvas.width,
      height: canvas.height,
      pixelRatio: window.devicePixelRatio || 1,
      textureRatio: 1,
    });

    visualizer.connectAudio(gainNode);

    presets = butterchurnPresets.getPresets();
    presetKeys = Object.keys(presets);

    if (presetKeys.length > 0) {
      loadPreset(Math.floor(Math.random() * presetKeys.length));
    }

    startRenderLoop();
  } catch (err) {
    console.error("Butterchurn initialization error:", err);
    fallbackSpectrumRenderer();
  }
}

function loadPreset(index: number) {
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
  if (visualizer && canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 36;
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

        currentPhase += isPlaying ? 0.08 : 0.01;
        const bassEnergy = (liveFftBands[0] || 0.5) * 1.5;
        const midEnergy = (liveFftBands[5] || 0.4);

        for (let i = 0; i < fftSize; i++) {
          const t = i / fftSize;
          const wave = Math.sin(t * Math.PI * 12 + currentPhase) * (20 + bassEnergy * 40) +
                       Math.sin(t * Math.PI * 28 + currentPhase * 1.5) * (15 + midEnergy * 25);
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

function fallbackSpectrumRenderer() {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const context = ctx;
  function draw() {
    context.fillStyle = "#050508";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const bars = 64;
    const barW = canvas.width / bars;
    for (let i = 0; i < bars; i++) {
      const fftVal = (liveFftBands[i % liveFftBands.length] || 0.1) * (isPlaying ? 1.0 : 0.05);
      const h = fftVal * (canvas.height * 0.8) + 10;
      const hue = (i / bars) * 280 + 160;
      context.fillStyle = `hsl(${hue}, 100%, 50%)`;
      context.fillRect(i * barW, canvas.height - h, barW - 2, h);
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
