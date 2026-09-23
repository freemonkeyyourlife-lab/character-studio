import assert from "node:assert/strict";
import test from "node:test";
import { providerAvailability } from "../lib/providers/registry.ts";

test("availability requires all settings and never returns their values", () => {
  const key = "a-private-key";
  const providers = providerAvailability({ VENICE_API_KEY: key });
  const venice = providers.find((provider) => provider.id === "venice");
  assert.equal(venice.configured, false);
  assert.deepEqual(venice.missingConfiguration, ["VENICE_CHAT_MODEL"]);
  assert.equal(JSON.stringify(providers).includes(key), false);
  assert.equal(providerAvailability({ VENICE_API_KEY: key, VENICE_CHAT_MODEL: "some-model" })
    .find((provider) => provider.id === "venice").configured, true);
  assert.equal(providers.find((provider) => provider.id === "seaart").configured, false);
});
