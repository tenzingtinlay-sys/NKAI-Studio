import { useEffect, useRef, useState } from "react";
import { LiveAvatarSession, SessionEvent, SessionState } from "@heygen/liveavatar-web-sdk";

export function LiveAvatarCloudPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const [status, setStatus] = useState("Ready to connect");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "you" | "avatar"; text: string }[]>([]);

  useEffect(() => () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) void session.stop().catch(() => undefined);
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    setStatus("Requesting a secure session token…");
    try {
      const response = await fetch("/api/liveavatar/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "FULL" }),
      });
      const payload = await response.json() as { session_token?: string; error?: string };
      if (!response.ok || !payload.session_token) {
        throw new Error(payload.error || "Could not create a LiveAvatar session.");
      }
      const session = new LiveAvatarSession(payload.session_token, { autoKeepAlive: true });
      sessionRef.current = session;
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        setStatus(state === SessionState.CONNECTED ? "Connected" : String(state).replaceAll("_", " "));
      });
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) session.attach(videoRef.current);
        setStatus("Avatar stream ready");
      });
      await session.start();
      if (videoRef.current) session.attach(videoRef.current);
      setStatus("Session started · waiting for avatar stream");
    } catch (cause) {
      sessionRef.current = null;
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
      try { await session.stop(); } catch { /* cleanup best effort */ }
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setStatus("Disconnected");
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
  const button: React.CSSProperties = { borderRadius: 9, padding: "10px 14px", cursor: "pointer", border: "1px solid #475569", color: "inherit", background: "#1e293b" };

  return <div className="mf-canvas">
    <div className="mf-head">
      <div><h1>LiveAvatar Cloud</h1><p>Official LiveAvatar Web SDK · real-time avatar streaming inside NKAI Studio.</p></div>
      <span style={{ fontSize: 12, opacity: 0.75 }}>{status}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 1fr)", gap: 14 }}>
      <section style={card}>
        <video ref={videoRef} autoPlay playsInline controls style={{ width: "100%", aspectRatio: "16 / 9", background: "#030712", borderRadius: 10, display: "block" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <button style={button} disabled={busy || !!sessionRef.current} onClick={() => void connect()}>{busy ? "Connecting…" : "Start LiveAvatar"}</button>
          <button style={button} disabled={busy || !sessionRef.current} onClick={() => void disconnect()}>End session</button>
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>Starting a session may consume LiveAvatar plan credits. Microphone permission may be requested by the SDK.</p>
      </section>
      <section style={card}>
        <b>Talk to your avatar</b>
        <div aria-live="polite" style={{ minHeight: 180, maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
          {history.length === 0 && <p style={{ opacity: 0.65, fontSize: 13 }}>Start a session, then send a message to the avatar.</p>}
          {history.map((item, i) => <div key={i} style={{ alignSelf: item.role === "you" ? "flex-end" : "flex-start", padding: 10, borderRadius: 10, background: item.role === "you" ? "#1d4ed8" : "#263244", maxWidth: "90%", overflowWrap: "anywhere" }}><small>{item.role === "you" ? "You" : "Avatar"}</small><div>{item.text}</div></div>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: 8 }}>
          <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Write a message…" aria-label="Message to LiveAvatar" style={{ flex: 1, minWidth: 0 }} />
          <button style={button} disabled={!message.trim() || busy || !sessionRef.current}>Send</button>
        </form>
        {error && <p role="alert" style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <p style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>The API key stays on the server. Configure LIVEAVATAR_API_KEY and LIVEAVATAR_AVATAR_ID in the deployment environment before starting.</p>
      </section>
    </div>
  </div>;
}
