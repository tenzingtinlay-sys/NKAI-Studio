import { createServerFn } from "@tanstack/react-start";
import { localChat, localScript, localSite } from "./local-engine";
import { REFERENCES } from "./references";

type Turn = { role: "user" | "assistant"; content: string };

async function grokText(messages: { role: string; content: string }[], max: number) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(28000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: max,
        temperature: 0.6,
        messages,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return body.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export const studioHealth = createServerFn({ method: "GET" }).handler(async () => {
  return {
    engine: process.env.XAI_API_KEY ? "grok" : "local",
    model: process.env.XAI_API_KEY ? "grok-4.5" : null,
    references: REFERENCES.length,
    imagine: Boolean(process.env.XAI_API_KEY),
    voice: Boolean(process.env.XAI_API_KEY),
  };
});

export const studioChat = createServerFn({ method: "POST" })
  .validator((input: { system?: string; messages?: Turn[] }) => {
    const messages = (input.messages || [])
      .slice(-12)
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 4000),
      }));
    return {
      system: String(input.system || "You are a helpful studio guide.").slice(0, 4000),
      messages,
    };
  })
  .handler(async ({ data }) => {
    const last = [...data.messages].reverse().find((m) => m.role === "user")?.content || "";
    if (!last) return { reply: "Say that again in a full sentence.", engine: "local" as const };
    const text = await grokText(
      [
        {
          role: "system",
          content: `${data.system}\nReply in 1-3 short spoken sentences. No markdown, no lists.`,
        },
        ...data.messages,
      ],
      220,
    );
    if (text) return { reply: text.replace(/[*#`]/g, "").slice(0, 700), engine: "grok" as const };
    return { reply: localChat(last, data.system), engine: "local" as const };
  });

export const studioScript = createServerFn({ method: "POST" })
  .validator((input: { topic?: string; scenes?: number; kind?: string }) => ({
    topic: String(input.topic || "").trim().slice(0, 600),
    scenes: Math.max(2, Math.min(8, Number(input.scenes) || 4)),
    kind: String(input.kind || "avatar video").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    if (!data.topic) return { scenes: localScript("a clear idea", data.scenes), engine: "local" as const };
    const raw = await grokText(
      [
        {
          role: "system",
          content:
            'Write a spoken video script. Reply with JSON only: {"scenes":[{"text":"..."}]}. Each text is 1-2 sentences a presenter can say. No markdown.',
        },
        {
          role: "user",
          content: `Topic: ${data.topic}. Kind: ${data.kind}. Scene count: ${data.scenes}.`,
        },
      ],
      900,
    );
    if (raw) {
      const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as { scenes?: { text?: string }[] } | { text?: string }[];
          const arr = Array.isArray(parsed) ? parsed : parsed.scenes || [];
          const scenes = arr
            .map((s) => ({ text: String(s.text || "").trim() }))
            .filter((s) => s.text)
            .slice(0, 8);
          if (scenes.length) return { scenes, engine: "grok" as const };
        } catch {
          /* fall through */
        }
      }
    }
    return { scenes: localScript(data.topic, data.scenes), engine: "local" as const };
  });

export const studioDesign = createServerFn({ method: "POST" })
  .validator(
    (input: { prompt?: string; kind?: string; reference?: string; previous?: string; change?: string }) => ({
      prompt: String(input.prompt || "").slice(0, 2000),
      kind: String(input.kind || "landing").slice(0, 40),
      reference: String(input.reference || ""),
      previous: String(input.previous || "").slice(0, 12000),
      change: String(input.change || "").slice(0, 500),
    }),
  )
  .handler(async ({ data }) => {
    const ref = REFERENCES.find((r) => r.id === data.reference) || REFERENCES[0];
    if (!ref) return { html: "<p>No reference styles loaded.</p>", engine: "local" as const, reference: "" };
    const kind = ["landing", "dashboard", "poster"].includes(data.kind) ? data.kind : "landing";
    if (data.prompt || data.change) {
      const user = data.change
        ? `Current HTML:\n${data.previous}\n\nApply this change and return the full updated HTML document only:\n${data.change}`
        : `Design type: ${kind}\nBrief: ${data.prompt}`;
      const raw = await grokText(
        [
          {
            role: "system",
            content: `You are a product designer. Return ONE complete HTML document with inline CSS only. No markdown fences. Visual language: scheme ${ref.scheme}, background ${ref.bg}, text ${ref.fg}, accent ${ref.accent}, font ${ref.font}, radius ${ref.radius}px. Invent original copy. Do not copy a trademarked brand name.`,
          },
          { role: "user", content: user },
        ],
        3500,
      );
      if (raw && /<html|<!doctype|<body/i.test(raw)) {
        const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/);
        const html = (fenced ? fenced[1] : raw).trim();
        return { html, engine: "grok" as const, reference: ref.id };
      }
    }
    return {
      html: localSite(ref, kind, data.prompt || data.change || "Studio"),
      engine: "local" as const,
      reference: ref.id,
    };
  });

export const studioImage = createServerFn({ method: "POST" })
  .validator((input: { prompt?: string }) => ({
    prompt: String(input.prompt || "").trim().slice(0, 700),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Photoreal generation is not connected. WebGPU art still renders instantly." };
    }
    if (!data.prompt) return { ok: false as const, error: "Describe the image first." };
    const models = ["grok-imagine-image", "grok-imagine-image-2.0"];
    let detail = "Image request failed.";
    for (const model of models) {
      try {
        const res = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            model,
            prompt: data.prompt,
            n: 1,
            response_format: "b64_json",
          }),
        });
        if (!res.ok) {
          detail = `Image engine returned ${res.status}.`;
          continue;
        }
        const body = (await res.json()) as {
          data?: { url?: string; b64_json?: string; base64?: string }[];
        };
        const item = body.data?.[0];
        const b64 = item?.b64_json || item?.base64;
        if (b64) {
          return { ok: true as const, dataUrl: `data:image/jpeg;base64,${b64}`, engine: model };
        }
        if (item?.url) {
          const img = await fetch(item.url, { signal: AbortSignal.timeout(20000) });
          if (!img.ok) continue;
          const buf = Buffer.from(await img.arrayBuffer());
          const mime = img.headers.get("content-type") || "image/jpeg";
          return {
            ok: true as const,
            dataUrl: `data:${mime};base64,${buf.toString("base64")}`,
            engine: model,
          };
        }
      } catch {
        detail = "Image engine timed out.";
      }
    }
    return { ok: false as const, error: detail };
  });

