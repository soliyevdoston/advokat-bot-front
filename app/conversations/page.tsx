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

  return (
    <AuthGuard>
      <main className="admin-split">
        <section className="surface panel">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 className="page-title" style={{ fontSize: 18 }}>Mijoz savollari</h2>
            <button className="btn-secondary" onClick={load}>Yangilash</button>
          </div>

          {loading ? <p style={{ color: "#546573" }}>Yuklanmoqda...</p> : null}

          {items.length === 0 && !loading ? (
            <div className="empty-state">Suhbatlar topilmadi</div>
          ) : (
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
                      <div style={{ fontSize: 12, color: "#4f6471" }}>{item.user.telegramId ? `tg:${item.user.telegramId}` : "–"}</div>
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
          )}
        </section>

        <section className="surface panel">
          <h2 style={{ marginBottom: 12 }}>Suhbat tafsilotlari</h2>
          {!selected ? (
            <p style={{ color: "#4f6471" }}>Suhbatni tanlang.</p>
          ) : (
            <div className="grid" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {selected.messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    border: "1px solid #d8dfd3",
                    borderRadius: 12,
                    padding: 10,
                    background: message.sender === "USER" ? "#fff" : "#f4f8f1"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>{message.sender === "USER" ? "Mijoz" : "AI"}</strong>
                    <span style={{ fontSize: 12, color: "#4f6471" }}>{formatDateTime(message.createdAt)}</span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{message.content}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
