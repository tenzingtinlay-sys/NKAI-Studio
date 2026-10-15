import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/studio/store";

const DEFAULT_MODEL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb";
const DEFAULT_GREETING =
  "Hi, I’m your NKAI avatar. Connect an open-source model worker to enable generated conversations, or use browser voice with the local demo.";

type Turn = { role: "user" | "assistant"; text: string };

export function OpenSourceAvatarPanel() {
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL);
  const [workerUrl, setWorkerUrl] = useState(() => {
    try { return localStorage.getItem("nkai-avatar-worker") || ""; } catch { return ""; }
  });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("3D viewer · browser-rendered");
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", text: DEFAULT_GREETING }]);
  const [modelError, setModelError] = useState(false);
  const viewerRef = useRef<HTMLElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const flash = useStudio((s) => s.flash);

  useEffect(() => {
    if (document.querySelector('script[data-nkai-model-viewer="true"]')) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    script.dataset.nkaiModelViewer = "true";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("nkai-avatar-worker", workerUrl.trim()); } catch { /* storage may be blocked */ }
  }, [workerUrl]);

  function speak(text: string) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus("Text response ready · browser speech unavailable");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = useStudio.getState().settings.lang || "en-US";
    utterance.rate = useStudio.getState().vp?.rate || 1;
    utterance.onstart = () => setStatus("Speaking · device/browser voice");
    utterance.onend = () => setStatus("Ready · 3D viewer remains active");
    utterance.onerror = () => setStatus("Text response ready · speech could not play");
    window.speechSynthesis.speak(utterance);
  }

  async function send(message: string) {
    const prompt = message.trim();
    if (!prompt || busy) return;
    const history = [...turns, { role: "user" as const, text: prompt }];
    setTurns(history);
    setDraft("");
    setBusy(true);
    setStatus(workerUrl.trim() ? "Connecting to configured GPU worker…" : "No GPU worker configured · local fallback");
    let reply = "";
    if (workerUrl.trim()) {
      try {
        const endpoint = new URL(workerUrl.trim());
        if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
          throw new Error("Use HTTPS for a remote worker URL.");
        }
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 45000);
        try {
          const response = await fetch(endpoint.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt, history: history.slice(-12), app: "NKAI-Studio" }),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`Worker returned HTTP ${response.status}`);
          const data = await response.json() as { reply?: string; response?: string; text?: string };
          reply = data.reply || data.response || data.text || "";
          if (!reply) throw new Error("Worker response must contain reply, response, or text.");
          setStatus("Connected · open-source GPU worker");
        } finally {
          window.clearTimeout(timeout);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Worker unavailable";
        setStatus(`Worker offline · fallback active (${reason})`);
      }
    }
    if (!reply) {
      reply = localReply(prompt);
      if (workerUrl.trim()) reply = "The GPU worker is unavailable, so I switched to the built-in offline conversation fallback. " + reply;
    }
    setTurns([...history, { role: "assistant", text: reply }]);
    setBusy(false);
    speak(reply);
  }

  function toggleMic() {
    type Recognition = {
      lang: string; interimResults: boolean;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null; onend: (() => void) | null;
      start: () => void; stop: () => void;
    };
    const browser = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; return; }
    if (!Ctor) { flash("Voice input is not supported here. Type your message instead."); return; }
    const mic = new Ctor();
    mic.lang = useStudio.getState().settings.lang || "en-US";
    mic.interimResults = false;
    mic.onresult = (event) => { const text = event.results[0]?.[0]?.transcript || ""; recognitionRef.current = null; if (text) void send(text); };
    mic.onerror = () => { recognitionRef.current = null; flash("Microphone failed. Check permission and try again."); };
    mic.onend = () => { recognitionRef.current = null; };
    recognitionRef.current = mic;
    try { mic.start(); } catch { recognitionRef.current = null; flash("Could not start microphone."); }
  }

  return (
    <div className="mf-canvas">
      <div className="mf-head">
        <div><h1>Open-source AI Avatar</h1><p>3D character viewer, browser voice, and optional self-hosted GPU inference — no paid AI API key required.</p></div>
        <div className="mf-bar"><span className="mf-pill">API-key-free architecture</span></div>
      </div>
      <div className="mf-grid two" style={{ alignItems: "start" }}>
        <section className="mf-card" style={{ minWidth: 0 }}>
          <div style={{ position: "relative", minHeight: 420, borderRadius: 16, overflow: "hidden", background: "radial-gradient(ellipse at 50% 35%, rgba(88,166,255,.22), rgba(7,12,25,.96) 72%)" }}>
            {!modelError ? (
              <div ref={(node) => { viewerRef.current = node; }} style={{ width: "100%", height: 440 }}>
                {/** model-viewer is loaded as a browser custom element */}
                {createModelViewer(modelUrl)}
              </div>
            ) : (
              <div style={{ padding: 32, textAlign: "center" }}>
                <h3>3D model could not load</h3><p>Check the model URL and that the host allows cross-origin access.</p>
              </div>
            )}
            <div style={{ position: "absolute", left: 14, bottom: 14, pointerEvents: "none" }}>
              <span className="mf-pill">{status}</span>
            </div>
          </div>
          <label style={{ display: "block", marginTop: 16 }}><b>Rigged 3D model URL (GLB/GLTF)</b>
            <input value={modelUrl} onChange={(e) => { setModelUrl(e.target.value); setModelError(false); }} placeholder="https://…/avatar.glb" style={{ width: "100%", marginTop: 8 }} />
          </label>
          <small style={{ opacity: .72, display: "block", marginTop: 8 }}>The included sample proves 3D rendering. For human-like lip sync, supply a licensed rigged avatar with facial morph targets/visemes; a generic GLB does not automatically provide them.</small>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button className="mf-ghost" type="button" onClick={() => { const el = viewerRef.current as (HTMLElement & { cameraOrbit?: string; jumpCameraToGoal?: () => void }) | null; if (el) { el.cameraOrbit = "0deg 75deg 2.5m"; el.jumpCameraToGoal?.(); } }}>Reset view</button>
            <button className="mf-ghost" type="button" onClick={() => { setModelUrl(DEFAULT_MODEL); setModelError(false); }}>Load sample model</button>
          </div>
        </section>
        <section className="mf-card" style={{ minHeight: 600, display: "flex", flexDirection: "column" }}>
          <h3 style={{ marginTop: 0 }}>GPU worker connection</h3>
          <p style={{ opacity: .75 }}>Paste the HTTPS endpoint of your own open-source inference worker. The worker should accept POST JSON with <code>message</code> and <code>history</code>, then return JSON containing <code>reply</code>. No provider API key is used by this UI.</p>
          <label><b>Worker endpoint URL</b><input value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)} placeholder="https://your-worker.example/ chat" style={{ width: "100%", marginTop: 8 }} /></label>
          <div className="mf-bar" style={{ marginTop: 10 }}>
            <button className="mf-ghost" type="button" onClick={() => { setWorkerUrl(""); setStatus("Local fallback selected"); }}>Use local fallback</button>
            <button className="mf-ghost" type="button" onClick={async () => { if (!workerUrl.trim()) { flash("Enter a worker URL first."); return; } setStatus("Checking worker…"); try { const u = new URL(workerUrl.trim()); const res = await fetch(u, { method: "OPTIONS" }); setStatus(res.ok ? "Worker URL responded · send a test message" : `Worker replied with HTTP ${res.status}`); } catch { setStatus("Worker could not be reached from this browser. Check HTTPS, CORS, and the endpoint."); } }}>Check connection</button>
          </div>
          <div role="log" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 220, maxHeight: 360, overflowY: "auto", padding: "18px 0" }}>
            {turns.map((turn, i) => <div key={i} style={{ alignSelf: turn.role === "user" ? "flex-end" : "flex-start", maxWidth: "94%", padding: "10px 12px", borderRadius: 12, background: turn.role === "user" ? "rgba(88,166,255,.18)" : "rgba(127,127,127,.12)" }}><small style={{ display: "block", opacity: .7, marginBottom: 4 }}>{turn.role === "user" ? "You" : "NKAI Avatar"}</small><span>{turn.text}</span></div>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(draft); }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Talk to the avatar…" aria-label="Message to avatar" style={{ flex: 1, minWidth: 0 }} />
            <button type="submit" className="mf-ghost" disabled={!draft.trim() || busy}>{busy ? "Thinking…" : "Send"}</button>
          </form>
          <div className="mf-bar" style={{ marginTop: 10 }}>
            <button className="mf-ghost" type="button" onClick={toggleMic}>🎙 Speak</button>
            <button className="mf-ghost" type="button" onClick={() => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); setStatus("Voice stopped"); }}>Stop voice</button>
            <button className="mf-ghost" type="button" onClick={() => setTurns([{ role: "assistant", text: DEFAULT_GREETING }])}>Clear chat</button>
          </div>
          <small style={{ opacity: .7, marginTop: 12 }}>GPU sessions are optional and may expire. This panel falls back automatically if a configured worker is unreachable; uninterrupted cloud GPU time is not guaranteed by free notebook tiers.</small>
        </section>
      </div>
    </div>
  );
}

function createModelViewer(src: string) {
  return (
    // @ts-expect-error model-viewer is registered by its browser module at runtime
    <model-viewer
      key={src}
      src={src}
      alt="Interactive 3D avatar model"
      camera-controls
      auto-rotate
      autoplay
      shadow-intensity="1"
      exposure="1"
      environment-image="neutral"
      style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      onError={() => undefined}
    />
  );
}

function localReply(message: string) {
  const lower = message.toLowerCase();
  if (/\b(hi|hello|hey|good morning|good evening)\b/.test(lower)) return "Hello! I’m ready to help. What would you like to build or practise today?";
  if (lower.includes("who are you") || lower.includes("your name")) return "I’m the NKAI Studio avatar. Connect an open-source GPU worker for generated answers, or continue with this local fallback.";
  if (lower.includes("help") || lower.includes("what can you do")) return "I can guide your work in short steps, help structure a presentation, practise an introduction, and read responses aloud. For fully generated answers, connect a compatible self-hosted model worker.";
  if (lower.includes("thank")) return "You’re welcome. What should we work on next?";
  return `I heard: “${message.slice(0, 180)}”. This is the offline fallback, not a large language model. Connect an open-source inference worker for generated conversation.`;
}
