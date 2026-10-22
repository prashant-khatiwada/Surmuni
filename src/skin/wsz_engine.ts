import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { WinampFontEngine } from "./font_engine";

export interface SkinManifest {
  name: string;
  bitmaps: Record<string, string>;
  vis_colors: string[];
}

export class WszSkinEngine {
  private static styleElement: HTMLStyleElement | null = null;
  public static currentSkin: SkinManifest | null = null;

  static async pickAndLoadSkin(): Promise<SkinManifest | null> {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Winamp Classic Skins (*.wsz, *.zip)",
          extensions: ["wsz", "zip"],
        },
      ],
    });

    if (!selected || typeof selected !== "string") return null;
    return await this.loadSkinFromPath(selected);
  }

  static async loadSkinFromPath(path: string): Promise<SkinManifest | null> {
    try {
      const manifest = await invoke<SkinManifest>("load_wsz_skin", { path });
      this.applySkin(manifest);
      return manifest;
    } catch (e) {
      console.error("Failed to load skin:", e);
      alert(`Could not load Winamp skin: ${e}`);
      return null;
    }
  }

  static async downloadAndApplySkin(url: string): Promise<SkinManifest | null> {
    try {
      const manifest = await invoke<SkinManifest>("download_and_load_skin", { url });
      this.applySkin(manifest);
      return manifest;
    } catch (e) {
      console.error("Failed to download skin:", e);
      alert(`Could not download Winamp skin: ${e}`);
      return null;
    }
  }

  static applySkin(manifest: SkinManifest) {
    this.currentSkin = manifest;
    const bmp = manifest.bitmaps;

    // Load bitmap fonts into pixel font engine
    WinampFontEngine.loadSkinBitmaps(bmp);

    if (!this.styleElement) {
      this.styleElement = document.createElement("style");
      this.styleElement.id = "surmuni-wsz-skin-styles";
      document.head.appendChild(this.styleElement);
    }

    // Generate 1:1 pixel-perfect CSS mapping matching Winamp 2.x and OneAmp layout
    let css = `
      /* Root Container: authentic 275px Winamp width, pixelated scaling */
      .winamp-container.skin-wsz {
        width: 275px !important;
        margin: 0 auto !important;
        image-rendering: pixelated !important;
        gap: 0 !important;
      }

      /* Double-size scaling support (Alt+D / 2X mode) */
      .winamp-container.skin-wsz.doublesize {
        transform: scale(2);
        transform-origin: top center;
        margin-bottom: 250px !important;
      }

      /* Common Window Sizing & Reset */
      .winamp-container.skin-wsz .winamp-window {
        width: 275px !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: hidden !important;
        position: relative !important;
        margin-bottom: 0 !important;
      }

      /* ========================================================================= */
      /* 1. MAIN WINDOW (275 x 116 px)                                            */
      /* ========================================================================= */
      .winamp-container.skin-wsz .main-window {
        height: 116px !important;
        ${bmp.main ? `background: url("${bmp.main}") no-repeat 0 0 !important;` : "background: #23242b !important;"}
      }

      /* Titlebar: 275 x 14 px */
      .winamp-container.skin-wsz .main-window .window-titlebar {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 275px !important;
        height: 14px !important;
        padding: 0 !important;
        border: none !important;
        ${bmp.titlebar ? `background: url("${bmp.titlebar}") no-repeat 0 0 !important;` : "background: transparent !important;"}
      }

      .winamp-container.skin-wsz .main-window .titlebar-handle {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 240px !important;
        height: 14px !important;
      }

      /* Title text baked into titlebar.bmp */
      .winamp-container.skin-wsz .main-window .titlebar-handle .title-text {
        display: none !important;
      }

      .winamp-container.skin-wsz .main-window .icon-bolt {
        position: absolute !important;
        top: 3px !important;
        left: 6px !important;
        width: 9px !important;
        height: 9px !important;
        cursor: pointer !important;
      }

      .winamp-container.skin-wsz .main-window .titlebar-controls {
        position: absolute !important;
        top: 3px !important;
        right: 2px !important;
        display: flex !important;
        gap: 1px !important;
      }

      .winamp-container.skin-wsz .main-window .win-btn {
        width: 9px !important;
        height: 9px !important;
        border: none !important;
        color: transparent !important;
        background: transparent !important;
        cursor: pointer !important;
        padding: 0 !important;
      }

      /* Main Body: absolute positioning anchor */
      .winamp-container.skin-wsz .main-window .main-body {
        position: absolute !important;
        top: 14px !important;
        left: 0 !important;
        width: 275px !important;
        height: 102px !important;
        padding: 0 !important;
        background: transparent !important;
      }

      /* Clutterbar: (10, 22) -> top: 8px from main-body, left: 10px, width: 8px, height: 43px */
      .winamp-container.skin-wsz .clutterbar {
        position: absolute !important;
        left: 10px !important;
        top: 8px !important;
        width: 8px !important;
        height: 43px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        z-index: 10 !important;
      }

      .winamp-container.skin-wsz .clutter-btn {
        width: 8px !important;
        height: 8.6px !important;
        background: transparent !important;
        border: none !important;
        color: transparent !important;
        cursor: pointer !important;
        padding: 0 !important;
      }

      /* Display Area: top LCD screen */
      .winamp-container.skin-wsz .main-window .display-area {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 275px !important;
        height: 43px !important;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        display: block !important;
      }

      /* Visualizer: (24, 43) relative to main window -> top: 29px from main-body */
      .winamp-container.skin-wsz .visualizer-box {
        position: absolute !important;
        left: 24px !important;
        top: 29px !important;
        width: 76px !important;
        height: 16px !important;
        background: transparent !important;
      }

      .winamp-container.skin-wsz #vis-canvas {
        width: 76px !important;
        height: 16px !important;
      }

      /* Time Display: (36, 26) relative to main -> top: 12px from main-body */
      .winamp-container.skin-wsz .timer-box {
        position: absolute !important;
        left: 36px !important;
        top: 12px !important;
        width: 60px !important;
        height: 13px !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        cursor: pointer !important;
      }

      .winamp-container.skin-wsz .time-mode {
        display: none !important;
      }

      /* Audio Specs: KBPS / KHZ / Mono / Stereo (111, 43) */
      .winamp-container.skin-wsz .audio-specs-box {
        position: absolute !important;
        left: 111px !important;
        top: 29px !important;
        width: 154px !important;
        height: 12px !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 12px !important;
        background: transparent !important;
      }

      .winamp-container.skin-wsz .spec-label {
        display: none !important;
      }

      .winamp-container.skin-wsz .spec-val {
        font-family: monospace !important;
        font-size: 9px !important;
        color: #00ff00 !important;
      }

      .winamp-container.skin-wsz .spec-stereo,
      .winamp-container.skin-wsz .spec-mono {
        font-size: 8px !important;
      }

      /* Marquee Title: (111, 27) -> top: 13px, width: 154px, height: 13px */
      .winamp-container.skin-wsz .marquee-container {
        position: absolute !important;
        left: 111px !important;
        top: 13px !important;
        width: 154px !important;
        height: 13px !important;
        background: transparent !important;
        border: none !important;
        padding: 0 2px !important;
        font-size: 9px !important;
        line-height: 13px !important;
      }

      /* Sliders Row: Volume, Balance, Toggles */
      .winamp-container.skin-wsz .controls-sliders-row {
        display: block !important;
        position: absolute !important;
        top: 43px !important;
        left: 0 !important;
        width: 275px !important;
        height: 14px !important;
      }

      .winamp-container.skin-wsz .slider-label {
        display: none !important;
      }

      /* Volume Slider: (107, 57) -> left: 107px, top: 43px, width: 68px, height: 13px */
      .winamp-container.skin-wsz .vol-group {
        position: absolute !important;
        left: 107px !important;
        top: 0 !important;
        width: 68px !important;
        height: 13px !important;
      }

      .winamp-container.skin-wsz #volume-slider {
        width: 68px !important;
        height: 13px !important;
        -webkit-appearance: none !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        margin: 0 !important;
      }

      .winamp-container.skin-wsz #volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        width: 14px !important;
        height: 11px !important;
        ${bmp.volume ? `background: url("${bmp.volume}") no-repeat 0 -422px !important;` : "background: #aaa !important;"}
        border: none !important;
        cursor: pointer !important;
      }

      /* Balance Slider: (177, 57) -> left: 177px, top: 0, width: 38px, height: 13px */
      .winamp-container.skin-wsz .bal-group {
        position: absolute !important;
        left: 177px !important;
        top: 0 !important;
        width: 38px !important;
        height: 13px !important;
      }

      .winamp-container.skin-wsz #balance-slider {
        width: 38px !important;
        height: 13px !important;
        -webkit-appearance: none !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        margin: 0 !important;
      }

      .winamp-container.skin-wsz #balance-slider::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        width: 14px !important;
        height: 11px !important;
        ${bmp.balance ? `background: url("${bmp.balance}") no-repeat 0 -422px !important;` : "background: #aaa !important;"}
        border: none !important;
        cursor: pointer !important;
      }

      /* Toggle Indicators (EQ / PL): (219, 58) & (242, 58) */
      .winamp-container.skin-wsz .toggle-indicators {
        position: absolute !important;
        left: 219px !important;
        top: 1px !important;
        display: flex !important;
        gap: 0 !important;
      }

      .winamp-container.skin-wsz #btn-eq-toggle {
        width: 23px !important;
        height: 12px !important;
        font-size: 8px !important;
        padding: 0 !important;
        line-height: 12px !important;
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat 0 -61px !important; color: transparent !important;` : ""}
        border: none !important;
      }

      .winamp-container.skin-wsz #btn-eq-toggle.active {
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat 0 -73px !important;` : "background: #00aa00 !important;"}
      }

      .winamp-container.skin-wsz #btn-pl-toggle {
        width: 23px !important;
        height: 12px !important;
        font-size: 8px !important;
        padding: 0 !important;
        line-height: 12px !important;
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat -23px -61px !important; color: transparent !important;` : ""}
        border: none !important;
      }

      .winamp-container.skin-wsz #btn-pl-toggle.active {
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat -23px -73px !important;` : "background: #00aa00 !important;"}
      }

      /* Hide extra text toggles that don't exist on 1998 faceplate */
      .winamp-container.skin-wsz #btn-ml-toggle,
      .winamp-container.skin-wsz #btn-vis-toggle {
        display: none !important;
      }

      /* Position Seek Bar: (16, 72) -> top: 58px from main-body, width: 248px, height: 10px */
      .winamp-container.skin-wsz .seek-bar-container {
        position: absolute !important;
        left: 16px !important;
        top: 58px !important;
        width: 248px !important;
        height: 10px !important;
      }

      .winamp-container.skin-wsz .winamp-seek {
        width: 248px !important;
        height: 10px !important;
        -webkit-appearance: none !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        margin: 0 !important;
      }

      .winamp-container.skin-wsz .winamp-seek::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        width: 29px !important;
        height: 10px !important;
        ${bmp.posbar ? `background: url("${bmp.posbar}") no-repeat -248px 0 !important;` : "background: #aaa !important;"}
        border: none !important;
        cursor: pointer !important;
      }

      /* Transport Buttons Row: (16, 88) -> top: 74px from main-body */
      .winamp-container.skin-wsz .transport-bar {
        position: absolute !important;
        left: 16px !important;
        top: 74px !important;
        display: flex !important;
        gap: 0 !important;
      }

      .winamp-container.skin-wsz .transport-btn {
        height: 18px !important;
        border: none !important;
        color: transparent !important;
        padding: 0 !important;
        cursor: pointer !important;
      }

      .winamp-container.skin-wsz #btn-prev {
        width: 23px !important;
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat 0 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-prev:active {
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat 0 -18px !important;` : ""}
      }

      .winamp-container.skin-wsz #btn-play {
        width: 23px !important;
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -23px 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-play:active,
      .winamp-container.skin-wsz #btn-play.is-playing {
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -23px -18px !important;` : ""}
      }

      .winamp-container.skin-wsz #btn-stop {
        width: 23px !important;
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -69px 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-stop:active {
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -69px -18px !important;` : ""}
      }

      .winamp-container.skin-wsz #btn-next {
        width: 22px !important;
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -92px 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-next:active {
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -92px -18px !important;` : ""}
      }

      .winamp-container.skin-wsz #btn-eject {
        width: 22px !important;
        height: 16px !important;
        margin-left: 6px !important;
        margin-top: 1px !important;
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -114px 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-eject:active {
        ${bmp.cbuttons ? `background: url("${bmp.cbuttons}") no-repeat -114px -16px !important;` : ""}
      }

      /* Shuffle & Repeat Buttons: (164, 89) and (211, 89) */
      .winamp-container.skin-wsz #btn-shuffle {
        position: absolute !important;
        left: 164px !important;
        top: 75px !important;
        width: 47px !important;
        height: 15px !important;
        border: none !important;
        color: transparent !important;
        padding: 0 !important;
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat -28px 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-shuffle.active {
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat -28px -30px !important;` : ""}
      }

      .winamp-container.skin-wsz #btn-repeat {
        position: absolute !important;
        left: 211px !important;
        top: 75px !important;
        width: 28px !important;
        height: 15px !important;
        border: none !important;
        color: transparent !important;
        padding: 0 !important;
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat 0 0 !important;` : ""}
      }
      .winamp-container.skin-wsz #btn-repeat.active {
        ${bmp.shufrep ? `background: url("${bmp.shufrep}") no-repeat 0 -30px !important;` : ""}
      }

      /* ========================================================================= */
      /* 2. EQUALIZER WINDOW (275 x 116 px)                                       */
      /* ========================================================================= */
      .winamp-container.skin-wsz .eq-window {
        height: 116px !important;
        ${bmp.eqmain ? `background: url("${bmp.eqmain}") no-repeat 0 0 !important;` : "background: #23242b !important;"}
      }

      .winamp-container.skin-wsz .eq-titlebar {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 275px !important;
        height: 14px !important;
        padding: 0 !important;
        border: none !important;
        ${bmp.titlebar ? `background: url("${bmp.titlebar}") no-repeat 0 0 !important;` : "background: transparent !important;"}
      }

      .winamp-container.skin-wsz .eq-titlebar .title-text {
        display: none !important;
      }

      .winamp-container.skin-wsz .eq-body {
        position: absolute !important;
        top: 14px !important;
        left: 0 !important;
        width: 275px !important;
        height: 102px !important;
        padding: 0 !important;
        background: transparent !important;
      }

      .winamp-container.skin-wsz .eq-top-controls {
        position: absolute !important;
        top: 4px !important;
        left: 14px !important;
        width: 247px !important;
        display: flex !important;
        align-items: center !important;
      }

      .winamp-container.skin-wsz #eq-on {
        width: 25px !important;
        height: 12px !important;
        border: none !important;
        color: transparent !important;
        ${bmp.eqmain ? `background: url("${bmp.eqmain}") no-repeat 0 -119px !important;` : ""}
      }
      .winamp-container.skin-wsz #eq-on.active {
        ${bmp.eqmain ? `background: url("${bmp.eqmain}") no-repeat -10px -119px !important;` : ""}
      }

      .winamp-container.skin-wsz #eq-auto {
        width: 33px !important;
        height: 12px !important;
        margin-left: 0 !important;
        border: none !important;
        color: transparent !important;
        ${bmp.eqmain ? `background: url("${bmp.eqmain}") no-repeat -33px -119px !important;` : ""}
      }
      .winamp-container.skin-wsz #eq-auto.active {
        ${bmp.eqmain ? `background: url("${bmp.eqmain}") no-repeat -43px -119px !important;` : ""}
      }

      .winamp-container.skin-wsz .eq-preset-wrapper {
        margin-left: auto !important;
      }

      .winamp-container.skin-wsz #btn-save-eq,
      .winamp-container.skin-wsz #btn-load-eq {
        display: none !important;
      }

      .winamp-container.skin-wsz .eq-preset-select {
        height: 14px !important;
        font-size: 8px !important;
        background: #111 !important;
        color: #0f0 !important;
        border: 1px solid #444 !important;
      }

      /* EQ Sliders Container: exactly positioned tracks */
      .winamp-container.skin-wsz .eq-sliders-container {
        position: absolute !important;
        top: 24px !important;
        left: 0 !important;
        width: 275px !important;
        height: 78px !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .winamp-container.skin-wsz .eq-band-label,
      .winamp-container.skin-wsz .eq-col > span {
        display: none !important;
      }

      .winamp-container.skin-wsz .slider-track-wrap {
        width: 14px !important;
        height: 63px !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }

      .winamp-container.skin-wsz .slider-track-wrap::after {
        display: none !important;
      }

      .winamp-container.skin-wsz .eq-slider {
        width: 14px !important;
        height: 63px !important;
        background: transparent !important;
        cursor: pointer !important;
      }

      .winamp-container.skin-wsz .eq-slider::-webkit-slider-thumb {
        width: 11px !important;
        height: 11px !important;
        ${bmp.eq_slider ? `background: url("${bmp.eq_slider}") no-repeat 0 0 !important;` : (bmp.eqmain ? `background: url("${bmp.eqmain}") no-repeat 0 -164px !important;` : "")}
        border: none !important;
      }

      /* 11 Track X coordinates: Preamp at 21px, 10 bands at 78, 96, 114, 132, 150, 168, 186, 204, 222, 240 */
      .winamp-container.skin-wsz .preamp-col {
        position: absolute !important;
        left: 21px !important;
        top: 0 !important;
        border: none !important;
        padding: 0 !important;
      }

      .winamp-container.skin-wsz .eq-bands {
        display: block !important;
      }

      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(1) { position: absolute !important; left: 78px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(2) { position: absolute !important; left: 96px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(3) { position: absolute !important; left: 114px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(4) { position: absolute !important; left: 132px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(5) { position: absolute !important; left: 150px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(6) { position: absolute !important; left: 168px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(7) { position: absolute !important; left: 186px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(8) { position: absolute !important; left: 204px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(9) { position: absolute !important; left: 222px !important; top: 0 !important; }
      .winamp-container.skin-wsz .eq-bands .eq-col:nth-child(10) { position: absolute !important; left: 240px !important; top: 0 !important; }

      /* ========================================================================= */
      /* 3. PLAYLIST WINDOW (275 px width)                                        */
      /* ========================================================================= */
      .winamp-container.skin-wsz .playlist-window {
        width: 275px !important;
        ${bmp.pledit ? `background: url("${bmp.pledit}") no-repeat 0 0 !important;` : "background: #000 !important;"}
      }

      .winamp-container.skin-wsz .pl-titlebar {
        height: 20px !important;
        border: none !important;
        ${bmp.pledit ? `background: url("${bmp.pledit}") no-repeat 0 0 !important;` : ""}
      }

      .winamp-container.skin-wsz .pl-titlebar .title-text {
        display: none !important;
      }

      .winamp-container.skin-wsz .playlist-body {
        padding: 2px 14px 28px 14px !important;
        background: transparent !important;
      }

      .winamp-container.skin-wsz .playlist-items-box {
        background: #000 !important;
        border: 1px inset #222 !important;
        font-family: Arial, sans-serif !important;
        font-size: 10px !important;
        color: #00ff00 !important;
      }

      .winamp-container.skin-wsz .playlist-bottom-bar {
        height: 26px !important;
        background: transparent !important;
        border-top: none !important;
        padding: 4px 6px !important;
      }

      .winamp-container.skin-wsz .pl-btn {
        background: #23242b !important;
        border: 1px solid #444 !important;
        font-size: 8px !important;
        padding: 1px 4px !important;
      }
    `;

    this.styleElement.innerHTML = css;
    const container = document.getElementById("app");
    if (container) {
      container.className = "winamp-container skin-wsz";
    }
  }
}
