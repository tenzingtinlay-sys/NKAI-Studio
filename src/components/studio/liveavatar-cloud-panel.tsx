import { useEffect, useMemo, useRef, useState } from "react";
import { LiveAvatarSession, SessionEvent, SessionState } from "@heygen/liveavatar-web-sdk";
import { chatWithPuter } from "@/lib/puter-ai";

type LiveAvatar = {
  id: string;
  name?: string;
  preview_url?: string;
  type?: string;
  gender?: string;
  tags?: string[] | string;
  description?: string;
  default_voice?: { id?: string; name?: string };
};
type LiveVoice = {
  id: string;
  name?: string;
  language?: string;
  gender?: string;
  tags?: string[] | string;
  description?: string;
};

const LANGUAGES = [
  ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"],
  ["bn", "Bengali"], ["mr", "Marathi"], ["pa", "Punjabi"], ["kn", "Kannada"],
  ["ml", "Malayalam"], ["ur", "Urdu"], ["ar", "Arabic"], ["es", "Spanish"],
  ["fr", "French"], ["de", "German"], ["pt", "Portuguese"], ["it", "Italian"],
  ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"], ["id", "Indonesian"],
  ["vi", "Vietnamese"], ["th", "Thai"], ["nl", "Dutch"], ["pl", "Polish"],
] as const;

