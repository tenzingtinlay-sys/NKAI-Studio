import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/features")({ component: FeaturesPage });

function FeaturesPage() {
  return (
    <main className="nkai-info-page">
      <header className="nkai-info-nav">
        <a className="nkai-home-brand" href="/"><span className="nkai-brand-glyph">✦</span><span>NKAI <b>STUDIO</b></span></a>
        <div><a href="/">Home</a>　<a href="/help">Help</a>　<a href="/deployment">System status</a>　<a href="/studio">Open studio ↗</a></div>
      </header>
      <section className="nkai-info-content">
        <div className="nkai-info-eyebrow">PRODUCT GUIDE</div>
        <h1>One workspace. Clear tools. No pretend features.</h1>
        <p className="nkai-info-lede">NKAI Studio brings avatar conversations, voice, scene-based video creation, and system diagnostics into one responsive workspace. Some capabilities depend on the browser, selected model, or a live GPU worker.</p>
        <div className="nkai-info-grid">
          <article className="nkai-info-card"><h2>AI conversation</h2><p>Chat through the same-origin server route to the configured NKAI worker. If the worker is unavailable, the app should report that clearly rather than claiming the conversation is live.</p></article>
          <article className="nkai-info-card"><h2>Voice and language</h2><p>Use browser speech as a fallback, or worker-generated audio when the configured worker supports TTS for your selected language. Browser voice availability varies by device.</p></article>
          <article className="nkai-info-card"><h2>Avatar workspace</h2><p>Choose a conversation profile and use the call controls. Profile initials are intentionally used until a real, licensed avatar model is connected; stock portraits are not presented as digital humans.</p></article>
          <article className="nkai-info-card"><h2>Video and scenes</h2><p>Build a short script, arrange scenes, preview speech, and render supported browser-based output. Rendering quality and export formats depend on browser support.</p></article>
          <article className="nkai-info-card"><h2>Projects and settings</h2><p>Organize the work you create and adjust studio options. Current local persistence is browser-based, so it is not a cloud-sync or multi-device project store.</p></article>
          <article className="nkai-info-card"><h2>Diagnostics</h2><p>Check the app's AI routes and Cloudflare gateway separately. A reachable endpoint proves connectivity, not end-to-end voice quality or avatar lip-sync.</p></article>
        </div>
        <div className="nkai-info-actions"><a className="nkai-info-button" href="/studio">Enter studio</a><a className="nkai-info-button secondary" href="/deployment">Check deployment</a><a className="nkai-info-button secondary" href="/gateway">Check gateway</a></div>
        <p className="nkai-info-note">Cost policy: the core product does not silently switch to paid inference APIs. Free compute providers can still impose session, queue, and availability limits.</p>
      </section>
    </main>
  );
}
