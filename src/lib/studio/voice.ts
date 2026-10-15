import { studioVoice } from "./ai";
import { visemeAt } from "./media";

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

export async function speakLine(opts: {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voiceName?: string;
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

function playSystem(text: string, opts: {
  lang: string;
  rate: number;
  pitch: number;
  voiceName?: string;
  onMouth: (open: number) => void;
}) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang;
    u.rate = opts.rate || 1;
    u.pitch = opts.pitch || 1;
    const voice = speechSynthesis.getVoices().find((v) => v.name === opts.voiceName);
    if (voice) u.voice = voice;
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
