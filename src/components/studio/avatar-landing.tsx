import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Camera, CameraOff, Check, ChevronDown, CircleHelp, Globe2, Languages, Mic, MicOff, MonitorPlay, Phone, Radio, Search, Send, Settings2, Sparkles, Volume2, VolumeX, Video, VideoOff, WandSparkles } from "lucide-react";
import { LiveTalkingNativePanel } from "@/components/studio/livetalking-native-panel";

type Avatar = { id: string; name: string; role: string; gender: "Woman" | "Man" | "Androgynous"; languages: string[]; tone: string; accent: string };
const AVATARS: Avatar[] = [
  { id: "maya", name: "Maya", role: "Warm conversation", gender: "Woman", languages: ["English", "Hindi", "Tamil"], tone: "warm", accent: "#b9a0ff" },
  { id: "arjun", name: "Arjun", role: "Career coach", gender: "Man", languages: ["English", "Hindi", "Punjabi"], tone: "clear", accent: "#8bd9c5" },
  { id: "sophia", name: "Sophia", role: "Language partner", gender: "Woman", languages: ["English", "French", "Spanish"], tone: "bright", accent: "#f1bd8b" },
  { id: "noah", name: "Noah", role: "Learning companion", gender: "Man", languages: ["English", "German", "Japanese"], tone: "calm", accent: "#89bfff" },
  { id: "isha", name: "Isha", role: "Mindful guide", gender: "Woman", languages: ["Hindi", "English", "Bengali"], tone: "gentle", accent: "#f2a9c5" },
  { id: "leo", name: "Leo", role: "Creative partner", gender: "Man", languages: ["English", "Spanish", "French"], tone: "energetic", accent: "#e6bd73" },
];
const LANGUAGES = ["English (India)", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi", "Punjabi", "Kannada", "Malayalam", "English (US)", "French", "German", "Spanish", "Japanese", "Korean", "Mandarin"];
const LANG_CODES: Record<string, string> = { "English (India)": "en-IN", Hindi: "hi-IN", Tamil: "ta-IN", Telugu: "te-IN", Bengali: "bn-IN", Marathi: "mr-IN", Punjabi: "pa-IN", Kannada: "kn-IN", Malayalam: "ml-IN", "English (US)": "en-US", French: "fr-FR", German: "de-DE", Spanish: "es-ES", Japanese: "ja-JP", Korean: "ko-KR", Mandarin: "zh-CN" };
type Message = { role: "you" | "avatar"; text: string; time: string };
const stamp = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function AvatarLandingPage() {
  const [avatarId, setAvatarId] = useState("maya");
  const [language, setLanguage] = useState("English (India)");
  const [gender, setGender] = useState("All");
  const [tab, setTab] = useState<"call" | "voices" | "languages" | "gallery">("call");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "avatar", text: "Hi, I’m Maya. Choose a language, say hello, or ask me to help you practise a conversation.", time: stamp() }]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"Any" | "Female" | "Male">("Any");
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [gpuOpen, setGpuOpen] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const code = LANG_CODES[language] || "en-IN";
  const filtered = useMemo(() => AVATARS.filter((a) => (gender === "All" || a.gender === gender) && (a.name + " " + a.role + " " + a.languages.join(" ")).toLowerCase().includes(query.toLowerCase())), [gender, query]);

  useEffect(() => {
    const refresh = () => setVoices(window.speechSynthesis?.getVoices() || []);
    refresh();
    window.speechSynthesis?.addEventListener?.("voiceschanged", refresh);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", refresh);
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOn]);

  function chooseAvatar(id: string) {
    const next = AVATARS.find((item) => item.id === id);
    if (!next) return;
    setAvatarId(id);
    setMessages((old) => [...old, { role: "avatar", text: `You’re now chatting with ${next.name}, your ${next.role.toLowerCase()}.`, time: stamp() }]);
  }

  async function toggleCamera() {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: micOn });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError("Camera permission was blocked or no camera is available. Allow camera access in your browser, then try again.");
    }
  }

  async function toggleMic() {
    if (micOn) {
      if (recognitionRef.current) recognitionRef.current.stop();
      streamRef.current?.getAudioTracks().forEach((track) => { track.stop(); });
      setMicOn(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCameraError("Speech recognition is not supported in this browser. You can still type a message and use voice playback.");
      return;
    }
    try {
      if (cameraOn && streamRef.current && !streamRef.current.getAudioTracks().length) {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        audio.getAudioTracks().forEach((track) => streamRef.current?.addTrack(track));
      }
      const recognition = new SpeechRecognition();
      recognition.lang = code;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const heard = event.results?.[0]?.[0]?.transcript;
        if (heard) void sendMessage(heard);
      };
      recognition.onerror = () => setCameraError("Could not hear you. Check microphone permission and try again.");
      recognition.onend = () => setMicOn(false);
      recognitionRef.current = recognition;
      recognition.start();
      setMicOn(true);
      setCameraError("");
    } catch {
      setCameraError("Microphone permission was blocked. Allow microphone access in your browser.");
    }
  }

  function speak(textToSpeak: string) {
    if (!("speechSynthesis" in window)) {
      setCameraError("Speech playback is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = code;
    utterance.rate = 0.96;
    const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
    const preferred = candidates.find((v) => voiceName && v.name === voiceName) || candidates[0] || voices.find((v) => v.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function speakGpuVoice(textToSpeak: string) {
    try {
      const response = await fetch("/api/avatar-ai/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: textToSpeak.slice(0, 500), language: code }),
      });
      const payload = await response.json() as { audio_base64?: string; mime_type?: string; error?: string; detail?: string };
      if (!response.ok || !payload.audio_base64) throw new Error(payload.error || payload.detail || "GPU voice is unavailable");
      const binary = atob(payload.audio_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: payload.mime_type || "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onplay = () => setSpeaking(true);
      audio.onended = audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch {
      // TTS is optional on a worker; keep the conversation usable with browser speech.
      speak(textToSpeak);
    }
  }

  async function sendMessage(value = text) {
    const prompt = value.trim();
    if (!prompt || aiBusy) return;
    setText("");
    setSessionStarted(true);
    setCameraError("");
    setAiBusy(true);
    setMessages((old) => [...old, { role: "you", text: prompt, time: stamp() }]);
    try {
      const history = messages.slice(-8).map((item) => ({
        role: item.role === "you" ? "user" : "assistant",
        text: item.text,
      }));
      const response = await fetch("/api/avatar-ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: prompt, language: code, history }),
      });
      const payload = await response.json() as { reply?: string; error?: string; detail?: string; code?: string };
      if (!response.ok || typeof payload.reply !== "string" || !payload.reply.trim()) {
        throw new Error(payload.error || payload.detail || (response.status === 401 ? "Sign in to use the GPU AI avatar." : "The NKAI GPU worker did not return a reply."));
      }
      const reply = payload.reply.trim();
      setMessages((old) => [...old, { role: "avatar", text: reply, time: stamp() }]);
      await speakGpuVoice(reply);
    } catch (cause) {
      setCameraError(cause instanceof Error ? cause.message : "Could not reach the NKAI GPU worker.");
    } finally {
      setAiBusy(false);
    }
  }

  const availableVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
  const genderFilteredVoices = availableVoices.filter((v) => voiceGender === "Any" || (voiceGender === "Female" ? /female|woman|zira|samantha|victoria|karen|susan|hazel|veena|heera|priya/i.test(v.name) : /male|man|david|mark|daniel|alex|ravi|guy/i.test(v.name)));
  const currentVoice = voiceName || genderFilteredVoices[0]?.name || availableVoices[0]?.name || "Browser default";

  return (
    <div className="nkai-home">
      <header className="nkai-home-nav">
        <a className="nkai-home-brand" href="/" aria-label="NKAI Studio home"><span className="nkai-brand-glyph"><Sparkles size={18} /></span><span>NKAI <b>STUDIO</b></span></a>
        <nav className="nkai-top-links" aria-label="Main navigation">
          <button className={tab === "call" ? "selected" : ""} onClick={() => setTab("call")}>Live call</button>
          <button className={tab === "voices" ? "selected" : ""} onClick={() => setTab("voices")}>Voices</button>
          <button className={tab === "languages" ? "selected" : ""} onClick={() => setTab("languages")}>Languages</button>
          <button className={tab === "gallery" ? "selected" : ""} onClick={() => setTab("gallery")}>Avatar gallery</button>
        </nav>
        <div className="nkai-nav-actions"><a className="nkai-secondary-link" href="/features">Features</a><a className="nkai-secondary-link" href="/help">Help</a><a className="nkai-studio-link" href="/studio">Open full studio <span>↗</span></a></div>
      </header>

      <main className="nkai-home-main">
        <section className="nkai-hero">
          <div className="nkai-hero-copy">
            <div className="nkai-eyebrow"><span className="nkai-pulse" /> YOUR CONVERSATION, REIMAGINED</div>
            <h1>Meet your AI.<br /><span>Face to face.</span></h1>
            <p>Choose a conversation profile, select your language, and chat by text or voice from one clean workspace.</p>
            <div className="nkai-hero-actions"><button className="nkai-button-primary" onClick={() => { setTab("call"); setSessionStarted(true); document.getElementById("nkai-call-stage")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><Video size={17} /> Start a conversation</button><button className="nkai-button-secondary" onClick={() => setTab("gallery")}><WandSparkles size={16} /> Explore avatars</button></div>
            <div className="nkai-trust-row"><span><Check size={14} /> Browser voice playback</span><span><Check size={14} /> 16 language choices</span><span><Check size={14} /> Camera stays on your device</span></div>
          </div>
          <div className="nkai-hero-visual nkai-hero-visual-clean" aria-label="Selected conversation partner">
            <div className="nkai-orbit nkai-orbit-one" /><div className="nkai-orbit nkai-orbit-two" />
            <div className="nkai-avatar-monogram" aria-hidden="true"><span>{avatar.name.slice(0, 1)}</span><i /><i /><i /></div>
            <div className="nkai-hero-caption"><span className="nkai-status-dot" /><span><b>{avatar.name}</b><small>{avatar.role} · {language}</small></span></div>
            <p className="nkai-hero-disclaimer">Portrait art is omitted until a real avatar model is connected.</p>
          </div>
        </section>

        <section className="nkai-workspace" id="nkai-call-stage">
          <div className="nkai-section-heading"><div><span className="nkai-eyebrow">YOUR PERSONAL AVATAR ROOM</span><h2>{tab === "call" ? "The conversation room" : tab === "voices" ? "Find your voice" : tab === "languages" ? "Speak your language" : "Meet the avatars"}</h2><p>{tab === "call" ? "A familiar side-by-side call layout, with your camera and your AI together." : tab === "voices" ? "Choose a voice profile and preview it before you start." : tab === "languages" ? "Switch the language for voice playback and speech recognition." : "Browse people by presentation style and choose who you want to talk to."}</p></div><div className="nkai-live-badge"><span className="nkai-status-dot" /> LOCAL PREVIEW</div></div>

          <div className="nkai-tab-strip" role="tablist" aria-label="Avatar workspace">
            <button role="tab" aria-selected={tab === "call"} className={tab === "call" ? "active" : ""} onClick={() => setTab("call")}><Video size={15} /> Live call</button>
            <button role="tab" aria-selected={tab === "voices"} className={tab === "voices" ? "active" : ""} onClick={() => setTab("voices")}><AudioLines size={15} /> Voice lab</button>
            <button role="tab" aria-selected={tab === "languages"} className={tab === "languages" ? "active" : ""} onClick={() => setTab("languages")}><Languages size={15} /> Languages</button>
            <button role="tab" aria-selected={tab === "gallery"} className={tab === "gallery" ? "active" : ""} onClick={() => setTab("gallery")}><Sparkles size={15} /> Avatar gallery</button>
          </div>

          {tab === "call" && <div className="nkai-call-layout">
            <section className="nkai-call-column">
              <div className="nkai-call-titlebar"><div><span className="nkai-call-kicker">NKAI LIVE ROOM</span><h3>Face-to-face conversation</h3></div><span className="nkai-encrypted"><span className="nkai-status-dot" /> Ready</span></div>
              <div className="nkai-video-grid">
                <div className="nkai-video-tile nkai-avatar-tile" style={{ "--avatar-accent": avatar.accent } as React.CSSProperties}>
                  <img src={avatar.image} alt={`${avatar.name} avatar portrait`} className={speaking ? "is-speaking" : ""} />
                  <div className="nkai-video-shade" />
                  <div className="nkai-tile-top"><span className="nkai-tile-tag"><Sparkles size={12} /> AI AVATAR</span><span className="nkai-quality-tag">HD PREVIEW</span></div>
                  <div className="nkai-avatar-caption"><span className="nkai-speaking-bars">{[0,1,2,3].map((n) => <i key={n} />)}</span><span><b>{avatar.name}</b><small>{avatar.role}</small></span><button aria-label={speaking ? "Mute avatar voice" : "Play avatar voice"} onClick={() => speaking ? window.speechSynthesis.cancel() : speak(`Hi, I’m ${avatar.name}. Nice to meet you. What would you like to talk about today?`)}>{speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></div>
                </div>
                <div className="nkai-video-tile nkai-user-tile">
                  {cameraOn ? <video ref={videoRef} autoPlay playsInline muted aria-label="Your live camera preview" /> : <div className="nkai-camera-placeholder"><div className="nkai-camera-icon"><CameraOff size={23} /></div><b>Your camera preview</b><span>Camera is off</span><button onClick={() => void toggleCamera()}><Camera size={14} /> Enable camera</button></div>}
                  <div className="nkai-tile-top"><span className="nkai-tile-tag"><UserRoundIcon /> YOU</span><span className="nkai-quality-tag">{cameraOn ? "CAMERA ON" : "PRIVATE"}</span></div>
                  {cameraOn && <div className="nkai-user-caption"><b>You</b><small>{micOn ? "Microphone on" : "Camera preview"}</small></div>}
                </div>
              </div>
              {cameraError && <div className="nkai-inline-error" role="status">{cameraError}</div>}
              <div className="nkai-call-controls"><button className={micOn ? "nkai-control active" : "nkai-control"} onClick={() => void toggleMic()}><span>{micOn ? <Mic size={17} /> : <MicOff size={17} />}</span><small>{micOn ? "Listening…" : "Mic"}</small></button><button className={cameraOn ? "nkai-control active" : "nkai-control"} onClick={() => void toggleCamera()}><span>{cameraOn ? <Camera size={17} /> : <VideoOff size={17} />}</span><small>{cameraOn ? "Camera on" : "Camera"}</small></button><button className="nkai-control" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }}><span><VolumeX size={17} /></span><small>Mute voice</small></button><button className="nkai-control nkai-control-settings" onClick={() => setTab("voices")}><span><Settings2 size={17} /></span><small>Settings</small></button><button className="nkai-end-call" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); setSessionStarted(false); if (recognitionRef.current) recognitionRef.current.stop(); setMicOn(false); }}><Phone size={17} /> End</button></div>
              <div className="nkai-call-footnote"><CircleHelp size={14} /> Camera and microphone require browser permission. This is a local preview; GPU-generated video is available when the LiveTalking worker is configured.</div>
            </section>
            <aside className="nkai-chat-column"><div className="nkai-chat-head"><div><span className="nkai-chat-avatar"><img src={avatar.image} alt="" /></span><span><b>{avatar.name}</b><small>{sessionStarted ? "Conversation started" : "Ready when you are"}</small></span></div><span className="nkai-chat-dots">•••</span></div><div className="nkai-chat-meta"><span><Languages size={13} /> {language}</span><span><span className="nkai-status-dot" /> {aiBusy ? "GPU thinking…" : speaking ? "Speaking" : "GPU voice ready"}</span></div><div className="nkai-messages" aria-live="polite">{messages.map((m, i) => <div className={m.role === "you" ? "nkai-message you" : "nkai-message"} key={i}><span className="nkai-message-author">{m.role === "you" ? "YOU" : avatar.name.toUpperCase()} <time>{m.time}</time></span><p>{m.text}</p>{m.role === "avatar" && <button className="nkai-replay" onClick={() => speak(m.text)}><Volume2 size={12} /> Listen</button>}</div>)}</div><form className="nkai-composer" onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder={aiBusy ? "The GPU avatar is thinking…" : `Message ${avatar.name}…`} aria-label="Message your avatar" disabled={aiBusy} /><button type="submit" disabled={!text.trim() || aiBusy} aria-label="Send message">{aiBusy ? <span className="nkai-pulse" /> : <Send size={16} />}</button></form><div className="nkai-chat-disclaimer">Replies use the connected NKAI GPU AI worker. Spoken audio uses GPU TTS when available, with browser voice as fallback.</div></aside>
          </div>}

          {tab === "voices" && <div className="nkai-tool-panel"><div className="nkai-tool-intro"><div className="nkai-tool-icon"><AudioLines size={22} /></div><div><h3>Voice lab</h3><p>Use voices installed in your browser. Availability varies by operating system and language.</p></div></div><div className="nkai-settings-grid"><label>Speech language<select value={language} onChange={(e) => { setLanguage(e.target.value); setVoiceName(""); }}><option value={language}>{language}</option>{LANGUAGES.filter((l) => l !== language).map((l) => <option key={l} value={l}>{l}</option>)}</select></label><label>Voice presentation<select value={voiceGender} onChange={(e) => { setVoiceGender(e.target.value as typeof voiceGender); setVoiceName(""); }}><option>Any</option><option>Female</option><option>Male</option></select></label><label className="nkai-span-two">Installed voice<select value={currentVoice} onChange={(e) => setVoiceName(e.target.value)}>{genderFilteredVoices.length ? genderFilteredVoices.map((v) => <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>) : <option value="Browser default">Browser default (voice list may be limited)</option>}</select></label></div><div className="nkai-voice-preview"><div className="nkai-voice-wave">{Array.from({length:30},(_,i)=><i key={i} style={{height:`${10+((i*17)%25)}px`}} />)}</div><div><b>{currentVoice}</b><small>{code} · {speaking ? "Playing preview" : "Ready to preview"}</small></div><button className="nkai-button-primary" onClick={() => speak(language === "Hindi" ? "नमस्ते, मैं आपकी एआई साथी हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?" : `Hello, I’m ${avatar.name}, your AI conversation partner. Let’s talk in ${language}.`)}><Volume2 size={16} /> Preview voice</button></div><p className="nkai-note">Gender labels are estimated from voice names where possible; your browser may offer different voices. This setting selects speech output and does not change the avatar's appearance.</p></div>}

          {tab === "languages" && <div className="nkai-tool-panel"><div className="nkai-tool-intro"><div className="nkai-tool-icon"><Globe2 size={22} /></div><div><h3>Choose a language</h3><p>Your selection updates voice playback and the language used for browser speech recognition.</p></div></div><div className="nkai-language-grid">{LANGUAGES.map((l) => <button key={l} className={language === l ? "chosen" : ""} onClick={() => { setLanguage(l); setVoiceName(""); }}><span className="nkai-language-symbol">{l === "Hindi" ? "हि" : l === "Tamil" ? "த" : l === "Japanese" ? "あ" : l === "Mandarin" ? "文" : l.slice(0,2).toUpperCase()}</span><span><b>{l}</b><small>{LANG_CODES[l]}</small></span>{language === l && <Check size={16} />}</button>)}</div><div className="nkai-language-footer"><span><Check size={16} /> Selected: <b>{language}</b></span><button className="nkai-button-primary" onClick={() => speak(language === "Hindi" ? "नमस्ते! चलिए बात शुरू करते हैं।" : `Hello! Let's start a conversation in ${language}.`)}><Volume2 size={15} /> Hear sample</button></div></div>}

          {tab === "gallery" && <div className="nkai-gallery-panel"><div className="nkai-gallery-toolbar"><div className="nkai-filter-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, role, language…" /></div><div className="nkai-gender-filters">{["All","Woman","Man","Androgynous"].map((g) => <button key={g} className={gender === g ? "active" : ""} onClick={() => setGender(g)}>{g === "Woman" ? "Women" : g === "Man" ? "Men" : g}</button>)}</div></div><div className="nkai-avatar-grid">{filtered.map((a) => <button key={a.id} className={avatarId === a.id ? "nkai-avatar-card chosen" : "nkai-avatar-card"} onClick={() => { chooseAvatar(a.id); setTab("call"); }}><span className="nkai-card-image nkai-card-initial" aria-hidden="true"><span>{a.name.slice(0, 1)}</span><span className="nkai-card-badge">{a.gender}</span><span className="nkai-card-select">{avatarId === a.id ? <Check size={15} /> : <Sparkles size={15} />}</span></span><span className="nkai-card-copy"><b>{a.name}</b><small>{a.role}</small><span>{a.languages.slice(0,3).join(" · ")}</span></span></button>)}</div>{filtered.length === 0 && <div className="nkai-empty-state">No avatars match those filters. Try another search.</div>}<p className="nkai-note">These are conversation profiles, not rendered 3D humans. A live digital-human stream appears only after a compatible GPU avatar service is connected.</p></div>}

          <div className="nkai-gpu-connect"><div className="nkai-gpu-symbol"><Radio size={20} /></div><div><b>Want a real-time generated digital human?</b><p>Connect the LiveTalking GPU worker to replace the portrait preview with a live avatar video stream.</p></div><button className="nkai-button-secondary" onClick={() => setGpuOpen((v) => !v)}>{gpuOpen ? "Hide connection" : "Connect Live GPU"} <ChevronDown size={15} /></button></div>
          {gpuOpen && <div className="nkai-gpu-panel"><LiveTalkingNativePanel /></div>}
        </section>
        <footer className="nkai-home-footer"><a className="nkai-home-brand" href="/"><span className="nkai-brand-glyph"><Sparkles size={16} /></span><span>NKAI <b>STUDIO</b></span></a><span>Open-source-first AI · Clear status · Responsive by design</span><span className="nkai-footer-links"><a href="/features">Features</a><a href="/help">Help &amp; setup</a><a href="/deployment">Deployment status</a><a href="/gateway">Gateway check</a><a href="/studio">Open studio ↗</a></span></footer>
      </main>
    </div>
  );
}

function UserRoundIcon() {
  return <span className="nkai-user-mini-icon">●</span>;
}
