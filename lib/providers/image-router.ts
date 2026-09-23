import { imageProviders, type ModelCapability } from "../character.ts";
import { providerAvailability } from "./registry.ts";

export type ImageRoute = { provider: string; model: string };

// A request tries at most two configured providers. Explicit provider/model
// selections remain exact, so the UI never silently switches a user's choice.
export function selectAutomaticImageRoutes(
  capability: ModelCapability,
  environment: Record<string, string | undefined>,
  maxAttempts = 2,
): ImageRoute[] {
  const available = new Set(providerAvailability(environment)
    .filter((provider) => provider.configured && provider.capabilities.includes(capability))
    .map((provider) => provider.id));
  return imageProviders.filter((provider) => available.has(provider.id))
    .flatMap((provider) => {
      const model = provider.models.find((candidate) => candidate.capabilities.includes(capability));
      return model ? [{ provider: provider.id, model: model.id }] : [];
    }).slice(0, Math.max(0, Math.min(2, maxAttempts)));
}
