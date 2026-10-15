import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/studio/store";

const AVATARS = [
  { label: "Avaturn · realistic", url: "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/avaturn.glb", body: "M" },
  { label: "Avatar SDK · realistic", url: "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/avatarsdk.glb", body: "M" },
  { label: "Brunette · female", url: "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/brunette.glb", body: "F" },
  { label: "VRoid · stylized", url: "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/vroid.glb", body: "F" },
];
const DEFAULT_MODEL = AVATARS[0].url;
const LANGUAGES = [
  { label: "English (India)", code: "en-IN" }, { label: "English (US)", code: "en-US" },
  { label: "Hindi", code: "hi-IN" }, { label: "Tamil", code: "ta-IN" }, { label: "Telugu", code: "te-IN" },
  { label: "Bengali", code: "bn-IN" }, { label: "Marathi", code: "mr-IN" }, { label: "Punjabi", code: "pa-IN" },
  { label: "Kannada", code: "kn-IN" }, { label: "Malayalam", code: "ml-IN" },
  { label: "French", code: "fr-FR" }, { label: "German", code: "de-DE" }, { label: "Spanish", code: "es-ES" },
];
const DEFAULT_GREETING =
  "Hi, I’m your NKAI avatar. Connect an open-source model worker to enable generated conversations, or use browser voice with the local demo.";

type Turn = { role: "user" | "assistant"; text: string };
type TalkingHeadApi = { showAvatar: (avatar: { url: string; body?: string; lipsyncLang?: string; avatarMood?: string }) => Promise<void>; speakAudio: (audio: unknown, options?: object, onSubtitles?: (word: string) => void) => void };
type HeadTTSApi = { connect: () => Promise<void>; setup: (options: object) => Promise<void>; synthesize: (options: { input: string }) => Promise<unknown>; onmessage?: ((message: { type: string; data: unknown }) => void) | null; onerror?: ((error: unknown) => void) | null };
type LocalGenerator = (messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, options: { max_new_tokens: number; do_sample: boolean; temperature: number }) => Promise<Array<{ generated_text?: string | Array<{ role: string; content: string }> }>>;

