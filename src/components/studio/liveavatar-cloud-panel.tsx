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
type Tab = "setup" | "chat";

const LANGUAGES = [
  ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"],
  ["bn", "Bengali"], ["mr", "Marathi"], ["pa", "Punjabi"], ["kn", "Kannada"],
  ["ml", "Malayalam"], ["ur", "Urdu"], ["ar", "Arabic"], ["es", "Spanish"],
  ["fr", "French"], ["de", "German"], ["pt", "Portuguese"], ["it", "Italian"],
  ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"], ["id", "Indonesian"],
  ["vi", "Vietnamese"], ["th", "Thai"], ["nl", "Dutch"], ["pl", "Polish"],
] as const;

const TONES = [
  ["warm", "Warm & supportive"],
  ["professional", "Professional"],
  ["calm", "Calm & thoughtful"],
  ["energetic", "Energetic & upbeat"],
  ["friendly", "Friendly & casual"],
] as const;

const TOPICS = [
  { id: "career", label: "Career growth", prompt: "Help me think through my career goals and next steps." },
  { id: "interview", label: "Interview practice", prompt: "Run a realistic mock interview with me and give constructive feedback." },
  { id: "leadership", label: "Leadership", prompt: "Discuss a practical leadership challenge with me." },
  { id: "communication", label: "Communication", prompt: "Help me communicate more clearly and confidently." },
  { id: "problem-solving", label: "Problem solving", prompt: "Help me break down a difficult problem into manageable steps." },
  { id: "planning", label: "Daily planning", prompt: "Help me prioritise my tasks and make a realistic plan for today." },
  { id: "learning", label: "Learning & skills", prompt: "Help me identify a skill to improve and create a learning plan." },
  { id: "open", label: "Open conversation", prompt: "Let's have an open conversation. Ask me what I'd like to discuss." },
] as const;

