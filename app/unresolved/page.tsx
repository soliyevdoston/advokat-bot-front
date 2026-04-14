"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { EscalationItem, Paginated } from "../../types";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const statusLabel: Record<string, string> = {
  OPEN: "Ochiq",
  IN_PROGRESS: "Ko'rilmoqda",
  RESOLVED: "Hal qilindi",
  CLOSED: "Yopildi"
};

const isQabul = (reason: string | null | undefined) =>
  typeof reason === "string" && reason.startsWith("qabul:");

const parseQabulSlotTime = (reason: string) => {
  // reason format: qabul:{slotId}:{slotTime}
  const parts = reason.split(":");
  if (parts.length >= 3) return parts.slice(2).join(":");
  return null;
};

type MeetingLinkModal = {
  escalationId: string;
  telegramId: string;
  lang: string;
  slotTime: string;
};

export default function UnresolvedPage() {
  const [items, setItems] = useState<EscalationItem[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number] | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MeetingLinkModal | null>(null);
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  const load = async (statusFilter = status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const data = await api.get<Paginated<EscalationItem>>(`/ai/escalations?${params.toString()}`);
      setItems(data.items);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const resolve = async (item: EscalationItem) => {
    const note = prompt("Hal qilish izohi", "Admin tomonidan hal qilindi") ?? "Admin tomonidan hal qilindi";
    try {
      await api.post(`/ai/escalations/${item.id}/resolve`, { note });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const openModal = (item: EscalationItem) => {
    setLink("");
    const slotTime = isQabul(item.reason) ? parseQabulSlotTime(item.reason!) ?? "" : "";
    setModal({
      escalationId: item.id,
      telegramId: item.user.telegramId ?? "",
      lang: item.user.language ?? "UZ",
      slotTime
    });
  };

  const sendLink = async () => {
    if (!modal || !link.trim()) return;
    setSending(true);
    try {
      await api.post("/admin/send-meeting-link", {
        telegramId: modal.telegramId,
        link: link.trim(),
        slotTime: modal.slotTime || "–",
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
          <h1 className="page-title">Qabul so'rovlari</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="input"
              style={{ width: "auto" }}
            >
              <option value="ALL">Barcha holatlar</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusLabel[s] ?? s}</option>
              ))}
            </select>
            <button className="btn-secondary" onClick={() => load()}>Yangilash</button>
          </div>
        </div>

        {loading ? <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda...</div> : null}

        <div className="surface panel">
          {items.length === 0 && !loading ? (
            <div className="empty-state">Hech qanday so'rov topilmadi</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th>Holat</th>
                  <th>Sabab / Vaqt</th>
                  <th>Suhbat</th>
                  <th>Sana</th>
                  <th>Izoh</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.user.fullName || item.user.username || item.user.id.slice(0, 8)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.user.telegramId ? `tg:${item.user.telegramId}` : item.user.phone || "–"}</div>
                    </td>
                    <td>
                      <span className={`tag ${item.status === "RESOLVED" || item.status === "CLOSED" ? "tag-ok" : "tag-danger"}`}>
                        {statusLabel[item.status] ?? item.status}
                      </span>
                      {isQabul(item.reason) && (
                        <div style={{ marginTop: 4 }}>
                          <span className="tag tag-info">Qabul</span>
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      {isQabul(item.reason) ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>Vaqt:</div>
                          <div style={{ fontSize: 13 }}>{parseQabulSlotTime(item.reason!) || "–"}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13 }}>{item.reason || "–"}</div>
                      )}
                    </td>
                    <td>
                      {item.conversation?.messages?.length ? (
                        <div style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>
                          {item.conversation.messages.map((message) => (
                            <div key={message.id} style={{ marginBottom: 4, fontSize: 13 }}>
                              <strong>{message.sender === "USER" ? "Mijoz" : "AI"}: </strong>
                              {message.content.slice(0, 140)}
                            </div>
                          ))}
                        </div>
                      ) : "–"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(item.createdAt)}</td>
                    <td>{item.resolutionNote || "–"}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(item.status === "OPEN" || item.status === "IN_PROGRESS") && (
                          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => resolve(item)}>
                            Hal qilindi
                          </button>
                        )}
                        {isQabul(item.reason) && item.user.telegramId && (
                          <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => openModal(item)}>
                            Link yuborish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
              <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16, fontSize: 14 }}>
                Mijozga: <strong>{modal.telegramId}</strong>
                {modal.slotTime ? <><br />Vaqt: {modal.slotTime}</> : null}
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
