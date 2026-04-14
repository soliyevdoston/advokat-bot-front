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
    if (getAccessToken()) router.replace("/dashboard");
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
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "20px",
      background: "#fafafa",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: "12px",
            background: "#0a0a0a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 16px",
          }}>
            ⚖️
          </div>
          <div style={{ fontSize: 11, color: "#71717a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
            Admin Panel
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
            Advokat Turdimotov M.M.
          </div>
          <div style={{ fontSize: 13, color: "#71717a", marginTop: 4 }}>
            Huquqiy maslahat xizmati
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e4e4e7",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,.08)",
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>Kirish</h2>
          <p style={{ color: "#71717a", margin: "0 0 20px", fontSize: 13 }}>
            Admin hisobingiz bilan kiring
          </p>

          <form className="grid" onSubmit={onSubmit} style={{ gap: 14 }}>
            <label className="grid" style={{ gap: 5 }}>
              <span style={{ fontSize: 12, color: "#3f3f46", fontWeight: 600 }}>Email</span>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                type="email"
                required
                autoComplete="username"
                placeholder="admin@advokat.local"
              />
            </label>

            <label className="grid" style={{ gap: 5 }}>
              <span style={{ fontSize: 12, color: "#3f3f46", fontWeight: 600 }}>Parol</span>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div style={{
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              className="btn-primary"
              disabled={loading}
              type="submit"
              style={{ padding: "11px 16px", marginTop: 2, width: "100%", fontSize: 14 }}
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