export function OpenSourceAvatarPanel() {
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [voiceOptions, setVoiceOptions] = useState<Array<{ name: string; lang: string }>>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rotationPlan, setRotationPlan] = useState(() => { try { return localStorage.getItem("nkai-platform-rotation-v2") || "Lightning AI|4|\nKaggle|12|\nLightning AI|4|\nLightning AI|4|"; } catch { return "Lightning AI|4|\nKaggle|12|\nLightning AI|4|\nLightning AI|4|"; } });
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [rotationNow, setRotationNow] = useState(Date.now());
  const [rotationStartedAt, setRotationStartedAt] = useState(() => { try { const saved = Number(localStorage.getItem("nkai-platform-rotation-v2-start")); return saved > 0 ? saved : Date.now(); } catch { return Date.now(); } });
  const [workerUrl, setWorkerUrl] = useState(() => {
    try { return localStorage.getItem("nkai-avatar-workers") || ""; } catch { return ""; }
  });
  const [workerToken, setWorkerToken] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("3D viewer · browser-rendered");
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", text: DEFAULT_GREETING }]);
  const [modelError, setModelError] = useState(false);
  const [talkingEnabled, setTalkingEnabled] = useState(false);
  const [talkingReady, setTalkingReady] = useState(false);
  const [localModelLoading, setLocalModelLoading] = useState(false);
  const [localModelReady, setLocalModelReady] = useState(false);
  const localGeneratorRef = useRef<LocalGenerator | null>(null);
  const talkingContainerRef = useRef<HTMLDivElement | null>(null);
  const talkingHeadRef = useRef<TalkingHeadApi | null>(null);
  const headTtsRef = useRef<HeadTTSApi | null>(null);
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
    try { localStorage.setItem("nkai-avatar-workers", workerUrl.trim()); } catch { /* storage may be blocked */ }
  }, [workerUrl]);

  useEffect(() => {
    const updateVoices = () => {
      if (!("speechSynthesis" in window)) return;
      const voices = window.speechSynthesis.getVoices();
      setVoiceOptions(voices.map((voice) => ({ name: voice.name, lang: voice.lang })));
      setSelectedVoice((current) => current || voices.find((voice) => voice.lang.toLowerCase() === speechLanguage.toLowerCase())?.name || "");
    };
    updateVoices();
    if ("speechSynthesis" in window) window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => { if ("speechSynthesis" in window) window.speechSynthesis.removeEventListener("voiceschanged", updateVoices); };
  }, [speechLanguage]);

  useEffect(() => {
    try { localStorage.setItem("nkai-platform-rotation-v2", rotationPlan); localStorage.setItem("nkai-platform-rotation-v2-start", String(rotationStartedAt)); } catch { /* storage may be blocked */ }
  }, [rotationPlan, rotationStartedAt]);

  useEffect(() => { const timer = window.setInterval(() => setRotationNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);

  const rotationEntries = rotationPlan.split(/\n+/).map((line) => {
    const [platform, hoursText, url] = line.split("|").map((part) => part.trim());
    return { platform, hours: Number(hoursText), url: url || "", valid: Boolean(platform && Number(hoursText) > 0) };
  }).filter((entry) => entry.valid);
  const totalRotationMs = rotationEntries.reduce((sum, entry) => sum + entry.hours * 3600000, 0);
  const rotationPosition = totalRotationMs ? Math.max(0, rotationNow - rotationStartedAt) % totalRotationMs : 0;
  let rotationCursor = 0;
  let activeRotationIndex = -1;
  for (let i = 0; i < rotationEntries.length; i++) { rotationCursor += rotationEntries[i].hours * 3600000; if (rotationPosition < rotationCursor) { activeRotationIndex = i; break; } }
  const activeRotation = rotationEntries[activeRotationIndex];
  const rotationElapsedInSlot = activeRotationIndex < 0 ? 0 : rotationPosition - (rotationCursor - rotationEntries[activeRotationIndex].hours * 3600000);
  const rotationRemainingMs = activeRotationIndex < 0 ? 0 : rotationEntries[activeRotationIndex].hours * 3600000 - rotationElapsedInSlot;
  const configuredRotationUrls = rotationEntries.filter((entry) => entry.url).map((entry) => entry.url);
  const orderedEndpoints = rotationEnabled
    ? [...(activeRotation?.url ? [activeRotation.url] : []), ...configuredRotationUrls.filter((url) => url !== activeRotation?.url), ...workerUrl.split(/[\n,]+/).map((url) => url.trim()).filter((url) => url && url !== activeRotation?.url && !configuredRotationUrls.includes(url))]
    : workerUrl.split(/[\n,]+/).map((url) => url.trim()).filter(Boolean);

  useEffect(() => {
    if (!talkingEnabled || !talkingContainerRef.current || talkingHeadRef.current) return;
    let cancelled = false;
    let head: TalkingHeadApi | null = null;
    (async () => {
      try {
        setStatus("Loading open-source 3D lip-sync engine…");
        const talkingHeadUrl = "https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7/+esm";
        const headTtsUrl = "https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/+esm";
        const [talkingModule, ttsModule] = await Promise.all([
          import(/* @vite-ignore */ talkingHeadUrl),
          import(/* @vite-ignore */ headTtsUrl),
        ]);
        if (cancelled || !talkingContainerRef.current) return;
        head = new talkingModule.TalkingHead(talkingContainerRef.current, {
          cameraView: "full",
          cameraRotateEnable: true,
          cameraZoomEnable: true,
          lipsyncModules: ["en", "de", "fr", "fi", "lt"],
          avatarMood: "neutral",
        }) as TalkingHeadApi;
        talkingHeadRef.current = head;
        const chosenAvatar = AVATARS.find((avatar) => avatar.url === modelUrl);
        await head.showAvatar({ url: modelUrl, body: chosenAvatar?.body || "M", lipsyncLang: speechLanguage.startsWith("fr") ? "fr" : speechLanguage.startsWith("de") ? "de" : "en", avatarMood: "neutral" });
        if (cancelled) return;
        const tts = new ttsModule.HeadTTS({
          endpoints: ["webgpu", "wasm"],
          languages: ["en-us"],
          voices: ["am_fenrir"],
          workerModule: "https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/modules/worker-tts.mjs",
          dictionaryURL: "https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/dictionaries/",
          dtypeWebgpu: "q4f16",
          dtypeWasm: "q4",
        }) as HeadTTSApi;
        tts.onmessage = (message) => {
          if (message.type === "audio") {
            try { head?.speakAudio(message.data); } catch { setStatus("Neural audio arrived but lip-sync playback failed"); }
          } else if (message.type === "error") {
            setStatus("Local neural voice failed · browser voice remains available");
          }
        };
        tts.onerror = () => setStatus("Local neural voice failed · browser voice remains available");
        await tts.connect();
        await tts.setup({ voice: "am_fenrir", language: "en-us", speed: 1, audioEncoding: "wav" });
        if (cancelled) return;
        headTtsRef.current = tts;
        setTalkingReady(true);
        setStatus("Talking avatar ready · local neural voice + viseme lip-sync");
      } catch {
        if (!cancelled) {
          setStatus("Lip-sync engine could not load · browser voice remains available");
          setTalkingEnabled(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [talkingEnabled]);

  async function speak(text: string) {
    const tts = headTtsRef.current;
    if (!speechLanguage.toLowerCase().startsWith("en") || !(talkingReady && tts)) {
      for (const candidate of orderedEndpoints) {
        try {
          const endpoint = new URL(candidate);
          endpoint.pathname = endpoint.pathname.replace(/\/$/, "").replace(/\/chat$/, "") + "/tts";
          endpoint.search = "";
          const response = await fetch(endpoint.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(workerToken.trim() ? { Authorization: "Bearer " + workerToken.trim() } : {}) },
            body: JSON.stringify({ text: text.slice(0, 800), language: speechLanguage }),
          });
          if (!response.ok) continue;
          const data = await response.json() as { audio_base64?: string; mime_type?: string };
          if (!data.audio_base64) continue;
          const binary = window.atob(data.audio_base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
          if (talkingHeadRef.current) talkingHeadRef.current.speakAudio({ audio: audioBuffer, ...estimateVisemes(text, audioBuffer.duration) });
          else {
            const audio = new Audio(URL.createObjectURL(new Blob([bytes], { type: data.mime_type || "audio/wav" })));
            await audio.play();
          }
          setStatus("Multilingual neural speech · worker endpoint " + candidate);
          return;
        } catch {
          // Try the next platform endpoint before using the browser voice.
        }
      }
      setStatus("Multilingual worker TTS unavailable · using installed browser voice");
    }
    const isEnglish = speechLanguage.toLowerCase().startsWith("en");
    if (talkingReady && tts && isEnglish) {
      try {
        setStatus("Generating local neural speech with lip-sync…");
        await tts.synthesize({ input: text.slice(0, 500) });
        return;
      } catch {
        setStatus("Local neural voice unavailable · using browser voice");
      }
    }
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus("Text response ready · browser speech unavailable");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLanguage;
    const voice = window.speechSynthesis.getVoices().find((item) => item.name === selectedVoice)
      || window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase() === speechLanguage.toLowerCase())
      || window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(speechLanguage.slice(0, 2).toLowerCase()));
    if (voice) utterance.voice = voice;
    utterance.rate = useStudio.getState().vp?.rate || 1;
    utterance.onstart = () => setStatus("Speaking · device/browser voice");
    utterance.onend = () => setStatus("Ready · 3D viewer remains active");
    utterance.onerror = () => setStatus("Text response ready · speech could not play");
    window.speechSynthesis.speak(utterance);
  }

  async function loadLocalModel() {
    if (localGeneratorRef.current || localModelLoading) return;
    setLocalModelLoading(true);
    setStatus("Loading local open-source Qwen model… first load downloads model weights");
    try {
      const transformersUrl = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/+esm";
      const { pipeline } = await import(/* @vite-ignore */ transformersUrl);
      let generator: LocalGenerator;
      try {
        generator = await pipeline("text-generation", "onnx-community/Qwen2.5-0.5B-Instruct", { device: "webgpu", dtype: "q4f16" }) as LocalGenerator;
      } catch {
        setStatus("WebGPU unavailable · loading slower WASM model");
        generator = await pipeline("text-generation", "onnx-community/Qwen2.5-0.5B-Instruct", { device: "wasm", dtype: "q4" }) as LocalGenerator;
      }
      localGeneratorRef.current = generator;
      setLocalModelReady(true);
      setStatus("Local AI ready · Qwen 0.5B runs in this browser without an API");
    } catch {
      setStatus("Local AI model could not load. Check browser WebGPU/WASM support and network access.");
    } finally {
      setLocalModelLoading(false);
    }
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
    const endpoints = orderedEndpoints;
    if (endpoints.length) {
      const failures: string[] = [];
      for (let index = 0; index < endpoints.length && !reply; index++) {
        try {
          const endpoint = new URL(endpoints[index]);
          if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
            throw new Error("Remote worker URLs must use HTTPS.");
          }
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 45000);
          try {
            const response = await fetch(endpoint.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(workerToken.trim() ? { Authorization: "Bearer " + workerToken.trim() } : {}) },
              body: JSON.stringify({ message: prompt, language: speechLanguage, history: history.slice(0, -1).slice(-10), app: "NKAI-Studio" }),
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json() as { reply?: string; response?: string; text?: string };
            reply = data.reply || data.response || data.text || "";
            if (!reply) throw new Error("Missing reply field");
            setStatus(`Connected · GPU worker ${index + 1}/${endpoints.length}`);
          } finally {
            window.clearTimeout(timeout);
          }
        } catch (error) {
          failures.push(`${index + 1}: ${error instanceof Error ? error.message : "offline"}`);
        }
      }
      if (!reply) setStatus(`All GPU workers offline · fallback active (${failures.join("; ")})`);
    }
    if (!reply && localGeneratorRef.current) {
      try {
        setStatus("Generating with local open-source model in this browser…");
        const messages = [
          { role: "system" as const, content: "You are NKAI Studio's practical, friendly AI avatar. Give useful, direct answers." },
          ...history.slice(-10).map((turn) => ({ role: turn.role, content: turn.text })),
        ];
        const generated = await localGeneratorRef.current(messages, { max_new_tokens: 180, do_sample: true, temperature: 0.7 });
        const value = generated[0]?.generated_text;
        if (typeof value === "string") reply = value;
        else if (Array.isArray(value)) reply = value.filter((item) => item.role === "assistant").map((item) => item.content).filter(Boolean).at(-1) || "";
        if (reply) setStatus("Answered by local open-source model · browser inference");
      } catch {
        setStatus("Local model failed · switching to offline scripted fallback");
      }
    }
    if (!reply) {
      reply = localReply(prompt);
      if (workerUrl.trim()) reply = "GPU workers are unavailable and the local AI model is not ready, so I switched to the built-in offline conversation fallback. " + reply;
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
              <>
                <div ref={(node) => { viewerRef.current = node; }} style={{ width: "100%", height: 440, display: talkingEnabled ? "none" : "block" }}>
                  {/** model-viewer is loaded as a browser custom element */}
                  {createModelViewer(modelUrl, () => setModelError(true))}
                </div>
                {talkingEnabled && <div ref={talkingContainerRef} style={{ width: "100%", height: 440 }} />}
              </>
            ) : (
              <div style={{ padding: 32, textAlign: "center" }}>
                <h3>3D model could not load</h3><p>Check the model URL and that the host allows cross-origin access.</p>
              </div>
            )}
            <div style={{ position: "absolute", left: 14, bottom: 14, pointerEvents: "none" }}>
              <span className="mf-pill">{status}</span>
            </div>
          </div>
          <label style={{ display: "block", marginTop: 16 }}><b>Choose avatar</b>
            <select value={modelUrl} onChange={(e) => { setModelUrl(e.target.value); setModelError(false); if (talkingEnabled) { setTalkingEnabled(false); setTalkingReady(false); talkingHeadRef.current = null; headTtsRef.current = null; } }} style={{ width: "100%", marginTop: 8 }}>
              {AVATARS.map((avatar) => <option key={avatar.url} value={avatar.url}>{avatar.label}</option>)}
            </select>
          </label>
          <label style={{ display: "block", marginTop: 16 }}><b>Rigged 3D model URL (GLB/GLTF)</b>
            <input value={modelUrl} onChange={(e) => { setModelUrl(e.target.value); setModelError(false); }} placeholder="https://…/avatar.glb" style={{ width: "100%", marginTop: 8 }} />
          </label>
          <small style={{ opacity: .72, display: "block", marginTop: 8 }}>Choose a sample rigged avatar or enter your own compatible GLB. English can use local neural HeadTTS with lip-sync; other languages use a selected browser voice, depending on installed language packs.</small>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button className="mf-ghost" type="button" onClick={() => { const el = viewerRef.current as (HTMLElement & { cameraOrbit?: string; jumpCameraToGoal?: () => void }) | null; if (el) { el.cameraOrbit = "0deg 75deg 2.5m"; el.jumpCameraToGoal?.(); } }}>Reset view</button>
            <button className="mf-ghost" type="button" onClick={() => { setTalkingEnabled(false); setTalkingReady(false); talkingHeadRef.current = null; headTtsRef.current = null; setModelUrl(DEFAULT_MODEL); setModelError(false); }}>Load sample model</button>
            <button className="mf-ghost" type="button" disabled={talkingEnabled} onClick={() => { setModelError(false); setTalkingEnabled(true); }}>Enable real lip-sync</button>
          </div>
        </section>
        <section className="mf-card" style={{ minHeight: 600, display: "flex", flexDirection: "column" }}>
          <h3 style={{ marginTop: 0 }}>Voice and language</h3>
          <div className="mf-bar" style={{ marginBottom: 10 }}>
            <label style={{ flex: 1, minWidth: 150 }}>Language
              <select value={speechLanguage} onChange={(e) => { setSpeechLanguage(e.target.value); const match = voiceOptions.find((voice) => voice.lang.toLowerCase() === e.target.value.toLowerCase()); setSelectedVoice(match?.name || ""); }} style={{ display: "block", width: "100%", marginTop: 6 }}>
                {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
              </select>
            </label>
            <label style={{ flex: 1, minWidth: 150 }}>Installed voice
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
                <option value="">Automatic matching voice</option>
                {voiceOptions.filter((voice) => voice.lang.toLowerCase().startsWith(speechLanguage.slice(0, 2).toLowerCase())).map((voice) => <option key={voice.name + voice.lang} value={voice.name}>{voice.name} ({voice.lang})</option>)}
              </select>
            </label>
          </div>
          <small style={{ opacity: .72, display: "block", marginBottom: 14 }}>HeadTTS neural speech is currently English-only. Other languages use an installed device/browser voice; the voice list depends on your OS. Full multilingual neural speech needs a multilingual model worker.</small>
          <h3>GPU platform rotation</h3>
          <p style={{ opacity: .75 }}>The scheduler selects a configured platform slot by elapsed time and tries that endpoint first, then other configured workers. It cannot start or wake a notebook session.</p>
          <label><b>Platform schedule (one line: platform | hours | HTTPS /chat URL)</b>
            <textarea value={rotationPlan} onChange={(e) => setRotationPlan(e.target.value)} placeholder={"Lightning AI|4|https://.../chat\nKaggle|12|https://.../chat"} style={{ width: "100%", minHeight: 110, marginTop: 8 }} />
          </label>
          <div className="mf-bar" style={{ alignItems: "center", marginTop: 8 }}>
            <button className="mf-ghost" type="button" onClick={() => { setRotationStartedAt(Date.now()); setRotationNow(Date.now()); }}>Restart rotation clock</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} /> Enable timed rotation</label>
          </div>
          <small style={{ opacity: .75, display: "block", marginBottom: 12 }}>{activeRotation ? "Scheduled slot: " + activeRotation.platform + " · " + Math.ceil(rotationRemainingMs / 60000) + " min remaining · " + (activeRotation.url ? "endpoint configured" : "waiting for endpoint URL") : "Add platform schedule entries to enable rotation."} Colab is excluded as a web-service worker because its free-tier rules prohibit offering web services. ZeroGPU is limited to about 5 GPU minutes/day on free accounts. Kaggle session and weekly quotas may prevent a daily 12-hour slot; confirm your current quota and permitted networking. Lightning AI free Studios restart every 4 hours.</small>
          <h3>GPU worker connection</h3>
          <p style={{ opacity: .75 }}>Paste one or more HTTPS endpoints of your own open-source inference workers, one per line in failover priority order. Each worker should accept POST JSON with <code>message</code> and <code>history</code>, then return JSON containing <code>reply</code>. No provider API key is used by this UI.</p>
          <label><b>Worker endpoint URLs (priority order)</b><textarea value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)} placeholder={"https://primary-worker.example/chat\nhttps://backup-worker.example/chat"} style={{ width: "100%", marginTop: 8, minHeight: 84 }} /></label><small style={{ opacity: .72 }}>Enter one HTTPS /chat endpoint per line, in priority order. The app tries each live worker before switching to the local fallback.</small>
          <label style={{ display: "block", marginTop: 10 }}><b>Optional worker access token</b><input type="password" autoComplete="off" value={workerToken} onChange={(e) => setWorkerToken(e.target.value)} placeholder="Only if WORKER_API_TOKEN is configured" style={{ width: "100%", marginTop: 8 }} /><small style={{ opacity: .72 }}>Kept in this page memory only; it is not saved to local storage.</small></label>
          <div className="mf-bar" style={{ marginTop: 10 }}>
            <button className="mf-ghost" type="button" onClick={() => { setWorkerUrl(""); setWorkerToken(""); setStatus(localModelReady ? "Local open-source AI selected" : "Local fallback selected"); }}>Use local fallback</button>
            <button className="mf-ghost" type="button" disabled={localModelReady || localModelLoading} onClick={() => void loadLocalModel()}>{localModelLoading ? "Loading local AI…" : localModelReady ? "Local AI ready" : "Load local AI (no API)"}</button>
            <button className="mf-ghost" type="button" onClick={async () => { const urls = orderedEndpoints; if (!urls.length) { flash("Enter at least one worker URL first."); return; } setStatus("Checking workers in priority order…"); let found = false; for (let i = 0; i < urls.length; i++) { try { const u = new URL(urls[i]); const health = new URL(u.toString()); health.pathname = health.pathname.replace(/\/$/, "").replace(/\/chat$/, "") + "/health"; health.search = ""; const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 8000); try { const res = await fetch(health, { method: "GET", signal: controller.signal }); if (res.ok) { const data = await res.json() as { status?: string; model?: string }; if (data.status === "ready" || data.status === "loading") { setStatus(`Worker ${i + 1}/${urls.length} reachable · ${data.status}${data.model ? ` · ${data.model}` : ""}`); found = true; break; } } } finally { window.clearTimeout(timeout); } } catch { /* try the next configured worker */ } } if (!found) setStatus("No health endpoint responded. Check the worker URL, HTTPS, and CORS."); }}>Check connection</button>
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
          <small style={{ opacity: .7, marginTop: 12 }}>For AI without any server/API, select “Load local AI (no API)”. It downloads a quantized Qwen model into browser runtime (first load is large and needs a capable desktop). The optional GPU worker remains the higher-capacity route. Free cloud GPU sessions may expire.</small>
        </section>
      </div>
    </div>
  );
}

