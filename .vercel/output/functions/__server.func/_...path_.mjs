import { defineEventHandler, getRequestURL, readRawBody, setResponseStatus } from "./_libs/h3+rou3+srvx.mjs";
import { getSessionUser } from "./_chunks/verify.server.mjs";
//#region server/utils/ai-worker-pool.mjs
/** @typedef {import("./ai-worker-types").AIWorker} AIWorker */
/**
* @typedef {Object} WorkerPoolEnv
* @property {string} [AI_WORKER_POOL_JSON]
* @property {string} [AI_WORKER_INTERNAL_URL]
* @property {string} [AI_WORKER_API_TOKEN]
*/
/** @type {Set<string>} */
var BLOCKED_LIVE_PLATFORMS = /* @__PURE__ */ new Set([
	"google-colab",
	"colab",
	"kaggle",
	"kaggle-notebooks"
]);
/**
* Parse a server-only JSON worker pool. A provider is eligible for live routing
* only when it explicitly opts in and is not a notebook-only platform.
* Example entry: { id, platform, baseUrl, token, leaseHours, liveServingAllowed }.
*/
/** @param {WorkerPoolEnv} [env] @returns {AIWorker[]} */
function parseWorkerPool(env = process.env) {
	const raw = env.AI_WORKER_POOL_JSON?.trim();
	if (raw) {
		let parsed;
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error("AI_WORKER_POOL_JSON must be valid JSON.");
		}
		if (!Array.isArray(parsed)) throw new Error("AI_WORKER_POOL_JSON must be a JSON array.");
		return parsed.filter((item) => {
			if (!item || typeof item !== "object" || item.enabled === false) return false;
			const platform = String(item.platform || "").trim().toLowerCase();
			if (BLOCKED_LIVE_PLATFORMS.has(platform) || item.liveServingAllowed !== true) return false;
			if (typeof item.id !== "string" || !item.id.trim()) return false;
			if (typeof item.baseUrl !== "string") return false;
			let url;
			try {
				url = new URL(item.baseUrl);
			} catch {
				return false;
			}
			if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
			const leaseHours = Number(item.leaseHours);
			if (!Number.isFinite(leaseHours) || leaseHours <= 0 || leaseHours > 24) return false;
			return true;
		}).map((item) => ({
			id: item.id.trim(),
			platform: String(item.platform || "custom").trim().toLowerCase(),
			baseUrl: item.baseUrl.replace(/\/+$/, ""),
			token: typeof item.token === "string" ? item.token : "",
			leaseHours: Number(item.leaseHours),
			priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 100
		})).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
	}
	const baseUrl = env.AI_WORKER_INTERNAL_URL?.trim();
	if (!baseUrl) return [];
	let url;
	try {
		url = new URL(baseUrl);
	} catch {
		return [];
	}
	if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return [];
	return [{
		id: "legacy-default",
		platform: "custom",
		baseUrl: baseUrl.replace(/\/+$/, ""),
		token: env.AI_WORKER_API_TOKEN?.trim() || "",
		leaseHours: 24,
		priority: 0
	}];
}
/**
* Time-window ordering is deterministic across stateless/serverless instances.
* @param {AIWorker[]} workers
* @param {number} [nowMs]
* @returns {AIWorker[]}
*/
function orderWorkersForTimeSlot(workers, nowMs = Date.now()) {
	if (!workers.length) return [];
	const totalMs = workers.reduce((sum, worker) => sum + worker.leaseHours * 60 * 60 * 1e3, 0);
	let cursor = (nowMs % totalMs + totalMs) % totalMs;
	let activeIndex = 0;
	for (let index = 0; index < workers.length; index += 1) {
		const windowMs = workers[index].leaseHours * 60 * 60 * 1e3;
		if (cursor < windowMs) {
			activeIndex = index;
			break;
		}
		cursor -= windowMs;
	}
	return [...workers.slice(activeIndex), ...workers.slice(0, activeIndex)];
}
//#endregion
//#region server/routes/api/ai/[...path].ts
var HOP_BY_HOP = /* @__PURE__ */ new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailers",
	"transfer-encoding",
	"upgrade",
	"host",
	"content-length"
]);
var ALLOWED = /* @__PURE__ */ new Set([
	"chat",
	"stream",
	"tts",
	"health",
	"capabilities",
	"tts-capabilities"
]);
async function workerIsReady(worker) {
	try {
		const headers = new Headers();
		if (worker.token) headers.set("authorization", "Bearer " + worker.token);
		const response = await fetch(worker.baseUrl + "/health", {
			headers,
			cache: "no-store",
			signal: AbortSignal.timeout(4e3)
		});
		if (!response.ok) return false;
		if (!(response.headers.get("content-type") || "").includes("json")) return true;
		const body = await response.json();
		const status = typeof body.status === "string" ? body.status.toLowerCase() : "";
		if (status && ![
			"ready",
			"healthy",
			"ok",
			"running"
		].includes(status)) return false;
		return body.ready !== false;
	} catch {
		return false;
	}
}
/**
* Same-origin gateway to the private open-source inference worker.
* Set AI_WORKER_INTERNAL_URL to the worker's private base URL and
* AI_WORKER_API_TOKEN to its optional WORKER_API_TOKEN. Never expose these
* values in browser code. The browser only calls /api/ai/{chat,tts,health,capabilities}.
*/
var ____path__default = defineEventHandler(async (event) => {
	if (process.env.AI_ALLOW_ANONYMOUS?.trim() !== "true") {
		let user;
		try {
			user = await getSessionUser();
		} catch {
			setResponseStatus(event, 401);
			return {
				error: "Sign in to use NKAI inference.",
				code: "AI_AUTH_REQUIRED"
			};
		}
		if (!user) {
			setResponseStatus(event, 401);
			return {
				error: "Sign in to use NKAI inference.",
				code: "AI_AUTH_REQUIRED"
			};
		}
	}
	let workers;
	try {
		workers = orderWorkersForTimeSlot(parseWorkerPool(), Date.now());
	} catch {
		setResponseStatus(event, 500);
		return {
			error: "The server-side AI worker pool configuration is invalid.",
			code: "AI_WORKER_POOL_INVALID"
		};
	}
	const requestUrl = getRequestURL(event);
	const suffix = requestUrl.pathname.slice(8).split("/").filter(Boolean);
	if (suffix.length !== 1 || !ALLOWED.has(suffix[0])) {
		setResponseStatus(event, 404);
		return { error: "Unknown private AI endpoint." };
	}
	const method = event.method.toUpperCase();
	const endpoint = suffix[0];
	if ((/* @__PURE__ */ new Set([
		"health",
		"capabilities",
		"tts-capabilities"
	])).has(endpoint) ? !["GET", "HEAD"].includes(method) : method !== "POST") {
		setResponseStatus(event, 405);
		return { error: "Method not allowed for this AI endpoint." };
	}
	if (method === "POST") {
		const origin = event.node?.req?.headers?.origin;
		if (typeof origin !== "string" || origin !== requestUrl.origin) {
			setResponseStatus(event, 403);
			return {
				error: "Cross-origin requests are not allowed.",
				code: "AI_ORIGIN_REJECTED"
			};
		}
		if (String(event.node?.req?.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") {
			setResponseStatus(event, 415);
			return { error: "Content-Type must be application/json." };
		}
	}
	let worker;
	const dedicatedTtsUrl = ["tts", "tts-capabilities"].includes(suffix[0]) ? process.env.AI_TTS_INTERNAL_URL?.trim() : "";
	if (dedicatedTtsUrl) {
		let ttsUrl;
		try {
			ttsUrl = new URL(dedicatedTtsUrl);
			if (!["http:", "https:"].includes(ttsUrl.protocol) || ttsUrl.username || ttsUrl.password) throw new Error("Invalid URL");
		} catch {
			setResponseStatus(event, 500);
			return {
				error: "The private TTS worker URL is invalid.",
				code: "AI_TTS_URL_INVALID"
			};
		}
		worker = {
			id: "dedicated-tts",
			platform: "lightning-ai",
			baseUrl: ttsUrl.href.replace(/\/$/, ""),
			token: process.env.AI_TTS_API_TOKEN?.trim() || "",
			leaseHours: 24,
			priority: 0
		};
		if (!await workerIsReady(worker)) {
			setResponseStatus(event, 503);
			return {
				error: "The dedicated TTS worker is not ready. Check its /health endpoint, reference voice, and authentication.",
				code: "AI_TTS_UNAVAILABLE"
			};
		}
	} else {
		for (const candidate of workers) if (await workerIsReady(candidate)) {
			worker = candidate;
			break;
		}
		if (!worker) {
			setResponseStatus(event, 503);
			return {
				error: workers.length ? "No configured NKAI AI worker is currently healthy." : "No eligible NKAI inference worker is configured.",
				code: workers.length ? "AI_WORKERS_UNAVAILABLE" : "AI_WORKER_NOT_CONFIGURED"
			};
		}
	}
	const upstreamBase = worker.baseUrl || process.env.AI_WORKER_INTERNAL_URL?.trim();
	if (!upstreamBase) {
		setResponseStatus(event, 503);
		return {
			error: "The private NKAI inference worker is not configured.",
			code: "AI_WORKER_NOT_CONFIGURED"
		};
	}
	let base;
	try {
		base = new URL(upstreamBase);
		if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Invalid URL");
	} catch {
		setResponseStatus(event, 500);
		return { error: "The private AI worker URL is invalid." };
	}
	const target = new URL(base.href);
	target.pathname = (base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname) + "/" + (suffix[0] === "tts-capabilities" ? "capabilities" : suffix[0] === "stream" ? "chat/stream" : suffix[0]);
	target.search = "";
	const headers = new Headers();
	headers.set("x-forwarded-prefix", "/api/ai");
	headers.set("content-type", "application/json");
	const token = dedicatedTtsUrl ? worker?.token?.trim() : worker?.token?.trim() || process.env.AI_WORKER_API_TOKEN?.trim();
	if (token) headers.set("authorization", "Bearer " + token);
	let body;
	if (method === "POST") {
		const raw = await readRawBody(event, false);
		body = raw ? typeof raw === "string" ? raw : new TextDecoder().decode(raw) : "";
		const maxBytes = endpoint === "tts" ? 16e3 : 64e3;
		if (!body) {
			setResponseStatus(event, 400);
			return { error: "A JSON request body is required." };
		}
		if (new TextEncoder().encode(body).byteLength > maxBytes) {
			setResponseStatus(event, 413);
			return { error: "The AI request body is too large." };
		}
		try {
			const parsed = JSON.parse(body);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected JSON object");
		} catch {
			setResponseStatus(event, 400);
			return { error: "Invalid JSON request body." };
		}
	}
	try {
		const upstream = await fetch(target, {
			method,
			headers,
			body,
			redirect: "manual",
			signal: AbortSignal.timeout([
				"chat",
				"stream",
				"tts"
			].includes(suffix[0]) ? 12e4 : 15e3)
		});
		const responseHeaders = new Headers();
		upstream.headers.forEach((value, name) => {
			if (!HOP_BY_HOP.has(name.toLowerCase())) responseHeaders.set(name, value);
		});
		responseHeaders.set("cache-control", "no-store");
		return new Response(upstream.body, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: responseHeaders
		});
	} catch (error) {
		setResponseStatus(event, 502);
		return {
			error: "Unable to reach the private NKAI inference worker.",
			code: "AI_WORKER_UNREACHABLE",
			detail: error instanceof Error ? error.message : "Upstream connection failed"
		};
	}
});
//#endregion
export { ____path__default as default };
