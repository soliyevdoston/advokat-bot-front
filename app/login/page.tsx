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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="surface panel" style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ marginBottom: 4 }}>Admin Login</h1>
        <p style={{ color: "#4f6471", marginTop: 0, marginBottom: 20 }}>
          Moderator + Advokat paneliga kirish
        </p>
        <form className="grid" onSubmit={onSubmit}>
          <label className="grid" style={{ gap: 6 }}>
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
              type="email"
              required
            />
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
              type="password"
              required
            />
          </label>

          {error ? (
            <div className="tag tag-danger" style={{ width: "fit-content" }}>
              {error}
            </div>
          ) : null}

          <button className="btn-primary" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
