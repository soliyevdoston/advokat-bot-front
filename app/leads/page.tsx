"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AIConversationListItem, LeadStatus, Paginated, User } from "../../types";

const COLUMNS: { key: LeadStatus; label: string; color: string; emoji: string }[] = [
  { key: "NEW",       label: "Yangi",                color: "#3b82f6", emoji: "🆕" },
  { key: "THINKING",  label: "O'ylayapti",            color: "#f59e0b", emoji: "🤔" },
  { key: "NO_BUDGET", label: "Mablag' yetarli emas", color: "#ef4444", emoji: "💸" },
  { key: "DECLINED",  label: "Rad etildi",            color: "#6b7280", emoji: "❌" },
  { key: "RESOLVED",  label: "Ijobiy hal",            color: "#16a34a", emoji: "✅" },
];

const LANG_FLAG: Record<string, string> = { UZ: "🇺🇿", RU: "🇷🇺", EN: "🇬🇧" };

type DetailUser = User & { _col: LeadStatus };

function ConversationPanel({ userId }: { userId: string }) {
  const [convs, setConvs] = useState<AIConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<Paginated<AIConversationListItem>>(`/ai/conversations?userId=${userId}&page=1&limit=20`)
      .then(d => setConvs(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>Suhbatlar yuklanmoqda…</div>;
  if (convs.length === 0) return <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>Suhbat yo'q</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {convs.map(conv => {
        const isOpen = openId === conv.id;
        const firstMsg = conv.messages.find(m => m.sender === "USER")?.content ?? "–";
        const statusColor = conv.status === "OPEN" ? "#f59e0b" : conv.status === "ESCALATED" ? "#ef4444" : "#6b7280";
        return (
          <div key={conv.id} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{ padding: "10px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start", background: "var(--bg)" }}
              onClick={() => setOpenId(isOpen ? null : conv.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>
                  {formatDateTime(conv.createdAt)}
                  <span style={{ marginLeft: 8, fontWeight: 700, color: statusColor }}>
                    {conv.status === "OPEN" ? "Ochiq" : conv.status === "ESCALATED" ? "Eskalatsiya" : "Yopiq"}
                  </span>
                  {conv.needsLawyer && <span style={{ marginLeft: 6, color: "#ef4444", fontWeight: 700 }}>⚖️ Advokat kerak</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {firstMsg.slice(0, 120)}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", maxHeight: 320, overflowY: "auto", background: "var(--surface)" }}>
                {conv.messages.map(msg => (
                  <div key={msg.id} style={{
                    marginBottom: 10,
                    display: "flex",
                    flexDirection: msg.sender === "USER" ? "row" : "row-reverse",
                    gap: 8,
                  }}>
                    <div style={{
                      maxWidth: "85%",
                      padding: "7px 11px",
                      borderRadius: msg.sender === "USER" ? "10px 10px 10px 2px" : "10px 10px 2px 10px",
                      background: msg.sender === "USER" ? "var(--bg)" : "#1d4ed8",
                      color: msg.sender === "USER" ? "var(--ink)" : "#fff",
                      fontSize: 13,
                      lineHeight: 1.5,
                      border: msg.sender === "USER" ? "1px solid var(--border)" : "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {msg.content}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>
                        {formatDateTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LeadsPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOverCol = useRef<LeadStatus | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);
  const [detail, setDetail] = useState<DetailUser | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "conv">("info");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<User>>("/users?page=1&limit=1000&role=CLIENT");
      setUsers(data.items);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const moveUser = async (userId: string, status: LeadStatus) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, leadStatus: status } : u));
    if (detail?.id === userId) setDetail(prev => prev ? { ...prev, leadStatus: status, _col: status } : null);
    try {
      await api.patch(`/users/${userId}`, { leadStatus: status });
    } catch (err) {
      toast.error((err as Error).message);
      void load();
    }
  };

  const onDragStart = (userId: string) => setDragging(userId);
  const onDragEnd   = () => { setDragging(null); setOverCol(null); dragOverCol.current = null; };

  const onDragOver = (e: React.DragEvent, colKey: LeadStatus) => {
    e.preventDefault();
    dragOverCol.current = colKey;
    setOverCol(colKey);
  };

  const onDrop = async (colKey: LeadStatus) => {
    if (dragging) await moveUser(dragging, colKey);
    setDragging(null); setOverCol(null); dragOverCol.current = null;
  };

  const effectiveStatus = (u: User): LeadStatus =>
    (u.leadStatus as LeadStatus | null) ?? "NEW";

  const filtered = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase();
        return (
          u.fullName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.phone?.includes(q) ||
          u.telegramId?.includes(q)
        );
      })
    : users;

  const colUsers = (key: LeadStatus) => filtered.filter(u => effectiveStatus(u) === key);

  return (
    <AuthGuard>
      <style>{`
        .kanban-board { display: flex; gap: 14px; align-items: flex-start; overflow-x: auto; padding-bottom: 12px; }
        .kanban-col { flex: 0 0 280px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; max-height: calc(100vh - 180px); }
        .kanban-col-header { padding: 12px 14px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; background: var(--surface); border-radius: 12px 12px 0 0; }
        .kanban-col-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .kanban-col-title { font-weight: 700; font-size: 13px; }
        .kanban-col-count { margin-left: auto; font-size: 11px; color: var(--muted); background: var(--bg); padding: 2px 8px; border-radius: 99px; font-weight: 600; }
        .kanban-drop-zone { flex: 1; overflow-y: auto; padding: 10px; min-height: 120px; display: flex; flex-direction: column; gap: 8px; border-radius: 0 0 12px 12px; transition: background 0.15s; }
        .kanban-drop-zone.over { background: rgba(59,130,246,0.07); }
        .kanban-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 11px 13px; cursor: grab; transition: box-shadow 0.15s, opacity 0.15s; }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card.dragging { opacity: 0.35; }
        .kanban-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.09); }
        .kc-name { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kc-username { font-size: 12px; color: #3b82f6; font-weight: 600; margin-top: 1px; }
        .kc-row { font-size: 12px; color: var(--ink); margin-top: 4px; display: flex; align-items: center; gap: 5px; }
        .kc-muted { font-size: 11px; color: var(--muted); margin-top: 5px; }
        .kc-actions { display: flex; gap: 4px; margin-top: 9px; flex-wrap: wrap; }
        .kc-move { font-size: 10px; padding: 2px 7px; border-radius: 5px; border: 1px solid; background: transparent; cursor: pointer; white-space: nowrap; }
        .kc-move:hover { opacity: 0.7; }
        .kc-detail { font-size: 10px; padding: 2px 8px; border-radius: 5px; border: 1px solid var(--border); background: transparent; cursor: pointer; color: var(--muted); margin-left: auto; }
        .kc-detail:hover { background: var(--hover); }
        .empty-col { color: var(--muted); font-size: 12px; text-align: center; padding: 24px 0; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 200; padding: 16px; }
        .modal-box { background: var(--surface); border-radius: 14px; width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
        .modal-head { padding: 20px 24px 0; }
        .modal-title { font-size: 17px; font-weight: 700; margin-bottom: 14px; }
        .modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
        .modal-tab { padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: none; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .modal-tab.active { color: var(--ink); border-bottom-color: var(--ink); }
        .modal-body { flex: 1; overflow-y: auto; padding: 16px 24px 20px; }
        .modal-row { display: flex; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .modal-row:last-child { border-bottom: none; }
        .modal-label { color: var(--muted); font-size: 12px; font-weight: 600; min-width: 120px; }
        .modal-val { font-weight: 500; word-break: break-all; }
      `}</style>

      <main style={{ paddingBottom: 0 }}>
        <div className="page-header">
          <h1 className="page-title">Leadlar</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Ism, telefon, username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn-secondary" onClick={load}>Yangilash</button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          Jami: <b>{users.length}</b> ta mijoz
        </div>

        {loading ? (
          <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda…</div>
        ) : (
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <span className="kanban-col-dot" style={{ background: col.color }} />
                  <span className="kanban-col-title">{col.emoji} {col.label}</span>
                  <span className="kanban-col-count">{colUsers(col.key).length}</span>
                </div>

                <div
                  className={`kanban-drop-zone${overCol === col.key && dragging ? " over" : ""}`}
                  onDragOver={e => onDragOver(e, col.key)}
                  onDragLeave={() => { dragOverCol.current = null; setOverCol(null); }}
                  onDrop={() => onDrop(col.key)}
                >
                  {colUsers(col.key).length === 0 ? (
                    <div className="empty-col">Hozircha yo'q</div>
                  ) : (
                    colUsers(col.key).map(user => (
                      <div
                        key={user.id}
                        className={`kanban-card${dragging === user.id ? " dragging" : ""}`}
                        draggable
                        onDragStart={() => onDragStart(user.id)}
                        onDragEnd={onDragEnd}
                      >
                        <div className="kc-name">{user.fullName || "Ismsiz"}</div>
                        {user.username && <div className="kc-username">@{user.username}</div>}
                        {user.phone && (
                          <div className="kc-row">📞 <a href={`tel:${user.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{user.phone}</a></div>
                        )}
                        {user.telegramId && (
                          <div className="kc-row">✈️ <span style={{ color: "var(--muted)" }}>{user.telegramId}</span></div>
                        )}
                        <div className="kc-muted">
                          {LANG_FLAG[user.language] ?? ""} {user.language}
                          {user.createdAt ? ` · ${formatDateTime(user.createdAt)}` : ""}
                        </div>
                        <div className="kc-actions">
                          {COLUMNS.filter(c => c.key !== col.key).map(target => (
                            <button
                              key={target.key}
                              className="kc-move"
                              style={{ borderColor: target.color, color: target.color }}
                              onClick={() => moveUser(user.id, target.key)}
                              title={target.label}
                            >
                              {target.emoji}
                            </button>
                          ))}
                          <button
                            className="kc-detail"
                            onClick={() => { setDetail({ ...user, _col: col.key }); setDetailTab("info"); }}
                          >
                            Batafsil
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {detail && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="modal-box">
            <div className="modal-head">
              <div className="modal-title">
                👤 {detail.fullName || "Ismsiz"}
                {detail.username && <span style={{ fontSize: 14, color: "#3b82f6", marginLeft: 8 }}>@{detail.username}</span>}
              </div>

              {/* Lead holat tugmalari */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {COLUMNS.filter(c => c.key !== detail._col).map(target => (
                  <button
                    key={target.key}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "5px 12px", borderColor: target.color, color: target.color }}
                    onClick={() => moveUser(detail.id, target.key)}
                  >
                    {target.emoji} {target.label}
                  </button>
                ))}
                <button className="btn-secondary" style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => setDetail(null)}>✕</button>
              </div>

              <div className="modal-tabs">
                <button className={`modal-tab${detailTab === "info" ? " active" : ""}`} onClick={() => setDetailTab("info")}>
                  Ma'lumotlar
                </button>
                <button className={`modal-tab${detailTab === "conv" ? " active" : ""}`} onClick={() => setDetailTab("conv")}>
                  Suhbatlar
                </button>
              </div>
            </div>

            <div className="modal-body">
              {detailTab === "info" && (
                <>
                  {[
                    { label: "To'liq ism",       val: detail.fullName || "–" },
                    { label: "Username",          val: detail.username ? `@${detail.username}` : "–" },
                    { label: "Telefon",           val: detail.phone || "–" },
                    { label: "Telegram ID",       val: detail.telegramId || "–" },
                    { label: "Til",               val: `${LANG_FLAG[detail.language] ?? ""} ${detail.language}` },
                    { label: "Faollik",           val: detail.isActive === false ? "Nofaol" : "Faol" },
                    { label: "Lead holati",       val: COLUMNS.find(c => c.key === detail._col)?.label ?? "–" },
                    { label: "Ro'yxatdan o'tgan", val: detail.createdAt ? formatDateTime(detail.createdAt) : "–" },
                  ].map(row => (
                    <div key={row.label} className="modal-row">
                      <span className="modal-label">{row.label}</span>
                      <span className="modal-val">{row.val}</span>
                    </div>
                  ))}
                </>
              )}

              {detailTab === "conv" && (
                <ConversationPanel userId={detail.id} />
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
