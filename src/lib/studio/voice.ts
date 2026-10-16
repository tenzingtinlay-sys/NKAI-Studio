import { studioVoice } from "./ai";
import { visemeAt } from "./media";
import { useStudio } from "./store";

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: Event) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function Recog() {
  const w = window as unknown as {
    SpeechRecognition?: new () => Rec;
    webkitSpeechRecognition?: new () => Rec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function canListen() {
  return typeof window !== "undefined" && Boolean(Recog());
}

export function listenOnce(lang: string) {
  const Ctor = Recog();
  if (!Ctor) return Promise.reject(new Error("Speech recognition needs Chrome or Edge."));
  return new Promise<string>((resolve, reject) => {
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const ev = e as unknown as { results: Array<{ 0: { transcript: string } }> };
      resolve(ev.results[0][0].transcript);
    };
    r.onerror = () => reject(new Error("Microphone did not return speech."));
    r.onend = () => reject(new Error("No speech heard."));
    try {
      r.start();
    } catch {
      reject(new Error("Microphone is busy."));
    }
  });
}

let stopAudio: (() => void) | null = null;

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
  stopAudio?.();
  stopAudio = null;
}

export function browserVoices() {
  if (typeof speechSynthesis === "undefined") return [] as SpeechSynthesisVoice[];
  return speechSynthesis.getVoices();
}

export type VoiceGender = "female" | "male";

/** Browsers load their voice list asynchronously; wait briefly for it. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === "undefined") return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 1200);
  });
}

// Voice names that indicate a higher-quality neural/enhanced engine.
const NATURAL_RE = /natural|neural|online|enhanced|premium|wavenet|studio/i;
// Novelty / low-quality voices that should never be chosen automatically.
const BAD_RE =
  /espeak|compact|novelty|zarvox|bad news|good news|bells|bahh|boing|cellos|whisper|trinoids|wobble|albert|jester|organ|superstar|deranged|hysterical|pipe organ/i;
const FEMALE_RE =
  /\b(female|woman|aria|jenny|sonia|libby|maisie|zira|samantha|karen|moira|tessa|serena|victoria|susan|hazel|heera|neerja|swara|kalpana|jessica|michelle|emma|ava|sara|elsa|hedda|amelie|denise|ana|natasha|clara|nova|allison|fiona)\b/i;
const MALE_RE =
  /\b(male|man|guy|davis|ryan|christopher|eric|roger|steffan|mark|david|daniel|alex|fred|george|james|thomas|oliver|prabhat|madhur|ravi|hemant|mohan|jorge|liam|brian|andrew|tom|aaron|arthur|gordon)\b/i;

// The built-in presenter library: Maya, Elena, Sofia are female; Noah, James, Arjun are male.
const FEMALE_PRESENTERS = new Set(["maya", "elena", "sofia"]);
const MALE_PRESENTERS = new Set(["noah", "james", "arjun"]);

/** Gender of the currently selected presenter, when it is one of the known library avatars. */
function presenterGender(): VoiceGender | undefined {
  try {
    const s = useStudio.getState();
    const name = s.avatars[s.avatar]?.name?.toLowerCase().trim() || "";
    if (FEMALE_PRESENTERS.has(name)) return "female";
    if (MALE_PRESENTERS.has(name)) return "male";
  } catch {
    /* store not ready */
  }
  return undefined;
}

function scoreVoice(v: SpeechSynthesisVoice, lang: string, gender?: VoiceGender): number {
  const vl = v.lang.replace("_", "-").toLowerCase();
  const want = lang.replace("_", "-").toLowerCase();
  let score = 0;
  if (vl === want) score += 40;
  else if (vl.split("-")[0] === want.split("-")[0]) score += 25;
  else return -1000;
  if (NATURAL_RE.test(v.name)) score += 50;
  if (/google/i.test(v.name)) score += 20;
  if (!v.localService) score += 5;
  if (v.default) score += 2;
  if (BAD_RE.test(v.name)) score -= 200;
  if (gender) {
    const isFemale = FEMALE_RE.test(v.name);
    const isMale = !isFemale && MALE_RE.test(v.name);
    if (gender === "female") {
      if (isFemale) score += 30;
      else if (isMale) score -= 60;
    } else {
      if (isMale) score += 30;
      else if (isFemale) score -= 60;
    }
  }
  return score;
}

