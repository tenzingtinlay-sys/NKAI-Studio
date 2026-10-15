import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/studio/store";
import { LiveTalkingNativePanel } from "@/components/studio/livetalking-native-panel";

const AVATARS = [
  { label: "MPFB human · CC0 sample", url: "/assets/avatars/mpfb.glb", body: "M" },
  { label: "Brunette human · CC BY-NC 4.0 (non-commercial only)", url: "/assets/avatars/brunette.glb", body: "F" },
];
const DEFAULT_MODEL = AVATARS[0].url;
const LANGUAGES = [
  { label: "English (India)", code: "en-IN" }, { label: "English (US)", code: "en-US" },
  { label: "Hindi", code: "hi-IN" }, { label: "Tamil", code: "ta-IN" }, { label: "Telugu", code: "te-IN" },
  { label: "Bengali", code: "bn-IN" }, { label: "Marathi", code: "mr-IN" }, { label: "Punjabi", code: "pa-IN" },
  { label: "Kannada", code: "kn-IN" }, { label: "Malayalam", code: "ml-IN" },
  { label: "French", code: "fr-FR" }, { label: "German", code: "de-DE" }, { label: "Spanish", code: "es-ES" },
  { label: "Chinese (Mandarin)", code: "zh-CN" }, { label: "Japanese", code: "ja-JP" }, { label: "Korean", code: "ko-KR" },
  { label: "Assamese", code: "as-IN" }, { label: "Gujarati", code: "gu-IN" }, { label: "Odia", code: "or-IN" },
  { label: "Urdu", code: "ur-IN" }, { label: "Nepali", code: "ne-NP" }, { label: "Sanskrit", code: "sa-IN" },
  { label: "Bodo", code: "brx-IN" }, { label: "Dogri", code: "doi-IN" }, { label: "Konkani", code: "kok-IN" },
  { label: "Maithili", code: "mai-IN" }, { label: "Manipuri", code: "mni-IN" }, { label: "Santali", code: "sat-IN" },
  { label: "Sindhi", code: "sd-IN" },
];
const DEFAULT_GREETING =
  "Hi, I’m your NKAI avatar. I can run with a browser-local open-source AI model and your device’s speech voices. No API key, avatar ID, or paid inference service is required.";
const VOICE_TEST_PHRASES: Record<string, string> = {
  en: "Hello! This is a voice test for NKAI Studio.",
  hi: "नमस्ते! यह NKAI Studio की आवाज़ का परीक्षण है।",
  ta: "வணக்கம்! இது NKAI Studio குரல் சோதனை.",
  te: "నమస్కారం! ఇది NKAI Studio వాయిస్ పరీక్ష.",
  bn: "নমস্কার! এটি NKAI Studio কণ্ঠস্বর পরীক্ষা।",
  mr: "नमस्कार! ही NKAI Studio च्या आवाजाची चाचणी आहे.",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਇਹ NKAI Studio ਦੀ ਆਵਾਜ਼ ਦੀ ਜਾਂਚ ਹੈ।",
  kn: "ನಮಸ್ಕಾರ! ಇದು NKAI Studio ಧ್ವನಿ ಪರೀಕ್ಷೆ.",
  ml: "നമസ്കാരം! ഇത് NKAI Studio ശബ്ദ പരിശോധനയാണ്.",
  fr: "Bonjour ! Ceci est un test vocal de NKAI Studio.",
  de: "Hallo! Dies ist ein Sprachtest für NKAI Studio.",
  es: "¡Hola! Esta es una prueba de voz de NKAI Studio.",
  zh: "你好！这是 NKAI Studio 的语音测试。",
  ja: "こんにちは！これは NKAI Studio の音声テストです。",
  ko: "안녕하세요! NKAI Studio 음성 테스트입니다.",
  as: "নমস্কাৰ! এইটো NKAI Studio-ৰ কণ্ঠ পৰীক্ষা।",
  gu: "નમસ્તે! આ NKAI Studio નો અવાજ પરીક્ષણ છે.",
  or: "ନମସ୍କାର! ଏହା NKAI Studio ର କଣ୍ଠ ପରୀକ୍ଷା।",
  ur: "السلام علیکم! یہ NKAI Studio کی آواز کا ٹیسٹ ہے۔",
  ne: "नमस्कार! यो NKAI Studio को आवाज परीक्षण हो।",
  sa: "नमः! एतत् NKAI Studio इत्यस्य स्वरपरीक्षणम् अस्ति।",
  brx: "खुलुमबाय! बेयो NKAI Studio नि रावनि टेस्ट।",
  doi: "नमस्कार! एह NKAI Studio दी आवाज़ दा परीक्षण ऐ।",
  kok: "नमस्कार! ही NKAI Studio आवाज चाचणी आसा.",
  mai: "प्रणाम! ई NKAI Studio के आवाज परीक्षण अछि।",
  mni: "ꯀꯨꯝꯖꯩ! ꯑꯁꯤ NKAI Studio ꯒꯤ ꯋꯥꯍꯩ ꯑꯁꯤꯅꯤ।",
  sat: "ᱡᱚᱦᱟᱨ! ᱱᱚᱣᱟ NKAI Studio ᱨᱮᱭᱟᱜ ᱟᱲᱟᱝ ᱛᱮᱥᱴ ᱠᱟᱱᱟ।",
  sd: "سلام! هي NKAI Studio جي آواز جي جاچ آهي۔",
};

