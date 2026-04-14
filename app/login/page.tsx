"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { getAccessToken, setTokens } from "../../lib/auth";
import type { LoginResponse } from "../../types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
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

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: "50%",
            background: "rgba(255,143,43,0.15)",
            border: "2px solid rgba(255,143,43,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 16px"
          }}>
            ⚖️
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            Admin Panel
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ff8f2b", lineHeight: 1.2 }}>
            Advokat Turdimotov M.M.
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            Huquqiy maslahat xizmati
          </div>
        </div>

        <div className="surface panel">
          <h2 style={{ marginBottom: 4, fontSize: 17 }}>Kirish</h2>
          <p style={{ color: "#4f6471", marginTop: 0, marginBottom: 20, fontSize: 14 }}>
            Moderator yoki admin hisobingiz bilan kiring
          </p>
          <form className="grid" onSubmit={onSubmit} style={{ gap: 14 }}>
            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "#4f6471", fontWeight: 600 }}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                type="email"
                required
                autoComplete="username"
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "#4f6471", fontWeight: 600 }}>Parol</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <div style={{
                background: "#ffe2e2",
                color: "#c13838",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14
              }}>
                {error}
              </div>
            ) : null}

            <button className="btn-primary" disabled={loading} type="submit" style={{ marginTop: 4, padding: "12px 16px" }}>
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
