"use client";

import { useEffect, useMemo, useState } from "react";
import { imageProviders, type Character } from "@/lib/character";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SavedGeneration = {
  id: string;
  characterId: string;
  name: string;
  prompt: string;
  imageUrl: string;
  imagePath?: string;
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
  const [provider, setProvider] = useState(imageProviders[0].id);
  const [model, setModel] = useState(imageProviders[0].models[0]?.id || "");
  const [imageUrl, setImageUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [referencePath, setReferencePath] = useState("");
  const [cloudMode, setCloudMode] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [migrationAvailable, setMigrationAvailable] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/characters", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          const cloudCharacters = (data.characters || []) as Character[];
          const generationResponse = await fetch("/api/generations", { cache: "no-store" });
          const generationData = generationResponse.ok ? await generationResponse.json() : { generations: [] };

          if (cancelled) return;
          setCloudMode(true);
          try {
            setMigrationAvailable(Boolean(localStorage.getItem(CHARACTER_KEY)));
          } catch {}
          try {
            const supabase = createSupabaseBrowserClient();
            const session = supabase ? await supabase.auth.getSession() : { data: { session: null } };
            setAuthEmail(session.data.session?.user.email || "");
          } catch {}
          setCharacters(cloudCharacters);
          setGenerations(generationData.generations || []);
          if (cloudCharacters[0]) {
            setCharacter(cloudCharacters[0]);
            setReferencePath((cloudCharacters[0] as Character & { referenceImagePath?: string }).referenceImagePath || "");
          }
        } else {
          loadLocal();
        }
      } catch {
        loadLocal();
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    const loadLocal = () => {
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
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const selectedProvider = imageProviders.find((item) => item.id === provider) || imageProviders[0];

  useEffect(() => {
    const firstModel = selectedProvider.models.find((item) => reference ? item.capabilities.includes("image-edit") : item.capabilities.includes("text-to-image"));
    if (firstModel && !selectedProvider.models.some((item) => item.id === model)) setModel(firstModel.id);
  }, [selectedProvider, reference, model]);

  const prompt = useMemo(
    () => [
      "photorealistic portrait",
      character.appearance,
      character.age ? `age ${character.age}` : "",
      character.personality,
    ].filter(Boolean).join(", "),
    [character]
  );

  const update = (key: keyof Character, value: string) => {
    setSaved(false);
    setCharacter((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const saveCharacter = async (pathOverride?: string) => {
    const next = { ...character, updatedAt: new Date().toISOString() };
    const nextPath = pathOverride ?? referencePath;

    try {
      if (cloudMode) {
        const response = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...next,
            referenceImagePath: nextPath || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not save character.");
        const savedCharacter = data.character as Character;
        setCharacter({ ...next, ...savedCharacter, referenceImagePath: nextPath, referenceImage: character.referenceImage } as Character);
        setCharacters((current) => [savedCharacter, ...current.filter((item) => item.id !== savedCharacter.id)]);
      } else {
        const updated = [next, ...characters.filter((item) => item.id !== next.id)];
        setCharacters(updated);
        localStorage.setItem(CHARACTER_KEY, JSON.stringify(updated));
      }
      setReferencePath(nextPath);
      setSaved(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save character.");
      return false;
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const response = await fetch("/api/storage/upload", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Image upload failed.");
    return data as { path: string; signedUrl: string };
  };

  const newCharacter = () => {
    setCharacter(blank());
    setImageUrl("");
    setReference(null);
    setReferencePath("");
    setSaved(false);
    setError("");
  };

  const saveGenerationLocal = (item: SavedGeneration) => {
    const updated = [item, ...generations].slice(0, 12);
    setGenerations(updated);
    localStorage.setItem(GENERATION_KEY, JSON.stringify(updated));
  };

  const migrateLocalData = async () => {
    if (!cloudMode || migrating) return;

    setMigrating(true);
    setError("");

    try {
      const localCharacters = JSON.parse(localStorage.getItem(CHARACTER_KEY) || "[]") as Character[];
      const localGenerations = JSON.parse(localStorage.getItem(GENERATION_KEY) || "[]") as SavedGeneration[];

      for (const item of localCharacters) {
        let referenceImagePath = item.referenceImagePath || "";
        if (!referenceImagePath && item.referenceImage) {
          const response = await fetch(item.referenceImage);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], `reference-${item.id}.png`, { type: blob.type || "image/png" });
            referenceImagePath = (await uploadFile(file, "references")).path;
          }
        }

        const response = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            name: item.name,
            age: item.age,
            appearance: item.appearance,
            personality: item.personality,
            referenceImagePath: referenceImagePath || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || `Could not import ${item.name || "character"}.`);
      }

      for (const item of localGenerations) {
        if (!item.imageUrl.startsWith("data:")) continue;

        const response = await fetch(item.imageUrl);
        if (!response.ok) continue;
        const blob = await response.blob();
        const file = new File([blob], `generation-${item.id}.png`, { type: blob.type || "image/png" });
        const uploaded = await uploadFile(file, "generations");

        const generationResponse = await fetch("/api/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            characterId: item.characterId,
            name: item.name,
            prompt: item.prompt,
            imagePath: uploaded.path,
          }),
        });
        const generationData = await generationResponse.json();
        if (!generationResponse.ok && !String(generationData?.error || "").toLowerCase().includes("duplicate")) {
          throw new Error(generationData?.error || "Could not import generation.");
        }
      }

      const charactersResponse = await fetch("/api/characters", { cache: "no-store" });
      const charactersData = await charactersResponse.json();
      const generationsResponse = await fetch("/api/generations", { cache: "no-store" });
      const generationsData = await generationsResponse.json();
      setCharacters(charactersData.characters || []);
      setGenerations(generationsData.generations || []);
      setMigrationAvailable(false);
      localStorage.removeItem(CHARACTER_KEY);
      localStorage.removeItem(GENERATION_KEY);
      if (charactersData.characters?.[0]) selectCharacter(charactersData.characters[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Local data import failed.");
    } finally {
      setMigrating(false);
    }
  };


  const generate = async () => {
    setGenerating(true);
    setError("");

    try {
      let uploadedReferencePath = referencePath;
      if (cloudMode && reference) {
        const uploaded = await uploadFile(reference, "references");
        uploadedReferencePath = uploaded.path;
        setReferencePath(uploaded.path);
        await saveCharacter(uploaded.path);
      }

      let response: Response;
      if (reference) {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("model", model);
        form.append("provider", provider);
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
      if (cloudMode) {
        const generatedFile = new File([blob], `generation-${crypto.randomUUID()}.png`, { type: blob.type || "image/png" });
        const uploaded = await uploadFile(generatedFile, "generations");
        setImageUrl(uploaded.signedUrl);

        const generationResponse = await fetch("/api/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            characterId: character.id,
            name: character.name || "Unnamed character",
            prompt,
            imagePath: uploaded.path,
          }),
        });
        const generationData = await generationResponse.json();
        if (!generationResponse.ok) throw new Error(generationData?.error || "Could not save generation.");
        setGenerations((current) => [generationData.generation, ...current].slice(0, 100));
      } else {
        const nextUrl = URL.createObjectURL(blob);
        setImageUrl(nextUrl);

        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            saveGenerationLocal({
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
      }
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
    setReferencePath(item.referenceImagePath || "");
    setSaved(true);
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const deleteCharacter = async () => {
    if (!character.id || !window.confirm("Delete this character and its saved generations?")) return;

    setError("");
    try {
      if (cloudMode) {
        const response = await fetch(`/api/characters/${character.id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete character.");
      } else {
        const next = characters.filter((item) => item.id !== character.id);
        setCharacters(next);
        localStorage.setItem(CHARACTER_KEY, JSON.stringify(next));
        const nextGenerations = generations.filter((item) => item.characterId !== character.id);
        setGenerations(nextGenerations);
        localStorage.setItem(GENERATION_KEY, JSON.stringify(nextGenerations));
      }

      const remaining = characters.filter((item) => item.id !== character.id);
      setCharacters(remaining);
      setGenerations((current) => current.filter((item) => item.characterId !== character.id));
      if (remaining[0]) {
        selectCharacter(remaining[0]);
      } else {
        newCharacter();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete character.");
    }
  };

  const currentGenerations = generations.filter((item) => item.characterId === character.id);
  const displayReference = character.referenceImage || "";

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">CHARACTER STUDIO</div>
          <h1>Create your character</h1>
          <p>Characters, references and generations stay organized in one simple workspace.</p>
        </div>
        <div className="headerActions">
          <div className="status">{cloudMode ? `CLOUD · SYNCED${authEmail ? ` · ${authEmail}` : ""}` : "LOCAL · BROWSER"}</div>
          {authChecked && cloudMode && <button className="secondary smallButton" onClick={signOut}>Sign out</button>}
          {authChecked && !cloudMode && <a className="secondary smallButton" href="/auth">Sign in</a>}
          {authChecked && cloudMode && migrationAvailable && (
            <button className="secondary smallButton" onClick={() => void migrateLocalData()} disabled={migrating}>
              {migrating ? "Importing…" : "Import local data"}
            </button>
          )}
        </div>
      </header>

      <section className="toolbar card">
        <div>
          <strong>Your characters</strong>
          <div className="vaultHint">{cloudMode ? "Synced to your account." : "Stored locally in this browser."}</div>
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
          <label>Reference image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; setReference(file); if (file) setCharacter((current) => ({ ...current, referenceImage: URL.createObjectURL(file) })); }} /></label>
          {displayReference && <img className="referencePreview" src={displayReference} alt="Character reference" />}
          {reference && <div className="saved">Reference ready: {reference.name}</div>}

          <div className="providerBox">
            <div><strong>Image model</strong><span>{selectedProvider.description}</span></div>
            <select value={provider} onChange={(e) => {
              const next = e.target.value;
              setProvider(next);
              setModel(imageProviders.find((item) => item.id === next)?.models[0]?.id || "");
            }}>
              {imageProviders.map((item) => (
                <option key={item.id} value={item.id} disabled={item.status !== "ready"}>
                  {item.name}{item.status === "planned" ? " · planned" : ""}
                </option>
              ))}
            </select>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={selectedProvider.models.length === 0}>
              {selectedProvider.models.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="toolbarActions">
            <button className="primary" onClick={() => void saveCharacter()}>Save character</button>
            {characters.some((item) => item.id === character.id) && (
              <button className="secondary smallButton" onClick={() => void deleteCharacter()}>Delete</button>
            )}
          </div>
          {saved && <div className="saved">Character saved.</div>}
        </div>

        <div className="card preview">
          <div className="previewTop"><h2>Preview</h2><span>{generating ? "Generating…" : reference ? "Reference edit" : "Text generation"}</span></div>
          {imageUrl ? <img className="generatedImage" src={imageUrl} alt={character.name || "Generated character"} /> : <div className="avatar"><span>{character.name ? character.name.slice(0, 1).toUpperCase() : "?"}</span></div>}
          <h3>{character.name || "Unnamed character"}</h3>
          <p>{character.appearance || "Your generated image will appear here."}</p>
          <div className="tags">{character.age && <span>Age {character.age}</span>}<span>{provider.toUpperCase()}</span>{reference && <span>REFERENCE</span>}</div>
          <div className="promptBox"><small>Generated prompt</small><div>{prompt || "Add appearance and personality details."}</div></div>
          <button className="secondary" onClick={() => void generate()} disabled={generating || !prompt}>{generating ? "Generating image…" : reference ? "Generate from reference" : "Generate image"}</button>
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
