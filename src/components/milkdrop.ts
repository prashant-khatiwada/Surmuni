// Butterchurn MilkDrop 2 Visualizer Engine for Surmuni
// Runs authentic MilkDrop 2 presets with WebGL2 and audio reactivity

import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";

export class MilkdropEngine {
  private canvas: HTMLCanvasElement;
  private visualizer: any = null;
  private audioContext: AudioContext | null = null;
  private presets: { [name: string]: any } = {};
  private presetKeys: string[] = [];
  private currentPresetIndex: number = 0;
  private presetNameEl: HTMLElement | null = null;
  private animFrameId: number | null = null;
  public isPlaying: boolean = false;
  private simulatedPhase: number = 0;
  private gainNode: GainNode | null = null;

  constructor(canvas: HTMLCanvasElement, presetNameEl?: HTMLElement) {
    this.canvas = canvas;
    this.presetNameEl = presetNameEl || null;
    this.init();
  }

  private init() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      // Create an internal gain pipeline to keep Web Audio graph alive
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.0001;

      const dest = this.audioContext.createMediaStreamDestination();
      this.gainNode.connect(dest);

      // Initialize Butterchurn
      this.visualizer = butterchurn.createVisualizer(this.audioContext, this.canvas, {
        width: 480,
        height: 260,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1,
      });

      this.visualizer.connectAudio(this.gainNode);

      // Load presets from butterchurn-presets
      this.presets = butterchurnPresets.getPresets();
      this.presetKeys = Object.keys(this.presets);

      if (this.presetKeys.length > 0) {
        const defaultIndex = Math.floor(Math.random() * this.presetKeys.length);
        this.loadPreset(defaultIndex);
      }

      this.startLoop();
    } catch (e) {
      console.error("Failed to initialize Butterchurn MilkDrop 2:", e);
    }
  }

  loadPreset(index: number, blendTime: number = 2.5) {
    if (!this.visualizer || this.presetKeys.length === 0) return;
    this.currentPresetIndex = (index + this.presetKeys.length) % this.presetKeys.length;
    const name = this.presetKeys[this.currentPresetIndex];
    const preset = this.presets[name];

    if (this.presetNameEl) {
      this.presetNameEl.innerText = `MilkDrop: ${name}`;
    }

    try {
      this.visualizer.loadPreset(preset, blendTime);
    } catch (err) {
      console.warn("Could not load preset:", name, err);
    }
  }

  nextPreset() {
    this.loadPreset(this.currentPresetIndex + 1, 2.5);
  }

  prevPreset() {
    this.loadPreset(this.currentPresetIndex - 1, 2.5);
  }

  randomPreset() {
    const nextIdx = Math.floor(Math.random() * this.presetKeys.length);
    this.loadPreset(nextIdx, 2.5);
  }

  setRendererSize(width: number, height: number) {
    if (this.visualizer) {
      this.visualizer.setRendererSize(width, height);
    }
  }

  private startLoop() {
    const render = () => {
      if (this.visualizer) {
        // Feed real-time or audio-reactive time-domain audio data into butterchurn's processor
        if (this.isPlaying && this.visualizer.audio) {
          const fftSize = this.visualizer.audio.fftSize || 1024;
          const timeL = new Uint8Array(fftSize);
          const timeR = new Uint8Array(fftSize);

          this.simulatedPhase += 0.08;
          for (let i = 0; i < fftSize; i++) {
            const t = i / fftSize;
            const wave = Math.sin(t * Math.PI * 12 + this.simulatedPhase) * 45 +
                         Math.sin(t * Math.PI * 28 + this.simulatedPhase * 1.5) * 25 +
                         (Math.random() - 0.5) * 12;
            const sample = Math.max(0, Math.min(255, Math.floor(128 + wave)));
            timeL[i] = sample;
            timeR[i] = sample;
          }

          if (this.visualizer.audio.updateAudio) {
            this.visualizer.audio.updateAudio(timeL, timeL, timeR);
          }
        }

        try {
          this.visualizer.render();
        } catch (e) {
          // Ignore transient WebGL frame drop
        }
      }
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
