"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { TopNav } from "../../components/TopNav";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import type { Payment } from "../../types";

const revokeObjectUrls = (items: Record<string, string>) => {
  Object.values(items).forEach((url) => URL.revokeObjectURL(url));
};

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [receiptPreviewMap, setReceiptPreviewMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const moderate = async (paymentId: string, action: "approve" | "reject") => {
    const note = prompt(`Moderation note (${action})`, "") ?? "";
    try {
      await api.post(`/payments/${paymentId}/${action}`, { note: note || undefined });
      await load();
    } catch (err) {
      alert((err as Error).message);
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
      alert((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <TopNav />
      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginBottom: 12 }}>Payments Moderation</h1>
          <button className="btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>

        {loading ? <div className="surface panel">Loading payments...</div> : null}
        {error ? <div className="surface panel">{error}</div> : null}

        {!loading && !error ? (
          <div className="surface panel">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Payment</th>
                  <th>Tariff</th>
                  <th>Amount</th>
                  <th>Receipt(s)</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No pending payments.</td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const latestReceipt = item.receipts[0];
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{item.user.fullName || item.user.username || item.user.id}</div>
                          <div style={{ fontSize: 12, color: "#4f6471" }}>{item.user.telegramId || "-"}</div>
                          <div style={{ fontSize: 12, color: "#4f6471" }}>user_id: {item.user.id.slice(0, 8)}...</div>
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
                                  alt="Receipt preview"
                                  className="receipt-thumb"
                                  onClick={() => openReceipt(latestReceipt.id)}
                                />
                              ) : (
                                <div className="receipt-thumb receipt-thumb-fallback">Preview loading...</div>
                              )}
                              <div className="receipt-meta">
                                <div style={{ fontSize: 12, color: "#4f6471" }}>
                                  Latest: {formatDateTime(latestReceipt.createdAt)}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {item.receipts.map((receipt, index) => (
                                    <button
                                      key={receipt.id}
                                      className="btn-secondary"
                                      style={{ padding: "4px 8px", fontSize: 12 }}
                                      onClick={() => openReceipt(receipt.id)}
                                    >
                                      Receipt #{index + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="tag tag-danger">Missing</span>
                          )}
                        </td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-secondary" onClick={() => moderate(item.id, "approve")}>
                              Approve
                            </button>
                            <button className="btn-danger" onClick={() => moderate(item.id, "reject")}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
