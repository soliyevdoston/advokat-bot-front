"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { setTokens } from "../../lib/auth";

const APK_URL = process.env.NEXT_PUBLIC_APK_URL ?? "/advokat-admin.apk";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function AccountPage() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window));

    const onBefore = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);

  const installPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    try {
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Ilova o'rnatildi.");
      }
    } catch {
      // ignore
    }
    setInstallPrompt(null);
  };

  const downloadApk = async () => {
    try {
      // HEAD probe so we don't take the user to a 404 page on Vercel.
      const head = await fetch(APK_URL, { method: "HEAD" });
      if (!head.ok) {
        toast.error(
          "APK fayl hali yuklanmagan. Hozircha brauzer orqali \"Ilovani o'rnatish\" tugmasidan foydalaning."
        );
        return;
      }
      const link = document.createElement("a");
      link.href = APK_URL;
      link.download = "advokat-admin.apk";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Yuklash boshlandi.");
    } catch {
      toast.error("APK yuklanmadi. Internetni tekshirib qaytadan urining.");
    }
  };

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

        {/* App download / install section */}
        <div className="surface panel" style={{ maxWidth: 480, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <strong style={{ fontSize: 15 }}>Telefon uchun ilova</strong>
          </div>
          <p style={{ color: "var(--muted)", margin: "0 0 14px", fontSize: 13, lineHeight: 1.45 }}>
            Brauzersiz, bosh ekrandan to'g'ridan-to'g'ri kirish uchun
            ilovani o'rnatib oling. Bildirishnomalar va offline kesh ham yoqiladi.
          </p>

          {isInstalled ? (
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
              ✓ Ilova allaqachon o'rnatilgan — siz hozir uning ichidasiz.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={downloadApk}
                style={{ width: "100%" }}
              >
                APK yuklab olish (Android)
              </button>

              {installPrompt && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={installPwa}
                  style={{ width: "100%" }}
                >
                  Brauzerdan o'rnatish
                </button>
              )}

              {isIos && (
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "var(--muted)",
                    fontSize: 12.5,
                    lineHeight: 1.5
                  }}
                >
                  iPhone uchun: Safari'da <strong>Share</strong> →{" "}
                  <strong>"Add to Home Screen"</strong> bosing.
                </p>
              )}
            </div>
          )}
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
