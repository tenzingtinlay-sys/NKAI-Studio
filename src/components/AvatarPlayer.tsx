import React, { useEffect, useState, useRef } from 'react';
import { createRealTimeVisemeEngine, scheduleVisemesFromManifest } from '@/lib/viseme';

type Avatar = { name: string; image?: string | null; audio?: string[]; video?: string | null };

export default function AvatarPlayer({ api = '/api/avatars/library', onUseAsStream }: { api?: string; onUseAsStream?: (avatar: { name: string; image?: string | null; audio?: string[] }) => void }) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selected, setSelected] = useState<Avatar | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [viseme, setViseme] = useState<number>(0);
  const visemeEngineRef = useRef<any>(null);
  const visemeSchedulerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    fetch(api)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setAvatars(data.avatars || []);
      })
      .catch(() => setAvatars([]));
    return () => { mounted = false; };
  }, [api]);

  useEffect(() => {
    if (!selected) return;
    // attach events
    const aud = audioRef.current;
    if (!aud) return;
    const onPlay = () => setPlaying(true);
    const onEnd = () => setPlaying(false);
    aud.addEventListener('play', onPlay);
    aud.addEventListener('ended', onEnd);
    aud.addEventListener('pause', onEnd);
    return () => {
      aud.removeEventListener('play', onPlay);
      aud.removeEventListener('ended', onEnd);
      aud.removeEventListener('pause', onEnd);
      // cleanup viseme engine/scheduler
      try { visemeEngineRef.current?.stop(); } catch {}
      try { visemeSchedulerRef.current?.stop(); } catch {}
      visemeEngineRef.current = null;
      visemeSchedulerRef.current = null;
      setViseme(0);
    };
  }, [selected]);

  function stopVisemeEngines() {
    try { visemeEngineRef.current?.stop(); } catch {}
    try { visemeSchedulerRef.current?.stop(); } catch {}
    visemeEngineRef.current = null;
    visemeSchedulerRef.current = null;
  }

  async function playSample(url?: string) {
    if (!url) return;
    stopVisemeEngines();
    if (!audioRef.current) {
      const a = document.createElement('audio');
      audioRef.current = a;
      a.controls = false;
      document.body.appendChild(a);
    }
    const a = audioRef.current!;
    a.crossOrigin = 'anonymous';

    // detect video vs audio by extension
    const isVideo = url.toLowerCase().endsWith('.mp4');
    if (isVideo) {
      // play as video
      let vEl = document.getElementById('__avatar_local_video') as HTMLVideoElement | null;
      if (!vEl) {
        vEl = document.createElement('video');
        vEl.id = '__avatar_local_video';
        vEl.style.position = 'fixed';
        vEl.style.left = '-9999px';
        vEl.muted = false;
        vEl.playsInline = true;
        document.body.appendChild(vEl);
      }
      vEl.src = url;
      vEl.crossOrigin = 'anonymous';

      // try manifest for visemes
      const manifestUrl = url + '.viseme.json';
      try {
        const res = await fetch(manifestUrl, { cache: 'no-cache' });
        if (res.ok) {
          const points = await res.json();
          vEl.play().catch(() => {});
          visemeSchedulerRef.current = scheduleVisemesFromManifest(vEl, points, (v: number) => setViseme(v));
          return;
        }
      } catch (e) {}

      vEl.play().catch(() => {});
      visemeEngineRef.current = createRealTimeVisemeEngine(vEl, (v: number) => setViseme(v));
      return;
    }

    a.src = url;

    // try to load a precomputed viseme manifest next to the audio: same filename + .viseme.json
    const manifestUrl = url + '.viseme.json';
    try {
      const res = await fetch(manifestUrl, { cache: 'no-cache' });
      if (res.ok) {
        const points = await res.json();
        // play audio then schedule visemes
        a.play().catch(() => {});
        visemeSchedulerRef.current = scheduleVisemesFromManifest(a, points, (v: number) => setViseme(v));
        return;
      }
    } catch (e) {
      // ignore manifest errors and fallback to real-time engine
    }

    // fallback to real-time viseme engine
    a.play().catch(() => {});
    visemeEngineRef.current = createRealTimeVisemeEngine(a, (v: number) => setViseme(v));
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 8 }}>
        {avatars.map((av) => (
          <button key={av.name} onClick={() => setSelected(av)} style={{ textAlign: 'center', padding: 8, borderRadius: 8, border: selected?.name === av.name ? '2px solid #6b46c1' : '1px solid #ddd', background: '#0b1220', color: '#fff' }}>
            {av.image ? (
              // image is served via vendor-file endpoint
              // image may contain encoded path segments
              <img src={`/api/vendor-file?path=${encodeURIComponent(av.image)}`} alt={av.name} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', borderRadius: 8 }}>{av.name[0]}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 13 }}>{av.name}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 160, height: 160, borderRadius: 12, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {selected.image ? <img src={`/api/vendor-file?path=${encodeURIComponent(selected.image)}`} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ color: '#fff' }}>{selected.name}</div>}
            {/* viseme mouth: render simple shapes by viseme index */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: 140, height: 36, borderRadius: 9, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* map viseme 0..6 to width */}
              <div style={{ height: 12, borderRadius: 8, background: '#ffb86b', width: `${Math.max(8, Math.min(140, 8 + viseme * 18))}px`, transition: 'width 0.06s linear' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#fff', fontWeight: 700 }}>{selected.name}</div>
            <div style={{ color: '#9ca3af' }}>{selected.audio && selected.audio.length ? `${selected.audio.length} sample(s)` : 'No voice samples'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                if (selected.video) {
                  playSample(selected.video.startsWith('/') ? selected.video : `/api/vendor-file?path=${encodeURIComponent(selected.video)}`);
                } else if (selected.audio && selected.audio[0]) {
                  playSample(selected.audio[0].startsWith('/') ? selected.audio[0] : `/api/vendor-file?path=${encodeURIComponent(selected.audio[0])}`);
                }
              }} style={{ padding: '8px 12px', borderRadius: 8 }}>Play sample</button>
              <button onClick={() => {
                try { visemeEngineRef.current?.stop(); } catch {}
                try { visemeSchedulerRef.current?.stop(); } catch {}
                const v = document.getElementById('__avatar_local_video') as HTMLVideoElement | null;
                if (v) { v.pause(); v.currentTime = 0; v.remove(); }
                if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
              }} style={{ padding: '8px 12px', borderRadius: 8 }}>Stop</button>
              <button onClick={() => onUseAsStream && onUseAsStream(selected)} style={{ padding: '8px 12px', borderRadius: 8 }}>Use as local stream</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
