import React, { useEffect, useRef, useState } from 'react';
import { speakText, stopSpeaking } from '../lib/lifemate-fallback';

type Message = { id: string; from: 'user' | 'bot'; text: string };

export default function LifeMateFallback({
  avatarName = 'LifeMate',
  avatarImage, // optional URL
}: {
  avatarName?: string;
  avatarImage?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const synthRef = useRef<{ speaking: boolean }>({ speaking: false });

  useEffect(() => {
    // greet
    const id = `m-${Date.now()}`;
    pushBot("Hello — I'm LifeMate. Tell me what's on your mind.");
    return () => stopSpeaking();
  }, []);

  function pushMessage(msg: Message) {
    setMessages((s) => [...s, msg]);
  }
  function pushBot(text: string) {
    const id = `b-${Date.now()}`;
    pushMessage({ id, from: 'bot', text });
    synthRef.current.speaking = true;
    speakText(text).finally(() => (synthRef.current.speaking = false));
  }

  function onSend() {
    const t = input.trim();
    if (!t) return;
    const id = `u-${Date.now()}`;
    pushMessage({ id, from: 'user', text: t });
    setInput('');
    // Very small offline "assistant" behavior: reflect and ask a follow-up.
    const reply = makeFallbackReply(t);
    // add slight delay to feel conversational
    setTimeout(() => pushBot(reply), 350);
  }

  function makeFallbackReply(userText: string) {
    // Keep replies short and safe. This is intentionally simple so it's offline-only.
    const short = userText.length > 120 ? userText.slice(0, 120) + '…' : userText;
    return `Thanks — I heard: "${short}". Can you tell me one specific thing you want help with?`;
  }

  // Optional: simple speech-to-text via Web Speech API (if available)
  async function toggleListen() {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      // not available
      pushBot('Speech recognition is not available in this browser.');
      return;
    }
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (listening) {
      setListening(false);
      return;
    }
    const r = new SpeechRec();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (ev: any) => {
      const text = ev.results[0][0].transcript as string;
      setInput(text);
      const id = `u-${Date.now()}`;
      pushMessage({ id, from: 'user', text });
      setTimeout(() => pushBot(makeFallbackReply(text)), 300);
    };
    r.onerror = (e: any) => {
      pushBot('Speech recognition error: ' + (e?.error || 'unknown'));
      setListening(false);
    };
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, maxWidth: 680 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {avatarImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarImage} alt={avatarName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: 28 }}>{avatarName[0] || 'L'}</div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{avatarName} (offline)</div>
          <div style={{ fontSize: 12, color: '#666' }}>Browser TTS fallback — no external API used</div>
        </div>
      </div>

      <div style={{ maxHeight: 300, overflow: 'auto', padding: 8, border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 8 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
            <div style={{ fontSize: 12, color: m.from === 'bot' ? '#0b66ff' : '#333', minWidth: 48 }}>{m.from === 'bot' ? avatarName : 'You'}</div>
            <div style={{ background: m.from === 'bot' ? '#f0f8ff' : '#f7f7f7', padding: '8px 10px', borderRadius: 6 }}>{m.text}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder="Say something to LifeMate..."
          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
        />
        <button onClick={onSend} style={{ padding: '8px 12px', borderRadius: 6 }}>Send</button>
        <button onClick={toggleListen} style={{ padding: '8px 12px', borderRadius: 6 }}>{listening ? 'Listening…' : '🎙️'}</button>
        <button onClick={() => { stopSpeaking(); pushBot('Okay, I stopped speaking.'); }} style={{ padding: '8px 12px', borderRadius: 6 }}>Stop</button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        Note: This offline fallback uses the browser's SpeechSynthesis (TTS) and optional SpeechRecognition if supported. It is a safe local-only guide and does not send data to third-party services.
      </div>
    </div>
  );
}
