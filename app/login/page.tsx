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
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid #d4d4d8;
          transition: background 0.15s, border-color 0.15s, transform 0.12s;
        }
        .pin-dot.filled { background: #0a0a0a; border-color: #0a0a0a; transform: scale(1.1); }
        .pin-dot.error  { background: #dc2626; border-color: #dc2626; }
        .pad-btn {
          width: 76px; height: 76px; border-radius: 50%;
          border: none; background: #f0f0f1;
          font-size: 24px; font-weight: 600; color: #0a0a0a;
          cursor: pointer; transition: background 0.12s, transform 0.08s;
          display: flex; align-items: center; justify-content: center;
          outline: none; -webkit-tap-highlight-color: transparent;
        }
        .pad-btn:hover:not(:disabled) { background: #e2e2e4; }
        .pad-btn:active:not(:disabled) { transform: scale(0.91); background: #d4d4d8; }
        .pad-btn:focus { outline: none; }
        .pad-btn:disabled { opacity: 0.35; cursor: default; }
        .pad-btn.ghost { background: transparent; font-size: 22px; }
        .pad-btn.ghost:hover:not(:disabled) { background: #f0f0f1; }
        .pad-btn.ghost:focus { outline: none; }
      `}</style>
      <main style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        padding: "20px",
        backgroundColor: "#ececed",
        backgroundImage: "linear-gradient(rgba(0,0,0,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.06) 1px,transparent 1px)",
        backgroundSize: "28px 28px",
      }}>
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          {/* Brand */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#0a0a0a", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, margin: "0 auto 16px",
          }}>⚖️</div>
          <div style={{ fontSize: 11, color: "#71717a", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
            Admin Panel
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#0a0a0a", letterSpacing: "-0.02em", marginBottom: 32 }}>
            Advokat Turdimotov M.M.
          </div>

          {/* Dots */}
          <div
            className={shake ? "pin-shake" : ""}
            style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 10, userSelect: "none" }}
          >
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={`pin-dot${pin.length > i ? (error ? " error" : " filled") : ""}`}
              />
            ))}
          </div>

          <div style={{ minHeight: 24, marginBottom: 28 }}>
            {error && (
              <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 500 }}>{error}</span>
            )}
          </div>

          {/* Number pad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 76px)", gap: 16, justifyContent: "center" }}>
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button key={d} className="pad-btn" onClick={() => pressDigit(d)} disabled={loading}>{d}</button>
            ))}
            <div />
            <button className="pad-btn" onClick={() => pressDigit("0")} disabled={loading}>0</button>
            <button className="pad-btn ghost" onClick={backspace} disabled={loading || pin.length === 0}>⌫</button>
          </div>
        </div>
      </main>
    </>
  );
}
