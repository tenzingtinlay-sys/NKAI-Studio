import { studioProxyImage } from "./ai";
import type { Brand, Scene } from "./types";

const cache = new Map<string, Promise<HTMLImageElement>>();

function decode(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

export function loadImage(src: string) {
  const hit = cache.get(src);
  if (hit) return hit;
  const job = (async () => {
    if (src.startsWith("data:") || src.startsWith("blob:")) return decode(src);
    try {
      const proxied = await studioProxyImage({ data: { url: src } });
      return decode(proxied.dataUrl);
    } catch {
      return decode(src);
    }
  })();
  cache.set(src, job);
  return job;
}

export function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function cpuArt(prompt: string, style: string, w: number, h: number, seed: number) {
  let s = hash(prompt + style + seed);
  const rnd = () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 1013904223) | 0;
    return (s >>> 0) % 10000 / 10000;
  };
  const hues: Record<string, number> = { Aurora: 170, Sunset: 15, Ocean: 205, Forest: 130, Mono: 0 };
  const H0 = hues[style] ?? 200;
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
    const r = (0.18 + rnd() * 0.4) * Math.max(w, h);
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
    x.arc(rnd() * w, rnd() * h, (0.05 + rnd() * 0.22) * w, 0, Math.PI * 2);
    x.stroke();
  }
  return c;
}

