import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type Check = { label: string; state: "checking" | "ready" | "offline" | "not-configured"; detail: string };

export const Route = createFileRoute("/deployment")({
  component: DeploymentPage,
});

function DeploymentPage() {
  const [checks, setChecks] = useState<Check[]>([
    { label: "NKAI app", state: "checking", detail: "Page is running in this browser." },
    { label: "Private AI chat worker", state: "checking", detail: "Checking /api/ai/health…" },
    { label: "Multilingual voice capabilities", state: "checking", detail: "Checking /api/ai/capabilities…" },
    { label: "Live avatar streaming", state: "checking", detail: "Checking /api/livetalking/…" },
  ]);
  const [checkedAt, setCheckedAt] = useState<string>("Not checked yet");

  async function refresh() {
    setChecks([
      { label: "NKAI app", state: "ready", detail: "The application page is running." },
      { label: "Private AI chat worker", state: "checking", detail: "Checking the server-side worker route…" },
      { label: "Multilingual voice capabilities", state: "checking", detail: "Checking the server-side capability route…" },
      { label: "Live avatar streaming", state: "checking", detail: "Checking the embedded streaming service…" },
    ]);
    const results: Check[] = [{ label: "NKAI app", state: "ready", detail: "The application page is running." }];
    const probes = [
      { label: "Private AI chat worker", url: "/api/ai/health", expected: "AI worker" },
      { label: "Neural voice capabilities", url: "/api/ai/tts-capabilities", expected: "voice capability" },
      { label: "Live avatar streaming", url: "/api/livetalking/", expected: "live avatar service" },
    ];
    for (const probe of probes) {
      try {
        const response = await fetch(probe.url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("json") ? await response.json() as Record<string, unknown> : null;
        if (response.ok) {
          let detail = "Endpoint responded successfully.";
          if (probe.url.endsWith("/health")) detail = `Worker status: ${String(body?.status || "reachable")}; model: ${String(body?.model || "not reported")}; GPU: ${String(body?.cuda ?? "not reported")}.`;
          else if (probe.url.includes("capabilities")) {
            const tts = body?.tts as { provider?: string; readyLanguages?: string[]; languages?: unknown[] } | undefined;
            const chat = body?.chat as { model?: string; ready?: boolean } | undefined;
            const langs = tts?.readyLanguages || [];
            detail = `Chat model: ${chat?.model || "reported by worker"}; TTS: ${tts?.provider || "reported by worker"}; advertised language variants: ${langs.length || tts?.languages?.length || 0}.`;
          } else detail = contentType.includes("text/html") ? "Embedded streaming page returned HTML." : "Streaming endpoint responded.";
          results.push({ label: probe.label, state: "ready", detail });
        } else {
          const code = typeof body?.code === "string" ? body.code : "";
          const message = typeof body?.error === "string" ? body.error : `HTTP ${response.status}`;
          results.push({ label: probe.label, state: code.includes("NOT_CONFIGURED") ? "not-configured" : "offline", detail: message });
        }
      } catch (error) {
        results.push({ label: probe.label, state: "offline", detail: error instanceof Error ? error.message : "Request failed." });
      }
      setChecks([...results, ...probes.slice(results.length - 1).map((remaining) => ({ label: remaining.label, state: "checking" as const, detail: "Waiting for health check…" }))]);
    }
    setChecks(results);
    setCheckedAt(new Date().toLocaleString());
  }

  useEffect(() => { void refresh(); }, []);

  const badge = (state: Check["state"]) => state === "ready" ? "READY" : state === "checking" ? "CHECKING" : state === "not-configured" ? "NOT CONFIGURED" : "OFFLINE";

  return (
    <main style={{ minHeight: "100vh", background: "#08090b", color: "#f5f7fa", padding: "clamp(20px, 5vw, 56px)", fontFamily: "Manrope, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ color: "#8ab4ff", letterSpacing: ".14em", fontSize: 12, fontWeight: 800 }}>NKAI STUDIO · LIVE DEPLOYMENT CHECK</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, margin: "12px 0" }}>Is the app actually working?</h1>
        <p style={{ color: "#aab3c2", maxWidth: 760, lineHeight: 1.7 }}>This page tests the running deployment—not just whether the GitHub source code exists. Green means the endpoint answered; it does not by itself prove voice quality or lip-sync accuracy.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "24px 0" }}>
          <button onClick={() => void refresh()} style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #3a4353", background: "#171d27", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Run live checks again</button>
          <a href="/" style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #3a4353", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open NKAI Studio</a>
        </div>
        <p style={{ color: "#8792a4", fontSize: 12 }}>Last checked: {checkedAt}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
          {checks.map((check) => (
            <section key={check.label} style={{ border: "1px solid #252d3a", background: "#10141b", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ fontSize: 17, margin: 0 }}>{check.label}</h2>
                <span style={{ fontSize: 10, letterSpacing: ".08em", fontWeight: 800, padding: "6px 8px", borderRadius: 20, background: check.state === "ready" ? "#123b2d" : check.state === "checking" ? "#292d36" : "#49251f", color: check.state === "ready" ? "#86efac" : check.state === "checking" ? "#d5d9e2" : "#ffb4a8", whiteSpace: "nowrap" }}>{badge(check.state)}</span>
              </div>
              <p style={{ color: "#aab3c2", lineHeight: 1.6, marginBottom: 0, overflowWrap: "anywhere" }}>{check.detail}</p>
            </section>
          ))}
        </div>
        <section style={{ marginTop: 22, border: "1px solid #34313a", background: "#141218", borderRadius: 16, padding: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>What deployment needs</h2>
          <ul style={{ color: "#b8bdc8", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Deploy this full-stack app to a server runtime such as Vercel; GitHub Pages alone cannot execute the private API routes.</li>
            <li>Set <code>AI_WORKER_INTERNAL_URL</code> and, if enabled, <code>AI_WORKER_API_TOKEN</code> in the deployment's server-side environment variables.</li>
            <li>Set <code>LIVETALKING_INTERNAL_URL</code> for the streaming service. WebRTC still needs correctly configured public ICE/STUN/TURN and media ports.</li>
            <li>Run a real conversation, test the selected language's generated audio, and confirm the avatar's mouth moves with playback.</li>
          </ul>
        </section>
        <p style={{ color: "#778194", fontSize: 12, marginTop: 28 }}>No worker endpoint or secret is entered into this page. This is a diagnostic page, not a claim that an unconfigured service is online.</p>
      </div>
    </main>
  );
}
