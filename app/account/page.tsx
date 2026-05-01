"use client";

import { useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { setTokens } from "../../lib/auth";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 10) {
      setError("Yangi parol kamida 10 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yangi parollar mos kelmadi.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Yangi parol joriy paroldan farq qilishi kerak.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        "/auth/change-password",
        { currentPassword, newPassword }
      );
      setTokens(res.accessToken, res.refreshToken);
      setMessage("Parol muvaffaqiyatli o'zgartirildi. Boshqa qurilmalardan chiqarildingiz.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError((err as Error).message || "Parolni o'zgartirib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ marginBottom: 8 }}>Hisob</h1>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>
          Parolni o'zgartirganingizda barcha qurilmalardan chiqib ketasiz.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Joriy parol</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Yangi parol (kamida 10 belgi)</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Yangi parolni takrorlang</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ color: "#c0392b", fontSize: 14 }}>{error}</div>
          )}
          {message && (
            <div style={{ color: "#27ae60", fontSize: 14 }}>{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--ink, #111)",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Saqlanmoqda…" : "Parolni o'zgartirish"}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border, #d6d6d6)",
  background: "var(--surface, #fff)",
  fontSize: 14
};
