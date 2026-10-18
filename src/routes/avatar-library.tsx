import { createFileRoute } from "@tanstack/react-router";
import { AuthNavActions } from "@/components/studio/auth-nav-actions";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowDownToLine, AudioLines, Boxes, CheckCircle2, CircleAlert, ExternalLink, RefreshCw, Video, WifiOff } from "lucide-react";

export const Route = createFileRoute("/avatar-library")({
  component: AvatarLibraryPage,
});

type State = "checking" | "ready" | "offline" | "not-configured";
type Provider = { id: string; name: string; kind: string; detail: string; state: State; status: string; action?: string; href?: string };

const starterAssets = [
  { id: "mpfb", name: "MPFB human", kind: "Browser 3D · GLB", detail: "Remote sample model. Verify the upstream asset licence before redistribution.", url: "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/mpfb.glb", download: false },
  { id: "brunette", name: "Brunette sample", kind: "Browser 3D · GLB", detail: "Non-commercial sample; it must not be used commercially without separate permission.", url: "/assets/avatars/brunette.glb", download: true },
];

function Badge({ state }: { state: State }) {
  const labels: Record<State, string> = { checking: "CHECKING", ready: "CONNECTED", offline: "OFFLINE", "not-configured": "NOT CONFIGURED" };
  return <span className={"nkai-provider-badge " + state}>{labels[state]}</span>;
}

