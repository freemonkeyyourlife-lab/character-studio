"use client";

import { useMemo, useState } from "react";
import { imageProviders, type Character } from "@/lib/character";

const initialCharacter: Character = { name: "", age: "", appearance: "", personality: "" };

export default function Home() {
  const [character, setCharacter] = useState(initialCharacter);
  const [saved, setSaved] = useState(false);
  const [provider, setProvider] = useState(imageProviders[0].id);

  const prompt = useMemo(() => [character.appearance, character.age ? `age ${character.age}` : "", character.personality].filter(Boolean).join(", "), [character]);

  const update = (key: keyof Character, value: string) => {
    setSaved(false);
    setCharacter((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">CHARACTER STUDIO</div>
          <h1>Create your character</h1>
          <p>Define the character once, then connect image models without changing the interface.</p>
        </div>
        <div className="status">MVP · Step 2</div>
      </header>
      <section className="grid">
        <div className="card">
          <h2>Character details</h2>
          <label>Name<input value={character.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Alex" /></label>
          <label>Age<input value={character.age} onChange={(e) => update("age", e.target.value)} placeholder="e.g. 28" /></label>
          <label>Appearance<textarea value={character.appearance} onChange={(e) => update("appearance", e.target.value)} placeholder="Hair, eyes, build, clothing style..." /></label>
          <label>Personality<textarea value={character.personality} onChange={(e) => update("personality", e.target.value)} placeholder="Calm, confident, funny..." /></label>
          <div className="providerBox">
            <div><strong>Image model</strong><span>Provider adapter</span></div>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {imageProviders.map((item) => <option key={item.id} value={item.id}>{item.name} · connection next</option>)}
            </select>
          </div>
          <button className="primary" onClick={() => setSaved(true)}>Save character</button>
          {saved && <div className="saved">Character saved for this session.</div>}
        </div>
        <div className="card preview">
          <div className="previewTop"><h2>Preview</h2><span>Generation pipeline</span></div>
          <div className="avatar"><span>{character.name ? character.name.slice(0, 1).toUpperCase() : "?"}</span></div>
          <h3>{character.name || "Unnamed character"}</h3>
          <p>{character.appearance || "Your generated image will appear here once a provider is connected."}</p>
          <div className="tags">{character.age && <span>Age {character.age}</span>}<span>{provider.toUpperCase()}</span></div>
          <div className="promptBox"><small>Generated prompt</small><div>{prompt || "Add appearance and personality details to build the prompt."}</div></div>
          <button className="secondary" disabled>Generate image · provider connection next</button>
        </div>
      </section>
    </main>
  );
}
