"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { TopNav } from "../../components/TopNav";
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
        stage: "Tolovni tasdiqlash",
        client: clientName(item.user),
        contact: item.user.telegramId ? `tg:${item.user.telegramId}` : "-",
        tariffCode: item.tariff.code,
        timeText: formatDateTime(item.createdAt),
        createdAt: new Date(item.createdAt).getTime(),
        actionHref: "/payments",
        actionText: "Payments bo‘limi",
        statusTag: "tag-danger"
      });
    });

    approvedPayments
      .filter((item) => !item.booking)
      .forEach((item) => {
        rows.push({
          id: `payment-approved-${item.id}`,
          priority: 2,
          stage: "Mijoz slot tanlashi kutilmoqda",
          client: clientName(item.user),
          contact: item.user.telegramId ? `tg:${item.user.telegramId}` : "-",
          tariffCode: item.tariff.code,
          timeText: formatDateTime(item.createdAt),
          createdAt: new Date(item.createdAt).getTime(),
          actionHref: "/payments",
          actionText: "Payments bo‘limi",
          statusTag: "tag-pending"
        });
      });

    upcomingBookings.forEach((item) => {
      rows.push({
        id: `booking-upcoming-${item.id}`,
        priority: 3,
        stage: "Bog‘lanish / konsultatsiya",
        client: clientName(item.user),
        contact: item.user.telegramId ? `tg:${item.user.telegramId}` : item.user.phone || "-",
        tariffCode: item.payment.tariff.code,
        timeText: formatDateTime(item.slot.startsAt),
        createdAt: new Date(item.slot.startsAt).getTime(),
        actionHref: "/bookings",
        actionText: "Bookings bo‘limi",
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
      <TopNav />
      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ marginBottom: 0 }}>Murojaatlar Navbati</h1>
          <button className="btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginBottom: 12 }}>
          <div className="surface panel">
            <h3>Tolov kutayotganlar</h3>
            <p style={{ fontSize: 34, margin: 0, fontWeight: 800, color: "#c13838" }}>{stats.pendingCount}</p>
          </div>
          <div className="surface panel">
            <h3>Slot kutayotganlar</h3>
            <p style={{ fontSize: 34, margin: 0, fontWeight: 800, color: "#9e6400" }}>{stats.waitingSlotCount}</p>
          </div>
          <div className="surface panel">
            <h3>Yaqin konsultatsiyalar</h3>
            <p style={{ fontSize: 34, margin: 0, fontWeight: 800, color: "#1f8f53" }}>{stats.upcomingCount}</p>
          </div>
        </div>

        {loading ? <div className="surface panel">Loading queue...</div> : null}
        {error ? <div className="surface panel">{error}</div> : null}

        {!loading && !error ? (
          <div className="surface panel">
            <table className="table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Bosqich</th>
                  <th>Mijoz</th>
                  <th>Aloqa</th>
                  <th>Tarif</th>
                  <th>Vaqt</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={7}>Hozircha navbat bo‘sh.</td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={`tag ${item.statusTag}`}>P{item.priority}</span>
                      </td>
                      <td>{item.stage}</td>
                      <td>{item.client}</td>
                      <td>{item.contact}</td>
                      <td>{item.tariffCode}</td>
                      <td>{item.timeText}</td>
                      <td>
                        <Link href={item.actionHref} style={{ color: "#0d5e93", fontWeight: 700 }}>
                          {item.actionText}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
