import { __exportAll, __toESM } from "../_runtime.mjs";
import { require_jsx_runtime, require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { Camera, CameraOff, CircleStop, ImagePlus, Mic, MonitorPlay, Moon, Paperclip, Radio, Send, Settings2, Sun, Video, VideoOff, X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/playground-Bg1FsVqp.js
var playground_Bg1FsVqp_exports = /* @__PURE__ */ __exportAll({ component: () => AvatarPlayground });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AvatarPlayground() {
	const videoRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const recorderRef = (0, import_react.useRef)(null);
	const chunksRef = (0, import_react.useRef)([]);
	const [cameraOn, setCameraOn] = (0, import_react.useState)(false);
	const [recording, setRecording] = (0, import_react.useState)(false);
	const [messages, setMessages] = (0, import_react.useState)([{
		role: "assistant",
		text: "Welcome to NKAI Playground. Start your camera or connect your avatar worker to begin."
	}]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [backdrop, setBackdrop] = (0, import_react.useState)("aurora");
	const [customBackdrop, setCustomBackdrop] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("Offline");
	const [showSettings, setShowSettings] = (0, import_react.useState)(false);
	const [muted, setMuted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => () => {
		recorderRef.current?.stop();
		streamRef.current?.getTracks().forEach((track) => track.stop());
		if (customBackdrop.startsWith("blob:")) URL.revokeObjectURL(customBackdrop);
	}, [customBackdrop]);
	async function startCamera() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}
			setCameraOn(true);
			setStatus("Camera connected");
		} catch {
			setStatus("Camera permission needed");
			setMessages((items) => [...items, {
				role: "assistant",
				text: "Camera access was blocked or no camera was found. Allow camera and microphone access in your browser, then try again."
			}]);
		}
	}
	function stopCamera() {
		if (recording) stopRecording();
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
		setCameraOn(false);
		setStatus("Offline");
	}
	function takeScreenshot() {
		const video = videoRef.current;
		if (!video || video.readyState < 2 || !video.videoWidth) {
			setStatus("Start the camera before taking a screenshot");
			return;
		}
		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const link = document.createElement("a");
		link.download = `nkai-playground-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.png`;
		link.href = canvas.toDataURL("image/png");
		link.click();
		setStatus("Screenshot saved");
	}
	function startRecording() {
		const stream = streamRef.current;
		if (!stream) {
			setStatus("Start the camera before recording");
			return;
		}
		if (typeof MediaRecorder === "undefined") {
			setStatus("Recording is not supported in this browser");
			return;
		}
		chunksRef.current = [];
		const recorder = new MediaRecorder(stream);
		recorderRef.current = recorder;
		recorder.ondataavailable = (event) => {
			if (event.data.size) chunksRef.current.push(event.data);
		};
		recorder.onstop = () => {
			const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `nkai-playground-recording-${Date.now()}.webm`;
			link.click();
			window.setTimeout(() => URL.revokeObjectURL(url), 1500);
			setRecording(false);
			setStatus("Recording downloaded");
		};
		recorder.start();
		setRecording(true);
		setStatus("Recording");
	}
	function stopRecording() {
		if (recorderRef.current?.state === "recording") recorderRef.current.stop();
	}
	function sendMessage() {
		const text = draft.trim();
		if (!text) return;
		setMessages((items) => [...items, {
			role: "user",
			text
		}]);
		setDraft("");
		setMessages((items) => [
			...items,
			{
				role: "user",
				text
			},
			{
				role: "assistant",
				text: "Your message is in this playground UI. Connect the NKAI AI worker in Settings to enable model-generated replies."
			}
		]);
	}
	function useMicrophone() {
		const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
		if (!SpeechRecognition) {
			setStatus("Speech recognition is not supported in this browser");
			return;
		}
		const recognition = new SpeechRecognition();
		recognition.lang = "en-IN";
		recognition.onresult = (event) => setDraft((current) => current ? current + " " + event.results[0][0].transcript : event.results[0][0].transcript);
		recognition.onerror = () => setStatus("Microphone input could not be transcribed");
		recognition.start();
		setStatus("Listening…");
	}
	function loadBackdrop(file) {
		if (!file) return;
		if (customBackdrop.startsWith("blob:")) URL.revokeObjectURL(customBackdrop);
		const url = URL.createObjectURL(file);
		setCustomBackdrop(url);
		setBackdrop("custom");
	}
	const stageStyle = backdrop === "custom" && customBackdrop ? { backgroundImage: `linear-gradient(180deg, rgba(7,10,18,.1), rgba(7,10,18,.55)), url("${customBackdrop}")` } : { backgroundImage: backdrop === "violet" ? "radial-gradient(ellipse at 70% 20%, #48366d, #11121e 62%)" : backdrop === "ocean" ? "radial-gradient(ellipse at 70% 20%, #175e72, #08151f 62%)" : "radial-gradient(ellipse at 70% 20%, #304e65, #111321 58%, #090b11)" };
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-screen bg-[#090b10] text-slate-100",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .playground-scroll::-webkit-scrollbar{width:6px}.playground-scroll::-webkit-scrollbar-thumb{background:#343746;border-radius:8px}
        .pg-control{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #303442;background:#171a24;color:#e6e8f0;border-radius:10px;padding:9px 12px;font-size:13px;transition:background .15s}
        .pg-control:hover{background:#232736}.pg-control:disabled{opacity:.4;cursor:not-allowed}
        .pg-field{width:100%;background:#11141c;border:1px solid #303442;border-radius:10px;padding:10px 12px;color:#eef0f6;outline:none}.pg-field:focus{border-color:#a78bfa}
        .pg-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#9399ad;font-weight:700}
      ` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: "/",
					className: "flex items-center gap-3 text-white no-underline",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid h-9 w-9 place-items-center rounded-xl bg-violet-500/20 text-violet-300",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { size: 19 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-bold tracking-wide",
						children: "NKAI STUDIO"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-[11px] text-slate-500",
						children: "STREAMING PLAYGROUND"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 rounded-full ${cameraOn ? "bg-emerald-400" : "bg-slate-500"}` }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-slate-400",
							children: status
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "pg-control",
							onClick: () => setShowSettings(!showSettings),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { size: 15 }), " Settings"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "pg-control",
							onClick: () => document.documentElement.classList.toggle("dark"),
							"aria-label": "Toggle theme",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { size: 15 })
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto grid max-w-[1500px] grid-cols-1 gap-5 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_360px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex flex-wrap items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "pg-label",
								children: "Live session"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-1 text-xl font-semibold tracking-tight",
								children: "Avatar Playground"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "pg-control",
									onClick: takeScreenshot,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { size: 15 }), " Screenshot"]
								}), recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "pg-control border-red-400/40 text-red-200",
									onClick: stopRecording,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleStop, { size: 15 }), " Stop recording"]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "pg-control",
									onClick: startRecording,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { size: 15 }), " Record stream"]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#11141c] md:min-h-[600px]",
							style: stageStyle,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute inset-0 opacity-20",
									style: {
										backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",
										backgroundSize: "42px 42px"
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
									ref: videoRef,
									autoPlay: true,
									playsInline: true,
									muted,
									className: cameraOn ? "relative z-10 max-h-[600px] w-full object-contain" : "absolute h-px w-px opacity-0"
								}),
								!cameraOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative z-10 flex max-w-sm flex-col items-center px-8 text-center",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mb-5 grid h-24 w-24 place-items-center rounded-full border border-violet-300/20 bg-violet-300/10 text-violet-200",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonitorPlay, { size: 38 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-lg font-semibold",
											children: "Your live preview starts here"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 text-sm leading-6 text-slate-400",
											children: "Start your camera for a local preview, or connect a compatible NKAI streaming worker to render a real-time avatar."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											className: "mt-5 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400",
											onClick: startCamera,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, {
												size: 16,
												className: "mr-2 inline"
											}), " Start camera"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-slate-200 backdrop-blur",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 rounded-full ${recording ? "animate-pulse bg-red-400" : "bg-slate-500"}` }), recording ? "Recording" : cameraOn ? "Local preview" : "Waiting for stream"]
								}),
								cameraOn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "absolute bottom-4 right-4 z-20 rounded-lg border border-white/10 bg-black/60 p-2.5",
									onClick: () => setMuted(!muted),
									title: muted ? "Unmute preview" : "Mute preview",
									children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoOff, { size: 17 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { size: 17 })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "pg-control",
									onClick: cameraOn ? stopCamera : startCamera,
									children: cameraOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CameraOff, { size: 15 }), " Stop camera"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { size: 15 }), " Start camera"] })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "pg-control",
									onClick: useMicrophone,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { size: 15 }), " Use microphone"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "pg-control cursor-pointer",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { size: 15 }),
										" Custom background",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "hidden",
											type: "file",
											accept: "image/*,video/*",
											onChange: (e) => loadBackdrop(e.target.files?.[0])
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ml-auto flex gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1",
									children: [
										["aurora", "Aurora"],
										["violet", "Violet"],
										["ocean", "Ocean"]
									].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: `rounded-lg px-3 py-1.5 text-xs ${backdrop === id ? "bg-white/10 text-white" : "text-slate-400"}`,
										onClick: () => setBackdrop(id),
										children: label
									}, id))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs leading-5 text-slate-500",
							children: "Note: custom backgrounds style the stage behind the camera preview; person segmentation / background removal requires a compatible vision model. Camera and recording remain on this device."
						}),
						showSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-3 flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-semibold",
										children: "Connection settings"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setShowSettings(false),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 16 })
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "pg-label",
									children: "NKAI worker endpoint"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "pg-field mt-2",
									placeholder: "https://your-worker.example.com",
									onChange: () => {}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-xs text-slate-500",
									children: "Worker connection is a UI placeholder in this first pass; no credentials are stored or sent by this screen."
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#10131a]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between border-b border-white/10 px-4 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "pg-label",
								children: "Conversation"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 font-semibold",
								children: "Chat with your avatar"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "pg-control",
								onClick: () => setMessages([{
									role: "assistant",
									text: "Conversation cleared. Start a new message whenever you're ready."
								}]),
								children: "Clear"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "playground-scroll flex-1 space-y-4 overflow-y-auto p-4",
							style: { maxHeight: 560 },
							children: messages.map((message, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `flex ${message.role === "user" ? "justify-end" : "justify-start"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === "user" ? "bg-violet-500/20 text-violet-50" : "border border-white/10 bg-white/[.04] text-slate-300"}`,
									children: message.text
								})
							}, index))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "border-t border-white/10 p-3",
							onSubmit: (event) => {
								event.preventDefault();
								sendMessage();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "pg-control !px-2.5",
										title: "Attach file",
										onClick: () => setStatus("File attachment is not connected yet"),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, { size: 16 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "pg-field min-w-0 flex-1",
										value: draft,
										onChange: (e) => setDraft(e.target.value),
										placeholder: "Type a message…",
										"aria-label": "Message"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "rounded-xl bg-violet-500 p-3 text-white hover:bg-violet-400",
										"aria-label": "Send message",
										type: "submit",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { size: 16 })
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 px-1 text-[10px] text-slate-500",
								children: "Chat UI is ready; model replies require the NKAI worker connection."
							})]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t border-white/10 px-6 py-4 text-center text-xs text-slate-600",
				children: "NKAI Studio · Local preview tools · No HeyGen credentials required for camera, screenshots or recording"
			})
		]
	});
}
//#endregion
export { AvatarPlayground as component, playground_Bg1FsVqp_exports };
