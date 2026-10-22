// Winamp 2.x Pixel Font Engine for NUMBERS.BMP and TEXT.BMP

export class WinampFontEngine {
  private static numbersImg: HTMLImageElement | null = null;
  private static textImg: HTMLImageElement | null = null;
  private static timerCanvas: HTMLCanvasElement | null = null;
  private static timerCtx: CanvasRenderingContext2D | null = null;

  static init(timerCanvas: HTMLCanvasElement) {
    this.timerCanvas = timerCanvas;
    this.timerCtx = timerCanvas.getContext("2d");
    this.renderFallbackTimer("00:00");
  }

  static loadSkinBitmaps(bitmaps: Record<string, string>) {
    if (bitmaps.numbers) {
      const img = new Image();
      img.onload = () => {
        this.numbersImg = img;
      };
      img.src = bitmaps.numbers;
    }

    if (bitmaps.text) {
      const img = new Image();
      img.onload = () => {
        this.textImg = img;
      };
      img.src = bitmaps.text;
    }
  }

  // Renders MM:SS or -MM:SS using classic NUMBERS.BMP
  // In Winamp NUMBERS.BMP (99x13 px):
  // Digits 0-9 are 9px wide x 13px high located at x = [0..81]
  // Minus sign '-' is at x = 90 (9x13px)
  // Blank is at x = 99
  static renderTime(timeStr: string) {
    if (!this.timerCtx || !this.timerCanvas) return;

    if (!this.numbersImg) {
      this.renderFallbackTimer(timeStr);
      return;
    }

    const ctx = this.timerCtx;
    ctx.clearRect(0, 0, this.timerCanvas.width, this.timerCanvas.height);

    let drawX = 0;
    const isNegative = timeStr.startsWith("-");
    const cleanStr = isNegative ? timeStr.substring(1) : timeStr;

    // Render minus sign if negative
    if (isNegative) {
      ctx.drawImage(this.numbersImg, 90, 0, 9, 13, drawX, 0, 9, 13);
    }
    drawX += 10;

    // Split MM:SS
    const parts = cleanStr.split(":");
    const minStr = (parts[0] || "00").padStart(2, "0");
    const secStr = (parts[1] || "00").padStart(2, "0");

    // Minutes digit 1 & 2
    this.drawDigit(ctx, minStr[0], drawX);
    drawX += 9;
    this.drawDigit(ctx, minStr[1], drawX);
    drawX += 11; // spacer for colon

    // Colon dots
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(drawX - 2, 3, 2, 2);
    ctx.fillRect(drawX - 2, 8, 2, 2);

    // Seconds digit 1 & 2
    this.drawDigit(ctx, secStr[0], drawX);
    drawX += 9;
    this.drawDigit(ctx, secStr[1], drawX);
  }

  private static drawDigit(ctx: CanvasRenderingContext2D, char: string, x: number) {
    const digit = parseInt(char, 10);
    if (!isNaN(digit) && digit >= 0 && digit <= 9 && this.numbersImg) {
      // Each digit in NUMBERS.BMP is 9px wide
      const srcX = digit * 9;
      ctx.drawImage(this.numbersImg, srcX, 0, 9, 13, x, 0, 9, 13);
    }
  }

  // Fallback crisp pixel LED font if no .wsz bitmap loaded
  private static renderFallbackTimer(timeStr: string) {
    if (!this.timerCtx || !this.timerCanvas) return;
    const ctx = this.timerCtx;
    ctx.clearRect(0, 0, this.timerCanvas.width, this.timerCanvas.height);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.timerCanvas.width, this.timerCanvas.height);

    ctx.font = "bold 13px 'Courier New', Courier, monospace";
    ctx.fillStyle = "#00ff00";
    ctx.textBaseline = "top";
    ctx.fillText(timeStr, 2, 0);
  }

  // Character sheet layout in TEXT.BMP:
  // Monospace characters: 5px wide x 6px high per glyph
  // Row 0: "ABCDEFGHIJKLMNOPQRSTUVWXYZ\"@ "
  // Row 1: "0123456789….:()-'!_+\\/[]^&%,=$# "
  static renderText(canvas: HTMLCanvasElement, text: string) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!this.textImg) {
      // Fallback
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "bold 9px 'Courier New', monospace";
      ctx.fillStyle = "#00ff00";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 2, canvas.height / 2);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const upperText = text.toUpperCase();
    let destX = 0;

    const row0Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ\"@ ";
    const row1Chars = "0123456789….:()-'!_+\\/[]^&%,=$# ";

    for (let i = 0; i < upperText.length; i++) {
      const ch = upperText[i];
      let srcX = -1;
      let srcY = -1;

      const idx0 = row0Chars.indexOf(ch);
      if (idx0 !== -1) {
        srcX = idx0 * 5;
        srcY = 0;
      } else {
        const idx1 = row1Chars.indexOf(ch);
        if (idx1 !== -1) {
          srcX = idx1 * 5;
          srcY = 6;
        }
      }

      if (srcX >= 0 && srcY >= 0) {
        ctx.drawImage(this.textImg, srcX, srcY, 5, 6, destX, 1, 5, 6);
      }
      destX += 5;
      if (destX > canvas.width) break;
    }
  }

  // Returns true if text bitmap is loaded
  static hasTextFont(): boolean {
    return this.textImg !== null;
  }
}
