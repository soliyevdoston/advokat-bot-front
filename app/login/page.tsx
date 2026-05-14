"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { getAccessToken, setTokens } from "../../lib/auth";
import type { LoginResponse } from "../../types";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const submitting = useRef(false);

  useEffect(() => {
    if (getAccessToken()) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (pin.length === 4 && !submitting.current) {
      submitting.current = true;
      submitPin(pin).finally(() => { submitting.current = false; });
    }
  }, [pin]);

  const submitPin = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>("/auth/pin-login", { pin: code });
      setTokens(res.accessToken, res.refreshToken);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const pressDigit = (d: string) => {
    if (loading) return;
    setError(null);
    setPin(p => p.length < 4 ? p + d : p);
  };

  const backspace = () => {
    if (loading) return;
    setError(null);
    setPin(p => p.slice(0, -1));
  };

  return (
    <>
      <style>{`
        @keyframes pinShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        .pin-shake { animation: pinShake 0.45s ease; }
        .pin-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,.25);
          transition: background 0.15s, border-color 0.15s, transform 0.12s;
        }
        .pin-dot.filled { background: #fff; border-color: #fff; transform: scale(1.15); }
        .pin-dot.error  { background: #f87171; border-color: #f87171; }
        .pad-btn {
          width: 72px; height: 72px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.07);
          font-size: 22px; font-weight: 600; color: rgba(255,255,255,.92);
          cursor: pointer; transition: background 0.12s, transform 0.08s;
          display: flex; align-items: center; justify-content: center;
          outline: none; -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(4px);
        }
        .pad-btn:hover:not(:disabled) { background: rgba(255,255,255,.14); }
        .pad-btn:active:not(:disabled) { transform: scale(0.91); background: rgba(255,255,255,.2); }
        .pad-btn:focus { outline: none; }
        .pad-btn:disabled { opacity: 0.3; cursor: default; }
        .pad-btn.ghost { background: transparent; border-color: transparent; font-size: 20px; color: rgba(255,255,255,.6); }
        .pad-btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,.07); }
      `}</style>
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "linear-gradient(145deg, #0d1b35 0%, #0f1929 50%, #1a2744 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background decoration */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(42,64,128,.45) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", right: "-10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26,39,68,.6) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ width: "100%", maxWidth: 320, textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, rgba(255,255,255,.15) 0%, rgba(255,255,255,.05) 100%)",
            border: "1px solid rgba(255,255,255,.15)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,.3)",
          }}>⚖️</div>

          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
            Yuridik xizmatlar • Admin Panel
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,.95)", letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.2 }}>
            Turdimatov Muzaffar
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 40, letterSpacing: "0.04em" }}>
            Advokat • Yuridik maslahat
          </div>

          {/* PIN dots */}
          <div
            className={shake ? "pin-shake" : ""}
            style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 12, userSelect: "none" }}
          >
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={`pin-dot${pin.length > i ? (error ? " error" : " filled") : ""}`}
              />
            ))}
          </div>

          <div style={{ minHeight: 22, marginBottom: 28 }}>
            {error && (
              <span style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>{error}</span>
            )}
            {!error && (
              <span style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>PIN kiriting</span>
            )}
          </div>

          {/* Number pad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 14, justifyContent: "center" }}>
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button key={d} className="pad-btn" onClick={() => pressDigit(d)} disabled={loading}>{d}</button>
            ))}
            <div />
            <button className="pad-btn" onClick={() => pressDigit("0")} disabled={loading}>0</button>
            <button className="pad-btn ghost" onClick={backspace} disabled={loading || pin.length === 0}>⌫</button>
          </div>

          <div style={{ marginTop: 40, fontSize: 11, color: "rgba(255,255,255,.2)", letterSpacing: "0.06em" }}>
            © 2025 Turdimatov Yuridik Idorasi
          </div>
        </div>
      </main>
    </>
  );
}
