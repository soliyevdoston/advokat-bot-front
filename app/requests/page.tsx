"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { LiveBadge } from "../../components/LiveBadge";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { usePolling } from "../../lib/usePolling";
import type { Payment } from "../../types";

const ADVOCATE_CODES = ["advocate_physical", "advocate_legal", "advocate_foreign"];

type ScheduleModal = {
  paymentId: string;
  clientName: string;
  phone: string;
  lang: "UZ" | "RU" | "EN";
  format: "zoom" | "phone" | "visit";
  datetime: string;
  zoomLink: string;
  address: string;
};

const getClientName = (p: Payment) =>
  p.user?.fullName || p.user?.username || p.user?.id?.slice(0, 8) || "Mijoz";

export default function RequestsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ScheduleModal | null>(null);
  const [sending, setSending] = useState(false);
  const [scheduled, setScheduled] = useState<Set<string>>(new Set());

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<Payment[]>("/payments?status=APPROVED");
      const advocate = data.filter(p => ADVOCATE_CODES.includes(p.tariff?.code ?? ""));
      // Sort by createdAt ascending (oldest first = first in queue)
      advocate.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setItems(advocate);
    } catch (err) {
      if (!silent) toast.error((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  usePolling(() => load(true), 10000);

  const openModal = (p: Payment) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setModal({
      paymentId: p.id,
      clientName: getClientName(p),
      phone: p.user?.phone ?? "",
      lang: (p.user?.language ?? "UZ") as "UZ" | "RU" | "EN",
      format: "phone",
      datetime: now.toISOString().slice(0, 16),
      zoomLink: "",
      address: "",
    });
  };

  const sendSchedule = async () => {
    if (!modal) return;
    if (!modal.datetime) { toast.error("Sana va vaqtni kiriting"); return; }
    if (modal.format === "zoom" && !modal.zoomLink.trim()) { toast.error("Zoom link kiriting"); return; }
    if (modal.format === "visit" && !modal.address.trim()) { toast.error("Manzilni kiriting"); return; }
    setSending(true);
    try {
      const dt = new Date(modal.datetime);
      const formatted = dt.toLocaleString("uz-UZ", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent",
      });
      await api.post(`/payments/${modal.paymentId}/schedule`, {
        format: modal.format,
        datetime: formatted,
        datetimeISO: new Date(modal.datetime).toISOString(),
        ...(modal.format === "zoom" ? { zoomLink: modal.zoomLink.trim() } : {}),
        ...(modal.format === "visit" ? { address: modal.address.trim() } : {}),
      });
      setScheduled(prev => new Set([...prev, modal.paymentId]));
      toast.success("Suhbat belgilandi! Mijozga xabar yuborildi.");
      setModal(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const tariffLabel = (p: Payment) => {
    const code = p.tariff?.code ?? "";
    if (code === "advocate_physical") return "👤 Jismoniy";
    if (code === "advocate_legal") return "🏢 Yuridik";
    if (code === "advocate_foreign") return "🌍 Chet el";
    return code;
  };

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Navbat <LiveBadge />
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>
              {items.length} ta tasdiqlangan to&apos;lov
            </span>
            <button className="btn-secondary" onClick={() => load()} disabled={loading}>
              Yangilash
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="surface panel">
            <div className="empty-state">
              <p>Navbatda hech kim yo&apos;q.</p>
              <p style={{ fontSize: 13 }}>Tasdiqlanagan to&apos;lovlar bu yerda ko&apos;rinadi.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((p, idx) => (
              <div key={p.id} className="surface panel" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 14,
                borderLeft: scheduled.has(p.id) ? "4px solid var(--ok)" : "4px solid var(--accent)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--accent)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 15, flexShrink: 0,
                  }}>{idx + 1}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{getClientName(p)}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {p.user?.phone && <span>📞 {p.user.phone}</span>}
                      <span>{tariffLabel(p)}</span>
                      <span>{formatMoney(p.amountMinor, p.currency)}</span>
                      <span>🕒 {formatDateTime(p.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  {scheduled.has(p.id) ? (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
                      background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                    }}>
                      ✅ Belgilandi
                    </span>
                  ) : (
                    <button className="btn-primary" onClick={() => openModal(p)}>
                      📅 Suhbat belgilash
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Modal */}
        {modal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 16,
          }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <div className="surface panel" style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ marginBottom: 4, fontSize: 17 }}>📅 Suhbat belgilash</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
                <strong>{modal.clientName}</strong>
                {modal.phone && <> · 📞 {modal.phone}</>}
              </p>

              <div style={{ display: "grid", gap: 16 }}>
                {/* Format */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Suhbat usuli
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {(["phone", "zoom", "visit"] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        className={modal.format === f ? "btn-primary" : "btn-secondary"}
                        onClick={() => setModal({ ...modal, format: f })}
                        style={{ fontSize: 13 }}
                      >
                        {f === "phone" ? "📞 Telefon" : f === "zoom" ? "🎥 Zoom" : "🤝 Yuzma-yuz"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Datetime */}
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sana va vaqt</span>
                  <input
                    type="datetime-local"
                    className="input"
                    value={modal.datetime}
                    onChange={e => setModal({ ...modal, datetime: e.target.value })}
                  />
                </label>

                {/* Zoom link */}
                {modal.format === "zoom" && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Zoom havola</span>
                    <input
                      className="input"
                      placeholder="https://zoom.us/j/..."
                      value={modal.zoomLink}
                      onChange={e => setModal({ ...modal, zoomLink: e.target.value })}
                    />
                  </label>
                )}

                {/* Address */}
                {modal.format === "visit" && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manzil</span>
                    <input
                      className="input"
                      placeholder="Farg&apos;ona shahri, Al-Farg&apos;oniy ko&apos;chasi, 15-uy"
                      value={modal.address}
                      onChange={e => setModal({ ...modal, address: e.target.value })}
                    />
                  </label>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="btn-primary" onClick={sendSchedule} disabled={sending} style={{ flex: 1 }}>
                    {sending ? "Yuborilmoqda..." : "✅ Tasdiqlash va yuborish"}
                  </button>
                  <button className="btn-secondary" onClick={() => setModal(null)}>
                    Bekor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
