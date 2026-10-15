import { useEffect, useRef, useState } from "react";

type OfferResponse = { sdp?: string; type?: RTCSdpType; sessionid?: string; error?: string; detail?: string };
type ApiResponse = { code?: number; msg?: string; error?: string; detail?: string };

export function LiveTalkingNativePanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const sessionRef = useRef("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Disconnected · waiting for configured LiveTalking GPU worker");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    peerRef.current?.close();
    peerRef.current = null;
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    setStatus("Negotiating WebRTC with the private LiveTalking worker…");
    try {
      peerRef.current?.close();
      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.ontrack = (event) => {
        const video = videoRef.current;
        if (!video) return;
        if (event.streams[0]) video.srcObject = event.streams[0];
        else {
          const stream = video.srcObject instanceof MediaStream ? video.srcObject : new MediaStream();
          stream.addTrack(event.track);
          video.srcObject = stream;
        }
        void video.play().catch(() => setStatus("Stream connected · press Play if your browser blocks autoplay"));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnected(true);
          setStatus("Live WebRTC stream connected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnected(false);
          setStatus("WebRTC connection lost · check GPU worker ICE/UDP networking");
        }
      };

      await pc.setLocalDescription(await pc.createOffer());
      if (pc.iceGatheringState !== "complete") {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("ICE gathering timed out. Check browser network permissions.")), 12000);
          const check = () => {
            if (pc.iceGatheringState === "complete") {
              window.clearTimeout(timeout);
              pc.removeEventListener("icegatheringstatechange", check);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", check);
          check();
        });
      }
      const offer = pc.localDescription;
      if (!offer?.sdp) throw new Error("Browser did not produce a WebRTC SDP offer.");
      const response = await fetch("/api/livetalking/offer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json() as OfferResponse;
      if (!response.ok || !result.sdp || !result.type) {
        throw new Error(result.error || result.detail || ("LiveTalking offer failed (HTTP " + response.status + ")."));
      }
      sessionRef.current = result.sessionid || "";
      await pc.setRemoteDescription({ type: result.type, sdp: result.sdp });
      setConnected(true);
      setStatus("Offer accepted · waiting for media tracks");
    } catch (cause) {
      peerRef.current?.close();
      peerRef.current = null;
      sessionRef.current = "";
      setConnected(false);
      const message = cause instanceof Error ? cause.message : "Could not connect to LiveTalking.";
      setError(message);
      setStatus("Unable to connect · verify LIVETALKING_INTERNAL_URL and GPU worker network ports");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    peerRef.current?.close();
    peerRef.current = null;
    sessionRef.current = "";
    if (videoRef.current) videoRef.current.srcObject = null;
    setConnected(false);
    setStatus("Disconnected");
    setError("");
  }

  async function speak() {
    const message = text.trim();
    if (!message || !sessionRef.current) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/livetalking/human", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionid: sessionRef.current, text: message, type: "echo" }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || (typeof result.code === "number" && result.code !== 0)) {
        throw new Error(result.error || result.msg || ("Text-to-avatar request failed (HTTP " + response.status + ")."));
      }
      setStatus("Text sent to the live avatar");
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send text to the avatar.");
    } finally {
      setBusy(false);
    }
  }

  async function interrupt() {
    if (!sessionRef.current) return;
    setBusy(true);
    try {
      const response = await fetch("/api/livetalking/interrupt_talk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionid: sessionRef.current }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || (typeof result.code === "number" && result.code !== 0)) {
        throw new Error(result.error || result.msg || "Interrupt request failed.");
      }
      setStatus("Speech interrupted");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not interrupt speech.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="nkai-live-panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong>LiveTalking · in-app WebRTC</strong>
        <span aria-live="polite" style={{ opacity: 0.8, fontSize: 12 }}>{status}</span>
      </div>
      <video ref={videoRef} autoPlay playsInline controls style={{ width: "100%", maxHeight: 460, minHeight: 220, background: "#090b10", borderRadius: 12, objectFit: "contain" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!connected
          ? <button type="button" className="mf-primary" disabled={busy} onClick={() => void connect()}>{busy ? "Connecting…" : "Connect live avatar"}</button>
          : <button type="button" className="mf-ghost" disabled={busy} onClick={disconnect}>Disconnect</button>}
        <button type="button" className="mf-ghost" disabled={!connected || busy} onClick={() => void interrupt()}>Interrupt speech</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void speak(); }} style={{ display: "flex", gap: 8 }}>
        <input aria-label="Text for live avatar" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type text for the live avatar to speak…" disabled={!connected || busy} style={{ flex: 1, minWidth: 0 }} />
        <button type="submit" className="mf-primary" disabled={!connected || busy || !text.trim()}>{busy ? "Working…" : "Speak"}</button>
      </form>
      <p style={{ margin: 0, opacity: 0.72, fontSize: 12 }}>
        Adapted to LiveTalking's open-source HTTP/WebRTC contract through NKAI's same-origin backend. The GPU service, model checkpoints and reachable WebRTC media ports must be configured separately; this bridge does not use a paid inference API.
      </p>
      {error ? <p role="alert" style={{ color: "#ff9b9b", margin: 0 }}>{error}</p> : null}
    </section>
  );
}
