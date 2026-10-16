import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <main className="nkai-info-page">
      <header className="nkai-info-nav">
        <a className="nkai-home-brand" href="/"><span className="nkai-brand-glyph">✦</span><span>NKAI <b>STUDIO</b></span></a>
        <div><a href="/">Home</a>　<a href="/features">Features</a>　<a href="/deployment">System status</a>　<a href="/studio">Open studio ↗</a></div>
      </header>
      <section className="nkai-info-content">
        <div className="nkai-info-eyebrow">HELP &amp; TROUBLESHOOTING</div>
        <h1>Get unstuck, without guessing.</h1>
        <p className="nkai-info-lede">Start with the simplest checks. This page explains what the app can test and what needs a configured worker.</p>
        <div className="nkai-info-grid">
          <article className="nkai-info-card"><h2>Chat does not respond</h2><p>Open Deployment status and run the checks. If the AI route reports offline or not configured, the Colab worker or gateway registration may have expired. A temporary Colab tunnel must stay running.</p></article>
          <article className="nkai-info-card"><h2>No generated voice</h2><p>Confirm the worker advertises TTS and supports the selected language. If it does not, the browser voice fallback may be used. Check browser audio permissions and volume.</p></article>
          <article className="nkai-info-card"><h2>Microphone or camera blocked</h2><p>Use HTTPS, allow the permission in your browser's site settings, and try again. Speech recognition support varies by browser; text chat remains available.</p></article>
          <article className="nkai-info-card"><h2>Live avatar is missing</h2><p>The AI chat worker and LiveTalking video backend are separate services. A working Qwen response does not mean a real-time video avatar has been deployed or registered.</p></article>
          <article className="nkai-info-card"><h2>Mobile layout or controls</h2><p>Use the bottom navigation for the main studio areas and More for secondary tools. Rotate the device if a scene editor needs extra room; controls should remain touch-friendly.</p></article>
          <article className="nkai-info-card"><h2>Privacy and credentials</h2><p>Never paste worker tokens into a chat message or client-side source. Keep them in server-side environment settings or the private Colab secret prompts.</p></article>
        </div>
        <div className="nkai-info-actions"><a className="nkai-info-button" href="/deployment">Run deployment checks</a><a className="nkai-info-button secondary" href="/gateway">Test Cloudflare gateway</a><a className="nkai-info-button secondary" href="/studio">Back to studio</a></div>
        <p className="nkai-info-note">A green status means an endpoint answered successfully. It is not a guarantee that the complete avatar experience has passed an end-to-end test.</p>
      </section>
    </main>
  );
}
