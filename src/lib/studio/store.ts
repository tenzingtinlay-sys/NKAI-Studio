import { create } from "zustand";
import {
  BG_OFFICE,
  LIBRARY,
  defaultScenes,
  uid,
  type Agent,
  type Avatar,
  type Brand,
  type LibImage,
  type MemoryItem,
  type Perf,
  type Project,
  type Scene,
  type Settings,
  type ViewId,
  type VoicePreset,
} from "./types";

const KEY = "mediaforge-v5";

type Snap = {
  name: string;
  scenes: Scene[];
  avatar: number;
  scene: number;
  vp: VoicePreset | null;
};

export type StudioState = {
  hydrated: boolean;
  view: ViewId;
  tab: "identity" | "voice" | "performance" | "advanced";
  name: string;
  pid: string;
  avatars: Avatar[];
  avatar: number;
  scenes: Scene[];
  scene: number;
  vp: VoicePreset | null;
  voices: VoicePreset[];
  agents: Agent[];
  agent: number;
  mem: MemoryItem[];
  projects: Project[];
  imgs: LibImage[];
  brand: Brand;
  settings: Settings;
  perf: Perf;
  query: string;
  toast: string;
  mouth: number;
  speaking: boolean;
  liveOn: boolean;
  gpu: string;
  engine: string;
  progress: string;
  lastVideo: { url: string; note: string } | null;
  scriptOpen: boolean;
  moreOpen: boolean;
  history: Snap[];
  future: Snap[];
  designHtml: string;
  designPrompt: string;
  designRef: string;
  designKind: string;
  log: string[];
  hydrate: () => void;
  persist: () => void;
  flash: (m: string) => void;
  go: (v: ViewId) => void;
  setTab: (t: StudioState["tab"]) => void;
  remember: () => void;
  undo: () => void;
  redo: () => void;
  updateScene: (i: number, patch: Partial<Scene>) => void;
  setScenes: (scenes: Scene[], name?: string) => void;
};

const baseScenes = defaultScenes(LIBRARY[0].src);

function fresh(): Omit<
  StudioState,
  "hydrate" | "persist" | "flash" | "go" | "setTab" | "remember" | "undo" | "redo" | "updateScene" | "setScenes"
> {
  return {
    hydrated: false,
    view: "studio",
    tab: "identity",
    name: "Personal Guide",
    pid: "p0",
    avatars: LIBRARY,
    avatar: 0,
    scenes: baseScenes,
    scene: 0,
    vp: null,
    voices: [],
    agents: [
      {
        name: "Maya, Personal Guide",
        prompt:
          "You are Maya, a warm, practical personal guide. Help people turn problems into clear next steps. Speak in short sentences.",
        hist: [],
      },
    ],
    agent: 0,
    mem: [],
    projects: [],
    imgs: [],
    brand: { c1: "#f3f5f7", c2: "#8ab4ff", font: "Manrope", tag: "Personal Guide", logo: "" },
    settings: { res: "720", fps: "30", lang: "en-US", aspect: "16:9", mem: true, neural: false },
    perf: {
      expression: "Neutral",
      energy: 56,
      gesture: 42,
      eye: true,
      lipsync: true,
      camera: "Eye-level",
      framing: "Center",
      preset: "Executive",
      bg: "Executive Studio",
    },
    query: "",
    toast: "",
    mouth: 0.04,
    speaking: false,
    liveOn: false,
    gpu: "checking",
    engine: "…",
    progress: "",
    lastVideo: null,
    scriptOpen: false,
    moreOpen: false,
    history: [],
    future: [],
    designHtml: "",
    designPrompt: "",
    designRef: "",
    designKind: "landing",
    log: [],
  };
}

function snapOf(s: StudioState): Snap {
  return {
    name: s.name,
    scenes: s.scenes,
    avatar: s.avatar,
    scene: s.scene,
    vp: s.vp,
  };
}

