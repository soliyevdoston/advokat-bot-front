"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { LiveBadge } from "../../components/LiveBadge";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { usePolling } from "../../lib/usePolling";
import type { Payment } from "../../types";

type Tab = "PENDING" | "APPROVED" | "REJECTED";

const TAB_LABEL: Record<Tab, string> = {
  PENDING: "⏳ Kutilmoqda",
  APPROVED: "✅ To'langan",
  REJECTED: "❌ Rad etilgan",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#b45309",
  APPROVED: "#16a34a",
  REJECTED: "#dc2626",
};
const STATUS_BG: Record<string, string> = {
  PENDING: "#fffbeb",
  APPROVED: "#f0fdf4",
  REJECTED: "#fef2f2",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Kutilmoqda",
  APPROVED: "To'langan",
  REJECTED: "Rad etilgan",
};

export default function PaymentsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [items, setItems] = useState<Payment[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; action: "approve" | "reject"; note: string } | null>(null);
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});

  const loadCounts = async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        api.get<Payment[]>("/payments?status=PENDING").then(d => d.length).catch(() => 0),
        api.get<Payment[]>("/payments?status=APPROVED").then(d => d.length).catch(() => 0),
        api.get<Payment[]>("/payments?status=REJECTED").then(d => d.length).catch(() => 0),
      ]);
      setCounts({ PENDING: pending, APPROVED: approved, REJECTED: rejected });
    } catch { /* ignore */ }
  };

  const loadTab = async (status: Tab, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<Payment[]>(`/payments?status=${status}`);
      setItems(data);
      // Load receipt previews for pending
      if (status === "PENDING") {
        const entries = await Promise.all(
          data.flatMap(p => p.receipts.slice(0, 1)).map(async r => {
            try {
              const blob = await api.getBlob(`/payments/receipts/${r.id}/content`);
              return [r.id, URL.createObjectURL(blob)] as const;
            } catch { return null; }
          })
        );
        setPreviewMap(Object.fromEntries(entries.filter((e): e is [string, string] => e !== null)));
      }
    } catch (err) {
      if (!silent) toast.error((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void loadCounts(); void loadTab(tab); }, [tab]);

  usePolling(async () => {
    await loadCounts();
    await loadTab(tab, true);
  }, 8000);

  const doModerate = async (id: string, action: "approve" | "reject", note?: string) => {
    setModerating(id);
    try {
      await api.post(`/payments/${id}/${action}`, { note: note || undefined });
      toast.success(action === "approve" ? "✅ To'lov tasdiqlandi!" : "❌ Rad etildi");
      setNoteModal(null);
      await loadCounts();
      await loadTab(tab);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setModerating(null);
    }
  };

  const openReceipt = async (receiptId: string) => {
    let url = previewMap[receiptId];
    if (!url) {
      try {
        const blob = await api.getBlob(`/payments/receipts/${receiptId}/content`);
        url = URL.createObjectURL(blob);
      } catch (err) { toast.error((err as Error).message); return; }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AuthGuard>
      <main>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            💳 To'lovlar <LiveBadge />
          </h1>
          <button className="btn-secondary" onClick={() => { void loadCounts(); void loadTab(tab); }}>
            ↻ Yangilash
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {(["PENDING", "APPROVED", "REJECTED"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 13,
                cursor: "pointer", border: "none", fontWeight: tab === t ? 700 : 500,
                background: tab === t ? STATUS_BG[t] : "var(--hover)",
                color: tab === t ? STATUS_COLOR[t] : "var(--ink-2)",
                outline: tab === t ? `2px solid ${STATUS_COLOR[t]}` : "none",
                outlineOffset: -2,
              }}
            >
              {TAB_LABEL[t]}
              {counts[t] > 0 && (
                <span style={{
                  marginLeft: 8, background: STATUS_COLOR[t], color: "#fff",
                  borderRadius: 99, fontSize: 11, padding: "1px 6px",
                }}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="surface panel" style={{ height: 100, opacity: 0.4 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="surface panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
            {tab === "PENDING" ? "Kutilayotgan to'lovlar yo'q" :
             tab === "APPROVED" ? "To'langan to'lovlar yo'q" : "Rad etilgan to'lovlar yo'q"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(item => (
              <PaymentCard
                key={item.id}
                item={item}
                tab={tab}
                previewMap={previewMap}
                moderating={moderating === item.id}
                onApprove={() => setNoteModal({ id: item.id, action: "approve", note: "" })}
                onReject={() => setNoteModal({ id: item.id, action: "reject", note: "" })}
                onOpenReceipt={openReceipt}
              />
            ))}
          </div>
        )}

        {/* Moderation modal */}
        {noteModal && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center", zIndex: 100 }}
            onClick={e => { if (e.target === e.currentTarget) setNoteModal(null); }}
          >
            <div className="surface panel" style={{ width: "100%", maxWidth: 420 }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>
                {noteModal.action === "approve" ? "✅ To'lovni tasdiqlash" : "❌ To'lovni rad etish"}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
                ID: <code style={{ fontSize: 12 }}>{noteModal.id.slice(0, 12)}…</code>
              </p>
              <div className="grid" style={{ gap: 12 }}>
                <label className="grid" style={{ gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Izoh (ixtiyoriy)</span>
                  <input
                    className="input"
                    value={noteModal.note}
                    onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
                    placeholder={noteModal.action === "approve" ? "Chek tekshirildi" : "Soxta chek"}
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") void doModerate(noteModal.id, noteModal.action, noteModal.note); }}
                  />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={noteModal.action === "approve" ? "btn-primary" : "btn-danger"}
                    onClick={() => void doModerate(noteModal.id, noteModal.action, noteModal.note)}
                    disabled={!!moderating}
                    style={{ flex: 1 }}
                  >
                    {moderating ? "Saqlanmoqda..." : noteModal.action === "approve" ? "Tasdiqlash" : "Rad etish"}
                  </button>
                  <button className="btn-secondary" onClick={() => setNoteModal(null)}>Bekor</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}

function PaymentCard({
  item, tab, previewMap, moderating, onApprove, onReject, onOpenReceipt,
}: {
  item: Payment;
  tab: Tab;
  previewMap: Record<string, string>;
  moderating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenReceipt: (id: string) => void;
}) {
  const receipt = item.receipts[0];
  const thumbUrl = receipt ? previewMap[receipt.id] : null;

  return (
    <div className="surface panel" style={{
      padding: 0, overflow: "hidden",
      borderLeft: `4px solid ${STATUS_COLOR[item.status]}`,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 0 }}>

        {/* Main info */}
        <div style={{ padding: "14px 16px" }}>
          {/* Row 1: Client */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              {item.user.fullName || item.user.username || item.user.id.slice(0, 8)}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: STATUS_BG[item.status], color: STATUS_COLOR[item.status],
            }}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>

          {/* Row 2: Contact */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10, fontSize: 13 }}>
            {item.user.phone && (
              <a href={`tel:${item.user.phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                📞 {item.user.phone}
              </a>
            )}
            {item.user.username && (
              <a href={`https://t.me/${item.user.username}`} target="_blank" rel="noreferrer"
                style={{ color: "#2563eb", textDecoration: "none" }}>
                ✈️ @{item.user.username}
              </a>
            )}
            {!item.user.username && item.user.telegramId && (
              <span style={{ color: "var(--muted)" }}>✈️ tg:{item.user.telegramId}</span>
            )}
          </div>

          {/* Row 3: Payment details */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--ink-2)" }}>
            <span>📋 {item.tariff.titleI18n?.uz ?? item.tariff.code}</span>
            <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>
              💰 {formatMoney(item.amountMinor, item.currency)}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              🕐 {formatDateTime(item.createdAt)}
            </span>
          </div>

          {/* Moderation note if any */}
          {item.moderationNote && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
              Izoh: {item.moderationNote}
            </div>
          )}

          {/* Actions for pending */}
          {tab === "PENDING" && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="btn-primary"
                onClick={onApprove}
                disabled={moderating}
                style={{ fontSize: 13 }}
              >
                ✅ Tasdiqlash
              </button>
              <button
                className="btn-danger"
                onClick={onReject}
                disabled={moderating}
                style={{ fontSize: 13 }}
              >
                ❌ Rad etish
              </button>
              {receipt && (
                <button
                  className="btn-secondary"
                  onClick={() => onOpenReceipt(receipt.id)}
                  style={{ fontSize: 13 }}
                >
                  🧾 Chekni ochish
                </button>
              )}
            </div>
          )}

          {/* For approved/rejected — just show receipt link */}
          {tab !== "PENDING" && receipt && (
            <div style={{ marginTop: 8 }}>
              <button
                className="btn-secondary"
                onClick={() => onOpenReceipt(receipt.id)}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                🧾 Chekni ko'rish
              </button>
            </div>
          )}
        </div>

        {/* Receipt thumb (pending only) */}
        {tab === "PENDING" && receipt && (
          <div
            style={{
              width: 90, minHeight: 90,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--hover)", cursor: "pointer", flexShrink: 0,
              borderLeft: "1px solid var(--border)",
            }}
            onClick={() => onOpenReceipt(receipt.id)}
            title="Chekni ko'rish"
          >
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt="Chek"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: 8 }}>
                🧾<br />Chek
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
