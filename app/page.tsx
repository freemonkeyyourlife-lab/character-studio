"use client";

import { useEffect, useMemo, useState } from "react";
import { imageProviders, type Character } from "@/lib/character";

type SavedGeneration = {
  id: string;
  characterId: string;
  name: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
};

const CHARACTER_KEY = "character-studio-characters";
const GENERATION_KEY = "character-studio-generations";

const blank = (): Character => ({
  id: crypto.randomUUID(),
  name: "",
  age: "",
  appearance: "",
  personality: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function Home() {
  const [character, setCharacter] = useState<Character>(blank);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generations, setGenerations] = useState<SavedGeneration[]>([]);
  const [provider, setProvider] = useState(imageProviders[0].id);\n  const [model, setModel] = useState(imageProviders[0].models[0]?.id || "");
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<File | null>(null);

  useEffect(() => {
    try {
      const storedCharacters = localStorage.getItem(CHARACTER_KEY);
      const storedGenerations = localStorage.getItem(GENERATION_KEY);
      if (storedCharacters) {
        const list = JSON.parse(storedCharacters) as Character[];
        setCharacters(list);
        if (list[0]) setCharacter(list[0]);
      }
      if (storedGenerations) setGenerations(JSON.parse(storedGenerations) as SavedGeneration[]);
    } catch {}
  }, []);

  const selectedProvider = imageProviders.find((item) => item.id === provider) || imageProviders[0];\n\n  const prompt = useMemo(
    () => ["photorealistic portrait", character.appearance, character.age ? `age ${character.age}` : "", character.personality]
      .filter(Boolean).join(", "),
    [character]
  );

  const update = (key: keyof Character, value: string) => {
    setSaved(false);
    setCharacter((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const saveCharacter = () => {
    const next = { ...character, updatedAt: new Date().toISOString() };
    const updated = [next, ...characters.filter((item) => item.id !== next.id)];
    setCharacter(next);
    setCharacters(updated);
    setSaved(true);
    localStorage.setItem(CHARACTER_KEY, JSON.stringify(updated));
  };

  const newCharacter = () => {
    setCharacter(blank());
    setImageUrl("");
    setReference(null);
    setSaved(false);
    setError("");
  };

  const saveGeneration = (item: SavedGeneration) => {
    const updated = [item, ...generations].slice(0, 12);
    setGenerations(updated);
    localStorage.setItem(GENERATION_KEY, JSON.stringify(updated));
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      let response: Response;
      if (reference) {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("reference", reference);
        response = await fetch("/api/generate", { method: "POST", body: form });
      } else {
        response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, model, prompt }),
        });
      }
      const type = response.headers.get("content-type") || "";
      if (!response.ok) {
        const data = type.includes("application/json") ? await response.json() : null;
        throw new Error(data?.error || "Generation failed.");
      }
      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      setImageUrl(nextUrl);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          saveGeneration({
            id: crypto.randomUUID(),
            characterId: character.id,
            name: character.name || "Unnamed character",
            prompt,
            imageUrl: reader.result,
            createdAt: new Date().toISOString(),
          });
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const selectCharacter = (item: Character) => {
    setCharacter(item);
    setImageUrl("");
    setReference(null);
    setSaved(true);
  };

  const currentGenerations = generations.filter((item) => item.characterId === character.id);

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">CHARACTER STUDIO</div>
          <h1>Create your character</h1>
          <p>Characters, references and generations stay organized in one simple workspace.</p>
        </div>
        <div className="status">MVP · Character Vault</div>
      </header>

      <section className="toolbar card">
        <div>
          <strong>Your characters</strong>
          <div className="vaultHint">Stored locally in this browser for now.</div>
        </div>
        <div className="toolbarActions">
          <select value={character.id} onChange={(e) => {
            const selected = characters.find((item) => item.id === e.target.value);
            if (selected) selectCharacter(selected);
          }}>
            <option value={character.id}>{character.name || "New character"}</option>
            {characters.filter((item) => item.id !== character.id).map((item) => (
              <option key={item.id} value={item.id}>{item.name || "Unnamed character"}</option>
            ))}
          </select>
          <button className="secondary smallButton" onClick={newCharacter}>New character</button>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Character details</h2>
          <label>Name<input value={character.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Alex" /></label>
          <label>Age<input value={character.age} onChange={(e) => update("age", e.target.value)} placeholder="e.g. 28" /></label>
          <label>Appearance<textarea value={character.appearance} onChange={(e) => update("appearance", e.target.value)} placeholder="Hair, eyes, build, clothing style..." /></label>
          <label>Personality<textarea value={character.personality} onChange={(e) => update("personality", e.target.value)} placeholder="Calm, confident, funny..." /></label>
          <label>Reference image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setReference(e.target.files?.[0] || null)} /></label>
          {reference && <div className="saved">Reference ready: {reference.name}</div>}
          <div className="providerBox">
            <div><strong>Image model</strong><span>Provider adapter</span></div>
            <select value={provider} onChange={(e) => { const next = e.target.value; setProvider(next); setModel(imageProviders.find((item) => item.id === next)?.models[0]?.id || ""); }}>
              {imageProviders.map((item) => <option key={item.id} value={item.id} disabled={item.status !== "ready"}>{item.name}{item.status === "planned" ? " · planned" : ""}</option>)}
            </select>
          </div>
          <button className="primary" onClick={saveCharacter}>Save character</button>
          {saved && <div className="saved">Character saved.</div>}
        </div>

        <div className="card preview">
          <div className="previewTop"><h2>Preview</h2><span>{generating ? "Generating…" : reference ? "Reference edit" : "Text generation"}</span></div>
          {imageUrl ? <img className="generatedImage" src={imageUrl} alt={character.name || "Generated character"} /> : <div className="avatar"><span>{character.name ? character.name.slice(0, 1).toUpperCase() : "?"}</span></div>}
          <h3>{character.name || "Unnamed character"}</h3>
          <p>{character.appearance || "Your generated image will appear here."}</p>
          <div className="tags">{character.age && <span>Age {character.age}</span>}<span>{provider.toUpperCase()}</span>{reference && <span>REFERENCE</span>}</div>
          <div className="promptBox"><small>Generated prompt</small><div>{prompt || "Add appearance and personality details."}</div></div>
          <button className="secondary" onClick={generate} disabled={generating || !prompt}>{generating ? "Generating image…" : reference ? "Generate from reference" : "Generate image"}</button>
          {error && <div className="error">{error}</div>}
        </div>
      </section>

      <section className="vault card">
        <div className="previewTop"><div><h2>Generation Vault</h2><p className="vaultHint">Saved generations for {character.name || "this character"}.</p></div><span>{currentGenerations.length}</span></div>
        {currentGenerations.length === 0 ? <div className="emptyVault">No generations for this character yet.</div> : (
          <div className="vaultGrid">{currentGenerations.map((item) => (
            <button className="vaultItem" key={item.id} onClick={() => setImageUrl(item.imageUrl)}>
              <img src={item.imageUrl} alt={item.name} /><strong>{item.name}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>
            </button>
          ))}</div>
        )}
      </section>
    </main>
  );
}
