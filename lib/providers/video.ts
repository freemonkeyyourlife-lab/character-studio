export type VideoGenerationInput = {
  prompt: string;
  model?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
};

export interface VideoProviderAdapter {
  generate(input: VideoGenerationInput): Promise<Blob>;
}