type Turn = { role: "user" | "assistant"; text: string };
type TalkingHeadApi = { showAvatar: (avatar: { url: string; body?: string; lipsyncLang?: string; avatarMood?: string }) => Promise<void>; speakAudio: (audio: unknown, options?: object, onSubtitles?: (word: string) => void) => void };
type HeadTTSApi = { connect: () => Promise<void>; setup: (options: object) => Promise<void>; synthesize: (options: { input: string }) => Promise<unknown>; onmessage?: ((message: { type: string; data: unknown }) => void) | null; onerror?: ((error: unknown) => void) | null };
type LocalGenerator = (messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, options: { max_new_tokens: number; do_sample: boolean; temperature: number; return_full_text: boolean }) => Promise<Array<{ generated_text?: string | Array<{ role: string; content: string }> }>>;

export function OpenSourceAvatarPanel() {
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL);
  const [localModelName, setLocalModelName] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [neuralVoice, setNeuralVoice] = useState("am_fenrir");
  const [indicVoiceStyle, setIndicVoiceStyle] = useState("default");
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<Array<{ name: string; lang: string }>>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
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
  const streamingContainerRef = useRef<HTMLDivElement | null>(null);
  const talkingHeadRef = useRef<TalkingHeadApi | null>(null);
  const headTtsRef = useRef<HeadTTSApi | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const localModelUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const flash = useStudio((s) => s.flash);

  useEffect(() => () => {
    if (localModelUrlRef.current) URL.revokeObjectURL(localModelUrlRef.current);
  }, []);

  useEffect(() => {
    if (document.querySelector('script[data-nkai-model-viewer="true"]')) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    script.dataset.nkaiModelViewer = "true";
    document.head.appendChild(script);
  }, []);

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

  // Default mode is fully browser-local. No worker URL, token, Space ID, or API key is needed.
  // Hosted GPU workers remain optional; basic avatar use must not depend on them.
  const orderedEndpoints: string[] = [];

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
          voices: ["am_fenrir", "af_bella"],
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
    // Try configured neural TTS workers for every language, including English.
    // This allows OpenVoice voice conversion and the default multilingual MMS worker
    // to be used instead of silently bypassing them when local English TTS is ready.
    for (const candidate of orderedEndpoints) {
      try {
        const endpoint = new URL(candidate, window.location.origin);
        endpoint.pathname = endpoint.pathname.replace(/\/$/, "").replace(/\/chat$/, "") + "/tts";
        endpoint.search = "";
        const response = await fetch(endpoint.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 800), language: speechLanguage, consent_confirmed: voiceConsent, voice: indicVoiceStyle === "default" ? undefined : indicVoiceStyle }),
        });
        if (!response.ok) continue;
        const data = await response.json() as { audio_base64?: string; mime_type?: string; provider?: string; language?: string };
        if (!data.audio_base64) continue;
        const binary = window.atob(data.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        if (talkingHeadRef.current) {
          const audioContext = new AudioContext();
          try {
            const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
            talkingHeadRef.current.speakAudio({ audio: audioBuffer, ...estimateVisemes(text, audioBuffer.duration) });
          } finally {
            void audioContext.close();
          }
        } else {
          const objectUrl = URL.createObjectURL(new Blob([bytes], { type: data.mime_type || "audio/wav" }));
          const audio = new Audio(objectUrl);
          const revokeAudioUrl = () => URL.revokeObjectURL(objectUrl);
          audio.addEventListener("ended", revokeAudioUrl, { once: true });
          audio.addEventListener("error", revokeAudioUrl, { once: true });
          try {
            await audio.play();
          } catch (error) {
            revokeAudioUrl();
            throw error;
          }
        }
        setStatus("Neural speech · " + (data.provider || "worker") + " · " + candidate);
        return;
      } catch {
        // Continue to the next worker, then try local neural speech and browser voices.
      }
    }
    if (orderedEndpoints.length) setStatus("Neural TTS unavailable for this language · trying local/browser voice");
    const isEnglish = speechLanguage.toLowerCase().startsWith("en");
    if (talkingReady && tts && isEnglish) {
      try {
        setStatus("Generating local neural speech with lip-sync…");
        await tts.setup({ voice: neuralVoice, language: "en-us", speed: 1, audioEncoding: "wav" });
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

  async function checkWorkerCapabilities() {
    if (!orderedEndpoints.length) {
      setStatus("Browser-local mode active · no hosted voice worker is configured or required.");
      return;
    }
    setStatus("Checking neural voice worker capabilities…");
    for (const candidate of orderedEndpoints) {
      try {
        const endpoint = new URL(candidate, window.location.origin);
        endpoint.pathname = "/api/ai/tts-capabilities";
        endpoint.search = "";
        const response = await fetch(endpoint.toString(), {
          method: "GET",
          headers: {},
        });
        if (!response.ok) continue;
        const data = await response.json() as {
          tts?: { provider?: string; ready?: boolean; detail?: string; languages?: Array<{ code?: string; label?: string }>; readyLanguages?: string[] };
          chat?: { model?: string; ready?: boolean };
          detail?: string | null;
        };
        const provider = data.tts?.provider || data.chat?.model || "Worker";
        const languages = data.tts?.languages?.map((item) => item.label || item.code).filter(Boolean)
          || data.tts?.readyLanguages
          || [];
        const summary = languages.length ? languages.slice(0, 12).join(", ") + (languages.length > 12 ? "…" : "") : "language list not advertised";
        const detail = data.tts?.detail || data.detail;
        setStatus(provider + " · TTS " + (data.tts?.ready ? "ready" : "capability endpoint reachable") + (detail ? " · " + detail : "") + " · " + summary);
        return;
      } catch {
        // Continue through the configured endpoint order.
      }
    }
    setStatus("No neural voice capabilities endpoint responded · check TTS worker configuration and readiness");
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
    setStatus("Preparing free browser-local AI…");
    if (!localGeneratorRef.current) await loadLocalModel();
    let reply = "";
    const endpoints = orderedEndpoints;
    if (endpoints.length) {
      const failures: string[] = [];
      for (let index = 0; index < endpoints.length && !reply; index++) {
        try {
          const endpoint = new URL("/api/ai/stream", window.location.origin);
          if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
            throw new Error("NKAI private inference route must use HTTPS outside local development.");
          }
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 120000);
          try {
            const response = await fetch(endpoint.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
              body: JSON.stringify({ message: prompt, language: speechLanguage, history: history.slice(0, -1).slice(-10), app: "NKAI-Studio" }),
              signal: controller.signal,
            });
            if (!response.ok) {
              const detail = await response.text().catch(() => "");
              throw new Error(`HTTP ${response.status}${detail ? ": " + detail.slice(0, 160) : ""}`);
            }
            if (!response.body) throw new Error("Streaming response body is unavailable");
            setStatus(`Streaming · GPU worker ${index + 1}/${endpoints.length}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let completed = false;
            setTurns([...history, { role: "assistant", text: "" }]);
            const consumeEvent = (event: string) => {
              for (const line of event.split("\n")) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data) continue;
                if (data === "[DONE]") { completed = true; continue; }
                let item: { token?: string; error?: string };
                try { item = JSON.parse(data) as { token?: string; error?: string }; }
                catch { continue; }
                if (item.error) throw new Error(item.error);
                if (item.token) {
                  reply += item.token;
                  setTurns([...history, { role: "assistant", text: reply }]);
                }
              }
            };
            while (!completed) {
              const { value, done } = await reader.read();
              buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
              const events = buffer.split("\n\n");
              buffer = events.pop() || "";
              for (const event of events) consumeEvent(event);
              if (done) break;
            }
            if (buffer.trim()) consumeEvent(buffer);
            if (!reply.trim()) throw new Error("Worker stream completed without generated text");
            setStatus(`Streaming complete · GPU worker ${index + 1}/${endpoints.length}`);
          } finally {
            window.clearTimeout(timeout);
          }
        } catch (error) {
          failures.push(`${index + 1}: ${error instanceof Error ? error.message : "offline"}`);
          if (reply) setStatus("Stream interrupted · keeping the partial generated response");
        }
      }
      if (!reply) setStatus(`All GPU workers offline · fallback active (${failures.join("; ")})`);
    }
    if (!reply && localGeneratorRef.current) {
      try {
        setStatus("Generating with local open-source model in this browser…");
        const messages = [
          { role: "system" as const, content: "You are NKAI Studio's practical, friendly AI avatar. Give useful, direct answers. Reply in " + (LANGUAGES.find((item) => item.code === speechLanguage)?.label || speechLanguage) + " unless the user explicitly asks for another language." },
          ...history.slice(-10).map((turn) => ({ role: turn.role, content: turn.text })),
        ];
        const generated = await localGeneratorRef.current(messages, { max_new_tokens: 180, do_sample: true, temperature: 0.7, return_full_text: false });
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
      if (!localGeneratorRef.current) reply = "The browser-local AI model could not load. This is an offline fallback, not a generated AI answer. Check your connection, browser WebGPU/WASM support, and available memory. " + reply;
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
    mic.lang = speechLanguage;
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
        <div><h1>Open-source AI Avatar</h1><p>Browser-rendered 3D avatar, local open-source chat model, and device speech — no API key, avatar ID, Space ID, or paid inference service required.</p></div>
        <div className="mf-bar"><span className="mf-pill">Local-first · no API keys</span></div>
      </div>
      <section className="mf-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Launch an avatar engine inside NKAI Studio</h2>
        <p style={{ opacity: .75 }}>The standard avatar and chat run in this app. The first local AI launch downloads open model weights to your browser; no API key or hosted worker is used.</p>
        <div className="mf-bar" style={{ flexWrap: "wrap" }}>
          <button className="mf-ghost" type="button" onClick={() => { setTalkingEnabled(false); setTalkingReady(false); setStatus("3D avatar viewer active"); }}>Launch 3D Avatar</button>
          <button className="mf-ghost" type="button" onClick={() => { setModelError(false); setTalkingEnabled(true); setStatus("Starting TalkingHead lip-sync engine…"); }}>Launch TalkingHead Lip-Sync</button>
          <button className="mf-ghost" type="button" onClick={() => { streamingContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); setStatus("Remote LiveTalking is optional; local avatar mode does not need it."); }}>Remote Streaming (Optional)</button>
          <button className="mf-ghost" type="button" disabled={localModelReady || localModelLoading} onClick={() => void loadLocalModel()}>{localModelLoading ? "Loading local AI…" : localModelReady ? "Local AI Ready" : "Launch Local AI"}</button>
        </div>
      </section>
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
            <select value={modelUrl} onChange={(e) => { if (localModelUrlRef.current) { URL.revokeObjectURL(localModelUrlRef.current); localModelUrlRef.current = null; } setLocalModelName(""); setModelUrl(e.target.value); setModelError(false); if (talkingEnabled) { setTalkingEnabled(false); setTalkingReady(false); talkingHeadRef.current = null; headTtsRef.current = null; } }} style={{ width: "100%", marginTop: 8 }}>
              {AVATARS.map((avatar) => <option key={avatar.url} value={avatar.url}>{avatar.label}</option>)}
              {localModelName && <option value={modelUrl}>{localModelName} · local GLB</option>}
            </select>
          </label>
          <label style={{ display: "block", marginTop: 16 }}><b>Rigged 3D model URL (GLB/GLTF)</b>
            <input value={modelUrl.startsWith("blob:") ? "" : modelUrl} onChange={(e) => { if (localModelUrlRef.current) { URL.revokeObjectURL(localModelUrlRef.current); localModelUrlRef.current = null; } setLocalModelName(""); setModelUrl(e.target.value); setModelError(false); if (talkingEnabled) { setTalkingEnabled(false); setTalkingReady(false); talkingHeadRef.current = null; headTtsRef.current = null; } }} placeholder="https://…/avatar.glb" style={{ width: "100%", marginTop: 8 }} />
          </label>
          <label style={{ display: "block", marginTop: 14 }}><b>Load a local avatar file (GLB, up to 100 MB)</b>
            <input type="file" accept=".glb,model/gltf-binary" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (!file.name.toLowerCase().endsWith(".glb") || file.size > 100 * 1024 * 1024) { flash("Choose a .glb file no larger than 100 MB."); e.currentTarget.value = ""; return; } if (localModelUrlRef.current) URL.revokeObjectURL(localModelUrlRef.current); const url = URL.createObjectURL(file); localModelUrlRef.current = url; setLocalModelName(file.name); setModelUrl(url); setModelError(false); if (talkingEnabled) { setTalkingEnabled(false); setTalkingReady(false); talkingHeadRef.current = null; headTtsRef.current = null; } }} style={{ display: "block", width: "100%", marginTop: 8 }} />
            <small style={{ opacity: .72 }}>Loaded in this browser session only; the file is not uploaded to the server or committed to Git. Use only models you are authorized to use.</small>
          </label>
          <small style={{ opacity: .72, display: "block", marginTop: 8 }}>The MPFB sample is intended as the redistribution-friendly starter; the local file is added by the asset download script. Avaturn, AvatarSDK and Brunette samples have non-commercial or CC BY-NC terms and must not be used commercially without a separate grant. English can use local neural HeadTTS; the GPU worker supplies the currently configured multilingual voices. Check docs/AI_AVATAR_ECOSYSTEM.md before redistribution.</small>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button className="mf-ghost" type="button" onClick={() => { const el = viewerRef.current as (HTMLElement & { cameraOrbit?: string; jumpCameraToGoal?: () => void }) | null; if (el) { el.cameraOrbit = "0deg 75deg 2.5m"; el.jumpCameraToGoal?.(); } }}>Reset view</button>
            <button className="mf-ghost" type="button" onClick={() => { if (localModelUrlRef.current) { URL.revokeObjectURL(localModelUrlRef.current); localModelUrlRef.current = null; } setLocalModelName(""); setTalkingEnabled(false); setTalkingReady(false); talkingHeadRef.current = null; headTtsRef.current = null; setModelUrl(DEFAULT_MODEL); setModelError(false); }}>Load sample model</button>
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
            {speechLanguage.toLowerCase().startsWith("en") && <label style={{ flex: 1, minWidth: 150 }}>Neural voice
              <select value={neuralVoice} onChange={(e) => setNeuralVoice(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
                <option value="am_fenrir">Fenrir · masculine</option>
                <option value="af_bella">Bella · feminine</option>
              </select>
            </label>}
            <label style={{ flex: 1, minWidth: 150 }}>AI voice style · Indic Parler
              <select value={indicVoiceStyle} onChange={(e) => setIndicVoiceStyle(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
                <option value="default">Language default</option>
                <option value="A female speaker">Female</option>
                <option value="A male speaker">Male</option>
                <option value="A warm, expressive female speaker">Warm and expressive</option>
                <option value="A deep, calm male speaker">Deep and calm</option>
              </select>
            </label>
          </div>
          <small style={{ opacity: .72, display: "block", marginBottom: 14 }}>No voice API key is needed for browser speech. English neural speech can run locally through HeadTTS when enabled; other languages use voices installed in your browser or operating system. The voice and language available depend on your device. Hosted TTS workers are optional and are not required for the base avatar.</small>
          <div className="mf-bar" style={{ marginBottom: 12 }}>
            <button className="mf-ghost" type="button" onClick={() => { const code = speechLanguage.toLowerCase().split("-")[0]; void speak(VOICE_TEST_PHRASES[code] || VOICE_TEST_PHRASES.en); }}>Test selected voice</button>
            <small style={{ opacity: .72 }}>Tests neural worker first, then local neural or installed browser voice.</small>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, marginBottom: 12 }}>
            <input type="checkbox" checked={voiceConsent} onChange={(e) => setVoiceConsent(e.target.checked)} style={{ marginTop: 2 }} />
            <span>I own or have permission to use the configured reference voice for voice cloning. Required only for OpenVoice voice-cloning workers.</span>
          </label>
          <h3>Optional hosted worker (not required)</h3>
          <p style={{ opacity: .75 }}>The default chat and speech path runs in your browser/device. These diagnostics are only for optional self-hosted workers; you do not need to configure them to use the local avatar.</p>
          <div className="mf-bar" style={{ marginTop: 10, marginBottom: 14 }}>
            <button className="mf-ghost" type="button" onClick={async () => { setStatus("Checking optional hosted worker…"); try { const response = await fetch("/api/ai/health", { cache: "no-store" }); const data = await response.json() as { status?: string; model?: string; error?: string }; if (!response.ok) throw new Error(data.error || "HTTP " + response.status); setStatus("Optional hosted worker " + (data.status || "reachable") + (data.model ? " · " + data.model : "")); } catch (error) { setStatus("Optional hosted worker unavailable · local mode remains available"); } }}>Check connection</button>
            <button className="mf-ghost" type="button" onClick={() => void checkWorkerCapabilities()}>Check voice capabilities</button>
            <button className="mf-ghost" type="button" disabled={localModelReady || localModelLoading} onClick={() => void loadLocalModel()}>{localModelLoading ? "Loading local AI…" : localModelReady ? "Local AI ready" : "Load local AI (no API)"}</button>
          </div>
          <div ref={streamingContainerRef} />
          <h3>Optional remote real-time streaming</h3>
          <p style={{ opacity: .75 }}>The local 3D avatar works without a streaming server. Remote WebRTC streaming is an advanced optional mode and requires a running compatible LiveTalking service; it is not needed for local chat or device speech.</p>
          <div style={{ border: "1px solid var(--mf-border, rgba(127,127,127,.25))", borderRadius: 12, padding: 14, background: "#101318", minHeight: 360 }}>
            <LiveTalkingNativePanel />
          </div>
          <small style={{ opacity: .72, display: "block", marginBottom: 12 }}>Configure LIVETALKING_INTERNAL_URL on the backend and deploy the open-source LiveTalking GPU service with compatible model checkpoints and reachable WebRTC media ports. Browser build success alone does not mean a GPU stream is online.</small>
          <small style={{ opacity: .72, display: "block", marginBottom: 12 }}>Local mode does not depend on the hosted worker. Browser speech synthesis is provided by your device and does not guarantee a neural voice for every language. Remote LiveTalking streaming remains optional and needs its own running server.</small>
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
          <small style={{ opacity: .7, marginTop: 12 }}>NKAI defaults to browser-local inference. The quantized Qwen model downloads on first use and needs network access for that download plus enough RAM/VRAM; after loading, inference runs on your device. No API key, token, Space ID, avatar ID, or paid cloud inference is required. Remote GPU/WebRTC services are optional only.</small>
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
  if (lower.includes("who are you") || lower.includes("your name")) return "I’m the NKAI Studio avatar. Load the browser-local open-source model for generated answers; no API key or hosted GPU worker is required.";
  if (lower.includes("help") || lower.includes("what can you do")) return "I can guide your work in short steps, help structure a presentation, practise an introduction, and read responses aloud. Load the browser-local open-source model for generated conversation.";
  if (lower.includes("thank")) return "You’re welcome. What should we work on next?";
  return `I heard: “${message.slice(0, 180)}”. This is the offline fallback, not a large language model. Check browser support and load the local open-source model for generated conversation.`;
}


function estimateVisemes(text: string, durationSeconds: number) {
  // Coarse text-timed visemes keep the mouth moving for external TTS audio.
  // For phoneme-accurate sync, use a TTS model that emits word/viseme timestamps.
  const visemes = Array.from(text.toLowerCase()).filter((char) => /[a-z]/.test(char) || char.charCodeAt(0) > 127).map((char) => {
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
    return "aa";
  });
  const step = visemes.length ? (durationSeconds * 1000) / visemes.length : 100;
  return { visemes, vtimes: visemes.map((_, index) => Math.round(index * step)), vdurations: visemes.map(() => Math.max(35, Math.round(step))) };
}