function createModelViewer(src: string, onError: () => void) {
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
      onError={onError}
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


function estimateVisemes(text: string, durationSeconds: number) {
  // Coarse text-timed visemes keep the mouth moving for external TTS audio.
  // For phoneme-accurate sync, use a TTS model that emits word/viseme timestamps.
  const visemes = Array.from(text.toLowerCase()).filter((char) => /[a-z]/.test(char)).map((char) => {
    if ("a".includes(char)) return "aa";
    if ("e".includes(char)) return "E";
    if ("i".includes(char)) return "I";
    if ("o".includes(char)) return "O";
    if ("u".includes(char)) return "U";
    if ("bmp".includes(char)) return "PP";
    if ("fv".includes(char)) return "FF";
    if ("sz".includes(char)) return "SS";
    if ("td".includes(char)) return "DD";
    if ("kg".includes(char)) return "kk";
    if ("n".includes(char)) return "nn";
    if ("r".includes(char)) return "RR";
    if ("cjqx".includes(char)) return "CH";
    return "sil";
  });
  const step = visemes.length ? (durationSeconds * 1000) / visemes.length : 100;
  return { visemes, vtimes: visemes.map((_, index) => Math.round(index * step)), vdurations: visemes.map(() => Math.max(35, Math.round(step))) };
}
