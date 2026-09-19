"use client";

import { useState } from "react";

type Character = {
  name: string;
  age: string;
  appearance: string;
  personality: string;
};

const initialCharacter: Character = {
  name: "",
  age: "",
  appearance: "",
  personality: "",
};

export default function Home() {
  const [character, setCharacter] = useState(initialCharacter);
  const [saved, setSaved] = useState(false);

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
          <p>Simple workspace for defining a character before connecting image models.</p>
        </div>
        <div className="status">MVP · Step 1</div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Character details</h2>
          <label>Name<input value={character.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Alex" /></label>
          <label>Age<input value={character.age} onChange={(e) => update("age", e.target.value)} placeholder="e.g. 28" /></label>
          <label>Appearance<textarea value={character.appearance} onChange={(e) => update("appearance", e.target.value)} placeholder="Hair, eyes, build, clothing style..." /></label>
          <label>Personality<textarea value={character.personality} onChange={(e) => update("personality", e.target.value)} placeholder="Calm, confident, funny..." /></label>
          <button className="primary" onClick={() => setSaved(true)}>Save character</button>
          {saved && <div className="saved">Character saved locally for this session.</div>}
        </div>

        <div className="card preview">
          <div className="previewTop">
            <h2>Preview</h2>
            <span>Image generation · next</span>
          </div>
          <div className="avatar">
            <span>{character.name ? character.name.slice(0, 1).toUpperCase() : "?"}</span>
          </div>
          <h3>{character.name || "Unnamed character"}</h3>
          <p>{character.appearance || "Your character preview will appear here."}</p>
          <div className="tags">
            {character.age && <span>Age {character.age}</span>}
            {character.personality && <span>{character.personality}</span>}
          </div>
        </div>
      </section>
    </main>
  );
}
