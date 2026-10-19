import { useEffect, useMemo, useRef, useState } from "react";
import { AgentEventsEnum, LiveAvatarSession, SessionEvent, SessionState } from "@heygen/liveavatar-web-sdk";
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
type Turn = { role: "you" | "avatar"; text: string; note?: string };
type Tab = "setup" | "chat";
type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

// [code sent to the provider, label, speech-recognition / browser-voice language tag]
const LANGUAGES = [
  ["en", "English", "en-IN"], ["hi", "Hindi", "hi-IN"], ["ta", "Tamil", "ta-IN"], ["te", "Telugu", "te-IN"],
  ["bn", "Bengali", "bn-IN"], ["mr", "Marathi", "mr-IN"], ["pa", "Punjabi", "pa-IN"], ["kn", "Kannada", "kn-IN"],
  ["ml", "Malayalam", "ml-IN"], ["ur", "Urdu", "ur-IN"], ["ar", "Arabic", "ar-SA"], ["es", "Spanish", "es-ES"],
  ["fr", "French", "fr-FR"], ["de", "German", "de-DE"], ["pt", "Portuguese", "pt-BR"], ["it", "Italian", "it-IT"],
  ["ja", "Japanese", "ja-JP"], ["ko", "Korean", "ko-KR"], ["zh", "Chinese", "zh-CN"], ["id", "Indonesian", "id-ID"],
  ["vi", "Vietnamese", "vi-VN"], ["th", "Thai", "th-TH"], ["nl", "Dutch", "nl-NL"], ["pl", "Polish", "pl-PL"],
] as const;

const TONES = [
  ["warm", "Warm & supportive"],
  ["professional", "Professional"],
  ["calm", "Calm & thoughtful"],
  ["energetic", "Energetic & upbeat"],
  ["friendly", "Friendly & casual"],
] as const;

const PREF_KEY = "nkai-live-call-prefs";
type Prefs = { avatarId?: string; voiceId?: string; language?: string; tone?: string };

