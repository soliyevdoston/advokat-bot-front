"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { LiveBadge } from "../../components/LiveBadge";
import { Sk } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { usePolling } from "../../lib/usePolling";
import type { EscalationItem } from "../../types";

type AppointmentFormat = "zoom" | "phone" | "visit";

type AppointmentModal = {
  escalationId: string;
  telegramId: string;
  lang: "UZ" | "RU" | "EN";
  clientName: string;
  datetime: string;
  format: AppointmentFormat;
  zoomLink: string;
};

const clientName = (params: { fullName: string | null; username: string | null; id: string }) =>
  params.fullName || params.username || params.id.slice(0, 8);

const contactFromReason = (reason: string | null): string => {
  if (!reason) return "–";
  const m =
    reason.match(/contact_confirmed:(.+)$/) ??
    reason.match(/contact:(.+)$/) ??
    reason.match(/contact_request:(.+)$/);
  return m ? decodeURIComponent(m[1]) : "–";
};

const reasonLabel = (reason: string | null): string => {
  if (!reason) return "Noma'lum";
  if (reason.startsWith("advocate_consult:")) {
    const fmt = reason.split(":")[2];
    if (fmt === "zoom") return "🎥 Zoom maslahat";
    if (fmt === "phone") return "📞 Telefon maslahat";
    if (fmt === "visit") return "🤝 Yuzma-yuz maslahat";
    return "Advokat maslahat";
  }
  if (reason.includes("contact_confirmed")) return "📞 Aloqa tasdiqlangan";
  if (reason.includes("PREMIUM")) return "⭐ Premium";
  if (reason.includes("qabul")) return "📅 Qabul";
  return reason.slice(0, 40);
};

