export type ProviderImageResult = Blob;

export type ImageGenerationInput = {
  prompt: string;
  model?: string;
};

export type ImageEditInput = {
  prompt: string;
  model?: string;
  image: Blob;
};

export interface ImageProviderAdapter {
  generate(input: ImageGenerationInput): Promise<ProviderImageResult>;
  edit?(input: ImageEditInput): Promise<ProviderImageResult>;
}
