import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, AudioLines, Bot, BrainCircuit, BriefcaseBusiness, GraduationCap, HeartHandshake, Mic2, Play, ShieldCheck, Sparkles, Video, Waves } from "lucide-react";

export const Route = createFileRoute("/visual-ai")({
  component: VisualAIPage,
});

const roles = [
  { icon: BriefcaseBusiness, title: "AI for interviews", copy: "Practice interviews, explore responses, and structure candidate conversations." },
  { icon: HeartHandshake, title: "AI customer experience", copy: "Build a helpful, consistent front line for product and service questions." },
  { icon: BrainCircuit, title: "AI learning companion", copy: "Turn complex topics into approachable, guided learning experiences." },
  { icon: GraduationCap, title: "AI tutor", copy: "Support lessons with a visual guide and an adaptable teaching style." },
  { icon: Bot, title: "AI team assistant", copy: "Give teams a face-to-face interface for approved knowledge and workflows." },
  { icon: Mic2, title: "AI presenter", copy: "Create presenter-led explainers, onboarding, and internal communications." },
];

function VisualAIPage() {
  return (
    <main className="vai-page">
      <header className="vai-nav">
        <Link to="/" className="vai-brand"><span className="vai-brand-mark"><Sparkles size={17} /></span><span>NKAI <b>Studio</b></span></Link>
        <nav aria-label="Main navigation" className="vai-nav-links">
          <a href="#capabilities">Capabilities</a><a href="#use-cases">Use cases</a><a href="#integration">Integration</a>
        </nav>
        <Link to="/" className="vai-nav-cta">Open studio <ArrowRight size={15} /></Link>
      </header>

      <section className="vai-hero">
        <div className="vai-hero-copy">
          <div className="vai-eyebrow"><span className="vai-pulse" /> VISUAL AI · HUMAN-CENTRED INTERACTION</div>
          <h1>Make AI feel more <em>human.</em></h1>
          <p className="vai-lede">Build voice-enabled visual assistants for work, learning, and customer experiences—with a clear path from prototype to a GPU-backed avatar.</p>
          <div className="vai-hero-actions">
            <Link to="/" className="vai-button vai-button-primary">Explore NKAI Studio <ArrowRight size={16} /></Link>
            <a href="#capabilities" className="vai-button vai-button-secondary"><Play size={15} /> Explore capabilities</a>
          </div>
          <div className="vai-proof"><span><ShieldCheck size={15} /> Consent-first design</span><span><Waves size={15} /> Voice-ready architecture</span></div>
        </div>
        <div className="vai-hero-visual">
          <div className="vai-orbit vai-orbit-one" /><div className="vai-orbit vai-orbit-two" />
          <div className="vai-visual-glow" />
          <div className="vai-avatar-card">
            <div className="vai-avatar-top"><span className="vai-live-dot" /> NKAI VISUAL AGENT <span className="vai-avatar-tag">PREVIEW</span></div>
            <div className="vai-avatar-art" role="img" aria-label="Abstract portrait placeholder for a future connected AI avatar">
              <div className="vai-avatar-halo" /><div className="vai-avatar-head"><div className="vai-hair" /><div className="vai-face"><i className="vai-eye left" /><i className="vai-eye right" /><i className="vai-nose" /><i className="vai-mouth" /></div><div className="vai-neck" /><div className="vai-jacket" /><div className="vai-shirt" /></div>
              <div className="vai-voice-pill"><AudioLines size={16} /><span>Voice + lip-sync connect here</span><span className="vai-bars"><i /><i /><i /><i /><i /></span></div>
            </div>
            <div className="vai-avatar-bottom"><div><b>Visual AI workspace</b><small>Engine connection required for live sessions</small></div><span className="vai-status-pending">NOT CONNECTED</span></div>
          </div>
          <div className="vai-float vai-float-top"><AudioLines size={17} /><span><b>Natural voice</b><small>Speech engine</small></span></div>
          <div className="vai-float vai-float-bottom"><Video size={17} /><span><b>Human-like video</b><small>GPU avatar renderer</small></span></div>
        </div>
      </section>

      <section className="vai-stats" aria-label="Platform principles">
        <div><b>One workspace</b><span>for voice, agents, and avatars</span></div>
        <div><b>Pluggable engines</b><span>choose providers by capability</span></div>
        <div><b>Production-minded</b><span>auth, consent, and secure media</span></div>
      </section>

      <section className="vai-section" id="use-cases">
        <div className="vai-section-head"><div><div className="vai-eyebrow">BUILT AROUND PEOPLE</div><h2>One visual AI layer.<br /><em>Many ways to help.</em></h2></div><p>Start with a focused role, then connect the right model, voice, and avatar runtime for the experience you need.</p></div>
        <div className="vai-role-grid">{roles.map((role) => { const Icon = role.icon; return <article className="vai-role-card" key={role.title}><div className="vai-role-icon"><Icon size={20} /></div><h3>{role.title}</h3><p>{role.copy}</p><a href="#integration">Explore use case <ArrowRight size={14} /></a></article>; })}</div>
      </section>

      <section className="vai-capabilities" id="capabilities">
        <div className="vai-cap-copy"><div className="vai-eyebrow">CAPABILITIES</div><h2>Real presence starts with the <em>right stack.</em></h2><p>NKAI keeps the conversation brain, speech, avatar rendering, and delivery layer separate—so each part can be tested and upgraded without pretending a demo is production-ready.</p><Link to="/" className="vai-button vai-button-primary">Open the workspace <ArrowRight size={16} /></Link></div>
        <div className="vai-cap-list">
          <article><span>01</span><div><h3>Voice in, voice out</h3><p>Connect speech recognition and a text-to-speech engine, with clear controls for microphone access.</p></div><AudioLines /></article>
          <article><span>02</span><div><h3>Expressive avatar output</h3><p>Choose between real-time streaming and rendered talking-human video based on the provider's actual capability.</p></div><Video /></article>
          <article><span>03</span><div><h3>GPU-backed inference</h3><p>Run large models on a separate GPU worker; keep secrets, authorization, and job control on the server.</p></div><Bot /></article>
          <article><span>04</span><div><h3>Privacy and consent</h3><p>Record permission for likeness and voice use, scope access to media, and support retention and deletion.</p></div><ShieldCheck /></article>
        </div>
      </section>

      <section className="vai-integration" id="integration">
        <div className="vai-integration-orb"><Waves size={38} /></div>
        <div><div className="vai-eyebrow">DESIGNED TO CONNECT</div><h2>Your AI stack. <em>Your choice.</em></h2><p>Explore the current NKAI workspace and provider integration plan. GPU engines and real-time streaming must be configured and tested before they are marked live.</p></div>
        <Link to="/" className="vai-button vai-button-light">Go to NKAI Studio <ArrowRight size={16} /></Link>
      </section>

      <footer className="vai-footer"><Link to="/" className="vai-brand"><span className="vai-brand-mark"><Sparkles size={16} /></span><span>NKAI <b>Studio</b></span></Link><span>Human-centred AI experiences, built with clear capability boundaries.</span><a href="https://github.com/tenzingtinlay-sys/NKAI-Studio" target="_blank" rel="noreferrer">View project on GitHub ↗</a></footer>
    </main>
  );
}
