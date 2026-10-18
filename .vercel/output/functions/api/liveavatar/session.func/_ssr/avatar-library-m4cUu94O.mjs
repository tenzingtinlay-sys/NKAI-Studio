import { __exportAll, __toESM } from "../_runtime.mjs";
import { require_jsx_runtime, require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { Activity, ArrowDownToLine, AudioLines, Boxes, CircleAlert, CircleCheck, ExternalLink, RefreshCw, Video, WifiOff } from "../_libs/lucide-react.mjs";
import { AuthNavActions } from "./auth-nav-actions-Dut7RsEr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/avatar-library-m4cUu94O.js
var avatar_library_m4cUu94O_exports = /* @__PURE__ */ __exportAll({ component: () => AvatarLibraryPage });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var starterAssets = [{
	id: "mpfb",
	name: "MPFB human",
	kind: "Browser 3D · GLB",
	detail: "CC0 sample loaded from upstream; check the upstream source and asset provenance before redistribution.",
	url: "https://raw.githubusercontent.com/met4citizen/TalkingHead/main/avatars/mpfb.glb",
	download: false
}];
function Badge({ state }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "nkai-provider-badge " + state,
		children: {
			checking: "CHECKING",
			ready: "CONNECTED",
			offline: "OFFLINE",
			"not-configured": "NOT CONFIGURED"
		}[state]
	});
}
function AvatarLibraryPage() {
	const [providers, setProviders] = (0, import_react.useState)([
		{
			id: "ai",
			name: "NKAI AI Gateway",
			kind: "Conversation engine",
			detail: "Private chat worker health and model availability.",
			state: "checking",
			status: "Checking server route…"
		},
		{
			id: "liveavatar",
			name: "HeyGen LiveAvatar",
			kind: "Hosted real-time video",
			detail: "Loads account/public avatars and voices using the server-side LiveAvatar API key.",
			state: "checking",
			status: "Waiting for catalogue check…"
		},
		{
			id: "livetalking",
			name: "LiveTalking",
			kind: "Self-hosted WebRTC stream",
			detail: "Requires a running GPU service and reachable media networking.",
			state: "checking",
			status: "Checking streaming route…"
		},
		{
			id: "duix",
			name: "Duix Avatar",
			kind: "Self-hosted avatar engine",
			detail: "Source is present, but this page will not claim it is live until a health endpoint is configured.",
			state: "not-configured",
			status: "No verified Duix health endpoint is configured."
		}
	]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [catalog, setCatalog] = (0, import_react.useState)(null);
	const [catalogMessage, setCatalogMessage] = (0, import_react.useState)("");
	const [checkedAt, setCheckedAt] = (0, import_react.useState)("Not checked yet");
	const refresh = (0, import_react.useCallback)(async () => {
		setBusy(true);
		setProviders((old) => old.map((p) => p.id === "duix" ? p : {
			...p,
			state: "checking",
			status: "Checking live server route…"
		}));
		const next = [];
		try {
			const response = await fetch("/api/ai/health", {
				cache: "no-store",
				signal: AbortSignal.timeout(1e4)
			});
			const data = await response.json().catch(() => ({}));
			next.push({
				id: "ai",
				name: "NKAI AI Gateway",
				kind: "Conversation engine",
				detail: "Private chat worker health and model availability.",
				state: response.ok ? "ready" : response.status === 503 ? "not-configured" : "offline",
				status: response.ok ? "Worker replied. Model: " + String(data.model || "not reported") : String(data.error || "HTTP " + response.status)
			});
		} catch (error) {
			next.push({
				id: "ai",
				name: "NKAI AI Gateway",
				kind: "Conversation engine",
				detail: "Private chat worker health and model availability.",
				state: "offline",
				status: error instanceof Error ? error.message : "Health check failed."
			});
		}
		try {
			const response = await fetch("/api/livetalking/status", {
				cache: "no-store",
				signal: AbortSignal.timeout(1e4)
			});
			const data = await response.json().catch(() => ({}));
			next.push({
				id: "livetalking",
				name: "LiveTalking",
				kind: "Self-hosted WebRTC stream",
				detail: "Requires a running GPU service and reachable media networking.",
				state: response.ok ? "ready" : response.status === 503 ? "not-configured" : "offline",
				status: response.ok ? "Status endpoint responded: " + JSON.stringify(data).slice(0, 180) : String(data.error || "HTTP " + response.status)
			});
		} catch (error) {
			next.push({
				id: "livetalking",
				name: "LiveTalking",
				kind: "Self-hosted WebRTC stream",
				detail: "Requires a running GPU service and reachable media networking.",
				state: "offline",
				status: error instanceof Error ? error.message : "Health check failed."
			});
		}
		setProviders((old) => {
			const byId = new Map([...old, ...next].map((p) => [p.id, p]));
			return [
				"ai",
				"liveavatar",
				"livetalking",
				"duix"
			].map((id) => byId.get(id));
		});
		setCheckedAt((/* @__PURE__ */ new Date()).toLocaleString());
		setBusy(false);
	}, []);
	(0, import_react.useEffect)(() => {
		refresh();
	}, [refresh]);
	async function loadLiveAvatarCatalog() {
		setCatalog(null);
		setCatalogMessage("Checking the signed-in LiveAvatar account…");
		try {
			const response = await fetch("/api/liveavatar/catalog", {
				headers: { Accept: "application/json" },
				cache: "no-store",
				signal: AbortSignal.timeout(15e3)
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || (response.status === 401 ? "Sign in to NKAI Studio first." : "LiveAvatar catalogue returned HTTP " + response.status + "."));
			if (!Array.isArray(data.avatars) || !Array.isArray(data.voices)) throw new Error("The catalogue response was not in the expected format.");
			setCatalog({
				avatars: data.avatars.length,
				voices: data.voices.length
			});
			setCatalogMessage(data.avatars.length ? "LiveAvatar catalogue loaded successfully." : "The API responded, but no selectable avatars were returned.");
			setProviders((old) => old.map((p) => p.id === "liveavatar" ? {
				...p,
				state: data.avatars.length ? "ready" : "not-configured",
				status: data.avatars.length + " avatars and " + data.voices.length + " voices returned by API."
			} : p));
		} catch (error) {
			const message = error instanceof Error ? error.message : "Catalogue request failed.";
			setCatalogMessage(message);
			setProviders((old) => old.map((p) => p.id === "liveavatar" ? {
				...p,
				state: "offline",
				status: message
			} : p));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "nkai-library",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "nkai-library-top",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						className: "nkai-library-brand",
						href: "/",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "nkai-library-mark",
							children: "N"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["NKAI ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "STUDIO" })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/",
							children: "Studio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "active",
							href: "/avatar-library",
							children: "Avatar library"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/deployment",
							children: "Diagnostics"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthNavActions, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "nkai-library-refresh",
						onClick: () => void refresh(),
						disabled: busy,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								size: 15,
								className: busy ? "nkai-spin" : ""
							}),
							" ",
							busy ? "Checking…" : "Refresh status"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "nkai-library-hero",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nkai-eyebrow",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { size: 14 }), " ONE LIBRARY · MULTIPLE RUNTIMES"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
						"Every avatar.",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "One place to connect." })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Browse 3D models, check live providers, and connect voice-enabled avatars through one consistent workspace. Status labels reflect real server checks—not placeholder availability." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nkai-library-meta",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " Server-connected checks"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Last checked: ", checkedAt] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "nkai-library-section",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nkai-section-heading",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "nkai-eyebrow",
							children: "PROVIDER STATUS"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Connected engines" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "nkai-muted",
							children: "Credentials remain server-side"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nkai-provider-grid",
						children: providers.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "nkai-provider-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "nkai-provider-card-top",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "nkai-provider-icon",
										children: provider.id === "ai" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, {}) : provider.id === "duix" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boxes, {}) : provider.id === "liveavatar" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AudioLines, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { state: provider.state })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "nkai-card-kind",
									children: provider.kind
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: provider.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "nkai-card-detail",
									children: provider.detail
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "nkai-provider-status",
									children: [provider.state === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 15 }) : provider.state === "checking" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
										size: 15,
										className: "nkai-spin"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { size: 15 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: provider.status })]
								}),
								provider.id === "liveavatar" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "nkai-library-button",
									onClick: () => void loadLiveAvatarCatalog(),
									children: ["Load account catalogue ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })]
								}),
								provider.id === "duix" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									className: "nkai-library-button secondary",
									href: "https://github.com/tenzingtinlay-sys/NKAI-Studio/tree/main/deploy/duix-avatar",
									children: ["Runtime setup notes ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })]
								}),
								provider.id === "livetalking" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									className: "nkai-library-button secondary",
									href: "https://github.com/tenzingtinlay-sys/NKAI-Studio/tree/main/deploy/livetalking",
									children: ["Runtime setup notes ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })]
								}),
								provider.id === "ai" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									className: "nkai-library-button secondary",
									href: "/deployment",
									children: ["Open diagnostics ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 })]
								})
							]
						}, provider.id))
					}),
					catalogMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nkai-catalog-result",
						role: "status",
						children: [catalog ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { size: 17 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, { size: 17 }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [catalogMessage, catalog && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
							" · ",
							catalog.avatars,
							" avatars · ",
							catalog.voices,
							" voices"
						] })] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "nkai-library-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nkai-section-heading",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "nkai-eyebrow",
						children: "DOWNLOADABLE STARTERS"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "3D avatar assets" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "nkai-muted",
						children: "GLB / glTF · licence-aware"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "nkai-asset-grid",
					children: starterAssets.map((asset, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "nkai-asset-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nkai-asset-art art-" + i,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nkai-asset-orbit" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "nkai-asset-silhouette",
										children: i === 0 ? "M" : "B"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "3D MODEL" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nkai-asset-info",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: asset.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "nkai-card-kind",
									children: asset.kind
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "nkai-asset-format",
									children: "GLB"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "nkai-card-detail",
								children: asset.detail
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								className: "nkai-library-button",
								href: asset.url,
								target: asset.download ? void 0 : "_blank",
								rel: asset.download ? void 0 : "noreferrer",
								...asset.download ? { download: true } : {},
								children: [
									asset.download ? "Download local asset" : "Open source model",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownToLine, { size: 15 })
								]
							})
						]
					}, asset.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "nkai-library-footer",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "NKAI STUDIO · AVATAR REGISTRY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Hosted streams and local 3D files are different asset types. A live provider is marked connected only after a server response." })]
			})
		]
	});
}
//#endregion
export { avatar_library_m4cUu94O_exports, AvatarLibraryPage as component };