export const studioVoice = createServerFn({ method: "POST" })
  .validator((input: { text?: string; voice?: string; lang?: string }) => ({
    text: String(input.text || "").trim().slice(0, 500),
    voice: String(input.voice || "eve").slice(0, 32),
    lang: String(input.lang || "en").slice(0, 8),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Neural voice is not connected. Browser speech still works." };
    if (!data.text) return { ok: false as const, error: "Nothing to speak." };
    try {
      const res = await fetch("https://api.x.ai/v1/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          text: data.text,
          voice_id: data.voice,
          language: data.lang.startsWith("en") ? "en" : data.lang.slice(0, 2),
        }),
      });
      if (!res.ok) return { ok: false as const, error: `Voice engine returned ${res.status}.` };
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") || "audio/mpeg";
      return { ok: true as const, audio: buf.toString("base64"), mime, voice: data.voice };
    } catch {
      return { ok: false as const, error: "Voice engine timed out." };
    }
  });

const ALLOWED_HOSTS = new Set(["images.unsplash.com"]);

export const studioProxyImage = createServerFn({ method: "POST" })
  .validator((input: { url?: string }) => {
    const url = String(input.url || "");
    let host = "";
    try {
      host = new URL(url).host;
    } catch {
      host = "";
    }
    if (!ALLOWED_HOSTS.has(host)) throw new Error("Image host is not allowed.");
    return { url };
  })
  .handler(async ({ data }) => {
    const res = await fetch(data.url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("Could not load the portrait.");
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || "image/jpeg";
    return { dataUrl: `data:${mime};base64,${buf.toString("base64")}` };
  });
