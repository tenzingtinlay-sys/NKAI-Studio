import { useState } from "react";
import { ImagePlus, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";

type DuixResult = { code?: number | string; message?: string; data?: unknown; conversationId?: string; avatarId?: string };

const voices = ["Marin", "Eve", "Leo", "Ara", "Rex", "Sal"];

export function DuixAvatarCreator() {
  const [source, setSource] = useState<"library" | "photo">("library");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [voice, setVoice] = useState("Marin");
  const [language, setLanguage] = useState("en-US");
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("Is there anything I can help you with?");
  const [description, setDescription] = useState("You are an AI avatar created for NKAI Studio. Be helpful, clear, and respectful.");
  const [conversationId, setConversationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DuixResult | null>(null);
  const [error, setError] = useState("");

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be 10 MB or smaller."); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }

  async function createAvatar() {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/duix/create-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.trim(),
          ttsName: voice,
          language,
          name: name.trim() || undefined,
          greetings: greeting.trim() || undefined,
          profile: description.trim() || undefined,
          source,
        }),
      });
      const body = await response.json().catch(() => ({})) as DuixResult & { error?: string };
      if (!response.ok) throw new Error(body.error || body.message || `Duix returned HTTP ${response.status}`);
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create avatar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mf-card" style={{ marginBottom: 18, border: "1px solid #5c3c85", background: "linear-gradient(145deg, #17131f, #10141b)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c4a2ff", fontSize: 11, fontWeight: 800, letterSpacing: ".12em" }}><Sparkles size={15} /> DUIX CLOUD · AVATAR CREATOR</div>
          <h2 style={{ fontSize: 22, margin: "8px 0 6px" }}>Create a Duix AI avatar</h2>
          <p style={{ color: "#aab3c2", lineHeight: 1.6, margin: 0, maxWidth: 760 }}>Configure a Duix avatar from inside NKAI Studio. Your Duix API token stays on the server; this form never asks for it in the browser.</p>
        </div>
        <a href="https://www.duix.com/dashboard/avatar-creator" target="_blank" rel="noreferrer" className="mf-ghost">Open Duix dashboard ↗</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 16, marginTop: 20 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Start from <span style={{ color: "#c4a2ff" }}>*</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" className={source === "library" ? "mf-primary" : "mf-ghost"} onClick={() => setSource("library")}>Duix library</button>
            <button type="button" className={source === "photo" ? "mf-primary" : "mf-ghost"} onClick={() => setSource("photo")}>Upload a face photo</button>
          </div>
          {source === "photo" ? (
            <div style={{ marginTop: 12, border: "1px dashed #61516f", borderRadius: 12, padding: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                {photoPreview ? <img src={photoPreview} alt="Selected face preview" style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 10 }} /> : <ImagePlus size={28} />}
                <span><b>{photo?.name || "Choose a face photo"}</b><small style={{ display: "block", color: "#aab3c2", marginTop: 4 }}>Image preview · max 10 MB</small></span>
                <input type="file" accept="image/*" hidden onChange={(e) => selectPhoto(e.target.files?.[0])} />
              </label>
              <p style={{ fontSize: 12, color: "#d7b8a4", lineHeight: 1.5, marginBottom: 0 }}>Photo upload is shown for workflow parity, but creation is disabled for this mode until Duix’s documented photo-upload API fields are confirmed. The image is not uploaded by this form.</p>
            </div>
          ) : (
            <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#1b1b26", color: "#c8c6d4", fontSize: 13, lineHeight: 1.55 }}>The documented createAvatar example does not expose a library-avatar ID or language field. This selection is a workspace preference only; it is not sent to Duix until its API schema confirms support.</div>
          )}
        </div>

        <div style={{ display: "grid", gap: 13, alignContent: "start" }}>
          <div>
            <label htmlFor="duix-conversation" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Conversation ID <span style={{ color: "#c4a2ff" }}>*</span></label>
            <input id="duix-conversation" value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder="Enter your Duix conversationId" />
            <small style={{ color: "#9ca5b5" }}>Required by the documented API example.</small>
          </div>
          <div>
            <label htmlFor="duix-voice" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Voice <span style={{ color: "#c4a2ff" }}>*</span></label>
            <select id="duix-voice" value={voice} onChange={(e) => setVoice(e.target.value)}>{voices.map((v) => <option key={v} value={v}>{v}</option>)}</select>
          </div>
          <div>
            <label htmlFor="duix-language" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Primary language preference (not sent by documented API)</label>
            <select id="duix-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en-US">English (US)</option><option value="en-IN">English (India)</option><option value="hi-IN">Hindi</option><option value="zh-CN">Chinese (Mandarin)</option><option value="ja-JP">Japanese</option><option value="ko-KR">Korean</option><option value="fr-FR">French</option><option value="de-DE">German</option><option value="es-ES">Spanish</option>
            </select>
          </div>
          <div>
            <label htmlFor="duix-name" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Name <span style={{ color: "#9ca5b5", fontWeight: 400 }}>(optional)</span></label>
            <input id="duix-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. NKAI Career Coach" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 14, marginTop: 16 }}>
        <div><label htmlFor="duix-greeting" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Greeting <span style={{ color: "#9ca5b5", fontWeight: 400 }}>(optional)</span></label><textarea id="duix-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} maxLength={1000} /></div>
        <div><label htmlFor="duix-description" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Description / system profile <span style={{ color: "#9ca5b5", fontWeight: 400 }}>(optional)</span></label><textarea id="duix-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={10000} /><small style={{ color: "#9ca5b5" }}>{description.length}/10,000 characters</small></div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
        <button type="button" className="mf-primary" disabled={busy || !conversationId.trim() || source === "photo"} onClick={() => void createAvatar()}>{busy ? <><LoaderCircle size={15} /> Creating…</> : <><Sparkles size={15} /> Create Duix avatar</>}</button>
        <span style={{ display: "inline-flex", gap: 7, alignItems: "center", color: "#aab3c2", fontSize: 12 }}><ShieldCheck size={14} /> API token remains server-side</span>
      </div>
      {source === "photo" && <p style={{ color: "#d7b8a4", fontSize: 13 }}>Switch to Duix library to create using the currently documented request.</p>}
      {error && <p role="alert" style={{ color: "#ffb4a8", marginTop: 14 }}>{error}</p>}
      {result && <div role="status" style={{ marginTop: 14, border: "1px solid #285c43", background: "#10271d", borderRadius: 10, padding: 14 }}><b style={{ color: "#86efac" }}>Duix API returned a successful response</b><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#d4e9dc", fontSize: 12 }}>{JSON.stringify(result, null, 2)}</pre></div>}
      <p style={{ fontSize: 12, color: "#9ca5b5", lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>Requires server secret <code>DUIX_API_TOKEN</code> and a valid Duix conversation ID. Duix account access, credits/plan, and API permissions are managed by Duix. Only the documented createAvatar request is sent; no API token is stored in browser storage.</p>
    </section>
  );
}
