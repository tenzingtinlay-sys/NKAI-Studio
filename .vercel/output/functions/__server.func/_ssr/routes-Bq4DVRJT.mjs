import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { t as REFERENCES } from "./references-BaZV1RVO.mjs";
import { _ as FolderKanban, a as Sparkles, b as Bot, c as Redo2, d as PenTool, f as Palette, g as Image$1, h as LayoutTemplate, l as Radio, m as Menu, n as UserRound, o as Settings, p as Mic, r as Undo2, s as Search, t as Video, u as Plug, v as Clapperboard, x as AudioLines, y as Brain } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bq4DVRJT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var studioHealth = createServerFn({ method: "GET" }).handler(createSsrRpc("7fe7d98f53a27a0378d4f1e0f2c4eed272f184b34a41ef0eda51298c6c2250c8"));
var studioChat = createServerFn({ method: "POST" }).validator((input) => {
	const messages = (input.messages || []).slice(-12).filter((m) => m && (m.role === "user" || m.role === "assistant")).map((m) => ({
		role: m.role,
		content: String(m.content || "").slice(0, 4e3)
	}));
	return {
		system: String(input.system || "You are a helpful studio guide.").slice(0, 4e3),
		messages
	};
}).handler(createSsrRpc("9e14fbcf13fd549e3dc62831945be123733fbcc4b997813dade8046ef5f904cd"));
var studioScript = createServerFn({ method: "POST" }).validator((input) => ({
	topic: String(input.topic || "").trim().slice(0, 600),
	scenes: Math.max(2, Math.min(8, Number(input.scenes) || 4)),
	kind: String(input.kind || "avatar video").slice(0, 80)
})).handler(createSsrRpc("7a3bc7d0b1537137902e7efcff2b5406071e5d8afa385e1831980b4c697ed5e5"));
var studioDesign = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input.prompt || "").slice(0, 2e3),
	kind: String(input.kind || "landing").slice(0, 40),
	reference: String(input.reference || ""),
	previous: String(input.previous || "").slice(0, 12e3),
	change: String(input.change || "").slice(0, 500)
})).handler(createSsrRpc("3a1b5490cb05a34fb68e0790f4aee9cee8eb49e066881cb355ace0586d2f6a4a"));
var studioImage = createServerFn({ method: "POST" }).validator((input) => ({ prompt: String(input.prompt || "").trim().slice(0, 700) })).handler(createSsrRpc("9a47f2306e771c0a5d7396b4997a99711ea19ec89f190279ebe4d5cb41d5d708"));
var studioVoice = createServerFn({ method: "POST" }).validator((input) => ({
	text: String(input.text || "").trim().slice(0, 500),
	voice: String(input.voice || "eve").slice(0, 32),
	lang: String(input.lang || "en").slice(0, 8)
})).handler(createSsrRpc("13e89e604a36dcb65a9360d32d0e5e80835b6803d1af22cec6f8495dfb22ffef"));
var ALLOWED_HOSTS = /* @__PURE__ */ new Set(["images.unsplash.com"]);
var studioProxyImage = createServerFn({ method: "POST" }).validator((input) => {
	const url = String(input.url || "");
	let host = "";
	try {
		host = new URL(url).host;
	} catch {
		host = "";
	}
	if (!ALLOWED_HOSTS.has(host)) throw new Error("Image host is not allowed.");
	return { url };
}).handler(createSsrRpc("73a44afe4a8005f5948b78d9da07417332a4b5553451d72f5ccf6424c9f6fbed"));
var cache = /* @__PURE__ */ new Map();
function decode(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error("image"));
		img.src = src;
	});
}
function loadImage(src) {
	const hit = cache.get(src);
	if (hit) return hit;
	const job = (async () => {
		if (src.startsWith("data:") || src.startsWith("blob:")) return decode(src);
		try {
			return decode((await studioProxyImage({ data: { url: src } })).dataUrl);
		} catch {
			return decode(src);
		}
	})();
	cache.set(src, job);
	return job;
}
function hash(s) {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return h >>> 0;
}
function cpuArt(prompt, style, w, h, seed) {
	let s = hash(prompt + style + seed);
	const rnd = () => {
		s = Math.imul(s ^ s >>> 15, 2246822519) + 1013904223 | 0;
		return (s >>> 0) % 1e4 / 1e4;
	};
	const H0 = {
		Aurora: 170,
		Sunset: 15,
		Ocean: 205,
		Forest: 130,
		Mono: 0
	}[style] ?? 200;
	const sat = style === "Mono" ? 0 : 62;
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const x = c.getContext("2d");
	if (!x) return c;
	x.fillStyle = `hsl(${H0} ${sat / 3}% 7%)`;
	x.fillRect(0, 0, w, h);
	x.globalCompositeOperation = "lighter";
	for (let i = 0; i < 9; i++) {
		const X = rnd() * w;
		const Y = rnd() * h;
		const r = (.18 + rnd() * .4) * Math.max(w, h);
		const g = x.createRadialGradient(X, Y, 0, X, Y, r);
		g.addColorStop(0, `hsla(${H0 + rnd() * 70 - 20} ${sat}% ${40 + rnd() * 22}% / 0.55)`);
		g.addColorStop(1, "transparent");
		x.fillStyle = g;
		x.fillRect(0, 0, w, h);
	}
	x.globalCompositeOperation = "source-over";
	for (let i = 0; i < 6; i++) {
		x.strokeStyle = `hsla(${H0 + rnd() * 50} ${sat}% 82% / 0.28)`;
		x.lineWidth = 1 + rnd() * 2;
		x.beginPath();
		x.arc(rnd() * w, rnd() * h, (.05 + rnd() * .22) * w, 0, Math.PI * 2);
		x.stroke();
	}
	return c;
}
var WGSL = `
struct U { seed:f32, style:f32, w:f32, h:f32 };
@group(0) @binding(0) var<uniform> u: U;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  var p = array<vec2f, 3>(vec2f(-1.,-1.), vec2f(3.,-1.), vec2f(-1., 3.));
  var o: V;
  o.pos = vec4f(p[i], 0., 1.);
  o.uv = vec2f(o.pos.x * 0.5 + 0.5, 1. - (o.pos.y * 0.5 + 0.5));
  return o;
}
fn h21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u2 = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2f(1., 0.)), u2.x), mix(h21(i + vec2f(0., 1.)), h21(i + vec2f(1., 1.)), u2.x), u2.y);
}
fn fbm(p: vec2f) -> f32 {
  var v = 0.;
  var a = .5;
  var q = p + u.seed;
  for (var i = 0; i < 5; i++) {
    v += a * noise(q);
    q = q * 2.03 + vec2f(1.7, 9.2);
    a *= .5;
  }
  return v;
}
fn hsl(h: f32, s: f32, l: f32) -> vec3f {
  let k = vec3f(0., 8./12., 4./12.);
  let a = s * min(l, 1. - l);
  let f = abs(fract(vec3f(h) + k) * 6. - 3.) - 1.;
  return l - a * clamp(f, vec3f(-1.), vec3f(1.));
}
@fragment fn fs(in: V) -> @location(0) vec4f {
  let uv = in.uv;
  let n = fbm(uv * vec2f(3.2, 3.8));
  let n2 = fbm(uv * 7. + 3.);
  var hue = .55;
  if (u.style > .5 && u.style < 1.5) { hue = .04; }
  else if (u.style < 2.5 && u.style > 1.5) { hue = .58; }
  else if (u.style > 2.5 && u.style < 3.5) { hue = .33; }
  else if (u.style > 3.5) { hue = 0.; }
  let sat = select(.55, 0., u.style > 3.5);
  let light = .08 + n * .42 + n2 * .12;
  var col = hsl(hue + (n2 - .5) * .08, sat, light);
  let vign = smoothstep(1.15, .25, length(uv - .5));
  col *= vign;
  let ring = abs(length(uv - vec2f(.5 + (n-.5)*.1, .45)) - .22 - n2 * .08);
  col += vec3f(1.) * smoothstep(.03, 0., ring) * .35 * sat;
  return vec4f(col, 1.);
}
`;
async function paintArt(canvas, prompt, style, w, h) {
	canvas.width = w;
	canvas.height = h;
	const styleN = Math.max(0, [
		"Aurora",
		"Sunset",
		"Ocean",
		"Forest",
		"Mono"
	].indexOf(style));
	const gpu = navigator.gpu;
	if (gpu) try {
		const device = await (await gpu.requestAdapter())?.requestDevice();
		if (device) {
			const module = device.createShaderModule({ code: WGSL });
			if ((await module.getCompilationInfo()).messages.some((m) => m.type === "error")) throw new Error("shader");
			const format = "rgba8unorm";
			const tex = device.createTexture({
				size: [w, h],
				format,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
			});
			const uni = device.createBuffer({
				size: 16,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
			});
			const seed = hash(prompt + style) % 1e3 / 50;
			device.queue.writeBuffer(uni, 0, new Float32Array([
				seed,
				styleN,
				w,
				h
			]));
			const bgl = device.createBindGroupLayout({ entries: [{
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				buffer: { type: "uniform" }
			}] });
			const bind = device.createBindGroup({
				layout: bgl,
				entries: [{
					binding: 0,
					resource: { buffer: uni }
				}]
			});
			const pipeline = device.createRenderPipeline({
				layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
				vertex: {
					module,
					entryPoint: "vs"
				},
				fragment: {
					module,
					entryPoint: "fs",
					targets: [{ format }]
				},
				primitive: { topology: "triangle-list" }
			});
			const enc = device.createCommandEncoder();
			const pass = enc.beginRenderPass({ colorAttachments: [{
				view: tex.createView(),
				loadOp: "clear",
				storeOp: "store",
				clearValue: {
					r: 0,
					g: 0,
					b: 0,
					a: 1
				}
			}] });
			pass.setPipeline(pipeline);
			pass.setBindGroup(0, bind);
			pass.draw(3);
			pass.end();
			const bytesPerRow = Math.ceil(w * 4 / 256) * 256;
			const buf = device.createBuffer({
				size: bytesPerRow * h,
				usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
			});
			enc.copyTextureToBuffer({ texture: tex }, {
				buffer: buf,
				bytesPerRow,
				rowsPerImage: h
			}, [w, h]);
			device.queue.submit([enc.finish()]);
			await buf.mapAsync(GPUMapMode.READ);
			const raw = new Uint8Array(buf.getMappedRange());
			const img = new ImageData(w, h);
			for (let y = 0; y < h; y++) img.data.set(raw.subarray(y * bytesPerRow, y * bytesPerRow + w * 4), y * w * 4);
			buf.unmap();
			canvas.getContext("2d")?.putImageData(img, 0, 0);
			device.destroy();
			return "webgpu";
		}
	} catch {}
	const art = cpuArt(prompt, style, w, h, Date.now());
	canvas.getContext("2d")?.drawImage(art, 0, 0);
	return "canvas";
}
function dims(aspect, res) {
	const [a, b] = aspect.split(":").map(Number);
	if (!a || !b) return [1280, 720];
	if (a >= b) return [Math.round(res * a / b / 2) * 2, res];
	return [res, Math.round(res * b / a / 2) * 2];
}
function cover(x, im, X, Y, W, H, z = 1) {
	if (!im) return;
	x.save();
	x.beginPath();
	x.rect(X, Y, W, H);
	x.clip();
	const s = Math.max(W / im.width, H / im.height) * z;
	x.drawImage(im, X + (W - im.width * s) / 2, Y + (H - im.height * s) / 2, im.width * s, im.height * s);
	x.restore();
}
function wrap(x, t, X, Y, mw, lh) {
	let line = "";
	let y = Y;
	for (const w of t.split(" ")) {
		const next = `${line}${w} `;
		if (x.measureText(next).width > mw && line) {
			x.fillText(line, X, y);
			y += lh;
			line = `${w} `;
		} else line = next;
	}
	x.fillText(line, X, y);
}
async function recordFrames(w, h, fps, draw, ms, onProg) {
	if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot record video.");
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const x = c.getContext("2d");
	if (!x) throw new Error("Canvas unavailable.");
	const mime = [
		"video/webm;codecs=vp9",
		"video/webm;codecs=vp8",
		"video/webm"
	].find((t) => MediaRecorder.isTypeSupported(t));
	const rec = new MediaRecorder(c.captureStream(fps), mime ? { mimeType: mime } : void 0);
	const chunks = [];
	rec.ondataavailable = (e) => {
		if (e.data.size) chunks.push(e.data);
	};
	const stopped = new Promise((resolve) => {
		rec.onstop = () => resolve();
	});
	rec.start(200);
	const t0 = performance.now();
	await new Promise((resolve) => {
		const frame = () => {
			const t = performance.now() - t0;
			draw(x, w, h, t);
			onProg?.(Math.min(1, t / ms));
			if (t >= ms) return resolve();
			requestAnimationFrame(frame);
		};
		frame();
	});
	rec.stop();
	await stopped;
	return URL.createObjectURL(new Blob(chunks, { type: mime || "video/webm" }));
}
async function renderScenes(scenes, avatarSrc, aspect, res, fps, brand, onProg) {
	const [w, h] = dims(aspect, res);
	const av = await loadImage(avatarSrc).catch(() => null);
	const logo = brand.logo ? await loadImage(brand.logo).catch(() => null) : null;
	const bgs = await Promise.all(scenes.map((s) => loadImage(s.img).catch(() => null)));
	const ds = scenes.map((s) => Math.max(2, s.dur) * 1e3);
	return {
		url: await recordFrames(w, h, fps, (x, W, H, t) => {
			let i = 0;
			let a = t;
			while (i < scenes.length - 1 && a >= ds[i]) {
				a -= ds[i];
				i++;
			}
			const s = scenes[i];
			const p = ds[i] ? a / ds[i] : 1;
			x.fillStyle = "#0b0d10";
			x.fillRect(0, 0, W, H);
			cover(x, bgs[i], 0, 0, W, H, 1 + .05 * p);
			const g = x.createLinearGradient(0, 0, W, 0);
			g.addColorStop(0, "rgba(0,0,0,.55)");
			g.addColorStop(1, "rgba(0,0,0,.08)");
			x.fillStyle = g;
			x.fillRect(0, 0, W, H);
			const ah = H * .9;
			const aw = Math.min(ah * .67, W * .46);
			const side = W < H ? .5 : .72;
			cover(x, av, (W - aw) * side, H - ah + Math.sin(t / 260) * H * .004, aw, ah);
			x.fillStyle = "rgba(0,0,0,.62)";
			x.fillRect(0, H * .8, W, H * .2);
			x.fillStyle = brand.c2 || "#8ab4ff";
			x.fillRect(0, H * .8, W * Math.min(1, p + .02), Math.max(3, H * .006));
			x.fillStyle = brand.c1 || "#fff";
			x.font = `700 ${Math.round(H * .038)}px ${brand.font || "Manrope"}, sans-serif`;
			x.textBaseline = "top";
			wrap(x, s.text, W * .06, H * .845, W * (W < H ? .88 : .48), H * .048);
			if (logo) x.drawImage(logo, W * .03, H * .04, logo.width * H * .08 / logo.height, H * .08);
		}, ds.reduce((a, c) => a + c, 0), onProg),
		note: `${scenes.length} scenes · ${w}×${h} · picture track (speech plays live in the studio, not inside the file)`
	};
}
async function renderClip(file, opts) {
	const v = document.createElement("video");
	v.src = URL.createObjectURL(file);
	v.muted = true;
	v.playsInline = true;
	await new Promise((resolve, reject) => {
		v.onloadedmetadata = () => resolve();
		v.onerror = () => reject(/* @__PURE__ */ new Error("Could not read that video."));
	});
	const a = Math.max(0, opts.start || 0);
	const end = Math.min(opts.end && opts.end > a ? opts.end : v.duration, v.duration);
	const speed = opts.speed || 1;
	const scale = Math.min(1, 1280 / (v.videoWidth || 1280));
	const w = Math.max(2, Math.round(v.videoWidth * scale / 2) * 2);
	const h = Math.max(2, Math.round(v.videoHeight * scale / 2) * 2);
	v.currentTime = a;
	await new Promise((resolve) => {
		v.onseeked = () => resolve();
	});
	v.playbackRate = speed;
	await v.play();
	const url = await recordFrames(w, h, 30, (x, W, H) => {
		x.filter = opts.filter && opts.filter !== "none" ? opts.filter : "none";
		x.drawImage(v, 0, 0, W, H);
		x.filter = "none";
		if (opts.caption) {
			x.fillStyle = "rgba(0,0,0,.6)";
			x.fillRect(0, H * .86, W, H * .14);
			x.fillStyle = "#fff";
			x.font = `700 ${Math.round(H * .04)}px sans-serif`;
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.fillText(opts.caption, W / 2, H * .93);
			x.textAlign = "left";
		}
	}, (end - a) / speed * 1e3, opts.onProg);
	v.pause();
	return {
		url,
		note: `Edited clip · ${w}×${h}`
	};
}
var OPEN = {
	sil: .04,
	PP: .08,
	FF: .2,
	TH: .24,
	DD: .3,
	kk: .34,
	CH: .28,
	SS: .18,
	nn: .22,
	RR: .36,
	aa: .86,
	E: .5,
	ih: .34,
	oh: .66,
	ou: .42
};
function visemeAt(text, t, dur) {
	const chars = text.toLowerCase();
	if (!chars.length || dur <= 0) return .04;
	const i = Math.min(chars.length - 1, Math.floor(t / dur * chars.length));
	const pair = chars.slice(i, i + 2);
	let v = "sil";
	if (pair === "th" || pair === "sh" || pair === "ch") v = pair === "th" ? "TH" : "CH";
	else {
		const c = chars[i];
		if (" \n.,!?".includes(c)) v = "sil";
		else if ("pbm".includes(c)) v = "PP";
		else if ("fv".includes(c)) v = "FF";
		else if ("td".includes(c)) v = "DD";
		else if ("kg".includes(c)) v = "kk";
		else if ("sz".includes(c)) v = "SS";
		else if ("nl".includes(c)) v = "nn";
		else if (c === "r") v = "RR";
		else if (c === "a") v = "aa";
		else if (c === "e") v = "E";
		else if (c === "i" || c === "y") v = "ih";
		else if (c === "o") v = "oh";
		else if (c === "u" || c === "w") v = "ou";
		else v = "DD";
	}
	return OPEN[v] ?? .2;
}
function drawTalking(ctx, img, w, h, open, energy) {
	ctx.clearRect(0, 0, w, h);
	if (!img) {
		ctx.fillStyle = "#15181c";
		ctx.fillRect(0, 0, w, h);
		return;
	}
	const bob = Math.sin(performance.now() / 420) * h * .004 * (.4 + energy);
	ctx.save();
	ctx.translate(0, bob);
	cover(ctx, img, 0, 0, w, h * 1.02, 1);
	ctx.restore();
	const jaw = h * .58;
	if (open > .08) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, jaw, w, h - jaw);
		ctx.clip();
		ctx.drawImage(img, 0, jaw + open * h * .012, w, h);
		ctx.restore();
		ctx.fillStyle = `rgba(12,6,8,${.15 + open * .55})`;
		ctx.beginPath();
		ctx.ellipse(w * .5, jaw + h * .08, w * (.055 + open * .04), h * (.012 + open * .028), 0, 0, Math.PI * 2);
		ctx.fill();
	}
	if (Math.sin(performance.now() / 1800) > .97) {
		ctx.fillStyle = "rgba(20,16,14,.72)";
		ctx.fillRect(w * .3, h * .36, w * .14, h * .018);
		ctx.fillRect(w * .56, h * .36, w * .14, h * .018);
	}
}
function shrinkFile(file, max) {
	return new Promise((resolve, reject) => {
		const fr = new FileReader();
		fr.onerror = () => reject(/* @__PURE__ */ new Error("Could not read that file."));
		fr.onload = () => {
			const img = new Image();
			img.onload = () => {
				const s = Math.min(1, max / Math.max(img.width, img.height));
				const c = document.createElement("canvas");
				c.width = Math.max(1, Math.round(img.width * s));
				c.height = Math.max(1, Math.round(img.height * s));
				c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
				resolve(c.toDataURL("image/jpeg", .82));
			};
			img.onerror = () => reject(/* @__PURE__ */ new Error("Could not read that image."));
			img.src = String(fr.result);
		};
		fr.readAsDataURL(file);
	});
}
function pickFile(accept) {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.onchange = () => resolve(input.files?.[0] ?? null);
		input.click();
	});
}
var BG_OFFICE = "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80";
var BG_LOFT = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80";
var BG_LIBRARY = "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80";
var BG_MAP = {
	"Executive Studio": BG_OFFICE,
	"Minimal Loft": BG_LOFT,
	"Warm Library": BG_LIBRARY,
	"Dark Editorial": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80"
};
var LIBRARY = [
	{
		name: "Maya",
		src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80"
	},
	{
		name: "Elena",
		src: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=80"
	},
	{
		name: "Sofia",
		src: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80"
	},
	{
		name: "Noah",
		src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80"
	},
	{
		name: "James",
		src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"
	},
	{
		name: "Arjun",
		src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80"
	}
];
var NEURAL_VOICES = [
	{
		id: "eve",
		label: "Eve · warm"
	},
	{
		id: "ara",
		label: "Ara · clear"
	},
	{
		id: "leo",
		label: "Leo · steady"
	},
	{
		id: "rex",
		label: "Rex · low"
	},
	{
		id: "sal",
		label: "Sal · bright"
	}
];
function uid() {
	return Math.random().toString(36).slice(2, 9);
}
function defaultScenes(avatarSrc) {
	return [
		{
			title: "Opening",
			text: "How can I help you today?",
			dur: 7,
			img: avatarSrc
		},
		{
			title: "Guidance",
			text: "Tell me what you are working through. We can break it down together.",
			dur: 9,
			img: BG_LOFT
		},
		{
			title: "Next step",
			text: "We will turn the challenge into a clear, practical next step.",
			dur: 8,
			img: BG_OFFICE
		}
	];
}
var KEY = "mediaforge-v5";
var baseScenes = defaultScenes(LIBRARY[0].src);
function fresh() {
	return {
		hydrated: false,
		view: "studio",
		tab: "identity",
		name: "Personal Guide",
		pid: "p0",
		avatars: LIBRARY,
		avatar: 0,
		scenes: baseScenes,
		scene: 0,
		vp: null,
		voices: [],
		agents: [{
			name: "Maya, Personal Guide",
			prompt: "You are Maya, a warm, practical personal guide. Help people turn problems into clear next steps. Speak in short sentences.",
			hist: []
		}],
		agent: 0,
		mem: [],
		projects: [],
		imgs: [],
		brand: {
			c1: "#f3f5f7",
			c2: "#8ab4ff",
			font: "Manrope",
			tag: "Personal Guide",
			logo: ""
		},
		settings: {
			res: "720",
			fps: "30",
			lang: "en-US",
			aspect: "16:9",
			mem: true,
			neural: false
		},
		perf: {
			expression: "Neutral",
			energy: 56,
			gesture: 42,
			eye: true,
			lipsync: true,
			camera: "Eye-level",
			framing: "Center",
			preset: "Executive",
			bg: "Executive Studio"
		},
		query: "",
		toast: "",
		mouth: .04,
		speaking: false,
		liveOn: false,
		gpu: "checking",
		engine: "…",
		progress: "",
		lastVideo: null,
		scriptOpen: false,
		moreOpen: false,
		history: [],
		future: [],
		designHtml: "",
		designPrompt: "",
		designRef: "",
		designKind: "landing",
		log: []
	};
}
function snapOf(s) {
	return {
		name: s.name,
		scenes: s.scenes,
		avatar: s.avatar,
		scene: s.scene,
		vp: s.vp
	};
}
var useStudio = create((set, get) => ({
	...fresh(),
	hydrate: () => {
		if (get().hydrated) return;
		try {
			const raw = localStorage.getItem(KEY);
			if (!raw) {
				set({ hydrated: true });
				get().persist();
				return;
			}
			const d = JSON.parse(raw);
			const custom = (d.avatars || []).filter((a) => a.custom);
			const avatars = [...LIBRARY, ...custom];
			set({
				hydrated: true,
				avatars,
				name: d.name || "Personal Guide",
				pid: d.pid || "p0",
				scenes: d.scenes?.length ? d.scenes : baseScenes,
				scene: d.scene || 0,
				avatar: Math.min(d.avatar || 0, avatars.length - 1),
				vp: d.vp || null,
				voices: d.voices || [],
				agents: d.agents?.length ? d.agents : get().agents,
				mem: d.mem || [],
				projects: d.projects || [],
				imgs: (d.imgs || []).slice(0, 12),
				brand: {
					...get().brand,
					...d.brand
				},
				settings: {
					...get().settings,
					...d.settings
				},
				perf: {
					...get().perf,
					...d.perf
				}
			});
		} catch {
			set({ hydrated: true });
		}
	},
	persist: () => {
		const payload = pack(get());
		set({ projects: payload.projects });
		try {
			localStorage.setItem(KEY, JSON.stringify(payload));
		} catch {
			set({ toast: "Browser storage is full. Delete a saved image or project." });
		}
	},
	flash: (m) => {
		set({ toast: m });
		window.setTimeout(() => {
			if (get().toast === m) set({ toast: "" });
		}, 2400);
	},
	go: (v) => {
		set({
			view: v,
			moreOpen: false,
			liveOn: v === "live" ? get().liveOn : false
		});
		get().persist();
	},
	setTab: (t) => set({ tab: t }),
	remember: () => {
		const s = get();
		set({
			history: [...s.history, snapOf(s)].slice(-30),
			future: []
		});
	},
	undo: () => {
		const s = get();
		const prev = s.history[s.history.length - 1];
		if (!prev) return s.flash("Nothing to undo");
		set({
			history: s.history.slice(0, -1),
			future: [...s.future, snapOf(s)],
			...prev
		});
		get().persist();
	},
	redo: () => {
		const s = get();
		const next = s.future[s.future.length - 1];
		if (!next) return s.flash("Nothing to redo");
		set({
			future: s.future.slice(0, -1),
			history: [...s.history, snapOf(s)],
			...next
		});
		get().persist();
	},
	updateScene: (i, patch) => {
		set({ scenes: get().scenes.map((sc, idx) => idx === i ? {
			...sc,
			...patch
		} : sc) });
		get().persist();
	},
	setScenes: (scenes, name) => {
		get().remember();
		set({
			scenes,
			scene: 0,
			...name ? { name } : {}
		});
		get().persist();
	}
}));
function pack(s) {
	const project = {
		id: s.pid,
		name: s.name,
		t: Date.now(),
		scenes: s.scenes,
		avatar: s.avatar,
		vp: s.vp,
		scene: s.scene
	};
	const projects = s.projects.some((p) => p.id === s.pid) ? s.projects.map((p) => p.id === s.pid ? project : p) : [project, ...s.projects];
	return {
		name: s.name,
		pid: s.pid,
		scenes: s.scenes,
		scene: s.scene,
		avatar: s.avatar,
		vp: s.vp,
		voices: s.voices,
		agents: s.agents.map((a) => ({
			...a,
			hist: a.hist.slice(-30)
		})),
		mem: s.mem,
		projects,
		imgs: s.imgs.slice(0, 12),
		brand: s.brand,
		settings: s.settings,
		perf: s.perf,
		avatars: s.avatars.filter((a) => a.custom)
	};
}
function memoryBlock(s) {
	if (!s.settings.mem || !s.mem.length) return "";
	return `\nKnown facts:\n${s.mem.map((m) => `- ${m.t}`).join("\n")}`;
}
function Recog() {
	const w = window;
	return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
function canListen() {
	return typeof window !== "undefined" && Boolean(Recog());
}
function listenOnce(lang) {
	const Ctor = Recog();
	if (!Ctor) return Promise.reject(/* @__PURE__ */ new Error("Speech recognition needs Chrome or Edge."));
	return new Promise((resolve, reject) => {
		const r = new Ctor();
		r.lang = lang;
		r.interimResults = false;
		r.continuous = false;
		r.onresult = (e) => {
			resolve(e.results[0][0].transcript);
		};
		r.onerror = () => reject(/* @__PURE__ */ new Error("Microphone did not return speech."));
		r.onend = () => reject(/* @__PURE__ */ new Error("No speech heard."));
		try {
			r.start();
		} catch {
			reject(/* @__PURE__ */ new Error("Microphone is busy."));
		}
	});
}
var stopAudio = null;
function stopSpeaking() {
	if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
	stopAudio?.();
	stopAudio = null;
}
function browserVoices() {
	if (typeof speechSynthesis === "undefined") return [];
	return speechSynthesis.getVoices();
}
async function speakLine(opts) {
	stopSpeaking();
	const text = opts.text.trim();
	if (!text) return;
	if (opts.neural) {
		const spoken = await studioVoice({ data: {
			text,
			voice: opts.neuralId || "eve",
			lang: opts.lang
		} });
		if (spoken.ok) {
			await playNeural(spoken.audio, spoken.mime, text, opts.onMouth);
			return;
		}
	}
	await playSystem(text, opts);
}
function playSystem(text, opts) {
	return new Promise((resolve) => {
		if (!("speechSynthesis" in window)) {
			resolve();
			return;
		}
		const u = new SpeechSynthesisUtterance(text);
		u.lang = opts.lang;
		u.rate = opts.rate || 1;
		u.pitch = opts.pitch || 1;
		const voice = speechSynthesis.getVoices().find((v) => v.name === opts.voiceName);
		if (voice) u.voice = voice;
		const dur = Math.max(900, text.length * 62);
		const t0 = performance.now();
		let timer = 0;
		const tick = () => {
			const t = performance.now() - t0;
			opts.onMouth(visemeAt(text, t, dur));
			if (t < dur + 200) timer = requestAnimationFrame(tick);
		};
		u.onstart = () => {
			timer = requestAnimationFrame(tick);
		};
		u.onend = u.onerror = () => {
			cancelAnimationFrame(timer);
			opts.onMouth(.04);
			resolve();
		};
		speechSynthesis.speak(u);
		stopAudio = () => {
			cancelAnimationFrame(timer);
			speechSynthesis.cancel();
			opts.onMouth(.04);
			resolve();
		};
	});
}
async function playNeural(b64, mime, text, onMouth) {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	const ctx = new AudioContext();
	const buf = await ctx.decodeAudioData(bytes.buffer.slice(0));
	const src = ctx.createBufferSource();
	src.buffer = buf;
	const analyser = ctx.createAnalyser();
	analyser.fftSize = 512;
	src.connect(analyser);
	analyser.connect(ctx.destination);
	const data = new Uint8Array(analyser.fftSize);
	let raf = 0;
	const t0 = performance.now();
	const dur = buf.duration * 1e3;
	const tick = () => {
		analyser.getByteTimeDomainData(data);
		let sum = 0;
		for (const v of data) {
			const n = (v - 128) / 128;
			sum += n * n;
		}
		const rms = Math.min(1, Math.sqrt(sum / data.length) * 4.2);
		const vis = visemeAt(text, performance.now() - t0, dur);
		onMouth(Math.max(rms, vis * .85));
		raf = requestAnimationFrame(tick);
	};
	await new Promise((resolve) => {
		src.onended = () => {
			cancelAnimationFrame(raf);
			onMouth(.04);
			ctx.close();
			resolve();
		};
		stopAudio = () => {
			try {
				src.stop();
			} catch {}
			cancelAnimationFrame(raf);
			onMouth(.04);
			ctx.close();
			resolve();
		};
		src.start();
		raf = requestAnimationFrame(tick);
	});
}
async function playShifted(srcUrl, rate) {
	const ctx = new AudioContext();
	const res = await fetch(srcUrl);
	const buf = await ctx.decodeAudioData(await res.arrayBuffer());
	const src = ctx.createBufferSource();
	src.buffer = buf;
	src.playbackRate.value = rate;
	src.connect(ctx.destination);
	src.start();
	src.onended = () => void ctx.close();
}
function Page({ title, lede, extra, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mf-canvas",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-head",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: lede })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-bar",
				children: extra
			})]
		}), children]
	});
}
async function say(text) {
	const s = useStudio.getState();
	useStudio.setState({ speaking: true });
	try {
		await speakLine({
			text,
			lang: s.settings.lang,
			rate: s.vp?.rate || .96,
			pitch: s.vp?.pitch || 1,
			voiceName: s.vp?.voice,
			neural: s.settings.neural,
			neuralId: s.vp?.neural || "eve",
			onMouth: (mouth) => useStudio.setState({ mouth: s.perf.lipsync ? mouth : .05 })
		});
	} finally {
		useStudio.setState({
			speaking: false,
			mouth: .04
		});
	}
}
function AvatarsPanel() {
	const avatars = useStudio((s) => s.avatars);
	const avatar = useStudio((s) => s.avatar);
	const flash = useStudio((s) => s.flash);
	const [name, setName] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		title: "Avatars",
		lede: "Choose the presenter, or create one from a front-facing photo stored in this browser.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-grid cards",
			children: avatars.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `mf-card ${i === avatar ? "sel" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-portrait",
						style: {
							aspectRatio: "0.8",
							width: "100%"
						},
						onClick: () => {
							useStudio.getState().remember();
							useStudio.setState({ avatar: i });
							useStudio.getState().persist();
							flash(`${p.name} is now the presenter`);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							className: "av",
							src: p.src,
							alt: ""
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: p.name }),
					p.custom ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => {
							const next = avatars.filter((_, idx) => idx !== i);
							useStudio.setState({
								avatars: next,
								avatar: 0
							});
							useStudio.getState().persist();
						},
						children: "Delete"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Library" })
				]
			}, `${p.name}-${i}`))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-card",
			style: { marginTop: 14 },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Create avatar from a photo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-bar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: name,
					placeholder: "Name",
					onChange: (e) => setName(e.target.value),
					style: { flex: 1 }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "mf-ghost",
					onClick: async () => {
						const file = await pickFile("image/*");
						if (!file) return;
						const src = await shrinkFile(file, 700);
						const av = {
							name: name.trim() || file.name.replace(/\.\w+$/, ""),
							src,
							custom: true
						};
						const list = [...useStudio.getState().avatars, av];
						useStudio.setState({
							avatars: list,
							avatar: list.length - 1
						});
						useStudio.getState().persist();
						flash("Avatar created");
					},
					children: "Choose photo"
				})]
			})]
		})]
	});
}
function VideoPanel() {
	const scenes = useStudio((s) => s.scenes);
	const last = useStudio((s) => s.lastVideo);
	const progress = useStudio((s) => s.progress);
	const [prompt, setPrompt] = (0, import_react.useState)("");
	const [count, setCount] = (0, import_react.useState)(4);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [file, setFile] = (0, import_react.useState)(null);
	const [cap, setCap] = (0, import_react.useState)("");
	const [start, setStart] = (0, import_react.useState)(0);
	const [end, setEnd] = (0, import_react.useState)("");
	const [speed, setSpeed] = (0, import_react.useState)(1);
	const [look, setLook] = (0, import_react.useState)("none");
	const total = scenes.reduce((a, s) => a + s.dur, 0);
	async function writeScript() {
		if (!prompt.trim()) return useStudio.getState().flash("Describe the video first");
		setBusy(true);
		const s = useStudio.getState();
		const r = await studioScript({ data: {
			topic: prompt + memoryBlock(s),
			scenes: count,
			kind: "avatar video"
		} });
		const av = s.avatars[s.avatar]?.src || "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80";
		s.setScenes(r.scenes.map((sc, i) => ({
			title: `Scene ${i + 1}`,
			text: sc.text,
			dur: 6,
			img: i ? BG_OFFICE : av
		})), prompt.slice(0, 40));
		useStudio.getState().flash(`Script written (${r.engine})`);
		setBusy(false);
	}
	async function render() {
		const s = useStudio.getState();
		setBusy(true);
		try {
			const out = await renderScenes(s.scenes, s.avatars[s.avatar].src, s.settings.aspect, Number(s.settings.res), Number(s.settings.fps), s.brand, (p) => useStudio.setState({ progress: `Rendering ${Math.round(p * 100)}%` }));
			useStudio.setState({
				lastVideo: out,
				progress: ""
			});
		} catch (e) {
			useStudio.getState().flash(e instanceof Error ? e.message : "Render failed");
		}
		setBusy(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		title: "Video",
		lede: "Write a presenter script, render a WebM, or trim a clip you already have.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Generate" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: prompt,
						placeholder: "Topic, audience, tone…",
						onChange: (e) => setPrompt(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: count,
								onChange: (e) => setCount(Number(e.target.value)),
								style: { width: 88 },
								children: [
									3,
									4,
									5,
									6
								].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: n,
									children: n
								}, n))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								disabled: busy,
								onClick: () => void writeScript(),
								children: "Write script"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-primary",
								disabled: busy,
								onClick: () => void render(),
								children: "Render video"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: progress || `${scenes.length} scenes · ${total}s. Fine-tune them in Scenes.` })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-card",
				children: last ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						controls: true,
						src: last.url
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-bar",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "mf-primary",
							href: last.url,
							download: `mediaforge-${Date.now()}.webm`,
							children: "Download .webm"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: last.note })
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Your rendered video appears here." })
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-card",
			style: { marginTop: 14 },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Edit a clip" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: async () => {
							const f = await pickFile("video/*");
							if (f) setFile(f);
						},
						children: "Choose video"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: file?.name || "No file" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: cap,
					placeholder: "Caption (optional)",
					onChange: (e) => setCap(e.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-grid two",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Trim start (s)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							value: start,
							onChange: (e) => setStart(Number(e.target.value))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Trim end (s, blank = end)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							value: end,
							onChange: (e) => setEnd(e.target.value === "" ? "" : Number(e.target.value))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Speed" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: speed,
							onChange: (e) => setSpeed(Number(e.target.value)),
							children: [
								.5,
								.75,
								1,
								1.5,
								2
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: n }, n))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Look" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: look,
							onChange: (e) => setLook(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "none",
									children: "Original"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "grayscale(1)",
									children: "Black and white"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "sepia(.8)",
									children: "Warm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "contrast(1.3) saturate(1.3)",
									children: "Vivid"
								})
							]
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "mf-primary",
					disabled: busy,
					onClick: async () => {
						if (!file) return useStudio.getState().flash("Choose a video file first");
						setBusy(true);
						try {
							const out = await renderClip(file, {
								start,
								end: end === "" ? null : end,
								speed,
								filter: look,
								caption: cap,
								onProg: (p) => useStudio.setState({ progress: `Rendering ${Math.round(p * 100)}%` })
							});
							useStudio.setState({
								lastVideo: out,
								progress: ""
							});
						} catch (e) {
							useStudio.getState().flash(e instanceof Error ? e.message : "Edit failed");
						}
						setBusy(false);
					},
					children: "Render edit"
				})
			]
		})]
	});
}
var STYLES = [
	"Aurora",
	"Sunset",
	"Ocean",
	"Forest",
	"Mono"
];
function ImagesPanel() {
	const imgs = useStudio((s) => s.imgs);
	const canvasRef = (0, import_react.useRef)(null);
	const [prompt, setPrompt] = (0, import_react.useState)("Calm aurora over a dark studio stage");
	const [style, setStyle] = (0, import_react.useState)("Aurora");
	const [size, setSize] = (0, import_react.useState)("16:9");
	const [text, setText] = (0, import_react.useState)("");
	const [filters, setFilters] = (0, import_react.useState)({
		b: 100,
		c: 100,
		s: 100,
		blur: 0
	});
	const [engine, setEngine] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const source = (0, import_react.useRef)(null);
	function paintFilters() {
		const cv = canvasRef.current;
		const src = source.current;
		if (!cv || !src) return;
		const x = cv.getContext("2d");
		if (!x) return;
		cv.width = src.width;
		cv.height = src.height;
		x.filter = `brightness(${filters.b}%) contrast(${filters.c}%) saturate(${filters.s}%) blur(${filters.blur}px)`;
		x.drawImage(src, 0, 0);
		x.filter = "none";
		if (text) {
			x.fillStyle = "rgba(0,0,0,.45)";
			x.fillRect(0, cv.height * .8, cv.width, cv.height * .2);
			x.fillStyle = "#fff";
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.font = `700 ${Math.round(cv.height * .07)}px ${useStudio.getState().brand.font}, sans-serif`;
			x.fillText(text, cv.width / 2, cv.height * .9);
		}
	}
	async function generate(kind) {
		if (!canvasRef.current) return;
		setBusy(true);
		const [w, h] = size === "1:1" ? [768, 768] : size === "9:16" ? [540, 960] : [960, 540];
		if (kind === "photo") {
			const r = await studioImage({ data: { prompt: `${prompt}. ${size} composition, cinematic, no text.` } });
			if (!r.ok) {
				useStudio.getState().flash(r.error);
				setBusy(false);
				return;
			}
			const img = new Image();
			img.onload = () => {
				const c = document.createElement("canvas");
				c.width = w;
				c.height = h;
				c.getContext("2d")?.drawImage(img, 0, 0, w, h);
				source.current = c;
				setEngine("grok imagine");
				paintFilters();
				setBusy(false);
			};
			img.src = r.dataUrl;
			return;
		}
		const made = document.createElement("canvas");
		const used = await paintArt(made, prompt, style, w, h);
		source.current = made;
		setEngine(used);
		paintFilters();
		setBusy(false);
	}
	(0, import_react.useEffect)(() => {
		generate("gpu");
	}, []);
	(0, import_react.useEffect)(() => {
		paintFilters();
	}, [filters, text]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		title: "Images",
		lede: "WebGPU generative art renders instantly. Photoreal uses the studio image engine when you ask.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Prompt" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: prompt,
						onChange: (e) => setPrompt(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-grid two",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Style" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: style,
							onChange: (e) => setStyle(e.target.value),
							children: STYLES.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: x }, x))
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Size" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: size,
							onChange: (e) => setSize(e.target.value),
							children: [
								"16:9",
								"1:1",
								"9:16"
							].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: x }, x))
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-primary",
								disabled: busy,
								onClick: () => void generate("gpu"),
								children: "Generate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								disabled: busy,
								onClick: () => void generate("photo"),
								children: "Photoreal"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: async () => {
									const f = await pickFile("image/*");
									if (!f) return;
									const url = await shrinkFile(f, 1400);
									const img = new Image();
									img.onload = () => {
										const c = document.createElement("canvas");
										c.width = img.width;
										c.height = img.height;
										c.getContext("2d")?.drawImage(img, 0, 0);
										source.current = c;
										setEngine("upload");
										paintFilters();
									};
									img.src = url;
								},
								children: "Edit my photo"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: engine ? `Engine: ${engine}` : "Rendering…" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Overlay text" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: text,
						onChange: (e) => setText(e.target.value)
					}),
					[
						[
							"Brightness",
							"b",
							40,
							160
						],
						[
							"Contrast",
							"c",
							40,
							160
						],
						[
							"Saturation",
							"s",
							0,
							200
						],
						[
							"Blur",
							"blur",
							0,
							10
						]
					].map(([label, key, min, max]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						label,
						" ",
						filters[key]
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min,
						max,
						value: filters[key],
						onChange: (e) => setFilters({
							...filters,
							[key]: Number(e.target.value)
						})
					})] }, key)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									const cv = canvasRef.current;
									if (!cv) return;
									const a = document.createElement("a");
									a.href = cv.toDataURL("image/png");
									a.download = "mediaforge-image.png";
									a.click();
								},
								children: "Download PNG"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									const cv = canvasRef.current;
									if (!cv) return;
									const full = cv.toDataURL("image/jpeg", .82);
									const thumb = document.createElement("canvas");
									thumb.width = 480;
									thumb.height = Math.round(480 * cv.height / cv.width);
									thumb.getContext("2d")?.drawImage(cv, 0, 0, thumb.width, thumb.height);
									const imgsNext = [{
										u: thumb.toDataURL("image/jpeg", .7),
										full,
										prompt
									}, ...useStudio.getState().imgs].slice(0, 12);
									useStudio.setState({ imgs: imgsNext });
									useStudio.getState().persist();
									useStudio.getState().flash("Saved to the library");
								},
								children: "Save to library"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									const cv = canvasRef.current;
									if (!cv) return;
									const s = useStudio.getState();
									s.updateScene(s.scene, { img: cv.toDataURL("image/jpeg", .82) });
									s.flash(`Scene ${s.scene + 1} background replaced`);
								},
								children: "Use as scene background"
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					width: 960,
					height: 540
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-grid cards",
			style: { marginTop: 14 },
			children: imgs.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: m.u,
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => {
							const img = new Image();
							img.onload = () => {
								const c = document.createElement("canvas");
								c.width = img.width;
								c.height = img.height;
								c.getContext("2d")?.drawImage(img, 0, 0);
								source.current = c;
								paintFilters();
							};
							img.src = m.full;
						},
						children: "Edit"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => {
							useStudio.setState({ imgs: imgs.filter((_, idx) => idx !== i) });
							useStudio.getState().persist();
						},
						children: "Remove"
					})]
				})]
			}, `${m.prompt}-${i}`))
		})]
	});
}
function VoicePanel() {
	const scene = useStudio((s) => s.scenes[s.scene]);
	const voices = useStudio((s) => s.voices);
	const vp = useStudio((s) => s.vp);
	const [text, setText] = (0, import_react.useState)(scene?.text || "");
	const [list, setList] = (0, import_react.useState)([]);
	const [voice, setVoice] = (0, import_react.useState)(vp?.voice || "");
	const [rate, setRate] = (0, import_react.useState)(Math.round((vp?.rate || .96) * 100));
	const [pitch, setPitch] = (0, import_react.useState)(Math.round((vp?.pitch || 1) * 100));
	const [neural, setNeural] = (0, import_react.useState)(vp?.neural || "eve");
	const [label, setLabel] = (0, import_react.useState)("");
	const [sample, setSample] = (0, import_react.useState)(null);
	const rec = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (typeof speechSynthesis === "undefined") return;
		const pull = () => setList(browserVoices());
		pull();
		speechSynthesis.onvoiceschanged = pull;
	}, []);
	function cfg() {
		return {
			name: label || "Custom",
			voice,
			rate: rate / 100,
			pitch: pitch / 100,
			neural
		};
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Voice",
		lede: "Browser speech, a neural studio voice, saved presets, and a pitch transformer for your own take.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Text to speech" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: text,
						onChange: (e) => setText(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Browser voice" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: voice,
						onChange: (e) => setVoice(e.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Default"
						}), list.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: v.name,
							children: [
								v.name,
								" (",
								v.lang,
								")"
							]
						}, v.name))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Neural voice" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: neural,
						onChange: (e) => setNeural(e.target.value),
						children: NEURAL_VOICES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: v.id,
							children: v.label
						}, v.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Speed ",
						rate,
						"%"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 50,
						max: 150,
						value: rate,
						onChange: (e) => setRate(Number(e.target.value))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Pitch ",
						pitch,
						"%"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 50,
						max: 150,
						value: pitch,
						onChange: (e) => setPitch(Number(e.target.value))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-primary",
								onClick: () => {
									useStudio.setState({ vp: cfg() });
									say(text);
								},
								children: "Speak"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: label,
								placeholder: "Name this voice",
								onChange: (e) => setLabel(e.target.value),
								style: { flex: 1 }
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									if (!label.trim()) return useStudio.getState().flash("Name the voice first");
									useStudio.setState({ voices: [...voices, cfg()] });
									useStudio.getState().persist();
									useStudio.getState().flash("Voice saved");
								},
								children: "Save voice"
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Saved voices" }),
					voices.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "None yet." }),
					voices.map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: { flex: 1 },
								children: [
									v.name,
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: v.neural })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									useStudio.setState({ vp: v });
									say("Hello, this is my voice for your project.");
								},
								children: "Play"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									useStudio.setState({ vp: v });
									useStudio.getState().persist();
									useStudio.getState().flash(`Project voice: ${v.name}`);
								},
								children: "Use"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									useStudio.setState({ voices: voices.filter((_, idx) => idx !== i) });
									useStudio.getState().persist();
								},
								children: "Remove"
							})
						]
					}, `${v.name}-${i}`)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Record and transform" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-bar",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: async () => {
								if (rec.current) {
									rec.current.stop();
									return;
								}
								try {
									const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
									const chunks = [];
									const media = new MediaRecorder(stream);
									rec.current = media;
									media.ondataavailable = (e) => chunks.push(e.data);
									media.onstop = () => {
										stream.getTracks().forEach((t) => t.stop());
										setSample(URL.createObjectURL(new Blob(chunks, { type: media.mimeType })));
										rec.current = null;
									};
									media.start();
									useStudio.getState().flash("Recording… click again to stop");
								} catch {
									useStudio.getState().flash("Microphone access was denied");
								}
							},
							children: "Record sample"
						})
					}),
					sample && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
						controls: true,
						src: sample,
						style: { width: "100%" }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-chips",
						children: [
							["Deep", .8],
							["Natural", 1],
							["Bright", 1.2],
							["Chipmunk", 1.5]
						].map(([n, r]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-chip",
							onClick: () => void playShifted(sample, Number(r)),
							children: n
						}, String(n)))
					})] })
				]
			})]
		})
	});
}
function AgentsPanel() {
	const agents = useStudio((s) => s.agents);
	const agent = useStudio((s) => s.agent);
	const a = agents[agent];
	const [draft, setDraft] = (0, import_react.useState)("");
	const [engine, setEngine] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const box = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (box.current) box.current.scrollTop = box.current.scrollHeight;
	}, [a?.hist.length]);
	if (!a) return null;
	async function send(text) {
		const clean = text.trim();
		if (!clean || busy) return;
		const s = useStudio.getState();
		const current = s.agents[s.agent];
		const hist = [...current.hist, {
			role: "user",
			content: clean
		}];
		const agentsNext = s.agents.map((ag, i) => i === s.agent ? {
			...ag,
			hist
		} : ag);
		useStudio.setState({ agents: agentsNext });
		setDraft("");
		setBusy(true);
		const r = await studioChat({ data: {
			system: current.prompt + memoryBlock(s),
			messages: hist
		} });
		const done = [...hist, {
			role: "assistant",
			content: r.reply
		}].slice(-40);
		useStudio.setState({ agents: useStudio.getState().agents.map((ag, i) => i === s.agent ? {
			...ag,
			hist: done
		} : ag) });
		useStudio.getState().persist();
		setEngine(r.engine);
		setBusy(false);
		if (useStudio.getState().settings.neural || true) say(r.reply);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Agents",
		lede: "Give an agent a role, then talk by text or microphone. Replies are spoken on the stage.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							style: { flex: 1 },
							children: "Your agents"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								const next = [...agents, {
									name: "New agent",
									prompt: "You are a concise studio assistant.",
									hist: []
								}];
								useStudio.setState({
									agents: next,
									agent: next.length - 1
								});
								useStudio.getState().persist();
							},
							children: "New"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-chips",
						children: agents.map((ag, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `mf-chip ${i === agent ? "active" : ""}`,
							onClick: () => useStudio.setState({ agent: i }),
							children: ag.name
						}, ag.name + i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Name" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: a.name,
						onChange: (e) => {
							const name = e.target.value;
							useStudio.setState({ agents: agents.map((ag, i) => i === agent ? {
								...ag,
								name
							} : ag) });
						},
						onBlur: () => useStudio.getState().persist()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Role and instructions" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						style: { minHeight: 140 },
						value: a.prompt,
						onChange: (e) => {
							const prompt = e.target.value;
							useStudio.setState({ agents: agents.map((ag, i) => i === agent ? {
								...ag,
								prompt
							} : ag) });
						},
						onBlur: () => useStudio.getState().persist()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								useStudio.setState({ agents: agents.map((ag, i) => i === agent ? {
									...ag,
									hist: []
								} : ag) });
								useStudio.getState().persist();
							},
							children: "Clear chat"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								if (agents.length < 2) return useStudio.getState().flash("Keep at least one agent");
								useStudio.setState({
									agents: agents.filter((_, i) => i !== agent),
									agent: 0
								});
								useStudio.getState().persist();
							},
							children: "Delete"
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-msgs",
						ref: box,
						children: [a.hist.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `mf-msg ${m.role === "user" ? "user" : ""}`,
							children: m.content
						}, i)), busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mf-msg",
							children: "Thinking…"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: draft,
								placeholder: "Message…",
								style: { flex: 1 },
								onChange: (e) => setDraft(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") send(draft);
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: async () => {
									try {
										send(await listenOnce(useStudio.getState().settings.lang));
									} catch (e) {
										useStudio.getState().flash(e instanceof Error ? e.message : "Mic failed");
									}
								},
								children: "Mic"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-primary",
								onClick: () => void send(draft),
								children: "Send"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: engine ? `Engine: ${engine}` : canListen() ? "Mic ready" : "Type a message. This browser has no speech recognition." })
				]
			})]
		})
	});
}
function LivePanel() {
	const avatars = useStudio((s) => s.avatars);
	const avatar = useStudio((s) => s.avatar);
	const agents = useStudio((s) => s.agents);
	const liveOn = useStudio((s) => s.liveOn);
	const speaking = useStudio((s) => s.speaking);
	const mouth = useStudio((s) => s.mouth);
	const [lines, setLines] = (0, import_react.useState)([]);
	const [status, setStatus] = (0, import_react.useState)("Idle");
	const [which, setWhich] = (0, import_react.useState)(0);
	const [draft, setDraft] = (0, import_react.useState)("");
	const hist = (0, import_react.useRef)([]);
	const gen = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => () => {
		gen.current++;
		stopSpeaking();
		useStudio.setState({
			liveOn: false,
			speaking: false
		});
	}, []);
	async function reply(text) {
		const s = useStudio.getState();
		hist.current = [...hist.current, {
			role: "user",
			content: text
		}];
		setLines([...hist.current]);
		setStatus("Thinking…");
		const r = await studioChat({ data: {
			system: (s.agents[which] || s.agents[0]).prompt + memoryBlock(s),
			messages: hist.current
		} });
		hist.current = [...hist.current, {
			role: "assistant",
			content: r.reply
		}];
		setLines([...hist.current]);
		setStatus("Speaking…");
		await say(r.reply);
		setStatus(useStudio.getState().liveOn ? "Listening…" : "Idle");
	}
	async function loop(token) {
		while (token === gen.current && useStudio.getState().liveOn) {
			if (!canListen()) {
				setStatus("Type a message");
				return;
			}
			setStatus("Listening…");
			try {
				const heard = await listenOnce(useStudio.getState().settings.lang);
				if (token !== gen.current || !useStudio.getState().liveOn) return;
				await reply(heard);
			} catch {
				if (token !== gen.current || !useStudio.getState().liveOn) return;
				setStatus("Didn't catch that. Listening…");
			}
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Live Avatar",
		lede: "Hands-free listen, think, speak. The mouth tracks visemes and the live audio level.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				style: { justifyItems: "center" },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						className: "mf-round",
						alt: "",
						src: avatars[avatar]?.src,
						style: { transform: `scale(${1 + mouth * .06})` }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: speaking ? "Speaking" : status }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-primary",
							onClick: () => {
								gen.current++;
								useStudio.setState({ liveOn: true });
								setStatus("Listening…");
								loop(gen.current);
							},
							children: "Start live session"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								gen.current++;
								useStudio.setState({ liveOn: false });
								stopSpeaking();
								setStatus("Idle");
							},
							children: "End"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Agent" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: which,
						onChange: (e) => setWhich(Number(e.target.value)),
						children: agents.map((ag, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: i,
							children: ag.name
						}, ag.name + i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: liveOn ? "Session is live." : "Uses the microphone in Chrome or Edge, or type below." })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mf-msgs",
					children: lines.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `mf-msg ${m.role === "user" ? "user" : ""}`,
						children: m.content
					}, i))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft,
						placeholder: "Type to the avatar…",
						style: { flex: 1 },
						onChange: (e) => setDraft(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter" && draft.trim()) {
								const t = draft;
								setDraft("");
								reply(t);
							}
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => {
							if (!draft.trim()) return;
							const t = draft;
							setDraft("");
							reply(t);
						},
						children: "Send"
					})]
				})]
			})]
		})
	});
}
function ProjectsPanel() {
	const projects = useStudio((s) => s.projects);
	const pid = useStudio((s) => s.pid);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Projects",
		lede: "Everything you make is saved in this browser.",
		extra: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "mf-ghost",
			onClick: async () => {
				const f = await pickFile(".json,application/json");
				if (!f) return;
				try {
					const p = JSON.parse(await f.text());
					if (!p.scenes) throw new Error("bad");
					const item = {
						id: uid(),
						name: p.name || "Imported",
						t: Date.now(),
						scenes: p.scenes,
						avatar: 0,
						vp: null,
						scene: 0
					};
					useStudio.setState({ projects: [item, ...useStudio.getState().projects] });
					useStudio.getState().persist();
				} catch {
					useStudio.getState().flash("That file is not a MediaForge project");
				}
			},
			children: "Import"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "mf-primary",
			onClick: () => {
				const s = useStudio.getState();
				s.remember();
				const id = uid();
				useStudio.setState({
					pid: id,
					name: "Untitled project",
					scenes: [{
						title: "Opening",
						text: "Start your story here.",
						dur: 6,
						img: s.avatars[s.avatar].src
					}],
					scene: 0
				});
				s.persist();
				s.go("studio");
			},
			children: "New project"
		})] }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-grid cards",
			children: projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `mf-card ${p.id === pid ? "sel" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-thumb",
						style: {
							height: 110,
							backgroundImage: `url(${p.scenes[0]?.img || ""})`
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: p.name,
						onChange: (e) => {
							const name = e.target.value;
							useStudio.setState({
								projects: projects.map((x) => x.id === p.id ? {
									...x,
									name
								} : x),
								...p.id === pid ? { name } : {}
							});
						},
						onBlur: () => useStudio.getState().persist()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						p.scenes.length,
						" scenes · ",
						new Date(p.t).toLocaleString(),
						p.id === pid ? " · open" : ""
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-primary",
								onClick: () => {
									useStudio.setState({
										pid: p.id,
										name: p.name,
										scenes: p.scenes,
										avatar: p.avatar,
										vp: p.vp,
										scene: 0
									});
									useStudio.getState().persist();
									useStudio.getState().go("studio");
								},
								children: "Open"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									const copy = {
										...p,
										id: uid(),
										name: `${p.name} copy`,
										t: Date.now(),
										scenes: p.scenes.map((sc) => ({ ...sc }))
									};
									useStudio.setState({ projects: [copy, ...projects] });
									useStudio.getState().persist();
								},
								children: "Duplicate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									const blob = URL.createObjectURL(new Blob([JSON.stringify(p)], { type: "application/json" }));
									const a = document.createElement("a");
									a.href = blob;
									a.download = `${p.name}.mediaforge.json`;
									a.click();
								},
								children: "Export"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									if (p.id === pid) return useStudio.getState().flash("Open another project before deleting this one");
									useStudio.setState({ projects: projects.filter((x) => x.id !== p.id) });
									useStudio.getState().persist();
								},
								children: "Delete"
							})
						]
					})
				]
			}, p.id))
		})
	});
}
var TPL = [
	[
		"Product explainer",
		"Intro, problem, how it works, call to action",
		[
			"Meet {t}.",
			"Here is the problem it solves.",
			"It works in three simple steps.",
			"Try {t} today."
		]
	],
	[
		"Welcome and onboarding",
		"Greet new people and point to a first step",
		[
			"Welcome to {t}.",
			"Here is what you can do first.",
			"We are here whenever you need us."
		]
	],
	[
		"Course introduction",
		"Open a lesson with the outcome",
		[
			"Welcome to {t}.",
			"By the end, you will be able to apply it.",
			"Let us begin with the fundamentals."
		]
	],
	[
		"Sales outreach",
		"A short personal pitch",
		[
			"I wanted to share how {t} can help.",
			"Teams usually see a result within weeks.",
			"Can we find fifteen minutes this week?"
		]
	],
	[
		"Social short",
		"Vertical hook and payoff",
		[
			"Stop scrolling: {t} in twenty seconds.",
			"Here is the one thing that matters.",
			"Follow for the next one."
		],
		"9:16"
	],
	[
		"Company update",
		"A leadership note",
		[
			"A quick update on {t}.",
			"What we finished, and what is next.",
			"Thank you for the work you do."
		]
	]
];
function TemplatesPanel() {
	const [topic, setTopic] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		title: "Templates",
		lede: "Start from a structure. Scenes are filled in and opened on the stage.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-card",
			style: { marginBottom: 14 },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Topic, company, or product" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: topic,
				placeholder: "Acme hiring platform",
				onChange: (e) => setTopic(e.target.value)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-grid cards",
			children: TPL.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t[0] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t[1] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
						t[2].length,
						" scenes",
						t[3] ? ` · ${t[3]}` : ""
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-primary",
						onClick: () => {
							const s = useStudio.getState();
							const n = topic.trim() || "your topic";
							if (t[3] === "9:16") useStudio.setState({ settings: {
								...s.settings,
								aspect: "9:16"
							} });
							const av = s.avatars[s.avatar].src;
							s.setScenes(t[2].map((line, i) => ({
								title: [
									"Hook",
									"Body",
									"Detail",
									"Close"
								][i] || `Scene ${i + 1}`,
								text: line.replaceAll("{t}", n),
								dur: 6,
								img: i === 0 ? av : i % 2 ? BG_OFFICE : BG_LIBRARY
							})), `${t[0]}: ${n}`);
							s.go("studio");
						},
						children: "Use template"
					})
				]
			}, t[0]))
		})]
	});
}
function ScenesPanel() {
	const scenes = useStudio((s) => s.scenes);
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Scene editor",
		lede: "Edit every line. Changes show on the stage and in the next render.",
		extra: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "mf-ghost",
			onClick: () => {
				const s = useStudio.getState();
				s.remember();
				useStudio.setState({ scenes: [...s.scenes, {
					title: "New scene",
					text: "Describe what should happen here.",
					dur: 6,
					img: BG_OFFICE
				}] });
				s.persist();
			},
			children: "Add scene"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "mf-primary",
			disabled: busy,
			onClick: async () => {
				setBusy(true);
				const s = useStudio.getState();
				try {
					const out = await renderScenes(s.scenes, s.avatars[s.avatar].src, s.settings.aspect, Number(s.settings.res), Number(s.settings.fps), s.brand, (p) => useStudio.setState({ progress: `Rendering ${Math.round(p * 100)}%` }));
					useStudio.setState({
						lastVideo: out,
						progress: ""
					});
					s.go("video");
				} catch (e) {
					s.flash(e instanceof Error ? e.message : "Render failed");
				}
				setBusy(false);
			},
			children: "Render video"
		})] }),
		children: scenes.map((sc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-card",
			style: { marginBottom: 10 },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mf-thumb",
					style: { backgroundImage: `url(${sc.img})` }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-grid two",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: sc.title,
						onChange: (e) => useStudio.getState().updateScene(i, { title: e.target.value })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: 2,
						max: 60,
						value: sc.dur,
						onChange: (e) => useStudio.getState().updateScene(i, { dur: Math.max(2, Number(e.target.value) || 6) })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: sc.text,
					onChange: (e) => useStudio.getState().updateScene(i, { text: e.target.value })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								if (i === 0) return;
								const next = [...scenes];
								[next[i - 1], next[i]] = [next[i], next[i - 1]];
								useStudio.getState().remember();
								useStudio.setState({ scenes: next });
								useStudio.getState().persist();
							},
							children: "Up"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								if (i >= scenes.length - 1) return;
								const next = [...scenes];
								[next[i + 1], next[i]] = [next[i], next[i + 1]];
								useStudio.getState().remember();
								useStudio.setState({ scenes: next });
								useStudio.getState().persist();
							},
							children: "Down"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								const next = [...scenes];
								next.splice(i + 1, 0, {
									...sc,
									title: `${sc.title} copy`
								});
								useStudio.getState().remember();
								useStudio.setState({ scenes: next });
								useStudio.getState().persist();
							},
							children: "Duplicate"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: async () => {
								const f = await pickFile("image/*");
								if (!f) return;
								const img = await shrinkFile(f, 1400);
								useStudio.getState().updateScene(i, { img });
							},
							children: "Background"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => useStudio.getState().updateScene(i, { img: i ? BG_OFFICE : useStudio.getState().avatars[useStudio.getState().avatar].src }),
							children: "Default background"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => void say(sc.text),
							children: "Hear"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => {
								if (scenes.length < 2) return useStudio.getState().flash("A project needs at least one scene");
								useStudio.getState().remember();
								useStudio.setState({
									scenes: scenes.filter((_, idx) => idx !== i),
									scene: 0
								});
								useStudio.getState().persist();
							},
							children: "Delete"
						})
					]
				})
			]
		}, `${sc.title}-${i}`))
	});
}
function BrandPanel() {
	const brand = useStudio((s) => s.brand);
	const name = useStudio((s) => s.name);
	function setBrand(patch) {
		useStudio.setState({ brand: {
			...useStudio.getState().brand,
			...patch
		} });
		useStudio.getState().persist();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Brand kit",
		lede: "Colour, type, tagline, and logo land on the stage and inside every render.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-grid two",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "color",
							value: brand.c1,
							onChange: (e) => setBrand({ c1: e.target.value })
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "color",
							value: brand.c2,
							onChange: (e) => setBrand({ c2: e.target.value })
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Font" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: brand.font,
						onChange: (e) => setBrand({ font: e.target.value }),
						children: [
							"Manrope",
							"DM Sans",
							"Georgia",
							"Trebuchet MS"
						].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: f }, f))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Tagline" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: brand.tag,
						onChange: (e) => setBrand({ tag: e.target.value })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: async () => {
								const f = await pickFile("image/*");
								if (!f) return;
								if (f.size > 6e5) return useStudio.getState().flash("Logo must be under 600 KB");
								const reader = new FileReader();
								reader.onload = () => setBrand({ logo: String(reader.result) });
								reader.readAsDataURL(f);
							},
							children: "Upload logo"
						}), brand.logo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "mf-ghost",
							onClick: () => setBrand({ logo: "" }),
							children: "Remove logo"
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Preview" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-stage",
					style: {
						backgroundImage: `url(${BG_OFFICE})`,
						backgroundSize: "cover"
					},
					children: [brand.logo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						className: "mf-logo",
						alt: "",
						src: brand.logo
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-caption",
						style: {
							borderTop: `3px solid ${brand.c2}`,
							color: brand.c1,
							fontFamily: brand.font
						},
						children: brand.tag || name
					})]
				})]
			})]
		})
	});
}
function DirectorPanel() {
	const [prompt, setPrompt] = (0, import_react.useState)("");
	const [tone, setTone] = (0, import_react.useState)("Professional");
	const [count, setCount] = (0, import_react.useState)(4);
	const [renderToo, setRenderToo] = (0, import_react.useState)(true);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const log = useStudio((s) => s.log);
	const last = useStudio((s) => s.lastVideo);
	const progress = useStudio((s) => s.progress);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "AI Director",
		lede: "One prompt writes the script, casts the presenter, applies the brand, and can render the cut.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						style: { minHeight: 130 },
						value: prompt,
						placeholder: "A 30-second welcome for new engineers. Warm, confident, no jargon.",
						onChange: (e) => setPrompt(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-grid two",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Tone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: tone,
							onChange: (e) => setTone(e.target.value),
							children: [
								"Professional",
								"Friendly",
								"Energetic"
							].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: t }, t))
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Scenes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: count,
							onChange: (e) => setCount(Number(e.target.value)),
							children: [
								3,
								4,
								5,
								6
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: n }, n))
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mf-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Render when the script is ready" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: renderToo,
							onChange: (e) => setRenderToo(e.target.checked)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-primary",
						disabled: busy,
						onClick: async () => {
							if (!prompt.trim()) return useStudio.getState().flash("Describe the video first");
							setBusy(true);
							const s = useStudio.getState();
							const push = (line) => useStudio.setState({ log: [...useStudio.getState().log, line] });
							useStudio.setState({ log: [] });
							try {
								push("1. Reading the brief.");
								const r = await studioScript({ data: {
									topic: `${prompt}. Tone: ${tone}.${memoryBlock(s)}`,
									scenes: count,
									kind: "avatar video"
								} });
								push(`2. Script from the ${r.engine} engine, ${r.scenes.length} scenes.`);
								const lower = prompt.toLowerCase();
								let avatar = s.avatar;
								if (/\b(he|him|his|man)\b/.test(lower)) avatar = 3;
								if (/\b(she|her|woman)\b/.test(lower)) avatar = 0;
								push(`3. Presenter: ${s.avatars[avatar]?.name || "Maya"}.`);
								push(`4. Voice: ${s.vp?.neural || s.vp?.voice || "studio default"} (${s.settings.lang}).`);
								push(`5. Brand: ${s.brand.c2}, ${s.brand.font}.`);
								const av = s.avatars[avatar].src;
								s.setScenes(r.scenes.map((sc, i) => ({
									title: [
										"Opening",
										"Context",
										"Insight",
										"Detail",
										"Proof",
										"Closing"
									][i] || `Scene ${i + 1}`,
									text: sc.text,
									dur: 6,
									img: i ? i % 2 ? BG_OFFICE : BG_LIBRARY : av
								})), prompt.slice(0, 40));
								useStudio.setState({ avatar });
								push("6. Scenes saved to the project.");
								if (renderToo) {
									push("7. Rendering the picture cut…");
									const now = useStudio.getState();
									const out = await renderScenes(now.scenes, now.avatars[now.avatar].src, now.settings.aspect, Number(now.settings.res), Number(now.settings.fps), now.brand, (p) => useStudio.setState({ progress: `Rendering ${Math.round(p * 100)}%` }));
									useStudio.setState({
										lastVideo: out,
										progress: ""
									});
									push("Done.");
								}
							} catch (e) {
								push(e instanceof Error ? e.message : "Stopped");
							}
							setBusy(false);
						},
						children: "Direct"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: progress })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Production log" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-log",
						children: log.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: line }, i))
					}),
					last && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						controls: true,
						src: last.url
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "mf-primary",
						href: last.url,
						download: "mediaforge-director.webm",
						children: "Download .webm"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => useStudio.getState().go("studio"),
						children: "Open in Studio"
					})
				]
			})]
		})
	});
}
function MemoryPanel() {
	const mem = useStudio((s) => s.mem);
	const on = useStudio((s) => s.settings.mem);
	const [text, setText] = (0, import_react.useState)("");
	const [q, setQ] = (0, import_react.useState)("");
	const shown = mem.filter((m) => m.t.toLowerCase().includes(q.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		title: "Project memory",
		lede: "Facts here are added to agents, live sessions, scripts, and the Director.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				style: { marginBottom: 12 },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: text,
						placeholder: "Our audience is senior operators. Keep the tone formal.",
						style: { flex: 1 },
						onChange: (e) => setText(e.target.value)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-primary",
						onClick: () => {
							if (!text.trim()) return;
							useStudio.setState({ mem: [{
								t: text.trim(),
								d: Date.now()
							}, ...mem] });
							setText("");
							useStudio.getState().persist();
						},
						children: "Remember"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mf-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Use memory in AI features" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: on,
						onChange: (e) => {
							const settings = {
								...useStudio.getState().settings,
								mem: e.target.checked
							};
							useStudio.setState({ settings });
							useStudio.getState().persist();
						}
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: q,
				placeholder: "Search memory…",
				onChange: (e) => setQ(e.target.value),
				style: { marginBottom: 12 }
			}),
			shown.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "No memories yet." }),
			shown.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				style: { marginBottom: 8 },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					style: { minHeight: 54 },
					value: m.t,
					onChange: (e) => {
						useStudio.setState({ mem: mem.map((x) => x === m ? {
							...x,
							t: e.target.value
						} : x) });
					},
					onBlur: () => useStudio.getState().persist()
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: new Date(m.d).toLocaleDateString() }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => {
							useStudio.setState({ mem: mem.filter((x) => x !== m) });
							useStudio.getState().persist();
						},
						children: "Delete"
					})]
				})]
			}, m.d + m.t))
		]
	});
}
function DesignPanel() {
	const html = useStudio((s) => s.designHtml);
	const [prompt, setPrompt] = (0, import_react.useState)("A calm landing page for an executive coaching practice");
	const [kind, setKind] = (0, import_react.useState)("landing");
	const [ref, setRef] = (0, import_react.useState)(REFERENCES[0]?.id || "");
	const [change, setChange] = (0, import_react.useState)("");
	const [mode, setMode] = (0, import_react.useState)("preview");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [note, setNote] = (0, import_react.useState)("");
	const chosen = REFERENCES.find((r) => r.id === ref) || REFERENCES[0];
	async function run(edit) {
		setBusy(true);
		setNote("");
		const r = await studioDesign({ data: {
			prompt,
			kind,
			reference: ref,
			previous: edit ? useStudio.getState().designHtml : "",
			change: edit || ""
		} });
		useStudio.setState({ designHtml: r.html });
		setNote(`${r.engine} · ${chosen?.name || "reference"}`);
		setMode("preview");
		setBusy(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "DesignForge",
		lede: "Generate a full page in the visual language of a reference system. Preview, copy, or download the HTML.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Brief" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						style: { minHeight: 110 },
						value: prompt,
						onChange: (e) => setPrompt(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Type" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: kind,
						onChange: (e) => setKind(e.target.value),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "landing",
								children: "Landing page"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "dashboard",
								children: "Dashboard"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "poster",
								children: "Poster"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Reference style (",
						REFERENCES.length,
						")"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: ref,
						onChange: (e) => setRef(e.target.value),
						children: REFERENCES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: r.id,
							children: r.name.slice(0, 64)
						}, r.id))
					}),
					chosen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-swatch",
						"aria-hidden": true,
						children: chosen.palette.slice(0, 6).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: c } }, c))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-primary",
						disabled: busy,
						onClick: () => void run(),
						children: busy ? "Designing…" : "Generate site"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Refine" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: change,
						placeholder: "Make the hero shorter…",
						onChange: (e) => setChange(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						disabled: busy || !html,
						onClick: () => void run(change || "Tighten the layout"),
						children: "Apply change"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: note })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `mf-chip ${mode === "preview" ? "active" : ""}`,
								onClick: () => setMode("preview"),
								children: "Preview"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `mf-chip ${mode === "code" ? "active" : ""}`,
								onClick: () => setMode("code"),
								children: "Code"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									if (!html) return;
									const a = document.createElement("a");
									a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
									a.download = "mediaforge-site.html";
									a.click();
								},
								children: "Download"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									if (!html) return;
									navigator.clipboard.writeText(html);
									useStudio.getState().flash("Code copied");
								},
								children: "Copy"
							})
						]
					}),
					!html && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Describe a site and generate it. A local template answers immediately if the model is quiet." }),
					html && mode === "preview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						className: "mf-frame",
						sandbox: "allow-scripts",
						title: "Design preview",
						srcDoc: html
					}),
					html && mode === "code" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						style: {
							maxHeight: 520,
							overflow: "auto",
							whiteSpace: "pre-wrap",
							fontSize: 11
						},
						children: html
					})
				]
			})]
		})
	});
}
function IntegrationsPanel() {
	const engine = useStudio((s) => s.engine);
	const gpu = useStudio((s) => s.gpu);
	const [health, setHealth] = (0, import_react.useState)(engine);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Integrations",
		lede: "What is actually connected. Keys stay on the server. Nothing is typed into the browser.",
		extra: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "mf-ghost",
			onClick: async () => {
				const h = await studioHealth();
				const label = h.engine === "grok" ? `grok · ${h.model}` : "local engine";
				setHealth(label);
				useStudio.setState({ engine: label });
			},
			children: "Re-check"
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-grid cards",
			children: [
				[
					"Text, script, DesignForge",
					health,
					"User-initiated. Short replies. Local script if the model is unavailable."
				],
				[
					"Photoreal images",
					health.includes("grok") ? "Ready when you press Photoreal" : "WebGPU art only",
					"Images tab. One image per click."
				],
				[
					"Neural voice",
					health.includes("grok") ? "Eve, Ara, Leo, Rex, Sal" : "Browser speech only",
					"Voice and Live Avatar. Falls back to the system voice."
				],
				[
					"WebGPU compositor",
					gpu,
					"Generative art shader. Canvas fallback if the GPU is blocked."
				],
				[
					"Lip sync",
					"On device",
					"Visemes from the line plus live audio level. No cloud face model."
				],
				[
					"Storyboard render",
					"MediaRecorder",
					"WebM picture track from the scenes, brand, and presenter."
				]
			].map(([name, state, note]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { color: "var(--color-good)" },
						children: state
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: note })
				]
			}, name))
		})
	});
}
function SettingsPanel() {
	const settings = useStudio((s) => s.settings);
	const [arm, setArm] = (0, import_react.useState)(false);
	function patch(p) {
		useStudio.setState({ settings: {
			...useStudio.getState().settings,
			...p
		} });
		useStudio.getState().persist();
		useStudio.getState().flash("Saved");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Page, {
		title: "Settings",
		lede: "Aspect, quality, language, and a full backup of this browser's studio.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-grid two",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Aspect ratio" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: settings.aspect,
						onChange: (e) => patch({ aspect: e.target.value }),
						children: [
							"16:9",
							"9:16",
							"1:1"
						].map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: a }, a))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Render quality (short side)" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: settings.res,
						onChange: (e) => patch({ res: e.target.value }),
						children: [
							"480",
							"720",
							"1080"
						].map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: a }, a))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Frame rate" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: settings.fps,
						onChange: (e) => patch({ fps: e.target.value }),
						children: [
							"24",
							"30",
							"60"
						].map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: a }, a))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Speech language" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: settings.lang,
						onChange: (e) => patch({ lang: e.target.value }),
						children: [
							"en-US",
							"en-GB",
							"en-IN",
							"hi-IN",
							"tr-TR",
							"es-ES",
							"fr-FR",
							"de-DE"
						].map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: a }, a))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mf-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Neural voice when speaking" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: settings.neural,
							onChange: (e) => patch({ neural: e.target.checked })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mf-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Include memory in prompts" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: settings.mem,
							onChange: (e) => patch({ mem: e.target.checked })
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Your data" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Projects, avatars, voices, agents, and memory stay in this browser." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									useStudio.getState().persist();
									const raw = localStorage.getItem("mediaforge-v5") || "{}";
									const a = document.createElement("a");
									a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
									a.download = "mediaforge-backup.json";
									a.click();
								},
								children: "Export everything"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: async () => {
									const f = await pickFile(".json,application/json");
									if (!f) return;
									try {
										if (!JSON.parse(await f.text()).settings) throw new Error("bad");
										localStorage.setItem("mediaforge-v5", await f.text());
										location.reload();
									} catch {
										useStudio.getState().flash("Not a MediaForge backup");
									}
								},
								children: "Import backup"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost",
								onClick: () => {
									if (!arm) {
										setArm(true);
										return;
									}
									localStorage.removeItem("mediaforge-v5");
									location.reload();
								},
								children: arm ? "Confirm reset" : "Reset all data"
							})
						]
					})
				]
			})]
		})
	});
}
function SearchPanel() {
	const q = useStudio((s) => s.query).toLowerCase();
	const s = useStudio();
	const rows = [];
	s.projects.forEach((p) => p.name.toLowerCase().includes(q) && rows.push([
		"Project",
		p.name,
		"projects"
	]));
	s.scenes.forEach((sc) => `${sc.title} ${sc.text}`.toLowerCase().includes(q) && rows.push([
		"Scene",
		`${sc.title}: ${sc.text}`,
		"scenes"
	]));
	s.mem.forEach((m) => m.t.toLowerCase().includes(q) && rows.push([
		"Memory",
		m.t,
		"memory"
	]));
	s.avatars.forEach((a) => a.name.toLowerCase().includes(q) && rows.push([
		"Avatar",
		a.name,
		"avatars"
	]));
	s.agents.forEach((a) => a.name.toLowerCase().includes(q) && rows.push([
		"Agent",
		a.name,
		"agents"
	]));
	s.voices.forEach((v) => v.name.toLowerCase().includes(q) && rows.push([
		"Voice",
		v.name,
		"voice"
	]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		title: "Search",
		lede: `${rows.length} result${rows.length === 1 ? "" : "s"} for “${s.query}”`,
		children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Nothing matched." }), rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-card",
			style: { marginBottom: 8 },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-bar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						style: { width: 72 },
						children: r[0]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { flex: 1 },
						children: r[1].slice(0, 140)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => s.go(r[2]),
						children: "Open"
					})
				]
			})
		}, i))]
	});
}
var PANELS = {
	avatars: AvatarsPanel,
	video: VideoPanel,
	images: ImagesPanel,
	voice: VoicePanel,
	agents: AgentsPanel,
	live: LivePanel,
	projects: ProjectsPanel,
	templates: TemplatesPanel,
	scenes: ScenesPanel,
	brand: BrandPanel,
	director: DirectorPanel,
	memory: MemoryPanel,
	design: DesignPanel,
	integrations: IntegrationsPanel,
	settings: SettingsPanel,
	search: SearchPanel
};
var NAV = [
	{
		id: "studio",
		label: "Studio",
		icon: Video,
		group: "Create"
	},
	{
		id: "avatars",
		label: "Avatars",
		icon: UserRound,
		group: "Create"
	},
	{
		id: "video",
		label: "Video",
		icon: Clapperboard,
		group: "Create"
	},
	{
		id: "images",
		label: "Images",
		icon: Image$1,
		group: "Create"
	},
	{
		id: "voice",
		label: "Voice",
		icon: AudioLines,
		group: "Create"
	},
	{
		id: "agents",
		label: "Agents",
		icon: Bot,
		group: "Create"
	},
	{
		id: "live",
		label: "Live Avatar",
		icon: Radio,
		group: "Create"
	},
	{
		id: "projects",
		label: "Projects",
		icon: FolderKanban,
		group: "Workspace"
	},
	{
		id: "templates",
		label: "Templates",
		icon: LayoutTemplate,
		group: "Workspace"
	},
	{
		id: "scenes",
		label: "Scenes",
		icon: Clapperboard,
		group: "Workspace"
	},
	{
		id: "brand",
		label: "Brand Kit",
		icon: Palette,
		group: "Workspace"
	},
	{
		id: "director",
		label: "AI Director",
		icon: Sparkles,
		group: "Intelligence"
	},
	{
		id: "memory",
		label: "Memory",
		icon: Brain,
		group: "Intelligence"
	},
	{
		id: "design",
		label: "DesignForge",
		icon: PenTool,
		group: "Intelligence"
	},
	{
		id: "integrations",
		label: "Integrations",
		icon: Plug,
		group: "System"
	},
	{
		id: "settings",
		label: "Settings",
		icon: Settings,
		group: "System"
	}
];
function clock(scenes) {
	const d = scenes.reduce((a, s) => a + s.dur, 0);
	return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}
