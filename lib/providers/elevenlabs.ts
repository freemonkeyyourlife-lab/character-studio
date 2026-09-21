const API_BASE = "https://api.elevenlabs.io/v1";

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured.");
  return key;
}

async function elevenFetch(path: string, init: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "xi-api-key": apiKey(),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs request failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : "."}`);
  }

  return response;
}

export async function cloneVoiceWithElevenLabs(
  name: string,
  files: File[],
  description?: string,
): Promise<{ voiceId: string; requiresVerification: boolean }> {
  const form = new FormData();
  form.append("name", name);
  if (description) form.append("description", description);
  for (const file of files) form.append("files[]", file, file.name || "voice-sample");

  const response = await elevenFetch("/voices/add", { method: "POST", body: form });
  const data = (await response.json()) as {
    voice_id?: string;
    requires_verification?: boolean;
  };

  if (!data.voice_id) throw new Error("ElevenLabs did not return a voice ID.");
  return {
    voiceId: data.voice_id,
    requiresVerification: Boolean(data.requires_verification),
  };
}

export async function synthesizeWithElevenLabs(input: {
  voiceId: string;
  text: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
}): Promise<Blob> {
  const response = await elevenFetch(`/text-to-speech/${encodeURIComponent(input.voiceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: input.text,
      model_id: input.modelId || process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
      voice_settings: {
        stability: input.stability ?? 0.5,
        similarity_boost: input.similarityBoost ?? 0.75,
        style: input.style ?? 0,
        use_speaker_boost: input.speakerBoost ?? true,
      },
    }),
  });

  return response.blob();
}