function AvatarLibraryPage() {
  const [providers, setProviders] = useState<Provider[]>([
    { id: "ai", name: "NKAI AI Gateway", kind: "Conversation engine", detail: "Private chat worker health and model availability.", state: "checking", status: "Checking server route…" },
    { id: "liveavatar", name: "HeyGen LiveAvatar", kind: "Hosted real-time video", detail: "Loads account/public avatars and voices using the server-side LiveAvatar API key.", state: "checking", status: "Waiting for catalogue check…" },
    { id: "livetalking", name: "LiveTalking", kind: "Self-hosted WebRTC stream", detail: "Requires a running GPU service and reachable media networking.", state: "checking", status: "Checking streaming route…" },
    { id: "duix", name: "Duix Avatar", kind: "Self-hosted avatar engine", detail: "Source is present, but this page will not claim it is live until a health endpoint is configured.", state: "not-configured", status: "No verified Duix health endpoint is configured." },
  ]);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<{ avatars: number; voices: number } | null>(null);
  const [catalogMessage, setCatalogMessage] = useState("");
  const [checkedAt, setCheckedAt] = useState("Not checked yet");

  const refresh = useCallback(async () => {
    setBusy(true);
    setProviders((old) => old.map((p) => p.id === "duix" ? p : { ...p, state: "checking", status: "Checking live server route…" }));
    const next: Provider[] = [];
    try {
      const response = await fetch("/api/ai/health", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      next.push({ id: "ai", name: "NKAI AI Gateway", kind: "Conversation engine", detail: "Private chat worker health and model availability.", state: response.ok ? "ready" : response.status === 503 ? "not-configured" : "offline", status: response.ok ? "Worker replied. Model: " + String(data.model || "not reported") : String(data.error || "HTTP " + response.status) });
    } catch (error) {
      next.push({ id: "ai", name: "NKAI AI Gateway", kind: "Conversation engine", detail: "Private chat worker health and model availability.", state: "offline", status: error instanceof Error ? error.message : "Health check failed." });
    }
    try {
      const response = await fetch("/api/livetalking/status", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      next.push({ id: "livetalking", name: "LiveTalking", kind: "Self-hosted WebRTC stream", detail: "Requires a running GPU service and reachable media networking.", state: response.ok ? "ready" : response.status === 503 ? "not-configured" : "offline", status: response.ok ? "Status endpoint responded: " + JSON.stringify(data).slice(0, 180) : String(data.error || "HTTP " + response.status) });
    } catch (error) {
      next.push({ id: "livetalking", name: "LiveTalking", kind: "Self-hosted WebRTC stream", detail: "Requires a running GPU service and reachable media networking.", state: "offline", status: error instanceof Error ? error.message : "Health check failed." });
    }
    setProviders((old) => {
      const byId = new Map([...old, ...next].map((p) => [p.id, p]));
      return ["ai", "liveavatar", "livetalking", "duix"].map((id) => byId.get(id)!);
    });
    setCheckedAt(new Date().toLocaleString());
    setBusy(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function loadLiveAvatarCatalog() {
    setCatalog(null);
    setCatalogMessage("Checking the signed-in LiveAvatar account…");
    try {
      const response = await fetch("/api/liveavatar/catalog", { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({})) as { avatars?: unknown[]; voices?: unknown[]; error?: string };
      if (!response.ok) throw new Error(data.error || (response.status === 401 ? "Sign in to NKAI Studio first." : "LiveAvatar catalogue returned HTTP " + response.status + "."));
      if (!Array.isArray(data.avatars) || !Array.isArray(data.voices)) throw new Error("The catalogue response was not in the expected format.");
      setCatalog({ avatars: data.avatars.length, voices: data.voices.length });
      setCatalogMessage(data.avatars.length ? "LiveAvatar catalogue loaded successfully." : "The API responded, but no selectable avatars were returned.");
      setProviders((old) => old.map((p) => p.id === "liveavatar" ? { ...p, state: data.avatars!.length ? "ready" : "not-configured", status: data.avatars!.length + " avatars and " + data.voices!.length + " voices returned by API." } : p));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Catalogue request failed.";
      setCatalogMessage(message);
      setProviders((old) => old.map((p) => p.id === "liveavatar" ? { ...p, state: "offline", status: message } : p));
    }
  }

  return (
    <main className="nkai-library">
      <header className="nkai-library-top">
        <a className="nkai-library-brand" href="/"><span className="nkai-library-mark">N</span><span>NKAI <b>STUDIO</b></span></a>
        <nav><a href="/">Studio</a><a className="active" href="/avatar-library">Avatar library</a><a href="/deployment">Diagnostics</a></nav>
        <AuthNavActions /><button className="nkai-library-refresh" onClick={() => void refresh()} disabled={busy}><RefreshCw size={15} className={busy ? "nkai-spin" : ""} /> {busy ? "Checking…" : "Refresh status"}</button>
      </header>
      <section className="nkai-library-hero">
        <div className="nkai-eyebrow"><Activity size={14} /> ONE LIBRARY · MULTIPLE RUNTIMES</div>
        <h1>Every avatar.<br /><span>One place to connect.</span></h1>
        <p>Browse 3D models, check live providers, and connect voice-enabled avatars through one consistent workspace. Status labels reflect real server checks—not placeholder availability.</p>
        <div className="nkai-library-meta"><span><i /> Server-connected checks</span><span>Last checked: {checkedAt}</span></div>
      </section>
      <section className="nkai-library-section">
        <div className="nkai-section-heading"><div><p className="nkai-eyebrow">PROVIDER STATUS</p><h2>Connected engines</h2></div><span className="nkai-muted">Credentials remain server-side</span></div>
        <div className="nkai-provider-grid">
          {providers.map((provider) => <article className="nkai-provider-card" key={provider.id}>
            <div className="nkai-provider-card-top"><span className="nkai-provider-icon">{provider.id === "ai" ? <Activity /> : provider.id === "duix" ? <Boxes /> : provider.id === "liveavatar" ? <Video /> : <AudioLines />}</span><Badge state={provider.state} /></div>
            <p className="nkai-card-kind">{provider.kind}</p><h3>{provider.name}</h3><p className="nkai-card-detail">{provider.detail}</p>
            <div className="nkai-provider-status">{provider.state === "ready" ? <CheckCircle2 size={15} /> : provider.state === "checking" ? <RefreshCw size={15} className="nkai-spin" /> : <CircleAlert size={15} />}<span>{provider.status}</span></div>
            {provider.id === "liveavatar" && <button className="nkai-library-button" onClick={() => void loadLiveAvatarCatalog()}>Load account catalogue <ExternalLink size={14} /></button>}
            {provider.id === "duix" && <a className="nkai-library-button secondary" href="https://github.com/tenzingtinlay-sys/NKAI-Studio/tree/main/deploy/duix-avatar">Runtime setup notes <ExternalLink size={14} /></a>}
            {provider.id === "livetalking" && <a className="nkai-library-button secondary" href="https://github.com/tenzingtinlay-sys/NKAI-Studio/tree/main/deploy/livetalking">Runtime setup notes <ExternalLink size={14} /></a>}
            {provider.id === "ai" && <a className="nkai-library-button secondary" href="/deployment">Open diagnostics <ExternalLink size={14} /></a>}
          </article>)}
        </div>
        {catalogMessage && <div className="nkai-catalog-result" role="status">{catalog ? <CheckCircle2 size={17} /> : <WifiOff size={17} />}<span>{catalogMessage}{catalog && <b> · {catalog.avatars} avatars · {catalog.voices} voices</b>}</span></div>}
      </section>
      <section className="nkai-library-section">
        <div className="nkai-section-heading"><div><p className="nkai-eyebrow">DOWNLOADABLE STARTERS</p><h2>3D avatar assets</h2></div><span className="nkai-muted">GLB / glTF · licence-aware</span></div>
        <div className="nkai-asset-grid">{starterAssets.map((asset, i) => <article className="nkai-asset-card" key={asset.id}>
          <div className={"nkai-asset-art art-" + i}><div className="nkai-asset-orbit" /><div className="nkai-asset-silhouette">{i === 0 ? "M" : "B"}</div><span>3D MODEL</span></div>
          <div className="nkai-asset-info"><div><h3>{asset.name}</h3><p className="nkai-card-kind">{asset.kind}</p></div><span className="nkai-asset-format">GLB</span></div>
          <p className="nkai-card-detail">{asset.detail}</p>
          <a className="nkai-library-button" href={asset.url} target={asset.download ? undefined : "_blank"} rel={asset.download ? undefined : "noreferrer"} {...(asset.download ? { download: true } : {})}>{asset.download ? "Download local asset" : "Open source model"} <ArrowDownToLine size={15} /></a>
        </article>)}</div>
      </section>
      <footer className="nkai-library-footer"><span>NKAI STUDIO · AVATAR REGISTRY</span><span>Hosted streams and local 3D files are different asset types. A live provider is marked connected only after a server response.</span></footer>
    </main>
  );
}
