import { test } from "node:test";
import { strict as assert } from "node:assert";
import { selectAutomaticVideoRoutes } from "../lib/providers/video-router.ts";

test("only configured video workflows run and fallback is capped", () => {
  const env = { FAL_KEY: "key", FAL_VIDEO_MODEL: "fal-ai/example", REPLICATE_API_TOKEN: "key", REPLICATE_VIDEO_MODEL: "owner/model", COMFYUI_URL: "http://localhost:8188", COMFYUI_VIDEO_WORKFLOW: "{}" };
  assert.deepEqual(selectAutomaticVideoRoutes(env), [
    { provider: "fal", model: "fal-ai/example" },
    { provider: "replicate", model: "owner/model" },
  ]);
  assert.deepEqual(selectAutomaticVideoRoutes({ FAL_KEY: "key" }), []);
});
