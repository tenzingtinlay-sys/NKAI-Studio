type PuterModel = { id: string; name: string; provider?: string };

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (prompt: string, options?: { model?: string }) => Promise<unknown>;
        listModels?: () => Promise<unknown>;
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

export async function listPuterModels(): Promise<PuterModel[]> {
  const puter = await loadPuter();
  if (!puter.ai?.listModels) return [{ id: "gpt-5.6-luna", name: "GPT-5.6 Luna" }];
  const raw = await puter.ai.listModels();
  const entries = Array.isArray(raw) ? raw : raw && typeof raw === "object" && "models" in raw && Array.isArray((raw as { models: unknown }).models) ? (raw as { models: unknown[] }).models : [];
  const models = entries.flatMap((entry): PuterModel[] => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    const id = value.id ?? value.model ?? value.name;
    if (typeof id !== "string" || !id.trim()) return [];
    return [{ id, name: typeof value.name === "string" && value.name !== id ? value.name : id, provider: typeof value.provider === "string" ? value.provider : undefined }];
  });
  return models.length ? models.sort((a, b) => a.name.localeCompare(b.name)) : [{ id: "gpt-5.6-luna", name: "GPT-5.6 Luna" }];
}

export async function chatWithPuter(prompt: string, history: Array<{ role: "user" | "assistant"; text: string }>, model: string): Promise<string> {
  const puter = await loadPuter();
  const transcript = history.slice(-8).map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`).join("\\n");
  const fullPrompt = [
    "You are the helpful, warm AI conversation partner inside NKAI Studio. Reply in the user's chosen language when possible. Be concise, useful, and honest. You are the conversation brain, not the live avatar renderer.",
    transcript ? `Recent conversation:\\n${transcript}` : "",
    `User: ${prompt}`,
    "Assistant:",
  ].filter(Boolean).join("\\n\\n");
  const result = await puter.ai!.chat(fullPrompt, { model });
  const text = extractText(result);
  if (!text) throw new Error("Puter.js returned an empty response. Try another model or retry.");
  return text;
}