/**
 * Pick the most natural installed browser voice for a language and (optional) gender.
 * Prefers neural/"Natural"/Google voices, avoids novelty voices, and matches gender by name.
 */
export function bestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  gender?: VoiceGender,
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const s = scoreVoice(v, lang, gender);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best && bestScore > -100 ? best : null;
}

export async function speakLine(opts: {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voiceName?: string;
  gender?: VoiceGender;
  neural: boolean;
  neuralId?: string;
  onMouth: (open: number) => void;
}) {
  stopSpeaking();
  const text = opts.text.trim();
  if (!text) return;
  if (opts.neural) {
    const spoken = await studioVoice({
      data: { text, voice: opts.neuralId || "eve", lang: opts.lang },
    });
    if (spoken.ok) {
      await playNeural(spoken.audio, spoken.mime, text, opts.onMouth);
      return;
    }
  }
  await playSystem(text, opts);
}

async function playSystem(text: string, opts: {
  lang: string;
  rate: number;
  pitch: number;
  voiceName?: string;
  gender?: VoiceGender;
  onMouth: (open: number) => void;
}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = await loadVoices();
  // An explicitly chosen voice wins; otherwise pick the most natural voice for the
  // language and the presenter's gender instead of the browser's single default.
  const chosen =
    voices.find((v) => v.name === opts.voiceName) ||
    bestVoice(voices, opts.lang, opts.gender ?? presenterGender());
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = chosen?.lang || opts.lang;
    u.rate = opts.rate || 1;
    u.pitch = opts.pitch || 1;
    if (chosen) u.voice = chosen;
    const dur = Math.max(900, text.length * 62);
    const t0 = performance.now();
    let timer = 0;
    const tick = () => {
      const t = performance.now() - t0;
      opts.onMouth(visemeAt(text, t, dur));
      if (t < dur + 200) timer = requestAnimationFrame(tick);
    };
    u.onstart = () => {
      timer = requestAnimationFrame(tick);
    };
    u.onend = u.onerror = () => {
      cancelAnimationFrame(timer);
      opts.onMouth(0.04);
      resolve();
    };
    speechSynthesis.speak(u);
    stopAudio = () => {
      cancelAnimationFrame(timer);
      speechSynthesis.cancel();
      opts.onMouth(0.04);
      resolve();
    };
  });
}

async function playNeural(b64: string, mime: string, text: string, onMouth: (n: number) => void) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(bytes.buffer.slice(0));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  const data = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const t0 = performance.now();
  const dur = buf.duration * 1000;
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) {
      const n = (v - 128) / 128;
      sum += n * n;
    }
    const rms = Math.min(1, Math.sqrt(sum / data.length) * 4.2);
    const vis = visemeAt(text, performance.now() - t0, dur);
    onMouth(Math.max(rms, vis * 0.85));
    raf = requestAnimationFrame(tick);
  };
  await new Promise<void>((resolve) => {
    src.onended = () => {
      cancelAnimationFrame(raf);
      onMouth(0.04);
      void ctx.close();
      resolve();
    };
    stopAudio = () => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      cancelAnimationFrame(raf);
      onMouth(0.04);
      void ctx.close();
      resolve();
    };
    src.start();
    raf = requestAnimationFrame(tick);
  });
}

export async function playShifted(srcUrl: string, rate: number) {
  const ctx = new AudioContext();
  const res = await fetch(srcUrl);
  const buf = await ctx.decodeAudioData(await res.arrayBuffer());
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  src.start();
  src.onended = () => void ctx.close();
}
