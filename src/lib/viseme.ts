export type VisemePoint = { t: number; v: number };

export function mapEnergyToViseme(energy: number) {
  // Map 0..1 energy to viseme index 0..6
  if (energy < 0.08) return 0; // closed
  if (energy < 0.18) return 1;
  if (energy < 0.30) return 2;
  if (energy < 0.45) return 3;
  if (energy < 0.65) return 4;
  if (energy < 0.85) return 5;
  return 6; // wide open
}

export function createRealTimeVisemeEngine(audio: HTMLMediaElement, onViseme: (v: number) => void) {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return { stop: () => {} };
  const ac = new AC();
  const src = ac.createMediaElementSource(audio);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  analyser.connect(ac.destination);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  function tick() {
    analyser.getByteFrequencyData(data);
    // compute energy in voice band (approx 300Hz-3000Hz)
    const sampleRate = ac.sampleRate;
    const binCount = analyser.frequencyBinCount;
    const freqPerBin = sampleRate / (analyser.fftSize);
    let startBin = Math.floor(300 / freqPerBin);
    let endBin = Math.min(binCount - 1, Math.floor(3000 / freqPerBin));
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += data[i];
    }
    const avg = sum / (endBin - startBin + 1) / 255; // 0..1
    const vis = mapEnergyToViseme(avg);
    try { onViseme(vis); } catch {}
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return {
    stop() {
      if (raf) cancelAnimationFrame(raf);
      try { analyser.disconnect(); } catch {}
      try { src.disconnect(); } catch {}
      try { ac.close(); } catch {}
    }
  };
}

export function scheduleVisemesFromManifest(audio: HTMLMediaElement, points: VisemePoint[], onViseme: (v: number) => void) {
  // points: sorted array of {t, v} where t is seconds
  let raf = 0;
  function tick() {
    const now = audio.currentTime;
    // find last point with t <= now
    let idx = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].t <= now) idx = i;
      else break;
    }
    if (idx >= 0) onViseme(points[idx].v);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return {
    stop() { if (raf) cancelAnimationFrame(raf); }
  };
}