function StudioApp() {
	const view = useStudio((s) => s.view);
	const toast = useStudio((s) => s.toast);
	const scriptOpen = useStudio((s) => s.scriptOpen);
	const moreOpen = useStudio((s) => s.moreOpen);
	const name = useStudio((s) => s.name);
	const scenes = useStudio((s) => s.scenes);
	const hydrated = useStudio((s) => s.hydrated);
	(0, import_react.useEffect)(() => {
		useStudio.getState().hydrate();
		(async () => {
			try {
				const h = await studioHealth();
				useStudio.setState({ engine: h.engine === "grok" ? `grok · ${h.model}` : "local engine" });
			} catch {
				useStudio.setState({ engine: "local engine" });
			}
			if (!navigator.gpu) {
				useStudio.setState({ gpu: "canvas 2d" });
				return;
			}
			const adapter = await navigator.gpu.requestAdapter().catch(() => null);
			useStudio.setState({ gpu: adapter ? "webgpu" : "canvas 2d" });
		})();
		const id = window.setInterval(() => useStudio.getState().persist(), 8e3);
		return () => window.clearInterval(id);
	}, []);
	const Panel = view !== "studio" ? PANELS[view] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mf",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mf-top",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-brand",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mf-mark",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
						}), "MediaForge"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-crumbs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Projects" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "›" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: name }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "›" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: NAV.find((n) => n.id === view)?.label || "Studio" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mf-search",
						onSubmit: (e) => {
							e.preventDefault();
							const q = new FormData(e.currentTarget).get("q");
							if (typeof q === "string" && q.trim()) {
								useStudio.setState({ query: q.trim() });
								useStudio.getState().go("search");
							}
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { size: 14 }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "q",
							placeholder: "Search projects, avatars, scenes…",
							"aria-label": "Search"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-actions",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mf-save",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: hydrated ? "Saved in this browser" : "Opening studio" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-icon",
								"aria-label": "Undo",
								onClick: () => useStudio.getState().undo(),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { size: 16 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-icon",
								"aria-label": "Redo",
								onClick: () => useStudio.getState().redo(),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Redo2, { size: 16 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-ghost mf-hide-sm",
								onClick: () => void previewLine(),
								children: "Preview"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "mf-primary",
								onClick: () => void publish(),
								children: "Publish"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `mf-body ${view === "studio" ? "is-studio" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "mf-side",
						children: [[
							"Create",
							"Workspace",
							"Intelligence",
							"System"
						].map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mf-navlabel",
							children: group
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "mf-nav",
							children: NAV.filter((n) => n.group === group).map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: view === n.id ? "active" : "",
								onClick: () => useStudio.getState().go(n.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(n.icon, { size: 16 }), n.label]
							}, n.id))
						})] }, group)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mf-mini",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Current project" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										marginTop: 4
									},
									children: name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
									scenes.length,
									" scenes · ",
									clock(scenes)
								] })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
						className: "mf-main",
						children: view === "studio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioCenter, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, {})] }) : Panel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {})
					}),
					view === "studio" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: "mf-right",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inspector, {})
					})
				]
			}),
			view === "studio" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-mobile-ins",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inspector, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "mf-dock",
				children: [[
					[
						"studio",
						"Studio",
						Video
					],
					[
						"avatars",
						"Avatars",
						UserRound
					],
					[
						"video",
						"Video",
						Clapperboard
					],
					[
						"voice",
						"Voice",
						Mic
					]
				].map(([id, label, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: view === id ? "active" : "",
					onClick: () => useStudio.getState().go(id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 18 }), label]
				}, id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: moreOpen ? "active" : "",
					onClick: () => useStudio.setState({ moreOpen: !moreOpen }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { size: 18 }), "More"]
				})]
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-toast",
				children: toast
			}),
			scriptOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScriptModal, {}),
			moreOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-modal",
				onClick: () => useStudio.setState({ moreOpen: false }),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-modal-card",
					onClick: (e) => e.stopPropagation(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-head",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Workspaces" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-more",
						children: NAV.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `mf-ghost ${view === n.id ? "mf-primary" : ""}`,
							onClick: () => useStudio.getState().go(n.id),
							children: n.label
						}, n.id))
					})]
				})
			})
		]
	});
}
async function previewLine() {
	const s = useStudio.getState();
	const text = s.scenes[s.scene]?.text || "";
	useStudio.setState({ speaking: true });
	try {
		await speakLine({
			text,
			lang: s.settings.lang,
			rate: s.vp?.rate || .96,
			pitch: s.vp?.pitch || 1,
			voiceName: s.vp?.voice,
			neural: s.settings.neural,
			neuralId: s.vp?.neural || "eve",
			onMouth: (mouth) => useStudio.setState({ mouth: s.perf.lipsync ? mouth : .04 })
		});
	} catch (e) {
		s.flash(e instanceof Error ? e.message : "Could not speak");
	}
	useStudio.setState({
		speaking: false,
		mouth: .04
	});
}
async function publish() {
	const s = useStudio.getState();
	s.flash("Rendering your video…");
	try {
		const out = await renderScenes(s.scenes, s.avatars[s.avatar].src, s.settings.aspect, Number(s.settings.res), Number(s.settings.fps), s.brand, (p) => useStudio.setState({ progress: `Rendering ${Math.round(p * 100)}%` }));
		useStudio.setState({
			lastVideo: out,
			progress: ""
		});
		s.go("video");
	} catch (e) {
		s.flash(e instanceof Error ? e.message : "Render failed");
	}
}
function StudioCenter() {
	const name = useStudio((s) => s.name);
	const scenes = useStudio((s) => s.scenes);
	const scene = useStudio((s) => s.scene);
	const perf = useStudio((s) => s.perf);
	const brand = useStudio((s) => s.brand);
	const speaking = useStudio((s) => s.speaking);
	const settings = useStudio((s) => s.settings);
	const engine = useStudio((s) => s.engine);
	const sc = scenes[scene];
	const bg = sc?.img && !sc.img.startsWith("data:") && BG_MAP[perf.bg] && sc.img === useStudio.getState().avatars[useStudio.getState().avatar]?.src ? BG_MAP[perf.bg] : sc?.img || BG_MAP[perf.bg] || "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mf-canvas",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-head",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: sc?.title || "New asset" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				name,
				" · ",
				perf.bg.toLowerCase(),
				" · ",
				settings.aspect
			] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-status",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					speaking ? "Speaking" : "Live preview",
					" · ",
					engine
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-stage-wrap",
			style: settings.aspect === "16:9" ? void 0 : {
				maxWidth: settings.aspect === "9:16" ? 420 : 640,
				margin: "0 auto"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-stage-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Scene ",
					String(scene + 1).padStart(2, "0"),
					" / ",
					String(scenes.length).padStart(2, "0")
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-stage-tools",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							const order = [
								"16:9",
								"9:16",
								"1:1"
							];
							const i = order.indexOf(settings.aspect);
							useStudio.setState({ settings: {
								...settings,
								aspect: order[(i + 1) % order.length]
							} });
							useStudio.getState().persist();
						},
						children: settings.aspect
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							document.querySelector(".mf-stage")?.requestFullscreen?.();
						},
						children: "Expand"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-stage",
				style: { aspectRatio: settings.aspect.replace(":", " / ") },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						className: "bg",
						alt: "",
						src: BG_MAP[perf.bg] && sc?.img === useStudio.getState().avatars[useStudio.getState().avatar]?.src ? BG_MAP[perf.bg] : bg
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mf-shade" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presenter, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mf-eye",
								children: (brand.tag || name).toUpperCase()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								style: { fontFamily: brand.font },
								children: name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								perf.expression,
								" · ",
								perf.preset
							] })
						]
					}),
					brand.logo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						className: "mf-logo",
						alt: "",
						src: brand.logo
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-caption",
						style: {
							borderBottom: `3px solid ${brand.c2}`,
							color: brand.c1
						},
						children: sc?.text
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mf-live",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: speaking ? "Speaking" : "Ready" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `mf-wave ${speaking ? "on" : ""}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {})
								]
							})
						]
					})
				]
			})]
		})]
	});
}
function Presenter() {
	const ref = (0, import_react.useRef)(null);
	const img = (0, import_react.useRef)(null);
	const avatar = useStudio((s) => s.avatar);
	const avatars = useStudio((s) => s.avatars);
	const framing = useStudio((s) => s.perf.framing);
	const camera = useStudio((s) => s.perf.camera);
	useStudio((s) => s.mouth);
	const src = avatars[avatar]?.src || avatars[0].src;
	(0, import_react.useEffect)(() => {
		let dead = false;
		img.current = null;
		loadImage(src).then((im) => {
			if (!dead) img.current = im;
		}).catch(() => {
			const im = new Image();
			im.onload = () => {
				if (!dead) img.current = im;
			};
			im.src = src;
		});
		return () => {
			dead = true;
		};
	}, [src]);
	(0, import_react.useEffect)(() => {
		const c = ref.current;
		if (!c) return;
		let raf = 0;
		const draw = () => {
			const ctx = c.getContext("2d");
			const s = useStudio.getState();
			if (ctx) drawTalking(ctx, img.current, c.width, c.height, s.mouth, s.speaking ? 1 : .2);
			raf = requestAnimationFrame(draw);
		};
		raf = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(raf);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `mf-presenter ${framing === "Left" ? "left" : framing === "Right" ? "right" : ""} ${camera === "Close" ? "close" : ""}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref,
			width: 480,
			height: 700
		})
	});
}
function Timeline() {
	const scenes = useStudio((s) => s.scenes);
	const scene = useStudio((s) => s.scene);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mf-timeline",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-tl-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Storyboard · ", clock(scenes)] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-tl-actions",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							const s = useStudio.getState();
							s.remember();
							const img = s.avatars[s.avatar].src;
							useStudio.setState({
								scenes: [...s.scenes, {
									title: "New scene",
									text: "Describe what should happen in this scene.",
									dur: 6,
									img
								}],
								scene: s.scenes.length
							});
							s.persist();
							s.flash("Scene added");
						},
						children: "+ Scene"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							const s = useStudio.getState();
							s.remember();
							const cur = s.scenes[s.scene];
							const next = [...s.scenes];
							next.splice(s.scene + 1, 0, {
								title: "Continuation",
								text: "A natural continuation of the previous scene.",
								dur: 6,
								img: cur.img
							});
							useStudio.setState({
								scenes: next,
								scene: s.scene + 1
							});
							s.persist();
							s.flash("Scene extended");
						},
						children: "Extend"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => useStudio.setState({ scriptOpen: true }),
						children: "Generate script"
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-tracks",
			children: scenes.map((sc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: `mf-scene ${i === scene ? "active" : ""}`,
				onClick: () => useStudio.setState({ scene: i }),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mf-thumb",
						style: { backgroundImage: `url(${sc.img})` }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: sc.title }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: sc.text })
				]
			}, `${sc.title}-${i}`))
		})]
	});
}
function Inspector() {
	const tab = useStudio((s) => s.tab);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mf-ins-tabs",
		children: [
			"identity",
			"voice",
			"performance",
			"advanced"
		].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: tab === t ? "active" : "",
			onClick: () => useStudio.getState().setTab(t),
			children: t[0].toUpperCase() + t.slice(1)
		}, t))
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mf-ins",
		children: tab === "identity" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Identity, {}) : tab === "voice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceTab, {}) : tab === "performance" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Performance, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Advanced, {})
	})] });
}
function Identity() {
	const avatars = useStudio((s) => s.avatars);
	const avatar = useStudio((s) => s.avatar);
	const perf = useStudio((s) => s.perf);
	const scene = useStudio((s) => s.scene);
	const text = useStudio((s) => s.scenes[s.scene]?.text || "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mf-section",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Avatar variants ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: avatars.length })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-portraits",
				children: avatars.slice(0, 6).map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: `mf-portrait ${i === avatar ? "active" : ""}`,
					onClick: () => {
						useStudio.getState().remember();
						useStudio.setState({ avatar: i });
						useStudio.getState().persist();
						useStudio.getState().flash("Presenter updated");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: p.src,
						alt: ""
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.name })]
				}, p.name))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mf-section",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Appearance ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Presenter" })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Camera" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mf-chips",
					children: [
						"Eye-level",
						"Close",
						"Medium"
					].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `mf-chip ${perf.camera === c ? "active" : ""}`,
						onClick: () => useStudio.setState({ perf: {
							...perf,
							camera: c
						} }),
						children: c
					}, c))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Framing" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mf-chips",
					children: [
						"Center",
						"Left",
						"Right"
					].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `mf-chip ${perf.framing === c ? "active" : ""}`,
						onClick: () => useStudio.setState({ perf: {
							...perf,
							framing: c
						} }),
						children: c
					}, c))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Background" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: perf.bg,
					onChange: (e) => {
						const bg = e.target.value;
						const s = useStudio.getState();
						const img = BG_MAP[bg] || "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80";
						s.updateScene(s.scene, { img });
						useStudio.setState({ perf: {
							...s.perf,
							bg
						} });
						s.flash(`${bg} selected`);
					},
					children: Object.keys(BG_MAP).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: b }, b))
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mf-section",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Script ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Scene ", scene + 1] })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Spoken text" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: text,
					onChange: (e) => useStudio.getState().updateScene(useStudio.getState().scene, { text: e.target.value })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "mf-primary mf-full",
					onClick: () => void previewLine(),
					children: "Update live preview"
				})
			]
		})
	] });
}
function VoiceTab() {
	const vp = useStudio((s) => s.vp);
	const settings = useStudio((s) => s.settings);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mf-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Voice ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: settings.lang })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: vp?.name || "Warm professional" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [vp?.neural || "eve", " · neural when enabled"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-primary",
						onClick: () => void previewLine(),
						children: "Play line"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => useStudio.getState().go("voice"),
						children: "Open Voice lab"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mf-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Neural voice" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `mf-toggle ${settings.neural ? "on" : ""}`,
					onClick: () => {
						useStudio.setState({ settings: {
							...settings,
							neural: !settings.neural
						} });
						useStudio.getState().persist();
					},
					"aria-label": "Toggle neural voice",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				})]
			})
		]
	});
}
function Performance() {
	const perf = useStudio((s) => s.perf);
	function patch(p) {
		useStudio.setState({ perf: {
			...useStudio.getState().perf,
			...p
		} });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mf-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Expression ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live" })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mf-chips",
				children: [
					"Neutral",
					"Warm",
					"Confident",
					"Energetic",
					"Serious"
				].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `mf-chip ${perf.expression === x ? "active" : ""}`,
					onClick: () => {
						patch({ expression: x });
						useStudio.getState().flash(`${x} performance`);
					},
					children: x
				}, x))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Energy" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-range",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 0,
					max: 100,
					value: perf.energy,
					onChange: (e) => patch({ energy: Number(e.target.value) })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("output", { children: perf.energy })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Gesture" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mf-range",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 0,
					max: 100,
					value: perf.gesture,
					onChange: (e) => patch({ gesture: Number(e.target.value) })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("output", { children: perf.gesture })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mf-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Lip sync" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `mf-toggle ${perf.lipsync ? "on" : ""}`,
					onClick: () => patch({ lipsync: !perf.lipsync }),
					"aria-label": "Toggle lip sync",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				})]
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mf-section",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Performance preset ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Premium" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mf-chips",
			children: [
				"Executive",
				"Educator",
				"Creator",
				"Advisor"
			].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: `mf-chip ${perf.preset === x ? "active" : ""}`,
				onClick: () => patch({ preset: x }),
				children: x
			}, x))
		})]
	})] });
}
function Advanced() {
	const settings = useStudio((s) => s.settings);
	const perf = useStudio((s) => s.perf);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mf-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Render ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: useStudio.getState().gpu })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Resolution" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				value: settings.res,
				onChange: (e) => {
					useStudio.setState({ settings: {
						...settings,
						res: e.target.value
					} });
					useStudio.getState().persist();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "1080",
						children: "1080p"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "720",
						children: "720p"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "480",
						children: "720p short · 480"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Frame rate" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value: settings.fps,
				onChange: (e) => {
					useStudio.setState({ settings: {
						...settings,
						fps: e.target.value
					} });
					useStudio.getState().persist();
				},
				children: [
					"30",
					"24",
					"60"
				].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
					value: f,
					children: [f, " fps"]
				}, f))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mf-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Direct eye line" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `mf-toggle ${perf.eye ? "on" : ""}`,
					onClick: () => useStudio.setState({ perf: {
						...perf,
						eye: !perf.eye
					} }),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "muted",
				children: "Publish records a real WebM from these scenes. Speech plays live in the preview; the file is the picture cut."
			})
		]
	});
}
function ScriptModal() {
	const ref = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mf-modal",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mf-modal-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "AI Director" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-icon",
						onClick: () => useStudio.setState({ scriptOpen: false }),
						"aria-label": "Close",
						children: "×"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					ref,
					placeholder: "Describe the video you want to create…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mf-bar",
					style: {
						justifyContent: "flex-end",
						marginTop: 12
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-ghost",
						onClick: () => useStudio.setState({ scriptOpen: false }),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mf-primary",
						onClick: async () => {
							const topic = ref.current?.value.trim() || "";
							if (!topic) return useStudio.getState().flash("Describe the video first");
							useStudio.setState({ scriptOpen: false });
							useStudio.getState().flash("Building the storyboard…");
							const s = useStudio.getState();
							const r = await studioScript({ data: {
								topic,
								scenes: 4,
								kind: "premium avatar video"
							} });
							const av = s.avatars[s.avatar].src;
							s.setScenes(r.scenes.map((sc, i) => ({
								title: [
									"Opening",
									"Context",
									"Insight",
									"Closing"
								][i] || `Scene ${i + 1}`,
								text: sc.text,
								dur: 6,
								img: av
							})));
							useStudio.getState().flash(`Storyboard ready · ${r.engine}`);
						},
						children: "Generate storyboard"
					})]
				})
			]
		})
	});
}
var SplitComponent = StudioApp;
//#endregion
export { SplitComponent as component };
