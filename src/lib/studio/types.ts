export type ViewId =
  | "studio"
  | "avatars"
  | "video"
  | "images"
  | "voice"
  | "agents"
  | "live"
  | "projects"
  | "templates"
  | "scenes"
  | "brand"
  | "director"
  | "memory"
  | "design"
  | "integrations"
  | "settings"
  | "search";

export type Scene = {
  title: string;
  text: string;
  dur: number;
  img: string;
};

export type Avatar = { name: string; src: string; custom?: boolean };

export type VoicePreset = {
  name: string;
  voice: string;
  rate: number;
  pitch: number;
  neural?: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type Agent = {
  name: string;
  prompt: string;
  hist: ChatTurn[];
};

export type MemoryItem = { t: string; d: number };

export type Project = {
  id: string;
  name: string;
  t: number;
  scenes: Scene[];
  avatar: number;
  vp: VoicePreset | null;
  scene: number;
};

export type Brand = {
  c1: string;
  c2: string;
  font: string;
  tag: string;
  logo: string;
};

export type Settings = {
  res: "480" | "720" | "1080";
  fps: "24" | "30" | "60";
  lang: string;
  aspect: "16:9" | "9:16" | "1:1";
  mem: boolean;
  neural: boolean;
};

export type Perf = {
  expression: string;
  energy: number;
  gesture: number;
  eye: boolean;
  lipsync: boolean;
  camera: "Eye-level" | "Close" | "Medium";
  framing: "Center" | "Left" | "Right";
  preset: string;
  bg: string;
};

export type LibImage = { u: string; full: string; prompt: string };

export const BG_OFFICE =
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80";
export const BG_LOFT =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80";
export const BG_LIBRARY =
  "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80";
export const BG_DARK =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80";

export const BG_MAP: Record<string, string> = {
  "Executive Studio": BG_OFFICE,
  "Minimal Loft": BG_LOFT,
  "Warm Library": BG_LIBRARY,
  "Dark Editorial": BG_DARK,
};

export const LIBRARY: Avatar[] = [
  {
    name: "Maya",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Elena",
    src: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Sofia",
    src: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Noah",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "James",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Arjun",
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
  },
];

export const NEURAL_VOICES = [
  { id: "eve", label: "Eve · warm" },
  { id: "ara", label: "Ara · clear" },
  { id: "leo", label: "Leo · steady" },
  { id: "rex", label: "Rex · low" },
  { id: "sal", label: "Sal · bright" },
] as const;

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function defaultScenes(avatarSrc: string): Scene[] {
  return [
    {
      title: "Opening",
      text: "How can I help you today?",
      dur: 7,
      img: avatarSrc,
    },
    {
      title: "Guidance",
      text: "Tell me what you are working through. We can break it down together.",
      dur: 9,
      img: BG_LOFT,
    },
    {
      title: "Next step",
      text: "We will turn the challenge into a clear, practical next step.",
      dur: 8,
      img: BG_OFFICE,
    },
  ];
}
