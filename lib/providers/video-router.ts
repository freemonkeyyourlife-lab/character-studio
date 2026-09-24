export type VideoRoute = { provider: "replicate" | "fal" | "comfyui"; model: string };

export function selectAutomaticVideoRoutes(env: Record<string, string | undefined>, limit = 2): VideoRoute[] {
  const routes: VideoRoute[] = [];
  if (env.FAL_KEY?.trim() && env.FAL_VIDEO_MODEL?.trim()) routes.push({ provider: "fal", model: env.FAL_VIDEO_MODEL.trim() });
  if (env.REPLICATE_API_TOKEN?.trim() && env.REPLICATE_VIDEO_MODEL?.trim()) routes.push({ provider: "replicate", model: env.REPLICATE_VIDEO_MODEL.trim() });
  if (env.COMFYUI_URL?.trim() && env.COMFYUI_VIDEO_WORKFLOW?.trim()) routes.push({ provider: "comfyui", model: "workflow" });
  return routes.slice(0, Math.max(0, Math.min(2, limit)));
}
