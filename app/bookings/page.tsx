"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { TopNav } from "../../components/TopNav";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

type BookingScheduleItem = {
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
    id: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    note: string | null;
    status: "AVAILABLE" | "BOOKED" | "BLOCKED";
  };
  payment: {
    id: string;
    tariff: {
      code: string;
    };
  };
};

const formatInterval = (startsAt: string, endsAt: string) => {
  const end = new Date(endsAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${formatDateTime(startsAt)} - ${end}`;
};

export default function BookingsPage() {
  const [items, setItems] = useState<BookingScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<BookingScheduleItem[]>("/bookings?upcoming=true");
      setItems(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AuthGuard>
      <TopNav />
      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ marginBottom: 0 }}>Contact Schedule</h1>
          <button className="btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>

        {loading ? <div className="surface panel">Loading schedule...</div> : null}
        {error ? <div className="surface panel">{error}</div> : null}

        {!loading && !error ? (
          <div className="surface panel">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Tariff</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No upcoming bookings.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatInterval(item.slot.startsAt, item.slot.endsAt)}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {item.user.fullName || item.user.username || item.user.id}
                        </div>
                        <div style={{ fontSize: 12, color: "#4f6471" }}>booking: {item.id.slice(0, 8)}...</div>
                      </td>
                      <td>
                        <div>{item.user.telegramId ? `tg: ${item.user.telegramId}` : "tg: -"}</div>
                        <div style={{ fontSize: 12, color: "#4f6471" }}>
                          phone: {item.user.phone || "-"}
                        </div>
                      </td>
                      <td>{item.payment.tariff.code}</td>
                      <td>
                        <span className={`tag ${item.status === "CONFIRMED" ? "tag-ok" : "tag-pending"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.slot.note || "-"}</td>
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
