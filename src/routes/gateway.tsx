import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

type GatewayResult = {
  state: "idle" | "checking" | "ready" | "error" | "blocked";
  detail: string;
  checkedAt?: string;
  servers?: number;
};

const DEFAULT_GATEWAY = "https://nkai-avatar-gateway.tenzingtinlay.workers.dev";
const WORKFLOW_URL = "https://github.com/tenzingtinlay-sys/NKAI-Studio/actions/workflows/deploy-cloudflare-gateway.yml";

export const Route = createFileRoute("/gateway")({
  component: CloudflareGatewayPage,
});

function CloudflareGatewayPage() {
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_GATEWAY);
  const [result, setResult] = useState<GatewayResult>({
    state: "idle",
    detail: "Run a health check to test the Cloudflare gateway independently.",
  });

  async function runHealthCheck() {
    let base: URL;
    try {
      base = new URL(gatewayUrl.trim());
      if (base.protocol !== "https:") throw new Error("Use an HTTPS gateway URL.");
      if (base.username || base.password) throw new Error("Gateway URLs must not contain credentials.");
      base.pathname = base.pathname.replace(/\/+$/, "");
      base.search = "";
      base.hash = "";
    } catch (error) {
      setResult({ state: "error", detail: error instanceof Error ? error.message : "Enter a valid HTTPS URL." });
      return;
    }

    setResult({ state: "checking", detail: "Requesting the gateway /health endpoint…" });
    try {
      const response = await fetch(`${base.origin}/health`, {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => null) as { gateway?: unknown; servers?: unknown; error?: unknown } | null;
      const checkedAt = new Date().toLocaleString();
      if (!response.ok) {
        setResult({ state: "error", detail: `Health endpoint returned HTTP ${response.status}.`, checkedAt });
        return;
      }
      if (body?.gateway !== true || !Array.isArray(body.servers)) {
        setResult({ state: "error", detail: "The endpoint responded, but its JSON did not match the expected gateway health schema.", checkedAt });
        return;
      }
      setResult({
        state: "ready",
        detail: body.servers.length
          ? "Gateway health schema is valid. One or more live-avatar backends are registered; media/WebRTC still needs a separate end-to-end test."
          : "Gateway is responding, but no live-avatar backend is currently registered. Start the GPU/LiveTalking host and register it before testing media.",
        servers: body.servers.length,
        checkedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      const blocked = message.toLowerCase().includes("fetch") || message.toLowerCase().includes("cors");
      setResult({
        state: blocked ? "blocked" : "error",
        detail: blocked
          ? "The browser could not read the response. This may be a CORS/origin-policy block, network failure, or an unavailable gateway; it does not prove the Worker is down. Run the GitHub deployment workflow to verify its health and configured CORS policy."
          : message,
        checkedAt: new Date().toLocaleString(),
      });
    }
  }

  const statusColor = result.state === "ready" ? "#86efac" : result.state === "checking" ? "#d5d9e2" : result.state === "idle" ? "#aab3c2" : "#ffb4a8";
  const statusLabel = result.state === "ready" ? "RESPONDING" : result.state === "checking" ? "CHECKING" : result.state === "blocked" ? "BROWSER BLOCKED / UNKNOWN" : result.state === "error" ? "CHECK FAILED" : "NOT TESTED";

  return (
    <main style={{ minHeight: "100vh", background: "#08090b", color: "#f5f7fa", padding: "clamp(20px, 5vw, 56px)", fontFamily: "Manrope, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ color: "#8ab4ff", letterSpacing: ".14em", fontSize: 12, fontWeight: 800 }}>NKAI STUDIO · ISOLATED SYSTEM TEST</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, margin: "12px 0" }}>Cloudflare Gateway Test Lab</h1>
        <p style={{ color: "#aab3c2", maxWidth: 760, lineHeight: 1.7 }}>
          Test the Live Avatar Cloudflare Worker here, separately from Studio creation, AI responses, and hallucination-related checks. This page only calls the gateway health endpoint; it does not start a deployment, register a host, or expose credentials.
        </p>

        <section style={{ marginTop: 26, border: "1px solid #252d3a", background: "#10141b", borderRadius: 16, padding: 22 }}>
          <label htmlFor="gateway-url" style={{ display: "block", color: "#c7cfdb", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Cloudflare Worker URL</label>
          <input id="gateway-url" value={gatewayUrl} onChange={(event) => setGatewayUrl(event.target.value)} spellCheck={false} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #3a4353", background: "#080b10", color: "#f5f7fa", borderRadius: 10, padding: "13px 14px", font: "inherit" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            <button aria-label="Run Cloudflare gateway health check" onClick={() => void runHealthCheck()} disabled={result.state === "checking"} style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #5b8df7", background: "#2458b8", color: "#fff", cursor: result.state === "checking" ? "wait" : "pointer", fontWeight: 800 }}>
              {result.state === "checking" ? "Checking…" : "Run gateway health check"}
            </button>
            <a href={WORKFLOW_URL} target="_blank" rel="noreferrer" style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #3a4353", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open deployment workflow ↗</a>
            <a href="/" style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #3a4353", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Back to Studio</a>
          </div>
        </section>

        <section aria-live="polite" style={{ marginTop: 16, border: "1px solid #252d3a", background: "#10141b", borderRadius: 16, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Gateway health</h2>
            <span style={{ fontSize: 10, letterSpacing: ".08em", fontWeight: 800, padding: "6px 9px", borderRadius: 20, background: "#252b35", color: statusColor }}>{statusLabel}</span>
          </div>
          <p style={{ color: "#aab3c2", lineHeight: 1.7, overflowWrap: "anywhere" }}>{result.detail}</p>
          {result.servers !== undefined && <p style={{ marginBottom: 0, fontWeight: 800 }}>Registered live-avatar backends: {result.servers}</p>}
          {result.checkedAt && <p style={{ color: "#8792a4", fontSize: 12, marginBottom: 0 }}>Last checked: {result.checkedAt}</p>}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14, marginTop: 16 }}>
          <section style={{ border: "1px solid #252d3a", background: "#10141b", borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 17, marginTop: 0 }}>What this test proves</h2>
            <ul style={{ color: "#aab3c2", lineHeight: 1.8, paddingLeft: 20 }}>
              <li>The URL responds over HTTPS.</li>
              <li>The health response has the expected gateway schema.</li>
              <li>How many live-avatar backends are currently registered.</li>
            </ul>
          </section>
          <section style={{ border: "1px solid #34313a", background: "#141218", borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 17, marginTop: 0 }}>What it does not prove</h2>
            <ul style={{ color: "#b8bdc8", lineHeight: 1.8, paddingLeft: 20 }}>
              <li>That WebRTC audio/video streaming works end to end.</li>
              <li>That a Colab tunnel or GPU worker is still alive.</li>
              <li>That the separate AI Gateway Proxy PR has been merged or deployed.</li>
            </ul>
          </section>
        </div>
        <p style={{ color: "#778194", fontSize: 12, lineHeight: 1.7, marginTop: 24 }}>
          Deployment is manual. Use the GitHub Actions workflow to run it after verifying the selected branch and required secrets. This test page never triggers deployment automatically and does not share state with the Studio's project or AI panels.
        </p>
      </div>
    </main>
  );
}
