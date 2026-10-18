import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";

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
        <p role="alert" style={{ color: "#f87171" }}>
          The live avatar could not load in this browser. Refresh the page, or try Chrome or Edge.
        </p>
      );
    }
    return this.props.children;
  }
}

const theme = {
  "--mf-card": "#12151b",
  "--mf-border": "#262b35",
  "--mf-muted": "#99a1b0",
  "--mf-input": "#0b0d11",
  "--mf-text": "#eef0f4",
  "--mf-primary": "#7b90ff",
} as React.CSSProperties;

export function LifeMatePage() {
  const [mounted, setMounted] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function toggleCam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
      setCamError("");
    } catch {
      setCamError("Camera permission was denied.");
    }
  }

  return (
    <main
      style={{
        ...theme,
        minHeight: "100vh",
        background: "#08090b",
        color: "#eef0f4",
        padding: "20px 16px 110px",
        font: "15px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, fontSize: 24 }}>NKAI Studio · Live conversation</h1>
          <p style={{ color: "#99a1b0", margin: "6px 0 0" }}>
            A two-way video call. Pick a face, a language and a tone, then talk. Your camera shows in the corner.
          </p>
        </header>
        {mounted && (
          <Boundary>
            <Suspense fallback={<p>Loading the live avatar…</p>}>
              <Panel />
            </Suspense>
          </Boundary>
        )}
        <nav style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <a href="/features" style={{ color: "#99a1b0" }}>Features</a>
          <a href="/help" style={{ color: "#99a1b0" }}>Help</a>
          <a href="/deployment" style={{ color: "#99a1b0" }}>Deployment status</a>
        </nav>
      </div>

      <div style={{ position: "fixed", right: 14, bottom: 14, width: 180, display: "grid", gap: 6, zIndex: 20 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", aspectRatio: "4 / 3", transform: "scaleX(-1)", background: "#000", borderRadius: 12, display: camOn ? "block" : "none", border: "1px solid #262b35" }}
        />
        <button
          type="button"
          onClick={() => void toggleCam()}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #262b35", background: "#12151b", color: "#eef0f4", cursor: "pointer" }}
        >
          {camOn ? "Hide my camera" : "Show my camera"}
        </button>
        {camError && <small style={{ color: "#f87171" }}>{camError}</small>}
      </div>
    </main>
  );
}
