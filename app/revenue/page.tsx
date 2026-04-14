"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import type { AdminRevenue, PaymentHistoryItem, Paginated } from "../../types";

const statusLabel: Record<string, string> = {
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan"
};

const statusTagClass: Record<string, string> = {
  PENDING: "tag-pending",
  APPROVED: "tag-ok",
  REJECTED: "tag-danger"
};

const PERIODS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "Hafta" },
  { key: "month", label: "Oy" },
  { key: "year", label: "Yil" },
] as const;

type PeriodKey = typeof PERIODS[number]["key"];

function formatAmount(byCurrency: Record<string, number>) {
  return Object.entries(byCurrency)
    .map(([currency, minor]) => formatMoney(minor, currency))
    .join(" + ") || "0";
}

function RevenueBar({ dayStats }: { dayStats: AdminRevenue["dayStats"] }) {
  const max = Math.max(...dayStats.map((d) => d.amount), 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, minWidth: dayStats.length * 18 }}>
        {dayStats.map((d) => {
          const pct = Math.round((d.amount / max) * 100);
          return (
            <div
              key={d.date}
              title={`${d.date}: ${formatMoney(d.amount, d.currency || "UZS")} (${d.count} ta)`}
              style={{
                flex: "0 0 14px",
                height: `${Math.max(pct, d.amount > 0 ? 4 : 1)}%`,
                background: d.amount > 0 ? "var(--ink)" : "var(--border)",
                borderRadius: 3,
                cursor: "default",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
        <span>{dayStats[0]?.date ?? ""}</span>
        <span>{dayStats[dayStats.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

export default function RevenuePage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const [revenue, setRevenue] = useState<AdminRevenue | null>(null);
  const [customFrom, setCustomFrom] = useState(thirtyDaysAgo);
  const [customTo, setCustomTo] = useState(today);
  const [customRevenue, setCustomRevenue] = useState<AdminRevenue | null>(null);
  const [activeTab, setActiveTab] = useState<PeriodKey>("month");
  const [loading, setLoading] = useState(true);
  const [customLoading, setCustomLoading] = useState(false);

  // History
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState<string>("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const LIMIT = 20;

  const loadRevenue = async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminRevenue>("/admin/revenue");
      setRevenue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomRevenue = async () => {
    setCustomLoading(true);
    try {
      const params = new URLSearchParams({ from: customFrom, to: customTo });
      const data = await api.get<AdminRevenue>(`/admin/revenue?${params}`);
      setCustomRevenue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCustomLoading(false);
    }
  };

  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (historyStatus) params.set("status", historyStatus);
      if (historyFrom) params.set("from", historyFrom);
      if (historyTo) params.set("to", historyTo);
      const data = await api.get<Paginated<PaymentHistoryItem>>(`/admin/payment-history?${params}`);
      setHistory(data.items);
      setHistoryTotal(data.total);
      setHistoryPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadRevenue();
    void loadHistory(1);
  }, []);

  const totalPages = Math.ceil(historyTotal / LIMIT);

  const currentPeriodData = revenue ? revenue[activeTab] : null;

  return (
    <AuthGuard>
      <main>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title">Daromad</h1>
          <button className="btn-secondary" onClick={() => { void loadRevenue(); void loadHistory(1); }}>
            Yangilash
          </button>
        </div>

        {/* Period tabs */}
        <div className="surface panel" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveTab(p.key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: activeTab === p.key ? "var(--ink)" : "var(--surface)",
                  color: activeTab === p.key ? "#fff" : "var(--ink)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: "var(--muted)" }}>Yuklanmoqda...</p>
          ) : currentPeriodData ? (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
              <div className="stat-card">
                <div className="stat-number" style={{ color: "var(--ok)" }}>
                  {formatAmount(currentPeriodData.byCurrency)}
                </div>
                <div className="stat-label">Jami daromad</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{currentPeriodData.count}</div>
                <div className="stat-label">To'lovlar soni</div>
              </div>
              {Object.entries(currentPeriodData.byCurrency).map(([cur, minor]) => (
                <div key={cur} className="stat-card">
                  <div className="stat-number" style={{ fontSize: 18 }}>{formatMoney(minor, cur)}</div>
                  <div className="stat-label">{cur}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Custom date range */}
        <div className="surface panel" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 12, fontSize: 15 }}>Ixtiyoriy sana oralig'i</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
              Dan
              <input
                type="date"
                className="input"
                style={{ width: 160 }}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
              Gacha
              <input
                type="date"
                className="input"
                style={{ width: 160 }}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
            <button
              className="btn-primary"
              style={{ padding: "9px 20px", alignSelf: "flex-end" }}
              onClick={loadCustomRevenue}
              disabled={customLoading}
            >
              {customLoading ? "Hisoblanmoqda..." : "Hisoblash"}
            </button>
          </div>

          {customRevenue ? (
            <div style={{ marginTop: 16 }}>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-number" style={{ color: "var(--ok)" }}>
                    {customRevenue.custom
                      ? formatAmount(customRevenue.custom.byCurrency)
                      : "0"}
                  </div>
                  <div className="stat-label">
                    Jami: {customFrom} – {customTo}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {customRevenue.custom?.count ?? 0}
                  </div>
                  <div className="stat-label">To'lovlar soni</div>
                </div>
              </div>

              {customRevenue.dayStats.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" }}>
                    Kunlik grafik
                  </div>
                  <RevenueBar dayStats={customRevenue.dayStats} />
                </div>
              )}
            </div>
          ) : revenue ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" }}>
                So'nggi 30 kun grafik
              </div>
              <RevenueBar dayStats={revenue.dayStats} />
            </div>
          ) : null}
        </div>

        {/* Payment history */}
        <div className="surface panel">
          <h2 style={{ marginBottom: 14, fontSize: 15 }}>To'lov tarixi</h2>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
              Holat
              <select
                className="input"
                style={{ width: 160 }}
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
              >
                <option value="">Barchasi</option>
                <option value="APPROVED">Tasdiqlangan</option>
                <option value="PENDING">Kutilmoqda</option>
                <option value="REJECTED">Rad etilgan</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
              Dan
              <input type="date" className="input" style={{ width: 160 }} value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
              Gacha
              <input type="date" className="input" style={{ width: 160 }} value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
            </label>
            <button className="btn-secondary" style={{ alignSelf: "flex-end" }} onClick={() => loadHistory(1)}>
              Qidirish
            </button>
            <button
              className="btn-secondary"
              style={{ alignSelf: "flex-end" }}
              onClick={() => {
                setHistoryStatus("");
                setHistoryFrom("");
                setHistoryTo("");
                void loadHistory(1);
              }}
            >
              Tozalash
            </button>
          </div>

          {historyLoading ? (
            <p style={{ color: "var(--muted)" }}>Yuklanmoqda...</p>
          ) : history.length === 0 ? (
            <div className="empty-state">To'lovlar topilmadi</div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mijoz</th>
                      <th>Tarif</th>
                      <th>Summa</th>
                      <th>Holat</th>
                      <th>Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>
                            {item.user.fullName || item.user.username || item.user.id.slice(0, 8)}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {item.user.telegramId ? `tg: ${item.user.telegramId}` : "–"}
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{item.tariff.code}</td>
                        <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                          {formatMoney(item.amountMinor, item.currency)}
                        </td>
                        <td>
                          <span className={`tag ${statusTagClass[item.status] ?? "tag-pending"}`}>
                            {statusLabel[item.status] ?? item.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, whiteSpace: "nowrap", color: "var(--muted)" }}>
                          {formatDateTime(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Jami: {historyTotal} ta | {historyPage}/{totalPages} bet
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: "5px 12px" }}
                    disabled={historyPage <= 1}
                    onClick={() => loadHistory(historyPage - 1)}
                  >
                    ← Oldingi
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: "5px 12px" }}
                    disabled={historyPage >= totalPages}
                    onClick={() => loadHistory(historyPage + 1)}
                  >
                    Keyingi →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
