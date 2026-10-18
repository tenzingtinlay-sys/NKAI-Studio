import { __exportAll, __toESM } from "../_runtime.mjs";
import { require_jsx_runtime, require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { Mic, MicOff, PhoneOff, Sparkles, UserRound, Video } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CyW5B7fL.js
var routes_CyW5B7fL_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function fetchJson(path, opts) {
	const res = await fetch(path, opts);
	const payload = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(payload.error || payload.message || `HTTP ${res.status}`);
	return payload;
}
async function listCatalog() {
	return fetchJson("/api/liveavatar/catalog");
}
async function startSession(input) {
	return fetchJson("/api/liveavatar/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
}
async function stopSession(input) {
	return fetchJson("/api/liveavatar/stop", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
}
var LANGS = [
	{
		value: "en",
		label: "English"
	},
	{
		value: "hi",
		label: "Hindi"
	},
	{
		value: "bn",
		label: "Bengali"
	},
	{
		value: "ta",
		label: "Tamil"
	},
	{
		value: "te",
		label: "Telugu"
	},
	{
		value: "ur",
		label: "Urdu"
	},
	{
		value: "ar",
		label: "Arabic"
	},
	{
		value: "es",
		label: "Spanish"
	},
	{
		value: "fr",
		label: "French"
	},
	{
		value: "de",
		label: "German"
	},
	{
		value: "pt",
		label: "Portuguese"
	},
	{
		value: "it",
		label: "Italian"
	},
	{
		value: "nl",
		label: "Dutch"
	},
	{
		value: "pl",
		label: "Polish"
	},
	{
		value: "ru",
		label: "Russian"
	},
	{
		value: "tr",
		label: "Turkish"
	},
	{
		value: "zh",
		label: "Chinese"
	},
	{
		value: "ja",
		label: "Japanese"
	},
	{
		value: "ko",
		label: "Korean"
	},
	{
		value: "id",
		label: "Indonesian"
	},
	{
		value: "vi",
		label: "Vietnamese"
	},
	{
		value: "th",
		label: "Thai"
	},
	{
		value: "sv",
		label: "Swedish"
	}
];
var TOPICS = [
	"Anything",
	"Professional",
	"Personal",
	"Spiritual",
	"Music",
	"Business",
	"Markets",
	"Research",
	"Education",
	"Job search"
];
function Home() {
	const videoRef = (0, import_react.useRef)(null);
	const roomRef = (0, import_react.useRef)(null);
	const sidRef = (0, import_react.useRef)("");
	const videoTimerRef = (0, import_react.useRef)(null);
	const [avatars, setAvatars] = (0, import_react.useState)([]);
	const [voices, setVoices] = (0, import_react.useState)([]);
	const [avatarId, setAvatarId] = (0, import_react.useState)("");
	const [voiceId, setVoiceId] = (0, import_react.useState)("");
	const [lang, setLang] = (0, import_react.useState)("en");
	const [gender, setGender] = (0, import_react.useState)("");
	const [tone, setTone] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("Anything");
	const [status, setStatus] = (0, import_react.useState)("Load avatars, then start a video call.");
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [live, setLive] = (0, import_react.useState)(false);
	const [hasVideo, setHasVideo] = (0, import_react.useState)(false);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const selected = avatars.find((a) => a.id === avatarId);
	const filtered = (0, import_react.useMemo)(() => {
		const label = LANGS.find((l) => l.value === lang)?.label.toLowerCase() ?? "";
		const q = tone.trim().toLowerCase();
		const match = voices.filter((v) => {
			const l = (v.language || "").toLowerCase();
			const langOk = l === lang || l.startsWith(lang + "-") || l.startsWith(lang + "_") || l.includes(label);
			const gOk = !gender || (v.gender || "").toLowerCase() === gender;
			const blob = JSON.stringify([
				v.name,
				v.tags,
				v.description
			]).toLowerCase();
			const qOk = !q || blob.includes(q);
			return langOk && gOk && qOk;
		});
		return match.length ? match : voices;
	}, [
		voices,
		lang,
		gender,
		tone
	]);
	async function load() {
		setBusy("load");
		setStatus("Loading public avatars and your account avatars…");
		try {
			const data = await listCatalog();
			setAvatars(data.avatars);
			setVoices(data.voices);
			setStatus(`${data.avatars.length} avatars · ${data.voices.length} voices. Pick a face, then start.`);
		} catch (e) {
			setStatus(e instanceof Error ? e.message : "Could not load the catalog.");
		} finally {
			setBusy(null);
		}
	}
	function cleanupAudio() {
		document.querySelectorAll("audio[data-live-audio]").forEach((el) => el.remove());
	}
	function clearVideoTimer() {
		if (videoTimerRef.current) {
			clearTimeout(videoTimerRef.current);
			videoTimerRef.current = null;
		}
	}
	async function end(auto = false, message) {
		clearVideoTimer();
		const room = roomRef.current;
		roomRef.current = null;
		try {
			room?.disconnect();
		} catch {}
		cleanupAudio();
		if (videoRef.current) videoRef.current.srcObject = null;
		const sid = sidRef.current;
		sidRef.current = "";
		if (sid) stopSession({ data: { session_id: sid } });
		setLive(false);
		setHasVideo(false);
		setMuted(false);
		setStatus(message ?? (auto ? "The call ended." : "Ended."));
	}
	async function start() {
		setBusy("start");
		setStatus("Opening the video call… allow the microphone when asked.");
		try {
			if (!avatarId) throw new Error("Pick an avatar first. Load the list if it is empty.");
			const langName = LANGS.find((l) => l.value === lang)?.label || "English";
			const fallbackVoice = selected?.default_voice?.id || "";
			const session = await startSession({ data: {
				language: lang,
				language_name: langName,
				avatar_id: avatarId,
				voice_id: voiceId || fallbackVoice || void 0,
				topic
			} });
			const { Room, RoomEvent, Track } = await import("../_libs/@heygen/liveavatar-web-sdk+[...].mjs").then((n) => n.livekit_client_esm_exports);
			const room = new Room({ adaptiveStream: true });
			roomRef.current = room;
			sidRef.current = session.session_id;
			room.on(RoomEvent.TrackSubscribed, (track) => {
				if (track.kind === Track.Kind.Video && videoRef.current) {
					clearVideoTimer();
					track.attach(videoRef.current);
					setHasVideo(true);
					setStatus(session.sandbox ? "On a video call. Speak naturally — this sandbox line ends in about a minute." : "On a video call. Speak naturally. The avatar listens and answers.");
				} else if (track.kind === Track.Kind.Audio) {
					const el = track.attach();
					el.dataset.liveAudio = "1";
					document.body.appendChild(el);
				}
			});
			room.on(RoomEvent.Disconnected, () => {
				end(true, session.sandbox ? "The call ended. Sandbox calls last about a minute." : "The call ended.");
			});
			await room.connect(session.livekit_url, session.token);
			setLive(true);
			setStatus("Connected. Waiting for the avatar’s video… then just talk.");
			videoTimerRef.current = setTimeout(() => {
				end(false, "Connected, but the avatar's video never arrived. Check the LiveAvatar account (credits, plan) and try again.");
			}, 25e3);
			let note = "";
			try {
				await room.startAudio();
			} catch {
				note = " Your browser blocked audio playback — click the page once to allow sound.";
			}
			try {
				await room.localParticipant.setMicrophoneEnabled(true);
			} catch {
				note += " Microphone unavailable — allow it in the browser to talk to the avatar.";
			}
			if (note && videoTimerRef.current) setStatus("Connected." + note);
		} catch (e) {
			await end(false, e instanceof Error ? e.message : "Could not start the call.");
		} finally {
			setBusy(null);
		}
	}
	async function toggleMute() {
		const room = roomRef.current;
		if (!room?.localParticipant) return;
		const next = !muted;
		await room.localParticipant.setMicrophoneEnabled(!next);
		setMuted(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-end justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-[0.22em] text-muted uppercase",
				children: "Live conversation"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-none text-fg sm:text-5xl",
				children: "LifeMate"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "hidden max-w-xs text-right text-sm text-muted sm:block",
				children: "A two-way video call. The avatar listens, answers, and follows the topic you choose."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "overflow-hidden rounded-2xl border border-border bg-surface",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative aspect-square w-full bg-surface-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						ref: videoRef,
						autoPlay: true,
						playsInline: true,
						className: `absolute inset-0 h-full w-full object-cover ${hasVideo ? "block" : "hidden"}`
					}), !hasVideo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center",
						children: [selected?.preview_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: selected.preview_url,
							alt: selected.name || "Avatar preview",
							className: "h-36 w-36 rounded-2xl object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid h-20 w-20 place-items-center rounded-2xl border border-border bg-surface text-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, {
								className: "h-8 w-8",
								strokeWidth: 1.5
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-2xl text-fg",
							children: selected?.name || "Video call"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: live ? "Waiting for the avatar’s picture…" : "Pick a face, a language, and a topic, then start the call."
						})] })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 border-t border-border px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 rounded-full ${live ? "bg-primary" : "bg-border"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "min-h-5 flex-1 text-sm text-muted",
						children: status
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void load(),
						disabled: busy !== null,
						className: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-fg disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }), busy === "load" ? "Loading…" : "Load avatars & voices"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Avatar",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: avatarId,
							onChange: (e) => setAvatarId(e.target.value),
							className: fieldClass,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Select an avatar…"
							}), avatars.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: a.id,
								children: a.name || a.id
							}, a.id))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Language",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: lang,
								onChange: (e) => setLang(e.target.value),
								className: fieldClass,
								children: LANGS.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: l.value,
									children: l.label
								}, l.value))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Gender",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: gender,
								onChange: (e) => setGender(e.target.value),
								className: fieldClass,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "Any gender"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "female",
										children: "Female"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "male",
										children: "Male"
									})
								]
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Tone",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: tone,
							onChange: (e) => setTone(e.target.value),
							placeholder: "calm, warm, young…",
							className: fieldClass
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Guide on",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: topic,
							onChange: (e) => setTopic(e.target.value),
							className: fieldClass,
							children: TOPICS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: t,
								children: t
							}, t))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Voice",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: voiceId,
							onChange: (e) => setVoiceId(e.target.value),
							className: fieldClass,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Voice: avatar default"
							}), filtered.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: v.id,
								children: [
									v.name,
									v.language,
									v.gender
								].filter(Boolean).join(" · ")
							}, v.id))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 grid grid-cols-3 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void start(),
								disabled: busy !== null || live,
								className: "col-span-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink disabled:opacity-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "h-4 w-4" }), busy === "start" ? "Connecting…" : "Start video call"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void toggleMute(),
								disabled: !live,
								className: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm text-fg disabled:opacity-40",
								children: [muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "h-4 w-4" }), muted ? "Unmute" : "Mute"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void end(false),
								disabled: !live,
								className: "col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm text-danger disabled:opacity-40",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "h-4 w-4" }), "End"]
							})
						]
					})
				]
			})]
		})]
	});
}
var fieldClass = "min-h-12 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary";
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex flex-col gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs font-medium tracking-wide text-muted uppercase",
			children: label
		}), children]
	});
}
//#endregion
export { Home as component, routes_CyW5B7fL_exports };
