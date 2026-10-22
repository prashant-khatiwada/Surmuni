declare module "butterchurn" {
  const butterchurn: {
    createVisualizer: (
      audioContext: AudioContext | null,
      canvas: HTMLCanvasElement,
      opts?: any
    ) => any;
  };
  export default butterchurn;
}

declare module "butterchurn-presets" {
  const butterchurnPresets: {
    getPresets: () => { [presetName: string]: any };
  };
  export default butterchurnPresets;
}
