import { useEffect, useRef } from "react";
import {
  AudioLines,
  Bot,
  Brain,
  Clapperboard,
  CloudCog,
  FolderKanban,
  Image as ImageIcon,
  LayoutTemplate,
  Menu,
  Mic,
  Palette,
  PenTool,
  Plug,
  Radio,
  Redo2,
  Search,
  Settings,
  Sparkles,
  Undo2,
  UserRound,
  Video,
} from "lucide-react";
import { studioHealth, studioScript } from "@/lib/studio/ai";
import { drawTalking, loadImage, renderScenes } from "@/lib/studio/media";
import { PANELS } from "@/components/studio/panels";
import { useStudio } from "@/lib/studio/store";
import { BG_MAP, BG_OFFICE, type ViewId } from "@/lib/studio/types";
import { speakLine } from "@/lib/studio/voice";

const NAV: { id: ViewId; label: string; icon: typeof Video; group: string }[] = [
  { id: "studio", label: "Studio", icon: Video, group: "Create" },
  { id: "avatars", label: "Avatars", icon: UserRound, group: "Create" },
  { id: "video", label: "Video", icon: Clapperboard, group: "Create" },
  { id: "images", label: "Images", icon: ImageIcon, group: "Create" },
  { id: "voice", label: "Voice", icon: AudioLines, group: "Create" },
  { id: "agents", label: "Agents", icon: Bot, group: "Create" },
  { id: "live", label: "Live Avatar", icon: Radio, group: "Create" },
  { id: "liveavatar-cloud", label: "LiveAvatar Cloud", icon: Radio, group: "Create" },
  { id: "projects", label: "Projects", icon: FolderKanban, group: "Workspace" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, group: "Workspace" },
  { id: "scenes", label: "Scenes", icon: Clapperboard, group: "Workspace" },
  { id: "brand", label: "Brand Kit", icon: Palette, group: "Workspace" },
  { id: "director", label: "AI Director", icon: Sparkles, group: "Intelligence" },
  { id: "memory", label: "Memory", icon: Brain, group: "Intelligence" },
  { id: "design", label: "DesignForge", icon: PenTool, group: "Intelligence" },
  { id: "integrations", label: "Integrations", icon: Plug, group: "System" },
  { id: "settings", label: "Settings", icon: Settings, group: "System" },
];

