import { require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/help-B2QHUPyF.js
var import_jsx_runtime = require_jsx_runtime();
function HelpPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "nkai-info-page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "nkai-info-nav",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				className: "nkai-home-brand",
				href: "/",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "nkai-brand-glyph",
					children: "✦"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["NKAI ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "STUDIO" })] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/",
					children: "Home"
				}),
				"　",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/features",
					children: "Features"
				}),
				"　",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/deployment",
					children: "System status"
				}),
				"　",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/studio",
					children: "Open studio ↗"
				})
			] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "nkai-info-content",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "nkai-info-eyebrow",
					children: "HELP & TROUBLESHOOTING"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Get unstuck, without guessing." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "nkai-info-lede",
					children: "Start with the simplest checks. This page explains what the app can test and what needs a configured worker."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nkai-info-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Chat does not respond" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Open Deployment status and run the checks. If the AI route reports offline or not configured, the Colab worker or gateway registration may have expired. A temporary Colab tunnel must stay running." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "No generated voice" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Confirm the worker advertises TTS and supports the selected language. If it does not, the browser voice fallback may be used. Check browser audio permissions and volume." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Microphone or camera blocked" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Use HTTPS, allow the permission in your browser's site settings, and try again. Speech recognition support varies by browser; text chat remains available." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Live avatar is missing" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The AI chat worker and LiveTalking video backend are separate services. A working Qwen response does not mean a real-time video avatar has been deployed or registered." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Mobile layout or controls" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Use the bottom navigation for the main studio areas and More for secondary tools. Rotate the device if a scene editor needs extra room; controls should remain touch-friendly." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Privacy and credentials" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Never paste worker tokens into a chat message or client-side source. Keep them in server-side environment settings or the private Colab secret prompts." })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nkai-info-actions",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "nkai-info-button",
							href: "/deployment",
							children: "Run deployment checks"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "nkai-info-button secondary",
							href: "/gateway",
							children: "Test Cloudflare gateway"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "nkai-info-button secondary",
							href: "/studio",
							children: "Back to studio"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "nkai-info-note",
					children: "A green status means an endpoint answered successfully. It is not a guarantee that the complete avatar experience has passed an end-to-end test."
				})
			]
		})]
	});
}
//#endregion
export { HelpPage as component };