export function LiveAvatarCloudPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const [avatars, setAvatars] = useState<LiveAvatar[]>([]);
  const [voices, setVoices] = useState<LiveVoice[]>([]);
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("en");
  const [gender, setGender] = useState("all");
  const [tone, setTone] = useState("warm");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Load your available LiveAvatar catalogue to begin.");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "you" | "avatar"; text: string }[]>([]);

  const selectedAvatar = avatars.find((item) => item.id === avatarId);
  const selectedVoice = voices.find((item) => item.id === voiceId);
  const filteredAvatars = useMemo(() => avatars.filter((item) => {
    const metadata = [item.name, item.description, item.tags, item.gender, item.type].flat().filter(Boolean).join(" ").toLowerCase();
    const queryMatches = metadata.includes(search.trim().toLowerCase());
    const avatarGender = String(item.gender ?? "").toLowerCase();
    const genderMatches = gender === "all" || (gender === "female" ? /female|woman|girl/i.test(avatarGender) : gender === "male" ? /male|man|boy/i.test(avatarGender) : !avatarGender);
    return queryMatches && genderMatches;
  }), [avatars, gender, search]);

  useEffect(() => () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) void session.stop().catch(() => undefined);
  }, []);

  // Opening LiveAvatar immediately loads the real account catalogue.
  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCatalog() {
    setLoadingCatalog(true);
    setError("");
    setStatus("Loading public and account avatars and available voices…");
    try {
      const response = await fetch("/api/liveavatar/catalog", { headers: { Accept: "application/json" } });
      const payload = await response.json() as { avatars?: LiveAvatar[]; voices?: LiveVoice[]; error?: string; sandbox?: boolean; sandbox_avatar_id?: string };
      if (!response.ok || !Array.isArray(payload.avatars) || !Array.isArray(payload.voices)) {
        throw new Error(payload.error || "Could not load the LiveAvatar catalogue.");
      }
      setAvatars(payload.avatars);
      setVoices(payload.voices);
      const nextAvatar = payload.sandbox
        ? payload.avatars.find((item) => item.id === payload.sandbox_avatar_id)
        : payload.avatars.find((item) => item.id === avatarId) ?? payload.avatars[0];
      setAvatarId(nextAvatar?.id ?? "");
      setVoiceId((current) => payload.voices!.some((item) => item.id === current) ? current : "");
      setStatus(payload.avatars.length + " available avatars · " + payload.voices.length + " public voices" + (payload.sandbox ? " · sandbox" : ""));
      if (!payload.avatars.length) {
        setError("The API key worked, but the account returned no selectable avatars.");
      } else if (payload.sandbox && !nextAvatar) {
        setError("LiveAvatar sandbox mode only permits the Wayne test avatar, but it was not returned by the catalogue. Check the API key's sandbox access or set LIVEAVATAR_IS_SANDBOX=false only if you intend to use production sessions.");
      } else if (!sessionRef.current && nextAvatar) {
        // Match the provider's sandbox restriction before creating a session.
        void connect(nextAvatar.id, nextAvatar);
      }
    } catch (cause) {
      setStatus("Catalogue unavailable");
      setError(cause instanceof Error ? cause.message : "Could not load the LiveAvatar catalogue.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function connect(targetAvatarId = avatarId, targetAvatarOverride?: LiveAvatar) {
    if (!targetAvatarId) {
      setError("Load the catalogue and choose an avatar first.");
      return;
    }
    const targetAvatar = targetAvatarOverride ?? avatars.find((item) => item.id === targetAvatarId);
    setBusy(true);
    setError("");
    setStatus("Requesting a secure session token…");
    try {
      const response = await fetch("/api/liveavatar/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "FULL", avatar_id: targetAvatarId, voice_id: voiceId || targetAvatar?.default_voice?.id || "", language, tone }),
      });
      const payload = await response.json() as { session_token?: string; sandbox?: boolean; error?: string };
      if (!response.ok || !payload.session_token) throw new Error(payload.error || "Could not create a LiveAvatar session.");
      const session = new LiveAvatarSession(payload.session_token, { autoKeepAlive: true, voiceChat: { defaultMuted: true } });
      sessionRef.current = session;
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        setStatus(state === SessionState.CONNECTED ? "Connected · " + (selectedAvatar?.name || "LiveAvatar") : String(state).replaceAll("_", " "));
      });
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) session.attach(videoRef.current);
        setStatus("Live avatar stream ready · " + (selectedAvatar?.name || "LiveAvatar"));
      });
      await session.start();
      if (videoRef.current) session.attach(videoRef.current);
      setStatus("Session started · waiting for avatar stream");
    } catch (cause) {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) await session.stop().catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "LiveAvatar connection failed.");
      setStatus("Not connected");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try { await session.stop(); } catch { /* best-effort session cleanup */ }
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setStatus("Disconnected");
  }

  async function sendMessage(input = message) {
    const text = input.trim();
    const session = sessionRef.current;
    if (!text || !session || session.state !== SessionState.CONNECTED || thinking) return;
    setThinking(true);
    setError("");
    setMessage("");
    const recent = history.slice(-8).map((item) => ({
      role: (item.role === "you" ? "user" : "assistant") as "user" | "assistant",
      text: item.text,
    }));
    setHistory((items) => [...items, { role: "you", text }]);
    try {
      let reply = "";
      try {
        const response = await fetch("/api/avatar-ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: text, language, history: recent }),
        });
        const payload = await response.json() as { reply?: string; error?: string; detail?: string };
        if (!response.ok || !payload.reply?.trim()) {
          throw new Error(payload.error || payload.detail || "NKAI AI did not return a reply.");
        }
        reply = payload.reply.trim();
      } catch (gpuError) {
        try {
          reply = await chatWithPuter(text, recent, "openai/gpt-5.5");
          setStatus("AI reply via Puter.js · speaking through LiveAvatar");
        } catch {
          throw gpuError;
        }
      }
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.state !== SessionState.CONNECTED) {
        throw new Error("The live avatar disconnected before it could speak the reply.");
      }
      await currentSession.repeat(reply);
      setHistory((items) => [...items, { role: "avatar", text: reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate or speak the reply.");
    } finally {
      setThinking(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Use Chrome or type your message.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setVoiceListening(true); setError(""); };
    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (transcript) void sendMessage(transcript);
    };
    recognition.onerror = (event: any) => setError("Microphone input failed: " + String(event.error || "unknown error") + ".");
    recognition.onend = () => setVoiceListening(false);
    try { recognition.start(); } catch {
      setVoiceListening(false);
      setError("Could not start microphone input. Check browser microphone permission.");
    }
  }

  const card: React.CSSProperties = { background: "var(--mf-card, #111827)", border: "1px solid var(--mf-border, #273244)", borderRadius: 14, padding: 18, minWidth: 0 };
  const label: React.CSSProperties = { display: "grid", gap: 7, color: "var(--mf-muted, #9ca3af)", fontSize: 12, fontWeight: 600 };
  const field: React.CSSProperties = { width: "100%", minWidth: 0, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--mf-border, #273244)", background: "var(--mf-input, #0b1220)", color: "var(--mf-text, #f8fafc)", font: "inherit" };
  const button: React.CSSProperties = { borderRadius: 10, padding: "11px 14px", cursor: "pointer", border: "1px solid var(--mf-border, #344256)", color: "var(--mf-text, #f8fafc)", background: "var(--mf-card, #172033)", fontWeight: 600 };
  const primary: React.CSSProperties = { ...button, background: "var(--mf-primary, #8b5cf6)", borderColor: "transparent", color: "#fff" };

  return <section style={{ display: "grid", gap: 16, color: "var(--mf-text, #f8fafc)" }}>
    <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div><span style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 11, letterSpacing: ".16em", fontWeight: 700 }}>HEYGEN LIVEAVATAR</span><h3 style={{ fontSize: 23, margin: "5px 0" }}>Choose your live conversation partner</h3><p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 13, margin: 0 }}>Real-time hosted avatar streaming inside NKAI Studio.</p></div>
      <button style={primary} disabled={loadingCatalog || busy} onClick={() => void loadCatalog()}>{loadingCatalog ? "Loading catalogue…" : "Load avatars & voices"}</button>
    </header>
    <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 12 }}>
      <label style={label}>Search avatars<input style={field} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or description" /></label>
      <label style={label}>Avatar gender<select style={field} value={gender} onChange={(event) => setGender(event.target.value)}><option value="all">All / not specified</option><option value="female">Female</option><option value="male">Male</option><option value="unknown">Unknown only</option></select></label>
      <label style={label}>Conversation tone<select style={field} value={tone} onChange={(event) => setTone(event.target.value)}><option value="warm">Warm & supportive</option><option value="professional">Professional</option><option value="calm">Calm & thoughtful</option><option value="energetic">Energetic & upbeat</option><option value="friendly">Friendly & casual</option></select></label>
      <label style={label}>Language<select style={field} value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <label style={label}>Avatar<select style={field} value={avatarId} onChange={(event) => { const id = event.target.value; setAvatarId(id); if (id) { const selected = avatars.find((item) => item.id === id); if (selected) { void (async () => { await disconnect(); await connect(id, selected); })(); } } }}><option value="">Select an avatar…</option>{filteredAvatars.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}{item.gender ? " · " + item.gender : ""}</option>)}</select><small style={{ color: "var(--mf-muted, #9ca3af)", fontWeight: 400 }}>{filteredAvatars.length} matching avatars · selecting one starts its live session</small></label>
      <label style={label}>Voice<select style={field} value={voiceId} onChange={(event) => setVoiceId(event.target.value)}><option value="">Avatar default{selectedAvatar?.default_voice?.name ? " · " + selectedAvatar.default_voice.name : ""}</option>{voices.filter((voice) => !voice.language || voice.language.toLowerCase().startsWith(language) || voice.language.toLowerCase().startsWith(language + "-") || voice.language.toLowerCase().includes(LANGUAGES.find(([code]) => code === language)?.[1].toLowerCase() || language)).map((voice) => <option key={voice.id} value={voice.id}>{voice.name || voice.id}{voice.language ? " · " + voice.language : ""}</option>)}</select><small style={{ color: "var(--mf-muted, #9ca3af)", fontWeight: 400 }}>{selectedVoice?.name || selectedAvatar?.default_voice?.name || "Provider default voice"}</small></label>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 14 }}>
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}><div><b>{selectedAvatar?.name || "LiveAvatar preview"}</b><p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 12, margin: "4px 0 0" }}>{selectedAvatar?.type || "Hosted digital human"} · {language.toUpperCase()} · {tone}</p></div><span style={{ fontSize: 11, color: "var(--mf-muted, #9ca3af)" }}>{status}</span></div>
        {selectedAvatar?.preview_url && !sessionRef.current && <img src={selectedAvatar.preview_url} alt={selectedAvatar.name || "Selected avatar"} style={{ display: "block", width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />}
        <video ref={videoRef} autoPlay playsInline controls style={{ width: "100%", aspectRatio: "16 / 9", background: "#030712", borderRadius: 10, display: "block" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <button style={primary} disabled={busy || !!sessionRef.current || !avatarId} onClick={() => void connect()}>{busy ? "Connecting…" : "Start live video"}</button>
          <button style={button} disabled={busy || !sessionRef.current} onClick={() => void disconnect()}>End session</button>
        </div>
        <p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 12, lineHeight: 1.6 }}>LiveAvatar is hosted by HeyGen and may consume account credits. Your API key remains on the server. Voice input uses browser speech recognition; AI replies are spoken by the connected live avatar.</p>
      </section>
      <section style={card}>
        <b>Talk to your avatar</b>
        <div aria-live="polite" style={{ minHeight: 180, maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
          {history.length === 0 && <p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 13 }}>Start a session, then speak or type. NKAI generates the reply and the live avatar speaks it.</p>}
          {history.map((item, index) => <div key={index} style={{ alignSelf: item.role === "you" ? "flex-end" : "flex-start", padding: 10, borderRadius: 10, background: item.role === "you" ? "#1d4ed8" : "#263244", maxWidth: "90%", overflowWrap: "anywhere" }}><small>{item.role === "you" ? "You" : "Avatar"}</small><div>{item.text}</div></div>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} style={{ display: "flex", gap: 8 }}>
          <input style={{ ...field, flex: 1 }} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder={thinking ? "AI is thinking; avatar will speak shortly…" : "Write or dictate a message…"} aria-label="Message to LiveAvatar" />
          <button type="button" style={button} disabled={busy || thinking || !sessionRef.current} onClick={startVoiceInput}>{voiceListening ? "Listening…" : "🎙 Voice"}</button>
          <button type="submit" style={button} disabled={!message.trim() || busy || thinking || !sessionRef.current}>{thinking ? "Thinking…" : "Send"}</button>
        </form>
        {error && <p role="alert" style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </section>
    </div>
  </section>;
}
