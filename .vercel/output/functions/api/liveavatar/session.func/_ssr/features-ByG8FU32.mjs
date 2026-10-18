import { require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/features-ByG8FU32.js
var import_jsx_runtime = require_jsx_runtime();
function FeaturesPage() {
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
					href: "/help",
					children: "Help"
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
					children: "PRODUCT GUIDE"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "One workspace. Clear tools. No pretend features." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "nkai-info-lede",
					children: "NKAI Studio brings avatar conversations, voice, scene-based video creation, and system diagnostics into one responsive workspace. Some capabilities depend on the browser, selected model, or a live GPU worker."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nkai-info-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "AI conversation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Chat through the same-origin server route to the configured NKAI worker. If the worker is unavailable, the app should report that clearly rather than claiming the conversation is live." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Voice and language" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Use browser speech as a fallback, or worker-generated audio when the configured worker supports TTS for your selected language. Browser voice availability varies by device." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Avatar workspace" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Choose a conversation profile and use the call controls. Profile initials are intentionally used until a real, licensed avatar model is connected; stock portraits are not presented as digital humans." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Video and scenes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Build a short script, arrange scenes, preview speech, and render supported browser-based output. Rendering quality and export formats depend on browser support." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Projects and settings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Organize the work you create and adjust studio options. Current local persistence is browser-based, so it is not a cloud-sync or multi-device project store." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-info-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Diagnostics" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Check the app's AI routes and Cloudflare gateway separately. A reachable endpoint proves connectivity, not end-to-end voice quality or avatar lip-sync." })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nkai-info-actions",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "nkai-info-button",
							href: "/studio",
							children: "Enter studio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "nkai-info-button secondary",
							href: "/deployment",
							children: "Check deployment"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "nkai-info-button secondary",
							href: "/gateway",
							children: "Check gateway"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "nkai-info-note",
					children: "Cost policy: the core product does not silently switch to paid inference APIs. Free compute providers can still impose session, queue, and availability limits."
				})
			]
		})]
	});
}
//#endregion
export { FeaturesPage as component };
