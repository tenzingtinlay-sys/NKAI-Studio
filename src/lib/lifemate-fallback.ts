// Small browser SpeechSynthesis helper for LifeMate offline fallback
export function speakText(text: string, lang = 'en-US', rate = 1, pitch = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return reject(new Error('SpeechSynthesis not available in this environment'));
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.onend = () => resolve();
    utter.onerror = (e) => reject(e);
    // Try to pick a voice close to the requested language
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const v = voices.find((v) => v.lang?.startsWith(lang.split('-')[0]));
      if (v) utter.voice = v;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
