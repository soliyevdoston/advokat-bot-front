"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import type { Payment } from "../../types";

const revokeObjectUrls = (items: Record<string, string>) => {
  Object.values(items).forEach((url) => URL.revokeObjectURL(url));
};

type ActionModal = {
  id: string;
  action: "approve" | "reject";
  note: string;
};

export default function PaymentsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Payment[]>([]);
  const [receiptPreviewMap, setReceiptPreviewMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [moderating, setModerating] = useState(false);

  useEffect(() => {
    return () => {
      revokeObjectUrls(receiptPreviewMap);
    };
  }, [receiptPreviewMap]);

  const buildReceiptPreviews = async (payments: Payment[]) => {
    const latestReceipts = payments
      .map((payment) => payment.receipts[0])
      .filter((receipt): receipt is Payment["receipts"][number] => Boolean(receipt));

    const entries = await Promise.all(
      latestReceipts.map(async (receipt) => {
        try {
          const blob = await api.getBlob(`/payments/receipts/${receipt.id}/content`);
          const objectUrl = URL.createObjectURL(blob);
          return [receipt.id, objectUrl] as const;
        } catch {
          return null;
        }
      })
    );

    return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Payment[]>("/payments?status=PENDING");
      const previews = await buildReceiptPreviews(data);

      setItems(data);
      setReceiptPreviewMap((prev) => {
        revokeObjectUrls(prev);
        return previews;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openModerate = (paymentId: string, action: "approve" | "reject") => {
    setActionModal({ id: paymentId, action, note: "" });
  };

  const confirmModerate = async () => {
    if (!actionModal) return;
    setModerating(true);
    try {
      await api.post(`/payments/${actionModal.id}/${actionModal.action}`, {
        note: actionModal.note || undefined,
      });
      const label = actionModal.action === "approve" ? "tasdiqlandi" : "rad etildi";
      toast.success(`To'lov ${label}!`);
      setActionModal(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setModerating(false);
    }
  };

  const openReceipt = async (receiptId: string) => {
    try {
      let url = receiptPreviewMap[receiptId];
      if (!url) {
        const blob = await api.getBlob(`/payments/receipts/${receiptId}/content`);
        url = URL.createObjectURL(blob);
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title">To'lovlar moderatsiyasi</h1>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Yuklanmoqda..." : "Yangilash"}
          </button>
        </div>

        {loading ? <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda...</div> : null}
        {error ? <div className="surface panel" style={{ color: "var(--danger)" }}>{error}</div> : null}

        {!loading && !error ? (
          <div className="surface panel">
            {items.length === 0 ? (
              <div className="empty-state">Kutilayotgan to'lovlar yo'q</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mijoz</th>
                    <th>To'lov</th>
                    <th>Tarif</th>
                    <th>Summa</th>
                    <th>Chek</th>
                    <th>Sana</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const latestReceipt = item.receipts[0];
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{item.user.fullName || item.user.username || item.user.id}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.user.telegramId ? `tg: ${item.user.telegramId}` : "-"}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>id: {item.user.id.slice(0, 8)}...</div>
                        </td>
                        <td>
                          <div style={{ fontFamily: "monospace", fontSize: 12 }}>{item.id.slice(0, 8)}...</div>
                          <span className="tag tag-pending">{item.status}</span>
                        </td>
                        <td>{item.tariff.code}</td>
                        <td>{formatMoney(item.amountMinor, item.currency)}</td>
                        <td>
                          {latestReceipt ? (
                            <div className="receipt-cell">
                              {receiptPreviewMap[latestReceipt.id] ? (
                                <img
                                  src={receiptPreviewMap[latestReceipt.id]}
                                  alt="Chek"
                                  className="receipt-thumb"
                                  onClick={() => openReceipt(latestReceipt.id)}
                                />
                              ) : (
                                <div className="receipt-thumb receipt-thumb-fallback">Yuklanmoqda...</div>
                              )}
                              <div className="receipt-meta">
                                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                                  {formatDateTime(latestReceipt.createdAt)}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {item.receipts.map((receipt, index) => (
                                    <button
                                      key={receipt.id}
                                      className="btn-secondary"
                                      style={{ padding: "4px 8px", fontSize: 12 }}
                                      onClick={() => openReceipt(receipt.id)}
                                    >
                                      Chek #{index + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="tag tag-danger">Yo'q</span>
                          )}
                        </td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn-secondary"
                              onClick={() => openModerate(item.id, "approve")}
                            >
                              Tasdiqlash
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => openModerate(item.id, "reject")}
                            >
                              Rad etish
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {/* Moderation confirmation modal */}
        {actionModal ? (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
              display: "grid", placeItems: "center", zIndex: 100
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !moderating) setActionModal(null); }}
          >
            <div className="surface panel" style={{ width: "100%", maxWidth: 420 }}>
              <h2 style={{ marginBottom: 6 }}>
                {actionModal.action === "approve" ? "✅ Tasdiqlash" : "❌ Rad etish"}
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16, fontSize: 14 }}>
                To'lov ID: <strong>{actionModal.id.slice(0, 8)}...</strong>
              </p>
              <div className="grid" style={{ gap: 12 }}>
                <label className="grid" style={{ gap: 5 }}>
                  <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
                    Izoh (ixtiyoriy)
                  </span>
                  <input
                    className="input"
                    value={actionModal.note}
                    onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
                    placeholder={actionModal.action === "approve" ? "Masalan: chek tekshirildi" : "Masalan: soxta chek"}
                    autoFocus
                  />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={actionModal.action === "approve" ? "btn-primary" : "btn-danger"}
                    disabled={moderating}
                    onClick={confirmModerate}
                    style={{ flex: 1 }}
                  >
                    {moderating
                      ? "Saqlanmoqda..."
                      : actionModal.action === "approve"
                        ? "Tasdiqlash"
                        : "Rad etish"}
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={moderating}
                    onClick={() => setActionModal(null)}
                  >
                    Bekor
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