export const useStudio = create<StudioState>((set, get) => ({
  ...fresh(),
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        set({ hydrated: true });
        get().persist();
        return;
      }
      const d = JSON.parse(raw) as Partial<ReturnType<typeof pack>>;
      const custom = (d.avatars || []).filter((a) => a.custom);
      const avatars = [...LIBRARY, ...custom];
      set({
        hydrated: true,
        avatars,
        name: d.name || "Personal Guide",
        pid: d.pid || "p0",
        scenes: d.scenes?.length ? d.scenes : baseScenes,
        scene: d.scene || 0,
        avatar: Math.min(d.avatar || 0, avatars.length - 1),
        vp: d.vp || null,
        voices: d.voices || [],
        agents: d.agents?.length ? d.agents : get().agents,
        mem: d.mem || [],
        projects: d.projects || [],
        imgs: (d.imgs || []).slice(0, 12),
        brand: { ...get().brand, ...d.brand },
        settings: { ...get().settings, ...d.settings },
        perf: { ...get().perf, ...d.perf },
      });
    } catch {
      set({ hydrated: true });
    }
  },
  persist: () => {
    const payload = pack(get());
    set({ projects: payload.projects });
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
      set({ toast: "Browser storage is full. Delete a saved image or project." });
    }
  },
  flash: (m) => {
    set({ toast: m });
    window.setTimeout(() => {
      if (get().toast === m) set({ toast: "" });
    }, 2400);
  },
  go: (v) => {
    set({ view: v, moreOpen: false, liveOn: v === "live" ? get().liveOn : false });
    get().persist();
  },
  setTab: (t) => set({ tab: t }),
  remember: () => {
    const s = get();
    set({ history: [...s.history, snapOf(s)].slice(-30), future: [] });
  },
  undo: () => {
    const s = get();
    const prev = s.history[s.history.length - 1];
    if (!prev) return s.flash("Nothing to undo");
    set({
      history: s.history.slice(0, -1),
      future: [...s.future, snapOf(s)],
      ...prev,
    });
    get().persist();
  },
  redo: () => {
    const s = get();
    const next = s.future[s.future.length - 1];
    if (!next) return s.flash("Nothing to redo");
    set({
      future: s.future.slice(0, -1),
      history: [...s.history, snapOf(s)],
      ...next,
    });
    get().persist();
  },
  updateScene: (i, patch) => {
    const scenes = get().scenes.map((sc, idx) => (idx === i ? { ...sc, ...patch } : sc));
    set({ scenes });
    get().persist();
  },
  setScenes: (scenes, name) => {
    get().remember();
    set({ scenes, scene: 0, ...(name ? { name } : {}) });
    get().persist();
  },
}));

function pack(s: StudioState) {
  const project: Project = {
    id: s.pid,
    name: s.name,
    t: Date.now(),
    scenes: s.scenes,
    avatar: s.avatar,
    vp: s.vp,
    scene: s.scene,
  };
  const projects = s.projects.some((p) => p.id === s.pid)
    ? s.projects.map((p) => (p.id === s.pid ? project : p))
    : [project, ...s.projects];
  return {
    name: s.name,
    pid: s.pid,
    scenes: s.scenes,
    scene: s.scene,
    avatar: s.avatar,
    vp: s.vp,
    voices: s.voices,
    agents: s.agents.map((a) => ({ ...a, hist: a.hist.slice(-30) })),
    mem: s.mem,
    projects,
    imgs: s.imgs.slice(0, 12),
    brand: s.brand,
    settings: s.settings,
    perf: s.perf,
    avatars: s.avatars.filter((a) => a.custom),
  };
}

export function memoryBlock(s: Pick<StudioState, "settings" | "mem">) {
  if (!s.settings.mem || !s.mem.length) return "";
  return `\nKnown facts:\n${s.mem.map((m) => `- ${m.t}`).join("\n")}`;
}

export function currentBg(s: Pick<StudioState, "perf" | "scenes" | "scene">) {
  return s.scenes[s.scene]?.img || BG_OFFICE;
}

export { BG_OFFICE };
