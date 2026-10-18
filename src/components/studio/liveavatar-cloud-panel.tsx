import { useEffect, useMemo, useRef, useState } from "react";
import { LiveAvatarSession, SessionEvent, SessionState } from "@heygen/liveavatar-web-sdk";
import LifeMateFallback from "../LifeMateFallback";
import AvatarPlayer from "../../AvatarPlayer";

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
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "you" | "avatar"; text: string }[]>([]);

  // Local stream state: when user selects a local avatar to act as the "stream"
  const [localStreamAvatar, setLocalStreamAvatar] = useState<{ name: string; image?: string | null; audio?: string[] } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const [mouthLevel, setMouthLevel] = useState(0);

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

  // Auto-load the catalogue on mount so dev users don't hit an empty UI.
  useEffect(() => {
    void loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoadingCatalog(true);
    setError("");
    setStatus("Loading public and account avatars and available voices…");

    // If dev user explicitly forces offline mode, skip all network calls to avoid
    // console 404 noise. Toggle with: localStorage.setItem('forceOfflineLifeMate','1')
    if (typeof window !== 'undefined') {
      try {
        const forced = window.localStorage.getItem('forceOfflineLifeMate') === '1' || window.location.search.includes('offline=1');
        if (forced) {
          setAvatars([]);
          setVoices([]);
          setStatus('Offline fallback forced by developer setting');
          setError('Offline fallback enabled');
          setLoadingCatalog(false);
          return;
        }
      } catch (e) {
        // ignore localStorage errors
      }
    }

    const tryJsonResponse = async (url: string, originHeader?: string) => {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (originHeader) headers.Origin = originHeader;
      const res = await fetch(url, { headers });
      // If the server returned HTML (dev SSR), content-type won't be JSON.
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Non-JSON response received");
      }
      const payload = await res.json();
      return { res, payload } as const;
    };

    try {
      // In local dev, prefer the built preview server to avoid dev SSR intercepting /api paths
      if (typeof window !== 'undefined' && (window.location.port === '8080' || window.location.hostname === '127.0.0.1')) {
        try {
          const preview = await tryJsonResponse("http://127.0.0.1:8081/api/liveavatar/catalog", "http://127.0.0.1:8081");
          const payload = preview.payload as { avatars?: LiveAvatar[]; voices?: LiveVoice[] };
          if (Array.isArray(payload.avatars) && Array.isArray(payload.voices)) {
            setAvatars(payload.avatars);
            setVoices(payload.voices);
            setAvatarId((current) => payload.avatars!.some((item) => item.id === current) ? current : payload.avatars![0]?.id ?? "");
            setVoiceId((current) => payload.voices!.some((item) => item.id === current) ? current : "");
            setStatus(payload.avatars.length + " available avatars · " + payload.voices.length + " public voices (preview)");
            setLoadingCatalog(false);
            return;
          }
        } catch (e) {
          console.warn('[liveavatar] preview fetch failed, skipping same-origin to avoid 404 noise', e);
        }
      }

      // Final fallback: no remote catalogue. Keep UI usable with offline fallback only.
      setAvatars([]);
      setVoices([]);
      setStatus('No LiveAvatar catalogue available; using local offline LifeMate fallback');
      setError('LiveAvatar catalogue unavailable — showing offline fallback.');
    } catch (cause) {
      setStatus("Catalogue unavailable");
      setError(cause instanceof Error ? cause.message : "Could not load the LiveAvatar catalogue.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function connect() {
    if (!avatarId) {
      setError("Load the catalogue and choose an avatar first.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Requesting a secure session token…");
    try {
      const response = await fetch("/api/liveavatar/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "FULL", avatar_id: avatarId, voice_id: voiceId || selectedAvatar?.default_voice?.id || "", language, tone }),
      });
      const payload = await response.json() as { session_token?: string; sandbox?: boolean; error?: string };
      if (!response.ok || !payload.session_token) throw new Error(payload.error || "Could not create a LiveAvatar session.");
      const session = new LiveAvatarSession(payload.session_token, { autoKeepAlive: true });
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
+      // Offer quick fallback: use a local avatar if available
+      try {
+        const lib = await fetch('/api/avatars/library').then((r) => r.json()).catch(() => null);
+        if (lib && Array.isArray(lib.avatars) && lib.avatars.length) {
+          // choose first avatar with audio
+          const found = lib.avatars.find((a: any) => Array.isArray(a.audio) && a.audio.length) || lib.avatars[0];
+          if (found) {
+            setLocalStreamAvatar(found);
+            // auto-play first sample if present
+            if (found.audio && found.audio[0]) playLocalStream(found.audio[0]);
+          }
+        }
+      } catch (e) {
+        /* ignore */
+      }
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
    // also stop any local stream
    stopLocalStream();
    setStatus("Disconnected");
  }

  function playLocalStream(pathOrEncoded: string) {
    // pathOrEncoded is expected to be the encoded vendor path like '370+ .../Audio/file.wav' or full encoded string
    stopLocalStream();
    const url = `/api/vendor-file?path=${encodeURIComponent(pathOrEncoded)}`;
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audioElemRef.current = audio;
    // create audio context and analyser
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ac = new AC();
      audioContextRef.current = ac;
      const src = ac.createMediaElementSource(audio);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyser.connect(ac.destination);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        // compute simple RMS-ish level
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length) / 255;
        setMouthLevel(rms);
        raf = requestAnimationFrame(tick);
      };
      audio.play().catch(() => {});
      tick();
      // store raf id on analyserRef via property for cleanup
      (analyserRef.current as any)._rafId = raf;
    } catch (e) {
      // fallback: just play audio without analyser
      audio.play().catch(() => {});
    }
    setLocalStreamAvatar((prev) => prev); // keep avatar set
  }

  function stopLocalStream() {
    try {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current.currentTime = 0;
        audioElemRef.current = null;
      }
      if (analyserRef.current) {
        const raf = (analyserRef.current as any)._rafId;
        if (raf) cancelAnimationFrame(raf);
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
        audioContextRef.current = null;
      }
    } catch (e) {}
    setMouthLevel(0);
    setLocalStreamAvatar(null);
  }

  function sendMessage() {
    const text = message.trim();
    const session = sessionRef.current;
    if (!text || !session || session.state !== SessionState.CONNECTED) return;
    try {
      session.repeat(text);
      setHistory((items) => [...items, { role: "you", text }]);
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the message.");
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
      <label style={label}>Avatar<select style={field} value={avatarId} onChange={(event) => setAvatarId(event.target.value)}><option value="">Select an avatar…</option>{filteredAvatars.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}{item.gender ? " · " + item.gender : ""}</option>)}</select><small style={{ color: "var(--mf-muted, #9ca3af)", fontWeight: 400 }}>{filteredAvatars.length} matching avatars</small></label>
      <label style={label}>Voice<select style={field} value={voiceId} onChange={(event) => setVoiceId(event.target.value)}><option value="">Avatar default{selectedAvatar?.default_voice?.name ? " · " + selectedAvatar.default_voice.name : ""}</option>{voices.filter((voice) => !voice.language || voice.language.toLowerCase().startsWith(language) || voice.language.toLowerCase().startsWith(language + "-") || voice.language.toLowerCase().includes(LANGUAGES.find(([code]) => code === language)?.[1].toLowerCase() || language)).map((voice) => <option key={voice.id} value={voice.id}>{voice.name || voice.id}{voice.language ? " · " + voice.language : ""}</option>)}</select><small style={{ color: "var(--mf-muted, #9ca3af)", fontWeight: 400 }}>{selectedVoice?.name || selectedAvatar?.default_voice?.name || "Provider default voice"}</small></label>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 14 }}>
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}><div><b>{selectedAvatar?.name || "LiveAvatar preview"}</b><p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 12, margin: "4px 0 0" }}>{selectedAvatar?.type || "Hosted digital human"} · {language.toUpperCase()} · {tone}</p></div><span style={{ fontSize: 11, color: "var(--mf-muted, #9ca3af)" }}>{status}</span></div>
        {/* If a local stream avatar is active, show it here instead of the live session video */}
        {localStreamAvatar ? (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {localStreamAvatar.image ? (
              <img src={`/api/vendor-file?path=${encodeURIComponent(localStreamAvatar.image)}`} alt={localStreamAvatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <div style={{ color: '#fff' }}>{localStreamAvatar.name}</div>}
            <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', width: 160, height: 22, borderRadius: 12, background: '#111' }}>
              <div style={{ height: '100%', width: `${Math.max(8, Math.min(100, mouthLevel * 120))}%`, background: '#ffb86b', transition: 'width 0.08s linear' }} />
            </div>
            <button onClick={() => stopLocalStream()} style={{ position: 'absolute', top: 10, right: 10, padding: '6px 10px', borderRadius: 8 }}>Stop local stream</button>
          </div>
        ) : (
          <>
            {selectedAvatar?.preview_url && !sessionRef.current && <img src={selectedAvatar.preview_url} alt={selectedAvatar.name || "Selected avatar"} style={{ display: "block", width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />}
            <video ref={videoRef} autoPlay playsInline controls style={{ width: "100%", aspectRatio: "16 / 9", background: "#030712", borderRadius: 10, display: "block" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <button style={primary} disabled={busy || !!sessionRef.current || !avatarId} onClick={() => void connect()}>{busy ? "Connecting…" : "Start live video"}</button>
              <button style={button} disabled={busy || !sessionRef.current} onClick={() => void disconnect()}>End session</button>
              <button style={button} onClick={() => { /* open local avatar selection UI area scroll into view */ const el = document.querySelector('[data-local-avatar-list]'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }}>Use local avatar instead</button>
            </div>
            <p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 12, lineHeight: 1.6 }}>LiveAvatar is hosted by HeyGen and may consume account credits. Your API key remains on the server.</p>
          </>
        )}
      </section>
      <section style={card}>
        <b>Talk to your avatar</b>
        <div aria-live="polite" style={{ minHeight: 180, maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
          {history.length === 0 && <p style={{ color: "var(--mf-muted, #9ca3af)", fontSize: 13 }}>Start a session, then send a message to the avatar.</p>}
          {history.map((item, index) => <div key={index} style={{ alignSelf: item.role === "you" ? "flex-end" : "flex-start", padding: 10, borderRadius: 10, background: item.role === "you" ? "#1d4ed8" : "#263244", maxWidth: "90%", overflowWrap: "anywhere" }}><small>{item.role === "you" ? "You" : "Avatar"}</small><div>{item.text}</div></div>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: 8 }}>
          <input style={{ ...field, flex: 1 }} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Write a message…" aria-label="Message to LiveAvatar" />
          <button style={button} disabled={!message.trim() || busy || !sessionRef.current}>Send</button>
        </form>
        {error && <p role="alert" style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </section>

      {/* Offline LifeMate fallback runs alongside the cloud panel so both can be used simultaneously */}
      <section style={card}>
        <b>LifeMate Offline Fallback</b>
        <div style={{ marginTop: 10 }}>
          <LifeMateFallback avatarName={selectedAvatar?.name || 'LifeMate'} avatarImage={selectedAvatar?.preview_url} />
        </div>
      </section>

      <section style={card}>
        <b>Local Avatars (Images + Voice Samples)</b>
        <div style={{ marginTop: 10 }}>
          <AvatarPlayer />
        </div>
      </section>
    </div>
  </section>;
}
