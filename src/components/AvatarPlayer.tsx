import React, { useEffect, useState, useRef } from 'react';

type Avatar = { name: string; image?: string | null; audio?: string[] };

export default function AvatarPlayer({ api = '/api/avatars/library' }: { api?: string }) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selected, setSelected] = useState<Avatar | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

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
    };
  }, [selected]);

  function playSample(url?: string) {
    if (!url) return;
    if (!audioRef.current) {
      const a = document.createElement('audio');
      audioRef.current = a;
      a.controls = false;
      document.body.appendChild(a);
    }
    const a = audioRef.current!;
    a.src = url;
    a.play().catch(() => {
      // autoplay may be blocked; try after a user gesture
    });
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
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: 120, height: 18, borderRadius: 9, background: playing ? '#ffb86b' : '#444', transition: 'background 0.12s linear' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#fff', fontWeight: 700 }}>{selected.name}</div>
            <div style={{ color: '#9ca3af' }}>{selected.audio && selected.audio.length ? `${selected.audio.length} sample(s)` : 'No voice samples'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { if (selected.audio && selected.audio[0]) playSample(`/api/vendor-file?path=${encodeURIComponent(selected.audio[0])}`); }} style={{ padding: '8px 12px', borderRadius: 8 }}>Play sample</button>
              <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } }} style={{ padding: '8px 12px', borderRadius: 8 }}>Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
