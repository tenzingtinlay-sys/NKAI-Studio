import { __toESM } from "../_runtime.mjs";
import { require_jsx_runtime, require_react } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deployment-BPtFGOS1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DeploymentPage() {
	const [checks, setChecks] = (0, import_react.useState)([
		{
			label: "NKAI app",
			state: "checking",
			detail: "Page is running in this browser."
		},
		{
			label: "Private AI chat worker",
			state: "checking",
			detail: "Checking /api/ai/health…"
		},
		{
			label: "Multilingual voice capabilities",
			state: "checking",
			detail: "Checking /api/ai/capabilities…"
		},
		{
			label: "Live avatar streaming",
			state: "checking",
			detail: "Checking /api/livetalking/…"
		}
	]);
	const [checkedAt, setCheckedAt] = (0, import_react.useState)("Not checked yet");
	async function refresh() {
		setChecks([
			{
				label: "NKAI app",
				state: "ready",
				detail: "The application page is running."
			},
			{
				label: "Private AI chat worker",
				state: "checking",
				detail: "Checking the server-side worker route…"
			},
			{
				label: "Multilingual voice capabilities",
				state: "checking",
				detail: "Checking the server-side capability route…"
			},
			{
				label: "Live avatar streaming",
				state: "checking",
				detail: "Checking the embedded streaming service…"
			}
		]);
		const results = [{
			label: "NKAI app",
			state: "ready",
			detail: "The application page is running."
		}];
		const probes = [
			{
				label: "Private AI chat worker",
				url: "/api/ai/health",
				expected: "AI worker"
			},
			{
				label: "Neural voice capabilities",
				url: "/api/ai/tts-capabilities",
				expected: "voice capability"
			},
			{
				label: "Live avatar streaming",
				url: "/api/livetalking/status",
				expected: "live avatar service"
			}
		];
		for (const probe of probes) {
			try {
				const response = await fetch(probe.url, {
					cache: "no-store",
					signal: AbortSignal.timeout(12e3)
				});
				const contentType = response.headers.get("content-type") || "";
				const body = contentType.includes("json") ? await response.json() : null;
				if (response.ok) {
					let detail = "Endpoint responded successfully.";
					if (probe.url.endsWith("/health")) detail = `Worker status: ${String(body?.status || "reachable")}; model: ${String(body?.model || "not reported")}; GPU: ${String(body?.cuda ?? "not reported")}.`;
					else if (probe.url.includes("capabilities")) {
						const tts = body?.tts;
						const chat = body?.chat;
						const langs = tts?.readyLanguages || [];
						detail = `Chat model: ${chat?.model || "reported by worker"}; TTS: ${tts?.provider || "reported by worker"}; advertised language variants: ${langs.length || tts?.languages?.length || 0}.`;
					} else detail = contentType.includes("text/html") ? "Embedded streaming page returned HTML." : "Streaming endpoint responded.";
					results.push({
						label: probe.label,
						state: "ready",
						detail
					});
				} else {
					const code = typeof body?.code === "string" ? body.code : "";
					const message = typeof body?.error === "string" ? body.error : `HTTP ${response.status}`;
					results.push({
						label: probe.label,
						state: code.includes("NOT_CONFIGURED") ? "not-configured" : "offline",
						detail: message
					});
				}
			} catch (error) {
				results.push({
					label: probe.label,
					state: "offline",
					detail: error instanceof Error ? error.message : "Request failed."
				});
			}
			setChecks([...results, ...probes.slice(results.length - 1).map((remaining) => ({
				label: remaining.label,
				state: "checking",
				detail: "Waiting for health check…"
			}))]);
		}
		setChecks(results);
		setCheckedAt((/* @__PURE__ */ new Date()).toLocaleString());
	}
	(0, import_react.useEffect)(() => {
		refresh();
	}, []);
	const badge = (state) => state === "ready" ? "READY" : state === "checking" ? "CHECKING" : state === "not-configured" ? "NOT CONFIGURED" : "OFFLINE";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		style: {
			minHeight: "100vh",
			background: "#08090b",
			color: "#f5f7fa",
			padding: "clamp(20px, 5vw, 56px)",
			fontFamily: "Manrope, system-ui, sans-serif"
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				maxWidth: 1e3,
				margin: "0 auto"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: {
						color: "#8ab4ff",
						letterSpacing: ".14em",
						fontSize: 12,
						fontWeight: 800
					},
					children: "NKAI STUDIO · LIVE DEPLOYMENT CHECK"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					style: {
						fontSize: "clamp(32px, 5vw, 52px)",
						lineHeight: 1.05,
						margin: "12px 0"
					},
					children: "Is the app actually working?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: {
						color: "#aab3c2",
						maxWidth: 760,
						lineHeight: 1.7
					},
					children: "This page tests the running deployment—not just whether the GitHub source code exists. Green means the endpoint answered; it does not by itself prove voice quality or lip-sync accuracy."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 12,
						flexWrap: "wrap",
						margin: "24px 0"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void refresh(),
						style: {
							padding: "12px 18px",
							borderRadius: 10,
							border: "1px solid #3a4353",
							background: "#171d27",
							color: "#fff",
							cursor: "pointer",
							fontWeight: 700
						},
						children: "Run live checks again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						style: {
							padding: "12px 18px",
							borderRadius: 10,
							border: "1px solid #3a4353",
							color: "#fff",
							textDecoration: "none",
							display: "inline-flex",
							alignItems: "center"
						},
						children: "Open NKAI Studio"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					style: {
						color: "#8792a4",
						fontSize: 12
					},
					children: ["Last checked: ", checkedAt]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
						gap: 14
					},
					children: checks.map((check) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						style: {
							border: "1px solid #252d3a",
							background: "#10141b",
							borderRadius: 16,
							padding: 20
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								gap: 12,
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								style: {
									fontSize: 17,
									margin: 0
								},
								children: check.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10,
									letterSpacing: ".08em",
									fontWeight: 800,
									padding: "6px 8px",
									borderRadius: 20,
									background: check.state === "ready" ? "#123b2d" : check.state === "checking" ? "#292d36" : "#49251f",
									color: check.state === "ready" ? "#86efac" : check.state === "checking" ? "#d5d9e2" : "#ffb4a8",
									whiteSpace: "nowrap"
								},
								children: badge(check.state)
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "#aab3c2",
								lineHeight: 1.6,
								marginBottom: 0,
								overflowWrap: "anywhere"
							},
							children: check.detail
						})]
					}, check.label))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					style: {
						marginTop: 22,
						border: "1px solid #34313a",
						background: "#141218",
						borderRadius: 16,
						padding: 20
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						style: {
							marginTop: 0,
							fontSize: 18
						},
						children: "What deployment needs"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						style: {
							color: "#b8bdc8",
							lineHeight: 1.8,
							paddingLeft: 20
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Deploy this full-stack app as a Docker Space on Hugging Face Spaces; GitHub Pages alone cannot execute the private API routes." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Set ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "AI_WORKER_INTERNAL_URL" }),
								" and, if enabled, ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "AI_WORKER_API_TOKEN" }),
								" in the deployment's server-side environment variables."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Set ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "LIVETALKING_INTERNAL_URL" }),
								" for the streaming service. WebRTC still needs correctly configured public ICE/STUN/TURN and media ports."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Run a real conversation, test the selected language's generated audio, and confirm the avatar's mouth moves with playback." })
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: {
						color: "#778194",
						fontSize: 12,
						marginTop: 28
					},
					children: "No worker endpoint or secret is entered into this page. This is a diagnostic page, not a claim that an unconfigured service is online."
				})
			]
		})
	});
}
//#endregion
export { DeploymentPage as component };