const WGSL = `
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

export async function paintArt(
  canvas: HTMLCanvasElement,
  prompt: string,
  style: string,
  w: number,
  h: number,
) {
  canvas.width = w;
  canvas.height = h;
  const styles = ["Aurora", "Sunset", "Ocean", "Forest", "Mono"];
  const styleN = Math.max(0, styles.indexOf(style));
  const gpu = navigator.gpu;
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      const device = await adapter?.requestDevice();
      if (device) {
        const module = device.createShaderModule({ code: WGSL });
        const info = await module.getCompilationInfo();
        if (info.messages.some((m: { type: string }) => m.type === "error")) throw new Error("shader");
        const format = "rgba8unorm" as GPUTextureFormat;
        const tex = device.createTexture({
          size: [w, h],
          format,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        });
        const uni = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const seed = (hash(prompt + style) % 1000) / 50;
        device.queue.writeBuffer(uni, 0, new Float32Array([seed, styleN, w, h]));
        const bgl = device.createBindGroupLayout({
          entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
        });
        const bind = device.createBindGroup({
          layout: bgl,
          entries: [{ binding: 0, resource: { buffer: uni } }],
        });
        const pipeline = device.createRenderPipeline({
          layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
          vertex: { module, entryPoint: "vs" },
          fragment: { module, entryPoint: "fs", targets: [{ format }] },
          primitive: { topology: "triangle-list" },
        });
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [{ view: tex.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(3);
        pass.end();
        const bytesPerRow = Math.ceil((w * 4) / 256) * 256;
        const buf = device.createBuffer({
          size: bytesPerRow * h,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        enc.copyTextureToBuffer({ texture: tex }, { buffer: buf, bytesPerRow, rowsPerImage: h }, [w, h]);
        device.queue.submit([enc.finish()]);
        await buf.mapAsync(GPUMapMode.READ);
        const raw = new Uint8Array(buf.getMappedRange());
        const img = new ImageData(w, h);
        for (let y = 0; y < h; y++) {
          img.data.set(raw.subarray(y * bytesPerRow, y * bytesPerRow + w * 4), y * w * 4);
        }
        buf.unmap();
        const ctx = canvas.getContext("2d");
        ctx?.putImageData(img, 0, 0);
        device.destroy();
        return "webgpu" as const;
      }
    } catch {
      /* canvas fallback */
    }
  }
  const art = cpuArt(prompt, style, w, h, Date.now());
  canvas.getContext("2d")?.drawImage(art, 0, 0);
  return "canvas" as const;
}

export function dims(aspect: string, res: number): [number, number] {
  const [a, b] = aspect.split(":").map(Number);
  if (!a || !b) return [1280, 720];
  if (a >= b) return [Math.round((res * a) / b / 2) * 2, res];
  return [res, Math.round((res * b) / a / 2) * 2];
}

function cover(
  x: CanvasRenderingContext2D,
  im: HTMLImageElement | null,
  X: number,
  Y: number,
  W: number,
  H: number,
  z = 1,
) {
  if (!im) return;
  x.save();
  x.beginPath();
  x.rect(X, Y, W, H);
  x.clip();
  const s = Math.max(W / im.width, H / im.height) * z;
  x.drawImage(im, X + (W - im.width * s) / 2, Y + (H - im.height * s) / 2, im.width * s, im.height * s);
  x.restore();
}

function wrap(x: CanvasRenderingContext2D, t: string, X: number, Y: number, mw: number, lh: number) {
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

export async function recordFrames(
  w: number,
  h: number,
  fps: number,
  draw: (x: CanvasRenderingContext2D, W: number, H: number, t: number) => void,
  ms: number,
  onProg?: (p: number) => void,
) {
  if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot record video.");
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (!x) throw new Error("Canvas unavailable.");
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  const rec = new MediaRecorder(c.captureStream(fps), mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
  });
  rec.start(200);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
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

export async function renderScenes(
  scenes: Scene[],
  avatarSrc: string,
  aspect: string,
  res: number,
  fps: number,
  brand: Brand,
  onProg?: (p: number) => void,
) {
  const [w, h] = dims(aspect, res);
  const av = await loadImage(avatarSrc).catch(() => null);
  const logo = brand.logo ? await loadImage(brand.logo).catch(() => null) : null;
  const bgs = await Promise.all(scenes.map((s) => loadImage(s.img).catch(() => null)));
  const ds = scenes.map((s) => Math.max(2, s.dur) * 1000);
  const total = ds.reduce((a, c) => a + c, 0);
  const url = await recordFrames(
    w,
    h,
    fps,
    (x, W, H, t) => {
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
      cover(x, bgs[i], 0, 0, W, H, 1 + 0.05 * p);
      const g = x.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "rgba(0,0,0,.55)");
      g.addColorStop(1, "rgba(0,0,0,.08)");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      const ah = H * 0.9;
      const aw = Math.min(ah * 0.67, W * 0.46);
      const side = W < H ? 0.5 : 0.72;
      cover(x, av, (W - aw) * side, H - ah + Math.sin(t / 260) * H * 0.004, aw, ah);
      x.fillStyle = "rgba(0,0,0,.62)";
      x.fillRect(0, H * 0.8, W, H * 0.2);
      x.fillStyle = brand.c2 || "#8ab4ff";
      x.fillRect(0, H * 0.8, W * Math.min(1, p + 0.02), Math.max(3, H * 0.006));
      x.fillStyle = brand.c1 || "#fff";
      x.font = `700 ${Math.round(H * 0.038)}px ${brand.font || "Manrope"}, sans-serif`;
      x.textBaseline = "top";
      wrap(x, s.text, W * 0.06, H * 0.845, W * (W < H ? 0.88 : 0.48), H * 0.048);
      if (logo) x.drawImage(logo, W * 0.03, H * 0.04, (logo.width * H * 0.08) / logo.height, H * 0.08);
    },
    total,
    onProg,
  );
  return { url, note: `${scenes.length} scenes · ${w}×${h} · picture track (speech plays live in the studio, not inside the file)` };
}

export async function renderClip(file: File, opts: {
  start: number;
  end: number | null;
  speed: number;
  filter: string;
  caption: string;
  onProg?: (p: number) => void;
}) {
  const v = document.createElement("video");
  v.src = URL.createObjectURL(file);
  v.muted = true;
  v.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    v.onloadedmetadata = () => resolve();
    v.onerror = () => reject(new Error("Could not read that video."));
  });
  const a = Math.max(0, opts.start || 0);
  const end = Math.min(opts.end && opts.end > a ? opts.end : v.duration, v.duration);
  const speed = opts.speed || 1;
  const scale = Math.min(1, 1280 / (v.videoWidth || 1280));
  const w = Math.max(2, Math.round((v.videoWidth * scale) / 2) * 2);
  const h = Math.max(2, Math.round((v.videoHeight * scale) / 2) * 2);
  v.currentTime = a;
  await new Promise<void>((resolve) => {
    v.onseeked = () => resolve();
  });
  v.playbackRate = speed;
  await v.play();
  const ms = ((end - a) / speed) * 1000;
  const url = await recordFrames(
    w,
    h,
    30,
    (x, W, H) => {
      x.filter = opts.filter && opts.filter !== "none" ? opts.filter : "none";
      x.drawImage(v, 0, 0, W, H);
      x.filter = "none";
      if (opts.caption) {
        x.fillStyle = "rgba(0,0,0,.6)";
        x.fillRect(0, H * 0.86, W, H * 0.14);
        x.fillStyle = "#fff";
        x.font = `700 ${Math.round(H * 0.04)}px sans-serif`;
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText(opts.caption, W / 2, H * 0.93);
        x.textAlign = "left";
      }
    },
    ms,
    opts.onProg,
  );
  v.pause();
  return { url, note: `Edited clip · ${w}×${h}` };
}

const OPEN: Record<string, number> = {
  sil: 0.04,
  PP: 0.08,
  FF: 0.2,
  TH: 0.24,
  DD: 0.3,
  kk: 0.34,
  CH: 0.28,
  SS: 0.18,
  nn: 0.22,
  RR: 0.36,
  aa: 0.86,
  E: 0.5,
  ih: 0.34,
  oh: 0.66,
  ou: 0.42,
};

export function visemeAt(text: string, t: number, dur: number) {
  const chars = text.toLowerCase();
  if (!chars.length || dur <= 0) return 0.04;
  const i = Math.min(chars.length - 1, Math.floor((t / dur) * chars.length));
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
  return OPEN[v] ?? 0.2;
}

export function drawTalking(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  w: number,
  h: number,
  open: number,
  energy: number,
) {
  ctx.clearRect(0, 0, w, h);
  if (!img) return;
  const bob = Math.sin(performance.now() / 420) * h * 0.004 * (0.4 + energy);
  ctx.save();
  ctx.translate(0, bob);
  cover(ctx, img, 0, 0, w, h * 1.02, 1);
  ctx.restore();
  const jaw = h * 0.58;
  if (open > 0.08) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, jaw, w, h - jaw);
    ctx.clip();
    ctx.drawImage(img, 0, jaw + open * h * 0.012, w, h);
    ctx.restore();
    ctx.fillStyle = `rgba(12,6,8,${0.15 + open * 0.55})`;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, jaw + h * 0.08, w * (0.055 + open * 0.04), h * (0.012 + open * 0.028), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const blink = Math.sin(performance.now() / 1800) > 0.97;
  if (blink) {
    ctx.fillStyle = "rgba(20,16,14,.72)";
    ctx.fillRect(w * 0.3, h * 0.36, w * 0.14, h * 0.018);
    ctx.fillRect(w * 0.56, h * 0.36, w * 0.14, h * 0.018);
  }
}

export function shrinkFile(file: File, max: number) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Could not read that file."));
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}

export function pickFile(accept: string) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    input.style.position = "fixed";
    input.style.left = "-10000px";
    document.body.appendChild(input);

    let settled = false;
    let focusTimer: number | undefined;

    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      window.removeEventListener("focus", onWindowFocus);
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      input.remove();
      resolve(file);
    };
    const onChange = () => finish(input.files?.[0] ?? null);
    const onCancel = () => finish(null);
    const onWindowFocus = () => {
      // Some browsers do not dispatch the input "cancel" event. Wait briefly
      // for "change" before treating the dialog closing as a cancellation.
      focusTimer = window.setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 500);
    };

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onWindowFocus, { once: true });
    try {
      input.click();
    } catch {
      finish(null);
    }
  });
}