function clock(scenes: { dur: number }[]) {
  const d = scenes.reduce((a, s) => a + s.dur, 0);
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

export function StudioApp() {
  const view = useStudio((s) => s.view);
  const toast = useStudio((s) => s.toast);
  const scriptOpen = useStudio((s) => s.scriptOpen);
  const moreOpen = useStudio((s) => s.moreOpen);
  const name = useStudio((s) => s.name);
  const scenes = useStudio((s) => s.scenes);
  const hydrated = useStudio((s) => s.hydrated);

  useEffect(() => {
    useStudio.getState().hydrate();
    void (async () => {
      try {
        const h = await studioHealth();
        useStudio.setState({ engine: h.engine === "grok" ? `grok · ${h.model}` : "local engine" });
      } catch {
        useStudio.setState({ engine: "local engine" });
      }
      if (!navigator.gpu) {
        useStudio.setState({ gpu: "canvas 2d" });
        return;
      }
      const adapter = await navigator.gpu.requestAdapter().catch(() => null);
      useStudio.setState({ gpu: adapter ? "webgpu" : "canvas 2d" });
    })();
    const id = window.setInterval(() => useStudio.getState().persist(), 8000);
    return () => window.clearInterval(id);
  }, []);

  const Panel = view !== "studio" ? PANELS[view] : null;

  return (
    <div className="mf">
      <header className="mf-top">
        <div className="mf-brand">
          <div className="mf-mark">
            <i />
          </div>
          NKAI Studio
        </div>
        <div className="mf-crumbs">
          <span>Projects</span>
          <span>›</span>
          <b>{name}</b>
          <span>›</span>
          <b>{NAV.find((n) => n.id === view)?.label || "Studio"}</b>
        </div>
        <form
          className="mf-search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q");
            if (typeof q === "string" && q.trim()) {
              useStudio.setState({ query: q.trim() });
              useStudio.getState().go("search");
            }
          }}
        >
          <span>
            <Search size={14} />
          </span>
          <input name="q" placeholder="Search projects, avatars, scenes…" aria-label="Search" />
        </form>
        <div className="mf-actions">
          <div className="mf-save">
            <i />
            <span>{hydrated ? "Saved in this browser" : "Opening studio"}</span>
          </div>
          <button className="mf-icon" aria-label="Undo" onClick={() => useStudio.getState().undo()}>
            <Undo2 size={16} />
          </button>
          <button className="mf-icon" aria-label="Redo" onClick={() => useStudio.getState().redo()}>
            <Redo2 size={16} />
          </button>
          <button className="mf-ghost mf-hide-sm" onClick={() => void previewLine()}>
            Preview
          </button>
          <button className="mf-primary" onClick={() => void publish()}>
            Publish
          </button>
        </div>
      </header>
      <div className={`mf-body ${view === "studio" ? "is-studio" : ""}`}>
        <aside className="mf-side">
          {["Create", "Workspace", "Intelligence", "System"].map((group) => (
            <div key={group}>
              <div className="mf-navlabel">{group}</div>
              <nav className="mf-nav">
                {NAV.filter((n) => n.group === group).map((n) => (
                  <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => useStudio.getState().go(n.id)}>
                    <n.icon size={16} />
                    {n.label}
                  </button>
                ))}
                {group === "System" && (
                  <button onClick={() => window.location.assign("/gateway")}>
                    <CloudCog size={16} />
                    Cloudflare Gateway
                  </button>
                )}
              </nav>
            </div>
          ))}
          <div className="mf-mini">
            <small>Current project</small>
            <strong style={{ display: "block", marginTop: 4 }}>{name}</strong>
            <small>
              {scenes.length} scenes · {clock(scenes)}
            </small>
          </div>
        </aside>
        <main className="mf-main">
          {view === "studio" ? (
            <>
              <StudioCenter />
              <Timeline />
            </>
          ) : (
            Panel && <Panel />
          )}
        </main>
        {view === "studio" && (
          <aside className="mf-right">
            <Inspector />
          </aside>
        )}
      </div>
      {view === "studio" && (
        <div className="mf-mobile-ins">
          <Inspector />
        </div>
      )}
      <nav className="mf-dock">
        {(
          [
            ["studio", "Studio", Video],
            ["avatars", "Avatars", UserRound],
            ["video", "Video", Clapperboard],
            ["voice", "Voice", Mic],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => useStudio.getState().go(id)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
        <button className={moreOpen ? "active" : ""} onClick={() => useStudio.setState({ moreOpen: !moreOpen })}>
          <Menu size={18} />
          More
        </button>
      </nav>
      {toast && <div className="mf-toast">{toast}</div>}
      {scriptOpen && <ScriptModal />}
      {moreOpen && (
        <div className="mf-modal" onClick={() => useStudio.setState({ moreOpen: false })}>
          <div className="mf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mf-head">
              <h1>Workspaces</h1>
            </div>
            <div className="mf-more">
              {NAV.map((n) => (
                <button key={n.id} className={`mf-ghost ${view === n.id ? "mf-primary" : ""}`} onClick={() => useStudio.getState().go(n.id)}>
                  {n.label}
                </button>
              ))}
              <button className="mf-ghost" onClick={() => window.location.assign("/gateway")}>
                Cloudflare Gateway Test Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function previewLine() {
  const s = useStudio.getState();
  const text = s.scenes[s.scene]?.text || "";
  useStudio.setState({ speaking: true });
  try {
    await speakLine({
      text,
      lang: s.settings.lang,
      rate: s.vp?.rate || 0.96,
      pitch: s.vp?.pitch || 1,
      voiceName: s.vp?.voice,
      neural: s.settings.neural,
      neuralId: s.vp?.neural || "eve",
      onMouth: (mouth) => useStudio.setState({ mouth: s.perf.lipsync ? mouth : 0.04 }),
    });
  } catch (e) {
    s.flash(e instanceof Error ? e.message : "Could not speak");
  }
  useStudio.setState({ speaking: false, mouth: 0.04 });
}

async function publish() {
  const s = useStudio.getState();
  s.flash("Rendering your video…");
  try {
    const out = await renderScenes(
      s.scenes,
      s.avatars[s.avatar].src,
      s.settings.aspect,
      Number(s.settings.res),
      Number(s.settings.fps),
      s.brand,
      (p) => useStudio.setState({ progress: `Rendering ${Math.round(p * 100)}%` }),
    );
    useStudio.setState({ lastVideo: out, progress: "" });
    s.go("video");
  } catch (e) {
    s.flash(e instanceof Error ? e.message : "Render failed");
  }
}

function StudioCenter() {
  const name = useStudio((s) => s.name);
  const scenes = useStudio((s) => s.scenes);
  const scene = useStudio((s) => s.scene);
  const perf = useStudio((s) => s.perf);
  const brand = useStudio((s) => s.brand);
  const speaking = useStudio((s) => s.speaking);
  const settings = useStudio((s) => s.settings);
  const engine = useStudio((s) => s.engine);
  const sc = scenes[scene];
  const bg = sc?.img && !sc.img.startsWith("data:") && BG_MAP[perf.bg] && sc.img === useStudio.getState().avatars[useStudio.getState().avatar]?.src
    ? BG_MAP[perf.bg]
    : sc?.img || BG_MAP[perf.bg] || BG_OFFICE;
  return (
    <div className="mf-canvas">
      <div className="mf-head">
        <div>
          <h1>{sc?.title || "New asset"}</h1>
          <p>
            {name} · {perf.bg.toLowerCase()} · {settings.aspect}
          </p>
        </div>
        <div className="mf-status">
          <i />
          {speaking ? "Speaking" : "Live preview"} · {engine}
        </div>
      </div>
      <div className="mf-stage-wrap" style={settings.aspect === "16:9" ? undefined : { maxWidth: settings.aspect === "9:16" ? 420 : 640, margin: "0 auto" }}>
        <div className="mf-stage-head">
          <span>
            Scene {String(scene + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
          </span>
          <div className="mf-stage-tools">
            <button
              onClick={() => {
                const order = ["16:9", "9:16", "1:1"] as const;
                const i = order.indexOf(settings.aspect);
                useStudio.setState({ settings: { ...settings, aspect: order[(i + 1) % order.length] } });
                useStudio.getState().persist();
              }}
            >
              {settings.aspect}
            </button>
            <button
              onClick={() => {
                document.querySelector(".mf-stage")?.requestFullscreen?.();
              }}
            >
              Expand
            </button>
          </div>
        </div>
        <div className="mf-stage" style={{ aspectRatio: settings.aspect.replace(":", " / ") }}>
          <img className="bg" alt="" src={BG_MAP[perf.bg] && sc?.img === useStudio.getState().avatars[useStudio.getState().avatar]?.src ? BG_MAP[perf.bg] : bg} />
          <div className="mf-shade" />
          <Presenter />
          <div className="mf-copy">
            <div className="mf-eye">{(brand.tag || name).toUpperCase()}</div>
            <h2 style={{ fontFamily: brand.font }}>{name}</h2>
            <p>{perf.expression} · {perf.preset}</p>
          </div>
          {brand.logo && <img className="mf-logo" alt="" src={brand.logo} />}
          <div className="mf-caption" style={{ borderBottom: `3px solid ${brand.c2}`, color: brand.c1 }}>
            {sc?.text}
          </div>
          <div className="mf-live">
            <i />
            <span>{speaking ? "Speaking" : "Ready"}</span>
            <div className={`mf-wave ${speaking ? "on" : ""}`}>
              <b /><b /><b /><b /><b />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Presenter() {
  const ref = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const avatar = useStudio((s) => s.avatar);
  const avatars = useStudio((s) => s.avatars);
  const framing = useStudio((s) => s.perf.framing);
  const camera = useStudio((s) => s.perf.camera);
  const mouth = useStudio((s) => s.mouth);
  const src = avatars[avatar]?.src || avatars[0].src;

  useEffect(() => {
    let dead = false;
    img.current = null;
    void loadImage(src)
      .then((im) => {
        if (!dead) img.current = im;
      })
      .catch(() => {
        const im = new Image();
        im.onload = () => {
          if (!dead) img.current = im;
        };
        im.src = src;
      });
    return () => {
      dead = true;
    };
  }, [src]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const draw = () => {
      const ctx = c.getContext("2d");
      const s = useStudio.getState();
      if (ctx) drawTalking(ctx, img.current, c.width, c.height, s.mouth, s.speaking ? 1 : 0.2);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const place = framing === "Left" ? "left" : framing === "Right" ? "right" : "";
  const cam = camera === "Close" ? "close" : "";
  return (
    <div className={`mf-presenter ${place} ${cam}`}>
      <img src={src} alt="Presenter" />
      <canvas ref={ref} width={480} height={700} />
    </div>
  );
}

function Timeline() {
  const scenes = useStudio((s) => s.scenes);
  const scene = useStudio((s) => s.scene);
  return (
    <div className="mf-timeline">
      <div className="mf-tl-top">
        <span>
          Storyboard · {clock(scenes)}
        </span>
        <div className="mf-tl-actions">
          <button
            onClick={() => {
              const s = useStudio.getState();
              s.remember();
              const img = s.avatars[s.avatar].src;
              useStudio.setState({
                scenes: [...s.scenes, { title: "New scene", text: "Describe what should happen in this scene.", dur: 6, img }],
                scene: s.scenes.length,
              });
              s.persist();
              s.flash("Scene added");
            }}
          >
            + Scene
          </button>
          <button
            onClick={() => {
              const s = useStudio.getState();
              s.remember();
              const cur = s.scenes[s.scene];
              const next = [...s.scenes];
              next.splice(s.scene + 1, 0, { title: "Continuation", text: "A natural continuation of the previous scene.", dur: 6, img: cur.img });
              useStudio.setState({ scenes: next, scene: s.scene + 1 });
              s.persist();
              s.flash("Scene extended");
            }}
          >
            Extend
          </button>
          <button onClick={() => useStudio.setState({ scriptOpen: true })}>Generate script</button>
        </div>
      </div>
      <div className="mf-tracks">
        {scenes.map((sc, i) => (
          <button key={`${sc.title}-${i}`} className={`mf-scene ${i === scene ? "active" : ""}`} onClick={() => useStudio.setState({ scene: i })}>
            <div className="mf-thumb" style={{ backgroundImage: `url(${sc.img})` }} />
            <strong>{sc.title}</strong>
            <small>{sc.text}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Inspector() {
  const tab = useStudio((s) => s.tab);
  return (
    <>
      <div className="mf-ins-tabs">
        {(["identity", "voice", "performance", "advanced"] as const).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => useStudio.getState().setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="mf-ins">{tab === "identity" ? <Identity /> : tab === "voice" ? <VoiceTab /> : tab === "performance" ? <Performance /> : <Advanced />}</div>
    </>
  );
}

function Identity() {
  const avatars = useStudio((s) => s.avatars);
  const avatar = useStudio((s) => s.avatar);
  const perf = useStudio((s) => s.perf);
  const scene = useStudio((s) => s.scene);
  const text = useStudio((s) => s.scenes[s.scene]?.text || "");
  return (
    <>
      <section className="mf-section">
        <h3>
          Avatar variants <span>{avatars.length}</span>
        </h3>
        <div className="mf-portraits">
          {avatars.slice(0, 6).map((p, i) => (
            <button
              key={p.name}
              className={`mf-portrait ${i === avatar ? "active" : ""}`}
              onClick={() => {
                useStudio.getState().remember();
                useStudio.setState({ avatar: i });
                useStudio.getState().persist();
                useStudio.getState().flash("Presenter updated");
              }}
            >
              <img src={p.src} alt="" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="mf-section">
        <h3>
          Appearance <span>Presenter</span>
        </h3>
        <label>Camera</label>
        <div className="mf-chips">
          {(["Eye-level", "Close", "Medium"] as const).map((c) => (
            <button key={c} className={`mf-chip ${perf.camera === c ? "active" : ""}`} onClick={() => useStudio.setState({ perf: { ...perf, camera: c } })}>
              {c}
            </button>
          ))}
        </div>
        <label>Framing</label>
        <div className="mf-chips">
          {(["Center", "Left", "Right"] as const).map((c) => (
            <button key={c} className={`mf-chip ${perf.framing === c ? "active" : ""}`} onClick={() => useStudio.setState({ perf: { ...perf, framing: c } })}>
              {c}
            </button>
          ))}
        </div>
        <label>Background</label>
        <select
          value={perf.bg}
          onChange={(e) => {
            const bg = e.target.value;
            const s = useStudio.getState();
            const img = BG_MAP[bg] || BG_OFFICE;
            s.updateScene(s.scene, { img });
            useStudio.setState({ perf: { ...s.perf, bg } });
            s.flash(`${bg} selected`);
          }}
        >
          {Object.keys(BG_MAP).map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </section>
      <section className="mf-section">
        <h3>
          Script <span>Scene {scene + 1}</span>
        </h3>
        <label>Spoken text</label>
        <textarea
          value={text}
          onChange={(e) => useStudio.getState().updateScene(useStudio.getState().scene, { text: e.target.value })}
        />
        <button className="mf-primary mf-full" onClick={() => void previewLine()}>
          Update live preview
        </button>
      </section>
    </>
  );
}

function VoiceTab() {
  const vp = useStudio((s) => s.vp);
  const settings = useStudio((s) => s.settings);
  return (
    <section className="mf-section">
      <h3>
        Voice <span>{settings.lang}</span>
      </h3>
      <div className="mf-card">
        <b>{vp?.name || "Warm professional"}</b>
        <small>{vp?.neural || "eve"} · neural when enabled</small>
        <button className="mf-primary" onClick={() => void previewLine()}>
          Play line
        </button>
        <button className="mf-ghost" onClick={() => useStudio.getState().go("voice")}>
          Open Voice lab
        </button>
      </div>
      <label className="mf-row">
        <span>Neural voice</span>
        <button
          className={`mf-toggle ${settings.neural ? "on" : ""}`}
          onClick={() => {
            useStudio.setState({ settings: { ...settings, neural: !settings.neural } });
            useStudio.getState().persist();
          }}
          aria-label="Toggle neural voice"
        >
          <i />
        </button>
      </label>
    </section>
  );
}

function Performance() {
  const perf = useStudio((s) => s.perf);
  function patch(p: Partial<typeof perf>) {
    useStudio.setState({ perf: { ...useStudio.getState().perf, ...p } });
  }
  return (
    <>
      <section className="mf-section">
        <h3>
          Expression <span>Live</span>
        </h3>
        <div className="mf-chips">
          {["Neutral", "Warm", "Confident", "Energetic", "Serious"].map((x) => (
            <button key={x} className={`mf-chip ${perf.expression === x ? "active" : ""}`} onClick={() => { patch({ expression: x }); useStudio.getState().flash(`${x} performance`); }}>
              {x}
            </button>
          ))}
        </div>
        <label>Energy</label>
        <div className="mf-range">
          <input type="range" min={0} max={100} value={perf.energy} onChange={(e) => patch({ energy: Number(e.target.value) })} />
          <output>{perf.energy}</output>
        </div>
        <label>Gesture</label>
        <div className="mf-range">
          <input type="range" min={0} max={100} value={perf.gesture} onChange={(e) => patch({ gesture: Number(e.target.value) })} />
          <output>{perf.gesture}</output>
        </div>
        <label className="mf-row">
          <span>Lip sync</span>
          <button className={`mf-toggle ${perf.lipsync ? "on" : ""}`} onClick={() => patch({ lipsync: !perf.lipsync })} aria-label="Toggle lip sync">
            <i />
          </button>
        </label>
      </section>
      <section className="mf-section">
        <h3>
          Performance preset <span>Premium</span>
        </h3>
        <div className="mf-chips">
          {["Executive", "Educator", "Creator", "Advisor"].map((x) => (
            <button key={x} className={`mf-chip ${perf.preset === x ? "active" : ""}`} onClick={() => patch({ preset: x })}>
              {x}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function Advanced() {
  const settings = useStudio((s) => s.settings);
  const perf = useStudio((s) => s.perf);
  return (
    <section className="mf-section">
      <h3>
        Render <span>{useStudio.getState().gpu}</span>
      </h3>
      <label>Resolution</label>
      <select
        value={settings.res}
        onChange={(e) => {
          useStudio.setState({ settings: { ...settings, res: e.target.value as typeof settings.res } });
          useStudio.getState().persist();
        }}
      >
        <option value="1080">1080p</option>
        <option value="720">720p</option>
        <option value="480">720p short · 480</option>
      </select>
      <label>Frame rate</label>
      <select
        value={settings.fps}
        onChange={(e) => {
          useStudio.setState({ settings: { ...settings, fps: e.target.value as typeof settings.fps } });
          useStudio.getState().persist();
        }}
      >
        {["30", "24", "60"].map((f) => (
          <option key={f} value={f}>
            {f} fps
          </option>
        ))}
      </select>
      <label className="mf-row">
        <span>Direct eye line</span>
        <button className={`mf-toggle ${perf.eye ? "on" : ""}`} onClick={() => useStudio.setState({ perf: { ...perf, eye: !perf.eye } })}>
          <i />
        </button>
      </label>
      <p className="muted">Publish records a real WebM from these scenes. Speech plays live in the preview; the file is the picture cut.</p>
    </section>
  );
}

function ScriptModal() {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="mf-modal">
      <div className="mf-modal-card">
        <div className="mf-head">
          <h1>AI Director</h1>
          <button className="mf-icon" onClick={() => useStudio.setState({ scriptOpen: false })} aria-label="Close">
            ×
          </button>
        </div>
        <textarea ref={ref} placeholder="Describe the video you want to create…" />
        <div className="mf-bar" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button className="mf-ghost" onClick={() => useStudio.setState({ scriptOpen: false })}>
            Cancel
          </button>
          <button
            className="mf-primary"
            onClick={async () => {
              const topic = ref.current?.value.trim() || "";
              if (!topic) return useStudio.getState().flash("Describe the video first");
              useStudio.setState({ scriptOpen: false });
              useStudio.getState().flash("Building the storyboard…");
              const s = useStudio.getState();
              const r = await studioScript({ data: { topic, scenes: 4, kind: "premium avatar video" } });
              const av = s.avatars[s.avatar].src;
              s.setScenes(
                r.scenes.map((sc, i) => ({
                  title: ["Opening", "Context", "Insight", "Closing"][i] || `Scene ${i + 1}`,
                  text: sc.text,
                  dur: 6,
                  img: av,
                })),
              );
              useStudio.getState().flash(`Storyboard ready · ${r.engine}`);
            }}
          >
            Generate storyboard
          </button>
        </div>
      </div>
    </div>
  );
}
