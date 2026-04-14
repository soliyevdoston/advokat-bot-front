"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
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
    language: string | null;
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

const statusLabel: Record<BookingScheduleItem["status"], string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor qilingan",
  COMPLETED: "Tugallangan"
};

const statusTagClass: Record<BookingScheduleItem["status"], string> = {
  PENDING: "tag-pending",
  CONFIRMED: "tag-ok",
  CANCELLED: "tag-danger",
  COMPLETED: "tag-info"
};

const formatInterval = (startsAt: string, endsAt: string) => {
  const end = new Date(endsAt).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${formatDateTime(startsAt)} – ${end}`;
};

type MeetingLinkModal = {
  bookingId: string;
  telegramId: string;
  lang: string;
  slotTime: string;
};

export default function BookingsPage() {
  const [items, setItems] = useState<BookingScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<MeetingLinkModal | null>(null);
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

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

  const openModal = (item: BookingScheduleItem) => {
    setLink("");
    setModal({
      bookingId: item.id,
      telegramId: item.user.telegramId ?? "",
      lang: item.user.language ?? "UZ",
      slotTime: formatInterval(item.slot.startsAt, item.slot.endsAt)
    });
  };

  const sendLink = async () => {
    if (!modal || !link.trim()) return;
    setSending(true);
    try {
      await api.post("/admin/send-meeting-link", {
        telegramId: modal.telegramId,
        link: link.trim(),
        slotTime: modal.slotTime,
        lang: modal.lang.toUpperCase() === "RU" ? "RU" : modal.lang.toUpperCase() === "EN" ? "EN" : "UZ"
      });
      setModal(null);
      alert("Link muvaffaqiyatli yuborildi!");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title">Bronlar jadvali</h1>
          <button className="btn-secondary" onClick={load}>Yangilash</button>
        </div>

        {loading ? <div className="surface panel" style={{ color: "#546573" }}>Yuklanmoqda...</div> : null}
        {error ? <div className="surface panel" style={{ color: "#c13838" }}>{error}</div> : null}

        {!loading && !error ? (
          <div className="surface panel">
            {items.length === 0 ? (
              <div className="empty-state">Yaqin bronlar yo'q</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Vaqt</th>
                    <th>Mijoz</th>
                    <th>Aloqa</th>
                    <th>Tarif</th>
                    <th>Holat</th>
                    <th>Izoh</th>
                    <th>Meeting link</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatInterval(item.slot.startsAt, item.slot.endsAt)}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {item.user.fullName || item.user.username || item.user.id}
                        </div>
                        <div style={{ fontSize: 12, color: "#4f6471" }}>bron: {item.id.slice(0, 8)}...</div>
                      </td>
                      <td>
                        <div>{item.user.telegramId ? `tg: ${item.user.telegramId}` : "tg: –"}</div>
                        <div style={{ fontSize: 12, color: "#4f6471" }}>
                          {item.user.phone || "–"}
                        </div>
                      </td>
                      <td>{item.payment.tariff.code}</td>
                      <td>
                        <span className={`tag ${statusTagClass[item.status]}`}>
                          {statusLabel[item.status]}
                        </span>
                      </td>
                      <td>{item.slot.note || "–"}</td>
                      <td>
                        {item.user.telegramId ? (
                          <button
                            className="btn-primary"
                            style={{ fontSize: 13, padding: "7px 12px" }}
                            onClick={() => openModal(item)}
                          >
                            Link yuborish
                          </button>
                        ) : (
                          <span style={{ color: "#4f6471", fontSize: 13 }}>tg yo'q</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {/* Meeting link modal */}
        {modal ? (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
              display: "grid", placeItems: "center", zIndex: 100
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
          >
            <div className="surface panel" style={{ width: "100%", maxWidth: 460 }}>
              <h2 style={{ marginBottom: 6 }}>Meeting link yuborish</h2>
              <p style={{ color: "#4f6471", marginTop: 0, marginBottom: 16, fontSize: 14 }}>
                Mijozga: <strong>{modal.telegramId}</strong><br />
                Vaqt: {modal.slotTime}
              </p>
              <div className="grid" style={{ gap: 12 }}>
                <input
                  className="input"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://meet.google.com/... yoki zoom link"
                  type="url"
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    disabled={sending || !link.trim()}
                    onClick={sendLink}
                  >
                    {sending ? "Yuborilmoqda..." : "Yuborish"}
                  </button>
                  <button className="btn-danger" onClick={() => setModal(null)}>
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
