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
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});
  const [characterSearch, setCharacterSearch] = useState("");
  const [vaultSearch, setVaultSearch] = useState("");
  const [characterSort, setCharacterSort] = useState<"updated" | "name">("updated");
  const [importingCharacter, setImportingCharacter] = useState(false);

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
        } else if (response.status === 401 || response.status === 503) {
          loadLocal();
        } else {
          throw new Error("Cloud data could not be loaded.");
        }
      } catch {
        loadLocal();
        if (!cancelled) setError("Cloud data could not be loaded. Using local browser storage.");
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
    fetch("/api/health", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && data?.providers) setProviderStatus(data.providers);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const selectedProvider = imageProviders.find((item) => item.id === provider) || imageProviders[0];

  useEffect(() => {
    const capability = reference ? "image-edit" : "text-to-image";
    const compatible = selectedProvider.models.find((item) => item.capabilities.includes(capability));
    const currentSupportsMode = selectedProvider.models.some(
      (item) => item.id === model && item.capabilities.includes(capability)
    );
    if (compatible && !currentSupportsMode) setModel(compatible.id);
    if (!compatible) setModel("");
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
  const duplicateCharacter = async () => {
    const copy: Character = {
      ...character,
      id: crypto.randomUUID(),
      name: character.name ? character.name + " Copy" : "Character Copy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCharacter(copy);
    setImageUrl("");
    setReference(null);
    setSaved(false);
    setError("");
    setReferencePath("");
    setCharacters((current) => [copy, ...current.filter((item) => item.id !== copy.id)]);
    if (!cloudMode) {
      localStorage.setItem(CHARACTER_KEY, JSON.stringify([copy, ...characters.filter((item) => item.id !== copy.id)]));
    } else {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...copy, referenceImagePath: null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Could not duplicate character.");
      } else {
        setSaved(true);
      }
    }
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

  const importCharacter = async (file: File) => {
    setImportingCharacter(true);
    setError("");
    try {
      const data = JSON.parse(await file.text()) as {
        character?: Partial<Character>;
      };
      if (!data.character?.name && !data.character?.appearance) {
        throw new Error("The selected file does not contain a valid character.");
      }

      const imported: Character = {
        id: crypto.randomUUID(),
        name: data.character.name || "Imported character",
        age: data.character.age || "",
        appearance: data.character.appearance || "",
        personality: data.character.personality || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (cloudMode) {
        const response = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...imported, referenceImagePath: null }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || "Could not import character.");
        setCharacters((current) => [result.character, ...current]);
        setCharacter(result.character);
        setSaved(true);
      } else {
        const updated = [imported, ...characters];
        setCharacters(updated);
        localStorage.setItem(CHARACTER_KEY, JSON.stringify(updated));
        setCharacter(imported);
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Character import failed.");
    } finally {
      setImportingCharacter(false);
    }
  };

  const exportCharacter = () => {
    const payload = {
      character: {
        id: character.id,
        name: character.name,
        age: character.age,
        appearance: character.appearance,
        personality: character.personality,
        referenceImagePath: character.referenceImagePath || null,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      },
      generations: generations
        .filter((item) => item.characterId === character.id)
        .map(({ imageUrl, ...item }) => item),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (character.name || "character").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() + ".json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteGeneration = async (item: SavedGeneration) => {
    if (!window.confirm("Delete this saved generation?")) return;
    setError("");
    try {
      if (cloudMode) {
        const response = await fetch(`/api/generations/${item.id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete generation.");
      }
      const updated = generations.filter((generation) => generation.id !== item.id);
      setGenerations(updated);
      if (!cloudMode) localStorage.setItem(GENERATION_KEY, JSON.stringify(updated));
      if (imageUrl === item.imageUrl) setImageUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete generation.");
    }
  };

  const downloadGeneration = async (item: SavedGeneration) => {
    try {
      const response = await fetch(item.imageUrl);
      if (!response.ok) throw new Error("Image could not be downloaded.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (item.name || "generation").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() + ".png";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download generation.");
    }
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

  const currentGenerations = generations
    .filter((item) => item.characterId === character.id)
    .filter((item) => {
      const query = vaultSearch.trim().toLowerCase();
      return !query || item.name.toLowerCase().includes(query) || item.prompt.toLowerCase().includes(query);
    });
  const filteredCharacters = [...characters].filter((item) => {
    const query = characterSearch.trim().toLowerCase();
    return !query || item.name.toLowerCase().includes(query) || item.appearance.toLowerCase().includes(query) || item.personality.toLowerCase().includes(query);
  });
  const sortedCharacters = filteredCharacters.sort((a, b) =>
    characterSort === "name"
      ? a.name.localeCompare(b.name)
      : b.updatedAt.localeCompare(a.updatedAt)
  );
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
          <input className="smallInput" value={characterSearch} onChange={(e) => setCharacterSearch(e.target.value)} placeholder="Search characters…" />
          <select value={characterSort} onChange={(e) => setCharacterSort(e.target.value as "updated" | "name")}>
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
          </select>
          <select value={character.id} onChange={(e) => {
            const selected = characters.find((item) => item.id === e.target.value);
            if (selected) selectCharacter(selected);
          }}>
            <option value={character.id}>{character.name || "New character"}</option>
            {sortedCharacters.filter((item) => item.id !== character.id).map((item) => (
              <option key={item.id} value={item.id}>{item.name || "Unnamed character"}</option>
            ))}
          </select>
          <button className="secondary smallButton" onClick={newCharacter}>New character</button>
          {characters.some((item) => item.id === character.id) && <button className="secondary smallButton" onClick={() => void duplicateCharacter()}>Duplicate</button>}
          {characters.some((item) => item.id === character.id) && <button className="secondary smallButton" onClick={exportCharacter}>Export JSON</button>}
          <label className="secondary smallButton" style={{ cursor: importingCharacter ? "wait" : "pointer" }}>
            {importingCharacter ? "Importing…" : "Import JSON"}
            <input type="file" accept="application/json,.json" hidden disabled={importingCharacter} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCharacter(file);
              e.currentTarget.value = "";
            }} />
          </label>}
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
              const nextProvider = imageProviders.find((item) => item.id === next);
              const compatible = nextProvider?.models.find((item) => reference
                ? item.capabilities.includes("image-edit")
                : item.capabilities.includes("text-to-image"));
              setModel(compatible?.id || "");
            }}>
              {imageProviders.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={item.status !== "ready" || providerStatus[item.id] === false}
                >
                  {item.name}{item.status === "planned" ? " · planned" : providerStatus[item.id] === false ? " · not configured" : ""}
                </option>
              ))}
            </select>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={selectedProvider.models.length === 0}>
              {selectedProvider.models
                .filter((item) => reference ? item.capabilities.includes("image-edit") : item.capabilities.includes("text-to-image"))
                .map((item) => (
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
        <div className="previewTop">
          <div><h2>Generation Vault</h2><p className="vaultHint">Saved generations for {character.name || "this character"}.</p></div>
          <div className="toolbarActions">
            <input className="smallInput" value={vaultSearch} onChange={(e) => setVaultSearch(e.target.value)} placeholder="Search generations…" />
            <span>{currentGenerations.length}</span>
          </div>
        </div>
        {currentGenerations.length === 0 ? <div className="emptyVault">No generations for this character yet.</div> : (
          <div className="vaultGrid">{currentGenerations.map((item) => (
            <div className="vaultItem" key={item.id}>
              <button className="vaultPreviewButton" onClick={() => setImageUrl(item.imageUrl)} aria-label={`Open ${item.name}`}>
                <img src={item.imageUrl} alt={item.name} /><strong>{item.name}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>
              </button>
              <div className="vaultItemActions">
                <button className="secondary smallButton" onClick={() => void downloadGeneration(item)}>Download</button>
                <button className="secondary smallButton" onClick={() => void deleteGeneration(item)}>Delete</button>
              </div>
            </div>
          ))}</div>
        )}
      </section>
    </main>
  );
}
