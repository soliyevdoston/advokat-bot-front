"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { Payment } from "../../types";

type BookingQueueItem = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    telegramId: string | null;
    phone: string | null;
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
};

const clientName = (params: { fullName: string | null; username: string | null; id: string }) =>
  params.fullName || params.username || params.id.slice(0, 8);

export default function RequestsPage() {
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [approvedPayments, setApprovedPayments] = useState<Payment[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, approved, bookings] = await Promise.all([
        api.get<Payment[]>("/payments?status=PENDING"),
        api.get<Payment[]>("/payments?status=APPROVED"),
        api.get<BookingQueueItem[]>("/bookings?upcoming=true")
      ]);
      setPendingPayments(pending);
      setApprovedPayments(approved);
      setUpcomingBookings(bookings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
        statusTag: "tag-danger"
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
          statusTag: "tag-pending"
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
        statusTag: "tag-ok"
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
      upcomingCount: upcomingBookings.length
    }),
    [approvedPayments, pendingPayments, upcomingBookings]
  );

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title">Murojaatlar navbati</h1>
          <button className="btn-secondary" onClick={load}>Yangilash</button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", marginBottom: 20 }}>
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
        </div>

        {loading ? <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda...</div> : null}
        {error ? <div className="surface panel" style={{ color: "var(--danger)" }}>{error}</div> : null}

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
                      <td>{item.tariffCode}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>{item.timeText}</td>
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
