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
      <main>
        <div className="page-header">
          <h1 className="page-title">Hisob</h1>
        </div>

        <div className="surface panel" style={{ maxWidth: 480 }}>
          <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: 13 }}>
            Parolni o'zgartirganingizda barcha boshqa qurilmalardan chiqib ketasiz —
            hozirgi qurilma faol qoladi.
          </p>

          <form onSubmit={submit} className="grid" style={{ gap: 14 }}>
            <label className="grid" style={{ gap: 5 }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
                Joriy parol
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="input"
              />
            </label>

            <label className="grid" style={{ gap: 5 }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
                Yangi parol{" "}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>(kamida 10 belgi)</span>
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
                className="input"
              />
            </label>

            <label className="grid" style={{ gap: 5 }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
                Yangi parolni takrorlang
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
                className="input"
              />
            </label>

            {error && (
              <div
                style={{
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  border: "1px solid #fecaca",
                  borderRadius: "var(--radius)",
                  padding: "9px 12px",
                  fontSize: 13
                }}
              >
                {error}
              </div>
            )}
            {message && (
              <div
                style={{
                  background: "var(--ok-bg)",
                  color: "var(--ok)",
                  border: "1px solid #bbf7d0",
                  borderRadius: "var(--radius)",
                  padding: "9px 12px",
                  fontSize: 13
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ marginTop: 4 }}
            >
              {loading ? "Saqlanmoqda…" : "Parolni o'zgartirish"}
            </button>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
