"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AIConversationListItem, AIConversationMessage, Paginated } from "../../types";

const statusLabel: Record<string, string> = {
  OPEN: "Ochiq",
  ESCALATED: "Eskalatsiya",
  CLOSED: "Yopildi"
};

const statusTagClass: Record<string, string> = {
  OPEN: "tag-pending",
  ESCALATED: "tag-danger",
  CLOSED: "tag-ok"
};

const categoryLabel: Record<string, string> = {
  FAMILY: "Oila",
  CIVIL: "Fuqarolik",
  CRIMINAL: "Jinoyat",
  LABOR: "Mehnat",
  PROPERTY: "Mulk",
  BUSINESS: "Biznes",
  ADMINISTRATIVE: "Ma'muriy",
  OTHER: "Boshqa"
};

export default function ConversationsPage() {
  const [items, setItems] = useState<AIConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ id: string; messages: AIConversationMessage[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<AIConversationListItem>>("/ai/conversations?page=1&limit=100");
      setItems(data.items);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openMessages = async (conversationId: string) => {
    try {
      const messages = await api.get<AIConversationMessage[]>(`/ai/conversations/${conversationId}/messages`);
      setSelected({ id: conversationId, messages });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const closeModal = () => setSelected(null);

  return (
    <AuthGuard>
      <main>
        <div className="surface panel">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 className="page-title" style={{ fontSize: 18 }}>Mijoz savollari</h2>
            <button className="btn-secondary" onClick={load}>Yangilash</button>
          </div>

          {loading ? <p style={{ color: "var(--muted)" }}>Yuklanmoqda...</p> : null}

          {items.length === 0 && !loading ? (
            <div className="empty-state">Suhbatlar topilmadi</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Foydalanuvchi</th>
                    <th>Holat</th>
                    <th>Kategoriya</th>
                    <th>Advokat</th>
                    <th>Oxirgi faollik</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{item.user.fullName || item.user.username || item.user.id.slice(0, 8)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.user.telegramId ? `tg:${item.user.telegramId}` : "–"}</div>
                      </td>
                      <td>
                        <span className={`tag ${statusTagClass[item.status] ?? "tag-pending"}`}>
                          {statusLabel[item.status] ?? item.status}
                        </span>
                      </td>
                      <td>{categoryLabel[item.category ?? "OTHER"] ?? item.category ?? "Boshqa"}</td>
                      <td>
                        <span className={`tag ${item.needsLawyer ? "tag-danger" : "tag-ok"}`}>
                          {item.needsLawyer ? "Ha" : "Yo'q"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>{formatDateTime(item.lastMessageAt || item.updatedAt || item.createdAt)}</td>
                      <td>
                        <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => openMessages(item.id)}>
                          Ko'rish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal overlay for conversation detail */}
        {selected && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={closeModal}
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                width: "100%",
                maxWidth: 640,
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Suhbat tafsilotlari</h2>
                <button
                  onClick={closeModal}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: "4px 10px",
                    fontSize: 13,
                    color: "var(--ink-2)",
                  }}
                >
                  Yopish
                </button>
              </div>
              <div style={{ overflowY: "auto", padding: 16, display: "grid", gap: 8 }}>
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 12,
                      background: message.sender === "USER" ? "var(--surface)" : "var(--bg)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: 13 }}>{message.sender === "USER" ? "Mijoz" : "AI"}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>{message.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
