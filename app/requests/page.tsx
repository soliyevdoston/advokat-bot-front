"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
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
  telegramId?: string;
  lang?: string;
  meetLink?: string | null;
};

type LinkModal = {
  telegramId: string;
  lang: string;
  label: string;
  link: string;
};

const clientName = (params: { fullName: string | null; username: string | null; id: string }) =>
  params.fullName || params.username || params.id.slice(0, 8);

export default function RequestsPage() {
  const toast = useToast();
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [approvedPayments, setApprovedPayments] = useState<Payment[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingQueueItem[]>([]);
  const [premiumEscalations, setPremiumEscalations] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<LinkModal | null>(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
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
        telegramId: item.user.telegramId ?? undefined,
        lang: item.user.language ?? "UZ",
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

  const openLinkModal = (telegramId: string, lang: string, label: string, existingLink?: string | null) => {
    setLinkModal({ telegramId, lang, label, link: existingLink ?? "" });
  };

  const sendLink = async () => {
    if (!linkModal || !linkModal.link.trim()) return;
    setSending(true);
    try {
      await api.post("/admin/send-meeting-link", {
        telegramId: linkModal.telegramId,
        link: linkModal.link.trim(),
        slotTime: linkModal.label,
        lang: (linkModal.lang.toUpperCase() === "RU" ? "RU" : linkModal.lang.toUpperCase() === "EN" ? "EN" : "UZ") as "UZ" | "RU" | "EN",
      });
      toast.success("Link muvaffaqiyatli yuborildi!");
      setLinkModal(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title">Murojaatlar navbati</h1>
          <button className="btn-secondary" onClick={load} disabled={loading}>
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

        {loading ? <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda...</div> : null}
        {error ? <div className="surface panel" style={{ color: "var(--danger)" }}>{error}</div> : null}

        {/* Premium escalations */}
        {!loading && premiumEscalations.length > 0 && (
          <div className="surface panel" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>⭐ Premium murojaatlar</h2>
            <div className="grid" style={{ gap: 10 }}>
              {premiumEscalations.map((esc) => {
                const contact = esc.reason?.match(/contact:(.+)$/)?.[1] ?? "–";
                const tgId = esc.user?.telegramId ?? "";
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
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {clientName(esc.user)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {tgId ? `tg: ${tgId}` : "–"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Aloqa: {contact}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {formatDateTime(esc.createdAt)}
                      </div>
                    </div>
                    {tgId ? (
                      <button
                        className="btn-primary"
                        style={{ fontSize: 13, padding: "7px 14px", background: "#f59e0b", borderColor: "#f59e0b" }}
                        onClick={() =>
                          openLinkModal(tgId, esc.user?.language ?? "UZ", `Premium qabul — ${clientName(esc.user)}`)
                        }
                      >
                        Link yuborish
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
                    <th>Bo'lim</th>
                    <th>Link</th>
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
                        <Link href={item.actionHref} style={{ color: "#0d5e93", fontWeight: 700, fontSize: 13 }}>
                          {item.actionText}
                        </Link>
                      </td>
                      <td>
                        {item.telegramId ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {item.meetLink && (
                              <a
                                href={item.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: "var(--ok)", wordBreak: "break-all" }}
                              >
                                Link bor
                              </a>
                            )}
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 12, padding: "4px 8px" }}
                              onClick={() =>
                                openLinkModal(
                                  item.telegramId!,
                                  item.lang ?? "UZ",
                                  item.timeText,
                                  item.meetLink
                                )
                              }
                            >
                              {item.meetLink ? "Qayta yuborish" : "Link yuborish"}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {/* Link send modal */}
        {linkModal ? (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
              display: "grid", placeItems: "center", zIndex: 100,
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !sending) setLinkModal(null); }}
          >
            <div className="surface panel" style={{ width: "100%", maxWidth: 460 }}>
              <h2 style={{ marginBottom: 6 }}>Meeting link yuborish</h2>
              <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16, fontSize: 14 }}>
                Mijoz: <strong>{linkModal.telegramId}</strong><br />
                {linkModal.label}
              </p>
              <div className="grid" style={{ gap: 12 }}>
                <input
                  className="input"
                  value={linkModal.link}
                  onChange={(e) => setLinkModal({ ...linkModal, link: e.target.value })}
                  placeholder="https://meet.google.com/... yoki zoom link"
                  type="url"
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    disabled={sending || !linkModal.link.trim()}
                    onClick={sendLink}
                  >
                    {sending ? "Yuborilmoqda..." : "Yuborish"}
                  </button>
                  <button className="btn-danger" disabled={sending} onClick={() => setLinkModal(null)}>
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
