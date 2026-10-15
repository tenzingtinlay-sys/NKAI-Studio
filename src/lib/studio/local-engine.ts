import type { RefToken } from "./references";

export function localChat(last: string, system: string) {
  const text = last.trim();
  const lower = text.toLowerCase();
  const role = system.split("\n")[0]?.slice(0, 140) || "Studio guide";
  if (/^(hi|hello|hey|good morning|good evening)\b/i.test(text)) {
    return `Hello. ${role} Ask for a scene, a script beat, or a next step and I will answer in the studio.`;
  }
  if (lower.includes("script") || lower.includes("scene")) {
    return `Open with the promise, name the problem, show one concrete step, then close with a single ask. I can drop that into your storyboard from the Director.`;
  }
  const clipped = text.length > 180 ? `${text.slice(0, 180)}…` : text;
  return `Working from “${clipped}”. Do the smallest useful version first, check that it lands, then expand. I kept this short so it can be spoken on the stage.`;
}

export function localScript(topic: string, n: number) {
  const clean = topic.replace(/\s+/g, " ").trim().slice(0, 180) || "the idea";
  const beats = [
    `Here is ${clean}, said plainly.`,
    `It matters because waiting costs more than starting.`,
    `It works in three steps: see the problem, choose one move, check the result.`,
    `Picture it with a real person, not a slogan.`,
    `The line to remember: ${clean}.`,
    `Your next step is one conversation, today.`,
    `Go one layer deeper, and keep the same promise.`,
    `Close by telling them exactly what to do next.`,
  ];
  const count = Math.max(2, Math.min(8, n || 4));
  return beats.slice(0, count).map((text) => ({ text }));
}

function esc(s: string) {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function brief(prompt: string) {
  const parts = prompt
    .split(/[.;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const title = (parts[0] || "Your idea, designed").slice(0, 70);
  const rest = parts
    .slice(1)
    .flatMap((p) => p.split(","))
    .map((x) => x.trim())
    .filter(Boolean);
  const feats = [...rest, "Fast to start", "Built to scale", "Yours to shape"].slice(0, 3);
  return { title, feats };
}

export function localSite(ref: RefToken, kind: string, prompt: string) {
  const { title, feats } = brief(prompt);
  const brand = esc((title.split(" ")[0] || "Studio").replace(/[^A-Za-z0-9]/g, "") || "Studio");
  const bg = ref.bg;
  const fg = ref.fg;
  const ac = ref.accent;
  const css = `:root{--bg:${bg};--fg:${fg};--ac:${ac};--r:${ref.radius}px;--font:${ref.font},Inter,system-ui,sans-serif}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--fg);font:16px/1.55 var(--font)}
a{color:inherit;text-decoration:none}.btn{display:inline-block;padding:12px 22px;border-radius:calc(var(--r)*2);background:var(--ac);color:${bg};font-weight:650}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid color-mix(in srgb,var(--fg) 18%,transparent)}
nav{display:flex;justify-content:space-between;align-items:center;padding:20px 6vw}nav b{font-size:20px}
.card{background:color-mix(in srgb,var(--fg) 6%,var(--bg));border:1px solid color-mix(in srgb,var(--fg) 14%,transparent);border-radius:var(--r);padding:24px}
.muted{opacity:.72}.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}`;
  const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}`;
  if (kind === "dashboard") {
    const stats = [
      ["Active scenes", "12"],
      ["Voices", "6"],
      ["Renders", "48"],
      ["Live sessions", "3"],
    ]
      .map(([k, v]) => `<div class="card"><div class="muted">${k}</div><h2>${v}</h2></div>`)
      .join("");
    return `${head}.app{display:grid;grid-template-columns:220px 1fr;min-height:100vh}aside{border-right:1px solid color-mix(in srgb,var(--fg) 14%,transparent);padding:24px}aside a{display:block;padding:10px 12px;border-radius:var(--r)}main{padding:32px;display:grid;gap:20px}@media(max-width:700px){.app{grid-template-columns:1fr}aside{display:none}}</style></head><body><div class="app"><aside><b>${brand}</b><br><br><a href="#">Overview</a><a href="#">Projects</a><a href="#">Voice</a><a href="#">Renders</a></aside><main><h1>${esc(title)}</h1><div class="grid">${stats}</div><div class="card"><h3>Now playing</h3><p class="muted">${esc(feats.join(" · "))}</p></div></main></div></body></html>`;
  }
  if (kind === "poster") {
    return `${head}body{min-height:100vh;display:grid;place-items:center;text-align:center}h1{font-size:clamp(42px,8vw,96px);line-height:.95;letter-spacing:-.03em}p{margin:20px 0 28px}</style></head><body><div><h1>${esc(title)}</h1><p class="muted">${feats.map(esc).join(" · ")}</p><a class="btn" href="#">Watch</a></div></body></html>`;
  }
  const cards = feats
    .map((f) => `<div class="card"><h3>${esc(f)}</h3><p class="muted">Written for a presenter, a voice, and a single next step.</p></div>`)
    .join("");
  return `${head}header{padding:12vh 6vw 8vh;max-width:920px}h1{font-size:clamp(36px,6vw,68px);line-height:1.02;letter-spacing:-.03em}header p{margin:18px 0 28px;max-width:560px}section{padding:0 6vw 8vh}.cta{margin:0 6vw 8vh;text-align:center;padding:48px 20px;border-radius:var(--r);background:var(--ac);color:${bg}}</style></head><body><nav><b>${brand}</b><a class="btn ghost" href="#">Studio</a></nav><header><h1>${esc(title)}</h1><p class="muted">${esc(prompt.slice(0, 160) || "A new way to present, ready in minutes.")}</p><a class="btn" href="#">Open the stage</a></header><section><div class="grid">${cards}</div></section><div class="cta"><h2>Ready when you are</h2></div></body></html>`;
}