function initials(name?: string) {
  const parts = String(name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export function LiveAvatarCloudPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camRef = useRef<HTMLVideoElement | null>(null);
  const camStream = useRef<MediaStream | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const [avatars, setAvatars] = useState<LiveAvatar[]>([]);
  const [voices, setVoices] = useState<LiveVoice[]>([]);
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("en");
  const [gender, setGender] = useState<"all" | "female" | "male">("all");
  const [tone, setTone] = useState("warm");
  const [topicId, setTopicId] = useState("open");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("setup");
  const [status, setStatus] = useState("Loading the avatar catalogue…");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "you" | "avatar"; text: string }[]>([]);

  const selectedAvatar = avatars.find((item) => item.id === avatarId);
  const selectedVoice = voices.find((item) => item.id === voiceId);
  const languageName = LANGUAGES.find(([code]) => code === language)?.[1] || language;
  const toneName = TONES.find(([code]) => code === tone)?.[1] || tone;

  const filteredAvatars = useMemo(() => avatars.filter((item) => {
    const metadata = [item.name, item.description, item.tags, item.gender, item.type].flat().filter(Boolean).join(" ").toLowerCase();
    const queryMatches = metadata.includes(search.trim().toLowerCase());
    const avatarGender = String(item.gender ?? "").toLowerCase();
    const genderMatches = gender === "all" || (gender === "female" ? /female|woman|girl/i.test(avatarGender) : /^(male|man|boy)/i.test(avatarGender));
    return queryMatches && genderMatches;
  }), [avatars, gender, search]);

  useEffect(() => () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) void session.stop().catch(() => undefined);
    camStream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCatalog() {
    setLoadingCatalog(true);
    setError("");
    setStatus("Loading avatars and voices…");
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
      setStatus(payload.avatars.length + " avatars · " + payload.voices.length + " voices" + (payload.sandbox ? " · sandbox" : ""));
      if (!payload.avatars.length) {
        setError("The API key worked, but the account returned no selectable avatars.");
      } else if (payload.sandbox && !nextAvatar) {
        setError("Sandbox mode only permits the Wayne test avatar, but it was not returned by the catalogue. Check the API key's sandbox access, or set LIVEAVATAR_IS_SANDBOX=false if you intend to use production sessions.");
      }
    } catch (cause) {
      setStatus("Catalogue unavailable");
      setError(cause instanceof Error ? cause.message : "Could not load the LiveAvatar catalogue.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function connect() {
    if (!avatarId) {
      setError("Choose an avatar first.");
      return;
    }
    const label = selectedAvatar?.name || "LiveAvatar";
    setBusy(true);
    setError("");
    setStatus("Requesting a secure session…");
    try {
      const response = await fetch("/api/liveavatar/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "FULL", avatar_id: avatarId, voice_id: voiceId || selectedAvatar?.default_voice?.id || "", language, tone }),
      });
      const payload = await response.json() as { session_token?: string; sandbox?: boolean; error?: string };
      if (!response.ok || !payload.session_token) throw new Error(payload.error || "Could not create a LiveAvatar session.");
      const session = new LiveAvatarSession(payload.session_token, { autoKeepAlive: true, voiceChat: { defaultMuted: true } });
      sessionRef.current = session;
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        if (state === SessionState.CONNECTED) setStatus("Connected · " + label);
        else setStatus(String(state).replaceAll("_", " "));
        if (String(state).toUpperCase().includes("DISCONNECT")) setLive(false);
      });
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) session.attach(videoRef.current);
        setLive(true);
        setTab("chat");
        setStatus("Live · " + label);
      });
      await session.start();
      if (videoRef.current) session.attach(videoRef.current);
      setLive(true);
      setTab("chat");
      setStatus("Session started · waiting for the avatar stream");
    } catch (cause) {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) await session.stop().catch(() => undefined);
      setLive(false);
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
    setLive(false);
    setStatus("Session ended");
  }

  async function toggleCam() {
    if (camStream.current) {
      camStream.current.getTracks().forEach((track) => track.stop());
      camStream.current = null;
      if (camRef.current) camRef.current.srcObject = null;
      setCamOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      camStream.current = stream;
      if (camRef.current) camRef.current.srcObject = stream;
      setCamOn(true);
    } catch {
      setError("Camera permission was denied.");
    }
  }

  async function sendMessage(input = message) {
    const text = input.trim();
    if (!text || thinking) return;
    setThinking(true);
    setError("");
    setMessage("");
    setTab("chat");
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
          reply = await chatWithPuter(text, recent, "gpt-5.6-luna");
          setStatus("Reply via Puter.js · speaking through the avatar");
        } catch {
          throw gpuError;
        }
      }
      const currentSession = sessionRef.current;
      if (currentSession && currentSession.state === SessionState.CONNECTED) {
        currentSession.repeat(reply);
        setStatus("Speaking · " + (selectedAvatar?.name || "LiveAvatar"));
      } else {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.lang = language;
          window.speechSynthesis.speak(utterance);
        }
        setStatus("Avatar offline · browser voice fallback");
      }
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

  const badge = live ? "live" : busy ? "busy" : "";
  const badgeText = live ? "Live" : busy ? "Connecting" : "Offline";

  return (
    <div className="lm">
      <style>{CSS}</style>
      <div className="lm-grid">
        <section className="lm-stage" aria-label="Live call">
          <div className="lm-stage-head">
            <div>
              <h2>{selectedAvatar?.name || "Choose an avatar"}</h2>
              <div className="lm-chips">
                <span>{languageName}</span>
                <span>{toneName}</span>
                {selectedAvatar?.gender && <span>{selectedAvatar.gender}</span>}
              </div>
            </div>
            <span className={"lm-badge " + badge}>{badgeText}</span>
          </div>

          <div className="lm-video-pair">
            <section className="lm-video-card" aria-label="AI avatar video">
              <div className="lm-video-label"><span>AI AVATAR</span><span className={live ? "connected" : ""}>{live ? "LIVE" : "WAITING"}</span></div>
              <div className="lm-video">
                <video ref={videoRef} autoPlay playsInline />
                {!live && <div className="lm-ph"><b>{initials(selectedAvatar?.name)}</b><span>{busy ? "Connecting to the avatar…" : "Choose an avatar and start the live session."}</span></div>}
              </div>
              <p className="lm-video-caption">{selectedAvatar?.name || "No avatar selected"}</p>
            </section>
            <section className="lm-video-card" aria-label="Your camera video">
              <div className="lm-video-label"><span>YOUR CAMERA</span><span className={camOn ? "connected" : ""}>{camOn ? "CAMERA ON" : "CAMERA OFF"}</span></div>
              <div className={"lm-video lm-user-video" + (camOn ? " camera-on" : "")}>
                <video ref={camRef} autoPlay muted playsInline />
                {!camOn && <div className="lm-ph lm-user-ph"><b><span aria-hidden="true">◎</span></b><span>Your camera preview will appear here.</span><small>Choose “Show my camera” to enable it.</small></div>}
                {camOn && <span className="lm-camera-live">● Camera preview</span>}
              </div>
              <p className="lm-video-caption">{camOn ? "Your video is active on this device" : "Camera is off"}</p>
            </section>
            <div className="lm-status">{status}</div>
          </div>

          <div className="lm-controls">
            <button type="button" className="lm-btn primary" disabled={busy || live || !avatarId} onClick={() => void connect()}>
              {busy ? "Connecting…" : "Start live video"}
            </button>
            <button type="button" className="lm-btn" disabled={busy || !live} onClick={() => void disconnect()}>End session</button>
            <button type="button" className={"lm-btn" + (camOn ? " active" : "")} onClick={() => void toggleCam()}>
              {camOn ? "Hide my camera" : "Show my camera"}
            </button>
            <button type="button" className={"lm-btn" + (voiceListening ? " active" : "")} disabled={thinking} onClick={startVoiceInput}>
              {voiceListening ? "Listening…" : "Voice"}
            </button>
          </div>
          {error && <p className="lm-error" role="alert">{error}</p>}
          <p className="lm-note">
            Hosted avatar streaming by HeyGen. Live sessions may use account credits, and your API key stays on the server.
          </p>
        </section>

        <aside className="lm-side">
          <div className="lm-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "setup"} className={tab === "setup" ? "on" : ""} onClick={() => setTab("setup")}>Setup</button>
            <button type="button" role="tab" aria-selected={tab === "chat"} className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>Conversation</button>
          </div>

          {tab === "setup" ? (
            <div>
              <label className="lm-field">Search avatars
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or description" />
              </label>
              <div className="lm-seg" role="group" aria-label="Avatar gender">
                {(["all", "female", "male"] as const).map((g) => (
                  <button key={g} type="button" className={gender === g ? "on" : ""} onClick={() => setGender(g)}>
                    {g === "all" ? "All" : g === "female" ? "Female" : "Male"}
                  </button>
                ))}
              </div>
              <div className="lm-list" role="listbox" aria-label="Avatars">
                {filteredAvatars.slice(0, 80).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === avatarId}
                    className={"lm-av" + (item.id === avatarId ? " sel" : "")}
                    disabled={live || busy}
                    onClick={() => setAvatarId(item.id)}
                  >
                    <i>{initials(item.name)}</i>
                    <span>{item.name || item.id}<small>{item.gender || item.type || "avatar"}</small></span>
                  </button>
                ))}
                {!filteredAvatars.length && <p className="lm-empty">{loadingCatalog ? "Loading…" : "No avatars match."}</p>}
              </div>
              <p className="lm-empty">{filteredAvatars.length} matching{filteredAvatars.length > 80 ? " · showing the first 80, search to narrow" : ""}</p>

              <label className="lm-field">Language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={live || busy}>
                  {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
              <label className="lm-field">Conversation tone
                <select value={tone} onChange={(event) => setTone(event.target.value)} disabled={live || busy}>
                  {TONES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
              <label className="lm-field">Voice
                <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)} disabled={live || busy}>
                  <option value="">Avatar default{selectedAvatar?.default_voice?.name ? " · " + selectedAvatar.default_voice.name : ""}</option>
                  {voices.filter((voice) => !voice.language || voice.language.toLowerCase().startsWith(language) || voice.language.toLowerCase().includes(languageName.toLowerCase())).map((voice) => (
                    <option key={voice.id} value={voice.id}>{voice.name || voice.id}{voice.language ? " · " + voice.language : ""}</option>
                  ))}
                </select>
                <small>{selectedVoice?.name || selectedAvatar?.default_voice?.name || "Provider default voice"}</small>
              </label>
              <button type="button" className="lm-btn" disabled={loadingCatalog || busy} onClick={() => void loadCatalog()}>
                {loadingCatalog ? "Loading…" : "Reload catalogue"}
              </button>

              <section className="lm-topics" aria-labelledby="lm-topics-title">
                <div className="lm-topics-head"><span id="lm-topics-title">Conversation topics</span><small>Choose a starting point</small></div>
                <div className="lm-topic-list">
                  {TOPICS.map((topic) => <button key={topic.id} type="button" className={"lm-topic" + (topicId === topic.id ? " on" : "")} aria-pressed={topicId === topic.id} onClick={() => { setTopicId(topic.id); setMessage(topic.prompt); setTab("chat"); }}>{topic.label}</button>)}
                </div>
                <button type="button" className="lm-btn primary lm-topic-start" onClick={() => { const topic = TOPICS.find((item) => item.id === topicId) || TOPICS[TOPICS.length - 1]; setMessage(topic.prompt); setTab("chat"); }}>Use selected topic</button>
              </section>
            </div>
          ) : (
            <div>
              <div className="lm-log" aria-live="polite">
                {history.length === 0 && <p className="lm-empty">Say hello. Speak with the Voice button or type below. When the avatar is live it speaks each reply.</p>}
                {history.map((item, index) => (
                  <div key={index} className={"lm-msg" + (item.role === "you" ? " you" : "")}>
                    <small>{item.role === "you" ? "You" : selectedAvatar?.name || "Avatar"}</small>
                    {item.text}
                  </div>
                ))}
              </div>
              <form className="lm-compose" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={1000}
                  placeholder={thinking ? "Thinking…" : "Write a message…"}
                  aria-label="Message to the avatar"
                />
                <button type="submit" className="lm-btn primary" disabled={!message.trim() || busy || thinking}>Send</button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.lm{--bg:#0b0e14;--panel:#121722;--panel2:#171e2c;--line:#222c3f;--ink:#e8ecf5;--mut:#8a96ad;--acc:#6d7bff;--ok:#2dd4a3;--warn:#f5b84a;color:var(--ink)}
.lm *{box-sizing:border-box}
.lm-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,1fr);gap:18px;align-items:start}
@media (max-width:920px){.lm-grid{grid-template-columns:1fr}}
.lm-stage,.lm-side{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px}
.lm-stage-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
.lm-stage-head h2{margin:0;font-size:20px}
.lm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.lm-chips span{font-size:12px;color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--panel2)}
.lm-badge{font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px;border:1px solid var(--line);color:var(--mut)}
.lm-badge.live{color:var(--ok);border-color:var(--ok)}
.lm-badge.busy{color:var(--warn);border-color:var(--warn)}
.lm-video{position:relative;aspect-ratio:16/9;background:#05070b;border-radius:14px;overflow:hidden;border:1px solid var(--line)}
.lm-video>video:first-child{width:100%;height:100%;object-fit:cover;display:block}
.lm-ph{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;text-align:center;color:var(--mut);padding:20px}
.lm-ph b{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;font-size:30px;color:#fff;background:linear-gradient(135deg,var(--acc),#a06bff)}
.lm-pip{position:absolute;right:12px;bottom:12px;width:26%;min-width:120px;aspect-ratio:4/3;object-fit:cover;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:#000;transform:scaleX(-1);display:none}
.lm-pip.on{display:block}
.lm-status{position:absolute;left:12px;bottom:12px;max-width:60%;font-size:12px;padding:5px 10px;border-radius:999px;background:rgba(5,7,11,.72);color:#dbe2f0}
.lm-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.lm-btn{border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:11px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer}
.lm-btn:disabled{opacity:.5;cursor:not-allowed}
.lm-btn.primary{background:var(--acc);border-color:var(--acc);color:#0b0e14}
.lm-btn.active{border-color:var(--ok);color:var(--ok)}
.lm-error{margin:12px 0 0;padding:10px 12px;border-radius:10px;border:1px solid #6b2b2b;background:#2a1216;color:#fca5a5;font-size:13px}
.lm-note{margin:12px 0 0;color:var(--mut);font-size:12px;line-height:1.6}
.lm-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:var(--panel2);padding:4px;border-radius:12px;margin-bottom:14px}
.lm-tabs button{border:0;background:transparent;color:var(--mut);padding:9px;border-radius:9px;font:inherit;font-weight:600;cursor:pointer}
.lm-tabs button.on{background:var(--panel);color:var(--ink);box-shadow:0 0 0 1px var(--line)}
.lm-field{display:grid;gap:6px;margin:12px 0;font-size:12px;font-weight:600;color:var(--mut)}
.lm-field small{font-weight:400}
.lm-field input,.lm-field select,.lm-compose input{width:100%;min-width:0;background:var(--bg);border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:10px 12px;font:inherit}
.lm-seg{display:flex;gap:6px;margin-bottom:10px}
.lm-seg button{flex:1;border:1px solid var(--line);background:var(--panel2);color:var(--mut);border-radius:10px;padding:8px;font:inherit;font-weight:600;cursor:pointer}
.lm-seg button.on{color:var(--ink);border-color:var(--acc)}
.lm-list{display:grid;gap:6px;max-height:250px;overflow:auto;margin-bottom:8px;padding-right:2px}
.lm-av{display:flex;gap:10px;align-items:center;text-align:left;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:12px;padding:8px 10px;font:inherit;cursor:pointer}
.lm-av:disabled{opacity:.6;cursor:not-allowed}
.lm-av.sel{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.lm-av i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--acc),#a06bff);flex:none}
.lm-av small{display:block;color:var(--mut)}
.lm-log{display:flex;flex-direction:column;gap:8px;min-height:240px;max-height:340px;overflow:auto;margin-bottom:12px}
.lm-msg{padding:9px 12px;border-radius:12px;max-width:92%;overflow-wrap:anywhere;background:var(--panel2);border:1px solid var(--line)}
.lm-msg.you{align-self:flex-end;background:#1d2545}
.lm-msg small{display:block;color:var(--mut);font-size:11px}
.lm-compose{display:flex;gap:8px}
.lm-compose input{flex:1}
.lm-empty{color:var(--mut);font-size:13px;margin:0}

.lm-video-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;position:relative}
.lm-video-card{min-width:0;border:1px solid var(--line);background:#0e131d;border-radius:14px;padding:8px}
.lm-video-label{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 4px 9px;font-size:10px;font-weight:800;letter-spacing:.09em;color:var(--mut)}
.lm-video-label .connected{color:var(--ok)}
.lm-video-caption{font-size:12px;color:var(--mut);margin:8px 4px 2px;overflow-wrap:anywhere}
.lm-video-pair .lm-status{position:static;grid-column:1/-1;max-width:none;width:max-content;margin-top:1px}
.lm-user-video>video:first-child{width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1);visibility:hidden}
.lm-user-video.camera-on>video:first-child{visibility:visible}
.lm-user-ph b{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;font-size:35px;color:#dbe2f0;background:#202a3d;border:1px solid #34415a}
.lm-user-ph small{font-size:11px;color:var(--mut)}
.lm-camera-live{position:absolute;left:10px;bottom:10px;padding:4px 8px;border-radius:999px;background:rgba(5,7,11,.72);color:var(--ok);font-size:11px}
.lm-video{aspect-ratio:4/3}
.lm-ph{gap:10px;padding:14px;font-size:12px}
.lm-ph b{width:70px;height:70px;font-size:25px}
.lm-topics{margin-top:18px;padding-top:15px;border-top:1px solid var(--line)}
.lm-topics-head{display:flex;flex-direction:column;gap:3px;margin-bottom:10px;font-size:13px;font-weight:700}
.lm-topics-head small{font-size:11px;font-weight:400;color:var(--mut)}
.lm-topic-list{display:flex;flex-wrap:wrap;gap:7px}
.lm-topic{border:1px solid var(--line);background:var(--panel2);color:var(--mut);border-radius:999px;padding:7px 10px;font:inherit;font-size:12px;cursor:pointer}
.lm-topic.on{color:var(--ink);border-color:var(--acc);background:#202746}
.lm-topic-start{margin-top:12px;width:100%}
@media (max-width:560px){.lm-video-pair{grid-template-columns:1fr}.lm-video-pair .lm-status{grid-column:1}}

`;
