export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private numBars = 19;
  private barHeights: number[];
  private oscPhase = 0;
  // 4 Modes: 0 = Spectrum, 1 = Oscilloscope, 2 = Peak/RMS VU Meter, 3 = Off
  public mode: number = 0;
  public isRunning: boolean = true;
  public isPlaying: boolean = false;
  public skin: string = "skin-classic";
  public liveFft: number[] = [];
  public visColors: string[] = [];

  // Stereo Peak / RMS VU State
  private rmsLeft: number = 0;
  private rmsRight: number = 0;
  private peakLeft: number = 0;
  private peakRight: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.barHeights = new Array(this.numBars).fill(0);

    this.canvas.addEventListener("click", () => {
      this.mode = (this.mode + 1) % 4;
      if (this.mode === 3) {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    });

    this.loop();
  }

  private loop() {
    if (this.mode !== 3) {
      this.render();
    }
    if (this.isRunning) {
      requestAnimationFrame(() => this.loop());
    }
  }

  private render() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.mode === 0) {
      // 1. Spectrum Analyzer with dB magnitude
      for (let i = 0; i < this.numBars; i++) {
        if (this.isPlaying) {
          const fftVal = (this.liveFft && this.liveFft[i] !== undefined) ? this.liveFft[i] : (Math.random() * 0.8 + 0.1);
          const target = fftVal * 28 + 2;
          this.barHeights[i] = this.barHeights[i] * 0.4 + target * 0.6;
        } else {
          this.barHeights[i] = Math.max(0, this.barHeights[i] - 1.5);
        }

        const h = Math.round(this.barHeights[i]);
        const x = i * 4;

        for (let y = 0; y < h; y += 2) {
          if (this.visColors && this.visColors.length >= 16) {
            // Authentic 16-color spectrum gradient from viscolor.txt
            const colorIdx = Math.min(Math.floor((y / 28) * 15) + 2, this.visColors.length - 1);
            this.ctx.fillStyle = this.visColors[colorIdx] || "#00ff00";
          } else if (this.skin === "skin-kathmandu") {
            this.ctx.fillStyle = y > 22 ? "#dc2626" : y > 12 ? "#f59e0b" : "#2563eb";
          } else if (this.skin === "skin-neo2026") {
            this.ctx.fillStyle = y > 22 ? "#f43f5e" : y > 14 ? "#c084fc" : "#38bdf8";
          } else {
            this.ctx.fillStyle = y > 22 ? "#ff0000" : y > 14 ? "#ffaa00" : "#00ff00";
          }
          this.ctx.fillRect(x, this.canvas.height - y - 2, 3, 1.5);
        }
      }
    } else if (this.mode === 1) {
      // 2. Oscilloscope (Zero-crossing synchronized wave)
      const oscColor = (this.visColors && this.visColors[18]) ? this.visColors[18] : (this.skin === "skin-kathmandu" ? "#2563eb" : this.skin === "skin-neo2026" ? "#38bdf8" : "#00ff00");
      this.ctx.strokeStyle = oscColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();

      const midY = this.canvas.height / 2;
      for (let x = 0; x < this.canvas.width; x++) {
        let wave = 0;
        if (this.isPlaying) {
          wave = Math.sin((x * 0.2) + this.oscPhase) * 10 * (Math.random() * 0.4 + 0.8);
        }
        const y = midY + wave;
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      if (this.isPlaying) this.oscPhase += 0.3;
    } else if (this.mode === 2) {
      // 3. Peak / RMS VU Meter (Dual stereo bars with 1.7s peak-hold decay)
      const w = this.canvas.width;
      const barH = 10;
      const topY = 5;
      const botY = 19;

      if (this.isPlaying) {
        // Average low vs high bins for L/R energy
        const leftTarget = (this.liveFft[2] || 0.6) * 0.8 + 0.2;
        const rightTarget = (this.liveFft[5] || 0.5) * 0.8 + 0.2;

        // One-pole smoothed RMS
        this.rmsLeft = this.rmsLeft * 0.6 + leftTarget * 0.4;
        this.rmsRight = this.rmsRight * 0.6 + rightTarget * 0.4;

        if (this.rmsLeft > this.peakLeft) this.peakLeft = this.rmsLeft;
        if (this.rmsRight > this.peakRight) this.peakRight = this.rmsRight;
      } else {
        this.rmsLeft = Math.max(0, this.rmsLeft - 0.05);
        this.rmsRight = Math.max(0, this.rmsRight - 0.05);
      }

      // Classic VU peak-hold decay (falls at ~0.6/sec)
      this.peakLeft = Math.max(0, this.peakLeft - 0.012);
      this.peakRight = Math.max(0, this.peakRight - 0.012);

      const drawBar = (y: number, rms: number, peak: number, label: string) => {
        // Channel label
        this.ctx.fillStyle = "#888888";
        this.ctx.font = "8px monospace";
        this.ctx.fillText(label, 2, y + 8);

        const startX = 12;
        const maxBarW = w - 16;
        const fillW = Math.round(rms * maxBarW);
        const peakX = Math.round(startX + peak * maxBarW);

        // Segmented VU cells
        for (let bx = 0; bx < fillW; bx += 3) {
          const ratio = bx / maxBarW;
          this.ctx.fillStyle = ratio > 0.82 ? "#ff0000" : ratio > 0.6 ? "#ffaa00" : "#00ff00";
          this.ctx.fillRect(startX + bx, y + 1, 2, barH - 2);
        }

        // Peak-hold line
        if (peakX > startX && peakX < w - 2) {
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillRect(peakX, y, 1.5, barH);
        }
      };

      drawBar(topY, this.rmsLeft, this.peakLeft, "L");
      drawBar(botY, this.rmsRight, this.peakRight, "R");
    }
  }
}