export default function RequestsPage() {
  const toast = useToast();
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<AppointmentModal | null>(null);
  const [sending, setSending] = useState(false);

  const load = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const data = await api.get<EscalationItem[]>("/admin/escalations?limit=100");
      setEscalations(data.filter(e => e.status === "OPEN" || e.status === "IN_PROGRESS"));
    } catch (err) {
      if (!silent) setError((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  usePolling(() => load(true), 8000);

  const openModal = (esc: EscalationItem) => {
    const tgId = esc.user?.telegramId;
    if (!tgId) { toast.error("Telegram ID yo'q"); return; }
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const datetimeLocal = now.toISOString().slice(0, 16);
    setModal({
      escalationId: esc.id,
      telegramId: tgId,
      lang: (esc.user?.language ?? "UZ") as "UZ" | "RU" | "EN",
      clientName: clientName(esc.user),
      datetime: datetimeLocal,
      format: "zoom",
      zoomLink: "",
    });
  };

  const sendAppointment = async () => {
    if (!modal) return;
    if (!modal.datetime) { toast.error("Sana va vaqtni kiriting"); return; }
    if (modal.format === "zoom" && !modal.zoomLink.trim()) {
      toast.error("Zoom link kiriting");
      return;
    }
    setSending(true);
    try {
      const dt = new Date(modal.datetime);
      const formatted = dt.toLocaleString("uz-UZ", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent"
      });
      await api.post("/admin/send-appointment", {
        telegramId: modal.telegramId,
        lang: modal.lang,
        datetime: formatted,
        format: modal.format,
        ...(modal.format === "zoom" ? { zoomLink: modal.zoomLink.trim() } : {}),
      });
      toast.success("Xabar mijozga yuborildi!");
      setModal(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Qabul so&apos;rovlari <LiveBadge />
          </h1>
          <button className="btn-secondary" onClick={() => load()} disabled={loading}>
            {loading ? "Yuklanmoqda..." : "Yangilash"}
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginBottom: 20 }}>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "var(--danger)" }}>
              {escalations.filter(e => e.status === "OPEN").length}
            </div>
            <div className="stat-label">Yangi so&apos;rovlar</div>
          </div>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "var(--warn)" }}>
              {escalations.filter(e => e.status === "IN_PROGRESS").length}
            </div>
            <div className="stat-label">Jarayonda</div>
          </div>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "#f59e0b" }}>
              {escalations.filter(e => e.reason?.includes("PREMIUM")).length}
            </div>
            <div className="stat-label">⭐ Premium</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sk.Card rows={3} />
            <Sk.Card rows={3} />
          </div>
        ) : null}
        {error ? <div className="surface panel" style={{ color: "var(--danger)" }}>{error}</div> : null}

        {!loading && !error && escalations.length === 0 && (
          <div className="surface panel">
            <div className="empty-state">Ochiq so&apos;rovlar yo&apos;q</div>
          </div>
        )}

        {!loading && !error && escalations.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {escalations.map((esc) => {
              const tgId = esc.user?.telegramId;
              const contact = contactFromReason(esc.reason);
              const label = reasonLabel(esc.reason);
              const isPremium = esc.reason?.includes("PREMIUM");
              return (
                <div
                  key={esc.id}
                  className="surface panel"
                  style={{
                    borderLeft: `4px solid ${isPremium ? "#f59e0b" : esc.status === "IN_PROGRESS" ? "var(--warn)" : "var(--danger)"}`,
                    padding: "14px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                        {clientName(esc.user)}
                        {isPremium && (
                          <span style={{ marginLeft: 8, background: "#f59e0b", color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 11 }}>
                            PREMIUM
                          </span>
                        )}
                        <span style={{
                          marginLeft: 8,
                          background: esc.status === "IN_PROGRESS" ? "var(--warn)" : "var(--danger)",
                          color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 11
                        }}>
                          {esc.status === "IN_PROGRESS" ? "Jarayonda" : "Yangi"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 2 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 2 }}>
                        Aloqa: <b>{contact}</b>
                      </div>
                      {tgId && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
                          Telegram: {tgId}
                        </div>
                      )}
                      {esc.user?.phone && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
                          Tel: {esc.user.phone}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                        {formatDateTime(esc.createdAt)}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      {tgId ? (
                        <button
                          className="btn-primary"
                          style={{ fontSize: 13, padding: "7px 14px", whiteSpace: "nowrap" }}
                          onClick={() => openModal(esc)}
                        >
                          📅 Uchrashuv belgilash
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>Telegram ID yo&apos;q</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Appointment modal */}
        {modal && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
          >
            <div
              className="surface"
              style={{ borderRadius: "var(--radius)", padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
            >
              <h2 style={{ margin: "0 0 18px", fontSize: 17 }}>
                📅 Uchrashuv belgilash — {modal.clientName}
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Sana va vaqt
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={modal.datetime}
                  onChange={e => setModal(m => m ? { ...m, datetime: e.target.value } : m)}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Uchrashuv turi
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["zoom", "phone", "visit"] as AppointmentFormat[]).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setModal(m => m ? { ...m, format: fmt } : m)}
                      style={{
                        flex: 1, padding: "8px 6px", borderRadius: "var(--radius)",
                        border: `2px solid ${modal.format === fmt ? "var(--accent)" : "var(--border)"}`,
                        background: modal.format === fmt ? "var(--accent)" : "var(--surface)",
                        color: modal.format === fmt ? "#fff" : "var(--ink)",
                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                      }}
                    >
                      {fmt === "zoom" ? "🎥 Zoom" : fmt === "phone" ? "📞 Telefon" : "🤝 Yuzma-yuz"}
                    </button>
                  ))}
                </div>
              </div>

              {modal.format === "zoom" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Zoom link
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://zoom.us/j/..."
                    value={modal.zoomLink}
                    onChange={e => setModal(m => m ? { ...m, zoomLink: e.target.value } : m)}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setModal(null)}
                  disabled={sending}
                >
                  Bekor qilish
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 2 }}
                  onClick={sendAppointment}
                  disabled={sending}
                >
                  {sending ? "Yuborilmoqda..." : "📤 Mijozga yuborish"}
                </button>
              </div>

              <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
                {modal.format === "zoom"
                  ? "Mijozga Zoom havolasi yuboriladi"
                  : modal.format === "phone"
                  ? "Mijozga siz chaqirasiz deb xabar yuboriladi"
                  : "Mijozga yuzma-yuz uchrashuv tasdiqlanadi"}
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
