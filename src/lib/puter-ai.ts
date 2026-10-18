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

const PUTER_MODELS: PuterModel[] = [
  { id: "openai/gpt-5.5", name: "GPT-5.5", provider: "OpenAI" },
  { id: "anthropic/claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic" },
  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "Google" },
  { id: "x-ai/grok-4.7", name: "Grok 4.7", provider: "xAI" },
  { id: "z-ai/glm-5.3", name: "GLM 5.3", provider: "Z.AI" },
  { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "DeepSeek" },
  { id: "qwen/qwen3.8-max", name: "Qwen 3.8 Max", provider: "Qwen" },
  { id: "mistralai/mistral-small-2603", name: "Mistral Small 4", provider: "Mistral" },
  { id: "moonshotai/kimi-k2.6", name: "Kimi K2.6", provider: "Moonshot AI" },
  { id: "google/gemma-4-31b-it", name: "Gemma 4 31B IT", provider: "Google" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta" },
  { id: "microsoft/phi-4", name: "Phi-4", provider: "Microsoft" },
  { id: "openai/gpt-5.3-codex", name: "GPT-5.3 Codex", provider: "OpenAI · Coding" },
];

export async function listPuterModels(): Promise<PuterModel[]> {
  // Keep the catalogue sourced from the documented model IDs, not a guessed listModels API.
  // Puter may change model availability by account, region, or product updates.
  return PUTER_MODELS;
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
