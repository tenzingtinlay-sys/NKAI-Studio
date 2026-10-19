import { signIn } from "@/lib/auth/client";
import { Component, Suspense, lazy, useEffect, useState } from "react";

const Panel = lazy(() =>
  import("@/components/studio/liveavatar-cloud-panel").then((m) => ({ default: m.LiveAvatarCloudPanel })),
);

class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <p role="alert" style={{ color: "#fca5a5" }}>
          The live avatar could not load in this browser. Refresh the page, or try Chrome or Edge.
        </p>
      );
    }
    return this.props.children;
  }
}

export function LifeMatePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="lmp">
      <style>{CSS}</style>
      <header className="lmp-top">
        <a className="lmp-brand" href="/">
          <span className="lmp-logo">N</span> NKAI Studio
        </a>
        <nav aria-label="Main">
          <a href="/features">Features</a>
          <a href="/help">Help</a>
          <a href="/deployment">Status</a>
          <a href="/gateway">Gateway</a>
  <button type="button" onClick={() => void signIn("grok-google", { callbackURL: "/" }).catch(() => undefined)} style={{ background: "#6d7bff", color: "#0b0e14", border: 0, borderRadius: 10, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}>
    Sign in with Google
  </button>
        </nav>
      </header>

      <main className="lmp-main">
        <p className="lmp-eyebrow">Live conversation</p>
        <h1>Talk face to face with an AI avatar</h1>
        <p className="lmp-lead">
          Choose a real-time digital human, pick your language and tone, and have a two-way video conversation. Your camera appears beside the avatar.
        </p>
        <ol className="lmp-steps">
          <li><b>1</b> Choose an avatar</li>
          <li><b>2</b> Pick language and tone</li>
          <li><b>3</b> Start the call</li>
        </ol>
        {mounted ? (
          <Boundary>
            <Suspense fallback={<p style={{ color: "#8a96ad" }}>Loading the live avatar…</p>}>
              <Panel />
            </Suspense>
          </Boundary>
        ) : (
          <p style={{ color: "#8a96ad" }}>Loading…</p>
        )}
      </main>

      <footer className="lmp-foot">
        <span>NKAI Studio · Open-source-first AI</span>
        <a href="/features">Features</a>
        <a href="/help">Help &amp; setup</a>
        <a href="/deployment">Deployment status</a>
      </footer>
    </div>
  );
}

const CSS = `
.lmp{min-height:100vh;background:radial-gradient(1200px 500px at 70% -10%,#1a2140 0,#0b0e14 60%);color:#e8ecf5;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.lmp *{box-sizing:border-box}
.lmp-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;max-width:1180px;margin:0 auto;padding:16px}
.lmp-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;font-weight:700}
.lmp-logo{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,#6d7bff,#a06bff);color:#fff}
.lmp-top nav{display:flex;gap:18px;font-size:14px}
.lmp-top nav a{color:#8a96ad;text-decoration:none}
.lmp-main{max-width:1180px;margin:0 auto;padding:8px 16px 40px}
.lmp-eyebrow{margin:0;color:#6d7bff;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.lmp-main h1{margin:6px 0 8px;font-size:clamp(26px,4vw,38px);line-height:1.15}
.lmp-lead{color:#8a96ad;margin:0 0 16px;max-width:640px}
.lmp-steps{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:0 0 22px}
.lmp-steps li{display:flex;gap:8px;align-items:center;font-size:13px;color:#c5cde0;border:1px solid #222c3f;background:#121722;border-radius:999px;padding:6px 14px 6px 8px}
.lmp-steps b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#6d7bff;color:#0b0e14;font-size:12px}
.lmp-foot{max-width:1180px;margin:0 auto;padding:18px 16px 28px;display:flex;gap:16px;flex-wrap:wrap;color:#8a96ad;font-size:13px;border-top:1px solid #1b2333}
.lmp-foot a{color:#8a96ad;text-decoration:none}
`;
