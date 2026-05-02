"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { LiveBadge } from "../../components/LiveBadge";
import { Sk } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { usePolling } from "../../lib/usePolling";
import type { EscalationItem, Payment } from "../../types";

type BookingQueueItem = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  meetLink?: string | null;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    telegramId: string | null;
    phone: string | null;
    language?: string | null;
  };
  slot: {
    startsAt: string;
    endsAt: string;
    timezone: string;
  };
  payment: {
    tariff: {
      code: string;
    };
  };
};

type QueueItem = {
  id: string;
  priority: 1 | 2 | 3;
  stage: string;
  client: string;
  contact: string;
  tariffCode: string;
  timeText: string;
  createdAt: number;
  actionHref: "/payments" | "/bookings";
  actionText: string;
  statusTag: "tag-danger" | "tag-pending" | "tag-ok";
  meetLink?: string | null;
};

const clientName = (params: { fullName: string | null; username: string | null; id: string }) =>
  params.fullName || params.username || params.id.slice(0, 8);

function genJitsiLink() {
  const id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return `https://meet.jit.si/advokat-${id}`;
}

export default function RequestsPage() {
  const toast = useToast();
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [approvedPayments, setApprovedPayments] = useState<Payment[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingQueueItem[]>([]);
  const [premiumEscalations, setPremiumEscalations] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [pending, approved, bookings, escalations] = await Promise.all([
        api.get<Payment[]>("/payments?status=PENDING"),
        api.get<Payment[]>("/payments?status=APPROVED"),
        api.get<BookingQueueItem[]>("/bookings?upcoming=true"),
        api.get<EscalationItem[]>("/admin/escalations?status=OPEN&limit=50").catch(() => [] as EscalationItem[]),
      ]);
      setPendingPayments(pending);
      setApprovedPayments(approved);
      setUpcomingBookings(bookings);
      setPremiumEscalations(escalations.filter(e => e.reason?.includes("PREMIUM")));
    } catch (err) {
      if (!silent) setError((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  usePolling(() => load(true), 6000);

  const sendPremiumLink = async (esc: EscalationItem) => {
    const tgId = esc.user?.telegramId;
    if (!tgId) { toast.error("Telegram ID yo'q"); return; }
    setSendingId(esc.id);
    const link = genJitsiLink();
    const lang = (esc.user?.language ?? "UZ") as "UZ" | "RU" | "EN";
    try {
      await api.post("/admin/send-meeting-link", {
        telegramId: tgId,
        link,
        slotTime: "Premium qabul",
        lang,
      });
      toast.success(`Link yuborildi: ${link}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSendingId(null);
    }
  };

  const queue = useMemo(() => {
    const rows: QueueItem[] = [];

    pendingPayments.forEach((item) => {
      rows.push({
        id: `payment-pending-${item.id}`,
        priority: 1,
        stage: "To'lovni tasdiqlash",
        client: clientName(item.user),
        contact: item.user.telegramId ? `tg:${item.user.telegramId}` : "–",
        tariffCode: item.tariff.code,
        timeText: formatDateTime(item.createdAt),
        createdAt: new Date(item.createdAt).getTime(),
        actionHref: "/payments",
        actionText: "To'lovlarga o'tish",
        statusTag: "tag-danger",
      });
    });

    approvedPayments
      .filter((item) => !item.booking)
      .forEach((item) => {
        rows.push({
          id: `payment-approved-${item.id}`,
          priority: 2,
          stage: "Mijoz vaqt tanlashi kutilmoqda",
          client: clientName(item.user),
          contact: item.user.telegramId ? `tg:${item.user.telegramId}` : "–",
          tariffCode: item.tariff.code,
          timeText: formatDateTime(item.createdAt),
          createdAt: new Date(item.createdAt).getTime(),
          actionHref: "/payments",
          actionText: "To'lovlarga o'tish",
          statusTag: "tag-pending",
        });
      });

    upcomingBookings.forEach((item) => {
      rows.push({
        id: `booking-upcoming-${item.id}`,
        priority: 3,
        stage: "Konsultatsiya rejalashtirilgan",
        client: clientName(item.user),
        contact: item.user.telegramId ? `tg:${item.user.telegramId}` : item.user.phone || "–",
        tariffCode: item.payment.tariff.code,
        timeText: formatDateTime(item.slot.startsAt),
        createdAt: new Date(item.slot.startsAt).getTime(),
        actionHref: "/bookings",
        actionText: "Bronlarga o'tish",
        statusTag: "tag-ok",
        meetLink: item.meetLink,
      });
    });

    return rows.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt - b.createdAt;
    });
  }, [approvedPayments, pendingPayments, upcomingBookings]);

  const stats = useMemo(
    () => ({
      pendingCount: pendingPayments.length,
      waitingSlotCount: approvedPayments.filter((item) => !item.booking).length,
      upcomingCount: upcomingBookings.length,
      premiumCount: premiumEscalations.length,
    }),
    [approvedPayments, pendingPayments, upcomingBookings, premiumEscalations]
  );

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>Murojaatlar navbati <LiveBadge /></h1>
          <button className="btn-secondary" onClick={() => load()} disabled={loading}>
            {loading ? "Yuklanmoqda..." : "Yangilash"}
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginBottom: 20 }}>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "var(--danger)" }}>{stats.pendingCount}</div>
            <div className="stat-label">To'lov kutayotganlar</div>
          </div>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "var(--warn)" }}>{stats.waitingSlotCount}</div>
            <div className="stat-label">Vaqt kutayotganlar</div>
          </div>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "var(--ok)" }}>{stats.upcomingCount}</div>
            <div className="stat-label">Yaqin konsultatsiyalar</div>
          </div>
          <div className="surface panel stat-card">
            <div className="stat-number" style={{ color: "#f59e0b" }}>{stats.premiumCount}</div>
            <div className="stat-label">⭐ Premium kutayotganlar</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
              <Sk.Card rows={3} />
              <Sk.Card rows={3} />
            </div>
            <Sk.Table rows={4} cols={4} />
          </div>
        ) : null}
        {error ? <div className="surface panel" style={{ color: "var(--danger)" }}>{error}</div> : null}

        {/* Premium escalations */}
        {!loading && premiumEscalations.length > 0 && (
          <div className="surface panel" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>⭐ Premium murojaatlar</h2>
            <div className="grid" style={{ gap: 10 }}>
              {premiumEscalations.map((esc) => {
                const contact = esc.reason?.match(/contact:(.+)$/)?.[1] ?? "–";
                const tgId = esc.user?.telegramId ?? "";
                const isSending = sendingId === esc.id;
                return (
                  <div
                    key={esc.id}
                    style={{
                      border: "1px solid #f59e0b",
                      borderRadius: "var(--radius)",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      background: "#fffbeb",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{clientName(esc.user)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {tgId ? `tg: ${tgId}` : "–"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Aloqa: {contact}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {formatDateTime(esc.createdAt)}
                      </div>
                    </div>
                    {tgId ? (
                      <button
                        className="btn-primary"
                        disabled={isSending}
                        style={{ fontSize: 13, padding: "7px 14px", background: "#f59e0b", borderColor: "#f59e0b" }}
                        onClick={() => sendPremiumLink(esc)}
                      >
                        {isSending ? "Yuborilmoqda..." : "Link yuborish"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>tg yo'q</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error ? (
          <div className="surface panel">
            {queue.length === 0 ? (
              <div className="empty-state">Hozircha navbat bo'sh</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Ustuvorlik</th>
                    <th>Bosqich</th>
                    <th>Mijoz</th>
                    <th>Aloqa</th>
                    <th>Tarif</th>
                    <th>Vaqt</th>
                    <th>Meet link</th>
                    <th>Bo'lim</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={`tag ${item.statusTag}`}>P{item.priority}</span>
                      </td>
                      <td>{item.stage}</td>
                      <td>{item.client}</td>
                      <td style={{ fontSize: 13 }}>{item.contact}</td>
                      <td>
                        {item.tariffCode === "qabul_booking" ? (
                          <span style={{ background: "#0d5e93", color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 12 }}>Qabul</span>
                        ) : (
                          <span style={{ background: "#6b7280", color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 12 }}>AI</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>{item.timeText}</td>
                      <td>
                        {item.meetLink ? (
                          <a
                            href={item.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "var(--ok)", wordBreak: "break-all", maxWidth: 160, display: "block" }}
                          >
                            {item.meetLink.replace("https://", "")}
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>–</span>
                        )}
                      </td>
                      <td>
                        <Link href={item.actionHref} style={{ color: "#0d5e93", fontWeight: 700, fontSize: 13 }}>
                          {item.actionText}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
