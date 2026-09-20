export type VideoModelDefinition = {
  id: string;
  name: string;
};

export type VideoProvider = {
  id: string;
  name: string;
  status: "ready" | "planned";
  description: string;
  models: VideoModelDefinition[];
};

export const videoProviders: VideoProvider[] = [
  {
    id: "replicate",
    name: "Replicate",
    status: "ready",
    description: "Hosted video model adapter. Set REPLICATE_VIDEO_MODEL to a model that accepts a prompt.",
    models: [
      { id: "configured", name: "Configured video model" },
    ],
  },
  {
    id: "fal",
    name: "fal",
    status: "ready",
    description: "Hosted video model adapter. Set FAL_VIDEO_MODEL to a video endpoint.",
    models: [
      { id: "configured", name: "Configured video model" },
    ],
  },
  {
    id: "comfyui",
    name: "ComfyUI",
    status: "ready",
    description: "Local or self-hosted video workflow. Set COMFYUI_VIDEO_WORKFLOW to a workflow JSON template.",
    models: [
      { id: "workflow", name: "Configured video workflow" },
    ],
  },
];

export function getVideoProvider(providerId: string) {
  return videoProviders.find((provider) => provider.id === providerId);
}
