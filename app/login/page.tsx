"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { getAccessToken, setTokens } from "../../lib/auth";
import type { LoginResponse } from "../../types";

type Mode = "pin" | "password";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("pin");
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const submitRef = useRef(false);

  useEffect(() => {
    if (getAccessToken()) { router.replace("/dashboard"); return; }
    api.get<{ pinSet: boolean }>("/auth/pin-status")
      .then(d => {
        setPinSet(d.pinSet);
        if (!d.pinSet) setMode("password");
      })
      .catch(() => { setPinSet(false); setMode("password"); });
  }, [router]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !submitRef.current) {
      submitRef.current = true;
      submitPin(pin).finally(() => { submitRef.current = false; });
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

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      setTokens(res.accessToken, res.refreshToken);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
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
          border: 2px solid #d4d4d8;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .pin-dot.filled {
          background: #0a0a0a;
          border-color: #0a0a0a;
          transform: scale(1.1);
        }
        .pin-dot.error {
          background: #dc2626;
          border-color: #dc2626;
        }
        .pad-btn {
          width: 72px; height: 72px; border-radius: 50%;
          border: none; background: #f4f4f5;
          font-size: 22px; font-weight: 600; color: #0a0a0a;
          cursor: pointer; transition: background 0.12s, transform 0.08s;
          display: flex; align-items: center; justify-content: center;
        }
        .pad-btn:hover:not(:disabled) { background: #e4e4e7; }
        .pad-btn:active:not(:disabled) { transform: scale(0.92); background: #d4d4d8; }
        .pad-btn:disabled { opacity: 0.4; cursor: default; }
        .pad-btn.backspace { background: transparent; font-size: 20px; }
        .pad-btn.backspace:hover:not(:disabled) { background: #f4f4f5; }
      `}</style>
      <main style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        padding: "20px", background: "#fafafa",
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "#0a0a0a", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 24, margin: "0 auto 14px",
            }}>⚖️</div>
            <div style={{ fontSize: 11, color: "#71717a", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
              Admin Panel
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
              Advokat Turdimotov M.M.
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: "#fff", border: "1px solid #e4e4e7",
            borderRadius: 16, padding: "28px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,.07)",
          }}>
            {mode === "pin" && pinSet !== null ? (
              <>
                <p style={{ textAlign: "center", color: "#71717a", fontSize: 14, margin: "0 0 24px", fontWeight: 500 }}>
                  PIN kodni kiriting
                </p>

                {/* Dots */}
                <div
                  className={shake ? "pin-shake" : ""}
                  style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 28 }}
                >
                  {[0,1,2,3].map(i => (
                    <div
                      key={i}
                      className={`pin-dot${pin.length > i ? (error ? " error" : " filled") : ""}`}
                    />
                  ))}
                </div>

                {error && (
                  <div style={{
                    textAlign: "center", color: "#dc2626", fontSize: 13,
                    marginBottom: 16, fontWeight: 500,
                  }}>{error}</div>
                )}

                {/* Number pad */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 14, justifyContent: "center" }}>
                  {["1","2","3","4","5","6","7","8","9"].map(d => (
                    <button key={d} className="pad-btn" onClick={() => pressDigit(d)} disabled={loading}>
                      {d}
                    </button>
                  ))}
                  <div /> {/* empty cell */}
                  <button className="pad-btn" onClick={() => pressDigit("0")} disabled={loading}>0</button>
                  <button className="pad-btn backspace" onClick={backspace} disabled={loading || pin.length === 0}>
                    ⌫
                  </button>
                </div>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button
                    onClick={() => { setMode("password"); setPin(""); setError(null); }}
                    style={{ fontSize: 12, color: "#71717a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Parol bilan kirish
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>Kirish</h2>
                <p style={{ color: "#71717a", margin: "0 0 20px", fontSize: 13 }}>Admin hisobingiz bilan kiring</p>

                <form onSubmit={submitPassword} style={{ display: "grid", gap: 14 }}>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontSize: 12, color: "#3f3f46", fontWeight: 600 }}>Email</span>
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      className="input" type="email" required autoComplete="username"
                      placeholder="admin@advokat.local" />
                  </label>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontSize: 12, color: "#3f3f46", fontWeight: 600 }}>Parol</span>
                    <input value={password} onChange={e => setPassword(e.target.value)}
                      className="input" type="password" required autoComplete="current-password"
                      placeholder="••••••••" />
                  </label>
                  {error && (
                    <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                  <button className="btn-primary" disabled={loading} type="submit"
                    style={{ padding: "11px 16px", marginTop: 2, width: "100%", fontSize: 14 }}>
                    {loading ? "Kirilmoqda..." : "Kirish"}
                  </button>
                </form>

                {pinSet && (
                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    <button
                      onClick={() => { setMode("pin"); setError(null); }}
                      style={{ fontSize: 12, color: "#71717a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      PIN bilan kirish
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
