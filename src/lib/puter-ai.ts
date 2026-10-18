type PuterModel = { id: string; name: string; provider?: string };

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (prompt: string, options?: { model?: string }) => Promise<unknown>;
        listModels?: (provider?: string | null) => Promise<unknown>;
      };
    };
  }
}

let puterScriptPromise: Promise<void> | undefined;

async function loadPuter(): Promise<NonNullable<Window["puter"]>> {
  if (typeof window === "undefined") throw new Error("Puter.js is only available in the browser.");
  if (!window.puter?.ai) {
    puterScriptPromise ??= new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-nkai-puter="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Could not load Puter.js.")), { once: true });
        if (window.puter?.ai) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.puter.com/v2/";
      script.async = true;
      script.dataset.nkaiPuter = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Puter.js. Check your connection and retry."));
      document.head.appendChild(script);
    });
    await puterScriptPromise;
  }
  if (!window.puter?.ai) throw new Error("Puter.js loaded, but its AI API is unavailable.");
  return window.puter;
}

function extractText(result: unknown): string {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const item = result as { message?: { content?: unknown }; text?: unknown; content?: unknown };
  const content = item.message?.content ?? item.text ?? item.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part) => part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : "").join("").trim();
  }
  return "";
}

const PREFERRED_MODELS = [
  "gpt-5.6-luna",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.5",
  "anthropic/claude-opus-5-5",
  "google/gemini-3.8-flash",
  "x-ai/grok-4.7",
  "z-ai/glm-5.3",
  "deepseek/deepseek-v4-pro",
  "qwen/qwen3.8-max",
  "mistralai/mistral-small-2603",
  "moonshotai/kimi-k2.6",
  "google/gemma-4-31b-it",
  "meta-llama/llama-4-maverick",
  "microsoft/phi-4",
  "openai/gpt-5.3-codex",
];

export async function listPuterModels(): Promise<PuterModel[]> {
  const puter = await loadPuter();
  if (!puter.ai?.listModels) throw new Error("This Puter.js version does not expose model discovery.");
  const result = await puter.ai.listModels();
  if (!Array.isArray(result)) throw new Error("Puter.js returned an invalid model catalogue.");
  const models: PuterModel[] = result.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as { id?: unknown; name?: unknown; provider?: unknown; aliases?: unknown };
    if (typeof item.id !== "string" || !item.id.trim()) return [];
    return [{
      id: item.id,
      name: typeof item.name === "string" && item.name.trim() ? item.name : item.id,
      provider: typeof item.provider === "string" ? item.provider : undefined,
    }];
  });
  if (!models.length) throw new Error("Puter.js did not return any chat models.");
  const order = new Map(PREFERRED_MODELS.map((id, index) => [id.toLowerCase(), index]));
  return models.sort((a, b) => {
    const ai = order.get(a.id.toLowerCase()) ?? 9999;
    const bi = order.get(b.id.toLowerCase()) ?? 9999;
    return ai - bi || a.name.localeCompare(b.name);
  });
}

export async function chatWithPuter(prompt: string, history: Array<{ role: "user" | "assistant"; text: string }>, model: string): Promise<string> {
  const puter = await loadPuter();
  const transcript = history.slice(-8).map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`).join("\n");
  const fullPrompt = [
    "You are the helpful, warm AI conversation partner inside NKAI Studio. Reply in the user's chosen language when possible. Be concise, useful, and honest. You are the conversation brain, not the live avatar renderer.",
    transcript ? `Recent conversation:\n${transcript}` : "",
    `User: ${prompt}`,
    "Assistant:",
  ].filter(Boolean).join("\n\n");
  const result = await puter.ai!.chat(fullPrompt, { model });
  const text = extractText(result);
  if (!text) throw new Error("Puter.js returned an empty response. Try another model or retry.");
  return text;
}