function readPrefs(): Prefs {
  try {
    return JSON.parse(window.localStorage.getItem(PREF_KEY) || "{}") as Prefs;
  } catch {
    return {};
  }
}
function writePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable */
  }
}
function initials(name?: string) {
  const parts = String(name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export function LiveAvatarCloudPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camRef = useRef<HTMLVideoElement | null>(null);
  const camStream = useRef<MediaStream | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const recRef = useRef<Rec | null>(null);
  const runRef = useRef(0);
  const cancelRef = useRef(false);
  const prefsReady = useRef(false);
  const historyRef = useRef<Turn[]>([]);
  const cfgRef = useRef({ language: "en", recog: "en-IN" });

  const [avatars, setAvatars] = useState<LiveAvatar[]>([]);
  const [voices, setVoices] = useState<LiveVoice[]>([]);
  const [sandbox, setSandbox] = useState(false);
  const [sandboxId, setSandboxId] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("en");
  const [gender, setGender] = useState<"all" | "female" | "male">("all");
  const [tone, setTone] = useState("warm");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("setup");
  const [status, setStatus] = useState("Loading the avatar catalogue…");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);

  const selectedAvatar = avatars.find((item) => item.id === avatarId);
  const selectedVoice = voices.find((item) => item.id === voiceId);
  const langRow = LANGUAGES.find(([code]) => code === language) ?? LANGUAGES[0];
  const languageName = langRow[1];
  const toneName = TONES.find(([code]) => code === tone)?.[1] || tone;
  const voiceName = selectedVoice?.name || selectedAvatar?.default_voice?.name || "Default voice";

  useEffect(() => {
    cfgRef.current = { language, recog: langRow[2] };
  }, [language, langRow]);

  const filteredAvatars = useMemo(() => avatars.filter((item) => {
    const metadata = [item.name, item.description, item.tags, item.gender, item.type].flat().filter(Boolean).join(" ").toLowerCase();
    const queryMatches = metadata.includes(search.trim().toLowerCase());
    const avatarGender = String(item.gender ?? "").toLowerCase();
    const genderMatches = gender === "all" || (gender === "female" ? /female|woman|girl/i.test(avatarGender) : /^(male|man|boy)/i.test(avatarGender));
    return queryMatches && genderMatches;
  }), [avatars, gender, search]);

  // Remember the user's choices.
  useEffect(() => {
    if (prefsReady.current) writePrefs({ avatarId, voiceId, language, tone });
  }, [avatarId, voiceId, language, tone]);

  useEffect(() => {
    const prefs = readPrefs();
    if (prefs.language && LANGUAGES.some(([code]) => code === prefs.language)) setLanguage(prefs.language);
    if (prefs.tone && TONES.some(([code]) => code === prefs.tone)) setTone(prefs.tone);
    void loadCatalog(prefs);
    return () => {
      runRef.current++;
      cancelRef.current = true;
      recRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      camStream.current?.getTracks().forEach((track) => track.stop());
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) void session.stop().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushTurn(turn: Turn) {
    historyRef.current = [...historyRef.current, turn].slice(-40);
    setHistory(historyRef.current);
  }

  async function loadCatalog(prefs: Prefs = {}) {
    setLoadingCatalog(true);
    setError("");
    setStatus("Loading avatars and voices…");
    try {
      const response = await fetch("/api/liveavatar/catalog", { headers: { Accept: "application/json" } });
      const payload = await response.json() as { avatars?: LiveAvatar[]; voices?: LiveVoice[]; error?: string; sandbox?: boolean; sandbox_avatar_id?: string };
      if (!response.ok || !Array.isArray(payload.avatars) || !Array.isArray(payload.voices)) {
        throw new Error(payload.error || "Could not load the LiveAvatar catalogue.");
      }
      const isSandbox = Boolean(payload.sandbox);
      const wayneId = payload.sandbox_avatar_id || "";
      let list = payload.avatars;
      // In sandbox mode only the Wayne test avatar can start a session, so make sure it is selectable.
      if (isSandbox && wayneId && !list.some((item) => item.id === wayneId)) {
        list = [{ id: wayneId, name: "Wayne (sandbox test avatar)", type: "sandbox" }, ...list];
      }
      setSandbox(isSandbox);
      setSandboxId(wayneId);
      setAvatars(list);
      setVoices(payload.voices);
      const usable = (item: LiveAvatar) => !isSandbox || item.id === wayneId;
      const wanted = prefs.avatarId || avatarId;
      const next = list.find((item) => item.id === wanted && usable(item))
        ?? (isSandbox ? list.find((item) => item.id === wayneId) : list[0]);
      setAvatarId(next?.id ?? "");
      const savedVoice = prefs.voiceId || voiceId;
      setVoiceId(savedVoice && payload.voices.some((item) => item.id === savedVoice) ? savedVoice : "");
      setStatus(list.length + " avatars · " + payload.voices.length + " voices" + (isSandbox ? " · sandbox" : ""));
      if (!list.length) setError("The API key worked, but the account returned no selectable avatars.");
    } catch (cause) {
      setStatus("Catalogue unavailable");
      setError(cause instanceof Error ? cause.message : "Could not load the LiveAvatar catalogue.");
    } finally {
      prefsReady.current = true;
      setLoadingCatalog(false);
    }
  }

  function attachVideo(session: LiveAvatarSession) {
    const element = videoRef.current;
    if (!element) return;
    session.attach(element);
    void element.play().catch(() => setStatus("Click the video to start playback and sound"));
  }

  async function connect() {
    if (!avatarId) {
      setError("Choose an avatar first.");
      return;
    }
    if (sandbox && avatarId !== sandboxId) {
      setError("Sandbox mode only runs the Wayne test avatar. Choose Wayne, or ask the owner to turn sandbox mode off.");
      return;
    }
    const run = ++runRef.current;
    cancelRef.current = false;
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
      if (cancelRef.current || run !== runRef.current) return;
      const session = new LiveAvatarSession(payload.session_token, { autoKeepAlive: true, voiceChat: { defaultMuted: true } });
      sessionRef.current = session;
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        if (state === SessionState.CONNECTING) setStatus("Connecting to " + label + "…");
      });
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        attachVideo(session);
        setLive(true);
        setTab("chat");
        setStatus("Live · " + label);
      });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        if (sessionRef.current !== session) return;
        sessionRef.current = null;
        setLive(false);
        setSpeaking(false);
        setStatus("Session ended");
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setSpeaking(true));
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => setSpeaking(false));
      await session.start();
      if (cancelRef.current || run !== runRef.current) {
        // The call was ended while it was still connecting: close it now.
        if (sessionRef.current === session) sessionRef.current = null;
        await session.stop().catch(() => undefined);
        return;
      }
      attachVideo(session);
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
      if (run === runRef.current) setBusy(false);
    }
  }

  // Ends everything: provider session, camera, microphone/recognition and browser voice.
  async function endCall() {
    runRef.current++;
    cancelRef.current = true;
    recRef.current?.abort();
    recRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    camStream.current?.getTracks().forEach((track) => track.stop());
    camStream.current = null;
    if (camRef.current) camRef.current.srcObject = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try { await session.stop(); } catch { /* best-effort cleanup */ }
    }
    const element = videoRef.current;
    if (element) {
      element.pause();
      element.srcObject = null;
    }
    setCamOn(false);
    setListening(false);
    setHeard("");
    setLive(false);
    setSpeaking(false);
    setBusy(false);
    setThinking(false);
    setStatus("Call ended · camera and microphone released");
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
    const run = runRef.current;
    const { language: lang, recog } = cfgRef.current;
    setThinking(true);
    setError("");
    setMessage("");
    setHeard("");
    setTab("chat");
    const recent = historyRef.current.slice(-8).map((item) => ({
      role: (item.role === "you" ? "user" : "assistant") as "user" | "assistant",
      text: item.text,
    }));
    pushTurn({ role: "you", text });
    try {
      let reply = "";
      let source = "NKAI GPU AI";
      try {
        const response = await fetch("/api/avatar-ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: text, language: lang, history: recent }),
        });
        const payload = await response.json() as { reply?: string; error?: string; detail?: string };
        if (!response.ok || !payload.reply?.trim()) {
          throw new Error(payload.error || payload.detail || "NKAI AI did not return a reply.");
        }
        reply = payload.reply.trim();
      } catch (gpuError) {
        try {
          reply = await chatWithPuter(text, recent, "gpt-5.6-luna");
          source = "Puter.js fallback";
        } catch {
          throw gpuError;
        }
      }
      if (run !== runRef.current) return;
      const session = sessionRef.current;
      let spoken = "";
      if (session && session.state === SessionState.CONNECTED) {
        try {
          session.repeat(reply);
          spoken = "spoken by the live avatar";
        } catch {
          spoken = "";
        }
      }
      if (!spoken) {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.lang = recog;
          window.speechSynthesis.speak(utterance);
        }
        spoken = "browser voice (avatar offline)";
      }
      pushTurn({ role: "avatar", text: reply, note: source + " · " + spoken });
      setStatus(spoken.startsWith("spoken") ? "Speaking · " + (selectedAvatar?.name || "LiveAvatar") : "Avatar offline · replied with browser voice");
    } catch (cause) {
      if (run === runRef.current) setError(cause instanceof Error ? cause.message : "Could not generate or speak the reply.");
    } finally {
      if (run === runRef.current) setThinking(false);
    }
  }

  function startVoiceInput() {
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Use Chrome or Edge, or type your message.");
      return;
    }
    try { sessionRef.current?.interrupt(); } catch { /* not connected */ }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const rec = new Ctor();
    rec.lang = cfgRef.current.recog;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => {
      setListening(true);
      setHeard("");
      setError("");
      setTab("chat");
    };
    rec.onresult = (event) => {
      const results = (event as { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }).results;
      let transcript = "";
      for (let i = 0; i < results.length; i++) transcript += results[i][0].transcript;
      setHeard(transcript);
      if (results[results.length - 1].isFinal && transcript.trim()) void sendMessage(transcript);
    };
    rec.onerror = (event) => {
      const code = String((event as { error?: string }).error || "unknown");
      if (code === "not-allowed" || code === "service-not-allowed") setError("Microphone permission is blocked. Allow it in the browser address bar.");
      else if (code === "no-speech") setError("No speech was heard. Press Speak to avatar and try again.");
      else if (code === "audio-capture") setError("No microphone was found.");
      else if (code !== "aborted") setError("Microphone input failed: " + code + ".");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setError("Could not start the microphone. Check browser permission.");
    }
  }

  const badge = speaking ? "live" : live ? "live" : busy ? "busy" : "";
  const badgeText = speaking ? "Speaking" : live ? "Live" : busy ? "Connecting" : "Offline";
  const locked = live || busy;

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
                <span>{voiceName}</span>
                {selectedAvatar?.gender && <span>{selectedAvatar.gender}</span>}
              </div>
            </div>
            <span className={"lm-badge " + badge}>{badgeText}</span>
          </div>

          <div className="lm-video">
            <video ref={videoRef} autoPlay playsInline onClick={(event) => void event.currentTarget.play().catch(() => undefined)} />
            {!live && (
              <div className="lm-ph">
                <b>{initials(selectedAvatar?.name)}</b>
                <span>{busy ? "Connecting to the avatar…" : "Pick an avatar in Setup, then press Start live video."}</span>
              </div>
            )}
            <video ref={camRef} className={"lm-pip" + (camOn ? " on" : "")} autoPlay muted playsInline />
            <div className="lm-status">{status}</div>
          </div>

          <div className="lm-controls">
            <button type="button" className="lm-btn primary" disabled={busy || live || !avatarId} onClick={() => void connect()}>
              {busy ? "Connecting…" : "Start live video"}
            </button>
            <button type="button" className="lm-btn" disabled={!live && !busy && !camOn && !listening} onClick={() => void endCall()}>End call</button>
            <button type="button" className={"lm-btn" + (camOn ? " active" : "")} onClick={() => void toggleCam()}>
              {camOn ? "Hide my camera" : "Show my camera"}
            </button>
            <button type="button" className={"lm-btn" + (listening ? " active" : "")} disabled={thinking} onClick={startVoiceInput}>
              {listening ? "Listening… (tap to stop)" : "Speak to avatar"}
            </button>
          </div>
          {error && <p className="lm-error" role="alert">{error}</p>}
          <p className="lm-note">
            Hosted avatar streaming by HeyGen. Live sessions may use account credits, and your API key stays on the server.
            {sandbox ? " Sandbox mode is on, so only the Wayne test avatar can start." : ""}
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
                {filteredAvatars.slice(0, 80).map((item) => {
                  const blocked = sandbox && item.id !== sandboxId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={item.id === avatarId}
                      className={"lm-av" + (item.id === avatarId ? " sel" : "")}
                      disabled={locked || blocked}
                      onClick={() => setAvatarId(item.id)}
                    >
                      <i>{initials(item.name)}</i>
                      <span>{item.name || item.id}<small>{blocked ? "Production only" : item.gender || item.type || "avatar"}</small></span>
                    </button>
                  );
                })}
                {!filteredAvatars.length && <p className="lm-empty">{loadingCatalog ? "Loading…" : "No avatars match."}</p>}
              </div>
              <p className="lm-empty">{filteredAvatars.length} matching{filteredAvatars.length > 80 ? " · first 80 shown, search to narrow" : ""}</p>

              <label className="lm-field">Language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={locked}>
                  {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
              <label className="lm-field">Conversation tone
                <select value={tone} onChange={(event) => setTone(event.target.value)} disabled={locked}>
                  {TONES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
              <label className="lm-field">Voice
                <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)} disabled={locked}>
                  <option value="">Avatar default{selectedAvatar?.default_voice?.name ? " · " + selectedAvatar.default_voice.name : ""}</option>
                  {voices.filter((voice) => !voice.language || voice.language.toLowerCase().startsWith(language) || voice.language.toLowerCase().includes(languageName.toLowerCase())).map((voice) => (
                    <option key={voice.id} value={voice.id}>{voice.name || voice.id}{voice.language ? " · " + voice.language : ""}</option>
                  ))}
                </select>
                <small>{voiceName}</small>
              </label>
              <button type="button" className="lm-btn" disabled={loadingCatalog || busy} onClick={() => void loadCatalog()}>
                {loadingCatalog ? "Loading…" : "Reload catalogue"}
              </button>
            </div>
          ) : (
            <div>
              <div className="lm-log" aria-live="polite">
                {history.length === 0 && !listening && <p className="lm-empty">Say hello. Use Speak to avatar or type below. When the avatar is live it speaks each reply.</p>}
                {history.map((item, index) => (
                  <div key={index} className={"lm-msg" + (item.role === "you" ? " you" : "")}>
                    <small>{item.role === "you" ? "You" : selectedAvatar?.name || "Avatar"}</small>
                    {item.text}
                    {item.note && <em>{item.note}</em>}
                  </div>
                ))}
                {listening && <div className="lm-msg you"><small>Listening…</small>{heard || "Speak now"}</div>}
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
.lm-ph{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;text-align:center;color:var(--mut);padding:20px;pointer-events:none}
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
.lm-av:disabled{opacity:.55;cursor:not-allowed}
.lm-av.sel{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.lm-av i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--acc),#a06bff);flex:none}
.lm-av small{display:block;color:var(--mut)}
.lm-log{display:flex;flex-direction:column;gap:8px;min-height:240px;max-height:340px;overflow:auto;margin-bottom:12px}
.lm-msg{padding:9px 12px;border-radius:12px;max-width:92%;overflow-wrap:anywhere;background:var(--panel2);border:1px solid var(--line)}
.lm-msg.you{align-self:flex-end;background:#1d2545}
.lm-msg small{display:block;color:var(--mut);font-size:11px}
.lm-msg em{display:block;margin-top:4px;color:var(--mut);font-size:11px;font-style:normal}
.lm-compose{display:flex;gap:8px}
.lm-compose input{flex:1}
.lm-empty{color:var(--mut);font-size:13px;margin:0}
`;
