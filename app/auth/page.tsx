 "use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setNotice("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Cloud accounts are not configured yet."); setBusy(false); return; }
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth/confirm" } });
    if (result.error) setError(result.error.message);
    else if (mode === "sign-up") setMessage("Account created. Check your email if confirmation is enabled.");
    else window.location.href = "/";
    setBusy(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("error");
    if (value === "confirmation") setNotice("The confirmation link is invalid or has expired. Request a new confirmation email.");
    if (value === "configuration") setNotice("Cloud authentication is not configured yet.");
  }, []);

  return (
    <main className="shell">
      <section className="card authCard">
        <div className="eyebrow">CHARACTER STUDIO</div>
        <h1>{mode === "sign-in" ? "Sign in" : "Create account"}</h1>
        <p>Keep characters and generations available across devices.</p>
        <form onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
          <button className="primary" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        {error && <div className="error">{error}</div>}
        {message && <div className="saved">{message}</div>}
        {notice && <div className="error">{notice}</div>}
        <button className="secondary authSwitch" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
          {mode === "sign-in" ? "Create a new account" : "I already have an account"}
        </button>
      </section>
    </main>
  );
}
