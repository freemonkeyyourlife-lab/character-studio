"use client";

import { useEffect, useMemo, useState } from "react";
import { videoProviders } from "@/lib/video";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CharacterDraft = {
  name?: string;
  age?: string;
  appearance?: string;
  personality?: string;
};

export default function VideoStudio() {
  const [provider, setProvider] = useState(videoProviders[0].id);
  const [model, setModel] = useState(videoProviders[0].models[0]?.id || "");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("");
  const [width, setWidth] = useState("768");
  const [height, setHeight] = useState("1024");
  const [fps, setFps] = useState("24");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("video/mp4");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});
  const [authEmail, setAuthEmail] = useState("");\n  const [characters, setCharacters] = useState<CharacterDraft[]>([]);\n  const [characterId, setCharacterId] = useState("");

  const selectedProvider = videoProviders.find((item) => item.id === provider) || videoProviders[0];

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.videoProviders) setProviderStatus(data.videoProviders);
      })
      .catch(() => {});

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {\n      setAuthEmail(data.session?.user.email || "");\n      if (data.session) fetch("/api/characters", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((payload) => {\n        if (Array.isArray(payload?.characters)) { setCharacters(payload.characters); setCharacterId(payload.characters[0]?.id || ""); }\n      }).catch(() => {});\n    });
  }, []);

  useEffect(() => {
    if (!selectedProvider.models.some((item) => item.id === model)) {
      setModel(selectedProvider.models[0]?.id || "");
    }
  }, [selectedProvider, model]);

  const providerReady = providerStatus[provider] !== false;
  const hasPrompt = prompt.trim().length > 0;

  const localCharacters = useMemo(() => {
    try {
      const stored = localStorage.getItem("character-studio-characters");
      return stored ? JSON.parse(stored) as CharacterDraft[] : [];
    } catch { return []; }
  }, []);

  const availableCharacters = characters.length ? characters : localCharacters;
  const selectedCharacter = availableCharacters.find((item) => item.id === characterId) || availableCharacters[0];
  const characterHint = selectedCharacter ? [selectedCharacter.name, selectedCharacter.age ? `age ${selectedCharacter.age}` : "", selectedCharacter.appearance, selectedCharacter.personality].filter(Boolean).join(", ") : "";

  const useCharacter = () => {
    if (characterHint) setPrompt(characterHint);
  };

  const generate = async () => {
    if (generating || !hasPrompt) return;
    setGenerating(true);
    setError("");
    if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl("");

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          model,
          duration: duration ? Number(duration) : undefined,
          width: width ? Number(width) : undefined,
          height: height ? Number(height) : undefined,
          fps: fps ? Number(fps) : undefined,
        }),
      });

      const type = response.headers.get("content-type") || "";
      if (!response.ok) {
        const data = type.includes("application/json") ? await response.json().catch(() => null) : null;
        throw new Error(data?.error || "Video generation failed.");
      }

      const blob = await response.blob();
      if (!blob.type.startsWith("video/")) throw new Error("The provider returned a non-video file.");
      setVideoType(blob.type);
      setVideoUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "character-studio-video.mp4";
    link.click();
  };

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">CHARACTER STUDIO · VIDEO</div>
          <h1>Video Studio</h1>
          <p>Generate character video locally or through a configured hosted provider. The same character prompts can be reused across image and video workflows.</p>
        </div>
        <div className="headerActions">
          <div className="status">{authEmail ? `SIGNED IN · ${authEmail}` : "LOCAL / SIGN-IN OPTIONAL"}</div>
          <a className="secondary smallButton" href="/">Characters</a>
        </div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Video generation</h2>
          <label>
            Prompt
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the scene, movement, camera, lighting and style…" maxLength={8000} />
          </label>
          {availableCharacters.length > 0 && <>\n            <label>Character<select value={selectedCharacter?.id || ""} onChange={(e) => setCharacterId(e.target.value)}>{availableCharacters.map((item, index) => <option key={item.id || index} value={item.id || ""}>{item.name || "Unnamed character"}</option>)}</select></label>\n            <button className="secondary smallButton" type="button" onClick={useCharacter}>Use selected character as prompt</button>\n          </>}

          <div className="providerBox">
            <div><strong>Video provider</strong><span>{selectedProvider.description}</span></div>
            <select value={provider} onChange={(e) => {
              const next = e.target.value;
              setProvider(next);
              const nextProvider = videoProviders.find((item) => item.id === next);
              setModel(nextProvider?.models[0]?.id || "");
            }}>
              {videoProviders.map((item) => (
                <option key={item.id} value={item.id} disabled={item.status !== "ready" || providerStatus[item.id] === false}>
                  {item.name}{providerStatus[item.id] === false ? " · not configured" : ""}
                </option>
              ))}
            </select>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {selectedProvider.models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>

          <div className="videoOptions">
            <label>Duration hint (seconds)<input inputMode="decimal" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Provider default" /></label>
            <label>Width<input inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} /></label>
            <label>Height<input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            <label>FPS<input inputMode="numeric" value={fps} onChange={(e) => setFps(e.target.value)} /></label>
          </div>

          <button className="primary" onClick={() => void generate()} disabled={generating || !hasPrompt || !providerReady}>
            {generating ? "Generating video…" : "Generate video"}
          </button>
          {!providerReady && <div className="error">This video provider is not configured on this deployment yet.</div>}
          {error && <div className="error" role="alert">{error}</div>}
        </div>

        <div className="card preview videoPreview">
          <div className="previewTop"><h2>Preview</h2><span>{generating ? "Generating…" : videoUrl ? videoType : "Ready"}</span></div>
          {videoUrl ? (
            <>
              <video className="generatedVideo" src={videoUrl} controls playsInline loop />
              <button className="secondary" onClick={download}>Download video</button>
            </>
          ) : (
            <div className="videoEmpty"><strong>Video output</strong><span>Your generated video will appear here.</span></div>
          )}
        </div>
      </section>

      <section className="card videoNotes">
        <h2>Local + online</h2>
        <p><strong>Local:</strong> ComfyUI can run a configurable video workflow on your own machine. There is no built-in per-generation service fee, but generation speed, storage and model requirements depend on your hardware.</p>
        <p><strong>Online:</strong> Replicate and fal can be configured with a video model in Vercel. Hosted providers can have their own pricing, quotas and content policies; Character Studio does not remove those provider constraints.</p>
        <p><strong>Mobile:</strong> the page is responsive, uses touch-friendly controls, and plays generated video with native mobile controls.</p>
      </section>
    </main>
  );
}
