import assert from "node:assert/strict";
import test from "node:test";
import { selectAutomaticImageRoutes } from "../lib/providers/image-router.ts";

test("selects only configured adapters with a model for the requested capability", () => {
  const env = { HF_TOKEN: "hf", FAL_KEY: "fal", COMFYUI_URL: "http://local" };
  assert.deepEqual(selectAutomaticImageRoutes("text-to-image", env).map((route) => route.provider), ["huggingface", "fal"]);
  assert.deepEqual(selectAutomaticImageRoutes("image-edit", env).map((route) => route.provider), ["huggingface", "fal"]);
  assert.deepEqual(selectAutomaticImageRoutes("text-to-image", { COMFYUI_URL: "http://local", COMFYUI_CHECKPOINT: "model.safetensors" })
    .map((route) => route.provider), ["comfyui"]);
  assert.deepEqual(selectAutomaticImageRoutes("image-edit", { COMFYUI_URL: "http://local", COMFYUI_CHECKPOINT: "model.safetensors" }), []);
});

test("limits fallback attempts and returns none without credentials", () => {
  const env = { HF_TOKEN: "hf", REPLICATE_API_TOKEN: "replicate", FAL_KEY: "fal" };
  assert.equal(selectAutomaticImageRoutes("text-to-image", env).length, 2);
  assert.equal(selectAutomaticImageRoutes("text-to-image", env, 1).length, 1);
  assert.deepEqual(selectAutomaticImageRoutes("text-to-image", {}), []);
});
