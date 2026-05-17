"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { LeadStatus, Paginated, User } from "../../types";

const COLUMNS: { key: LeadStatus; label: string; color: string; emoji: string }[] = [
  { key: "NEW",       label: "Yangi",                color: "#3b82f6", emoji: "🆕" },
  { key: "THINKING",  label: "O'ylayapti",            color: "#f59e0b", emoji: "🤔" },
  { key: "NO_BUDGET", label: "Mablag' yetarli emas", color: "#ef4444", emoji: "💸" },
  { key: "DECLINED",  label: "Rad etildi",            color: "#6b7280", emoji: "❌" },
  { key: "RESOLVED",  label: "Ijobiy hal",            color: "#16a34a", emoji: "✅" },
];

const LANG_FLAG: Record<string, string> = { UZ: "🇺🇿", RU: "🇷🇺", EN: "🇬🇧" };

type DetailUser = User & { _col: LeadStatus };

export default function LeadsPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOverCol = useRef<LeadStatus | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);
  const [detail, setDetail] = useState<DetailUser | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<User>>("/users?page=1&limit=500&role=CLIENT");
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
        .kanban-col-header { padding: 12px 14px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; position: sticky; top: 0; background: var(--surface); border-radius: 12px 12px 0 0; z-index: 1; }
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
        /* Detail modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 200; padding: 16px; }
        .modal-box { background: var(--surface); border-radius: 14px; padding: 24px; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 17px; font-weight: 700; margin-bottom: 18px; }
        .modal-row { display: flex; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .modal-row:last-child { border-bottom: none; }
        .modal-label { color: var(--muted); font-size: 12px; font-weight: 600; min-width: 110px; }
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
                            onClick={() => setDetail({ ...user, _col: col.key })}
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

      {/* Detail modal */}
      {detail && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="modal-box">
            <div className="modal-title">
              👤 {detail.fullName || "Ismsiz"}
              {detail.username && <span style={{ fontSize: 14, color: "#3b82f6", marginLeft: 8 }}>@{detail.username}</span>}
            </div>

            {[
              { label: "To'liq ism", val: detail.fullName || "–" },
              { label: "Username", val: detail.username ? `@${detail.username}` : "–" },
              { label: "Telefon", val: detail.phone || "–" },
              { label: "Telegram ID", val: detail.telegramId || "–" },
              { label: "Til", val: `${LANG_FLAG[detail.language] ?? ""} ${detail.language}` },
              { label: "Holat", val: detail.isActive === false ? "Nofaol" : "Faol" },
              { label: "Lead holati", val: COLUMNS.find(c => c.key === detail._col)?.label ?? "–" },
              { label: "Ro'yxatdan o'tgan", val: detail.createdAt ? formatDateTime(detail.createdAt) : "–" },
            ].map(row => (
              <div key={row.label} className="modal-row">
                <span className="modal-label">{row.label}</span>
                <span className="modal-val">{row.val}</span>
              </div>
            ))}

            <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLUMNS.filter(c => c.key !== detail._col).map(target => (
                <button
                  key={target.key}
                  className="btn-secondary"
                  style={{ fontSize: 13, borderColor: target.color, color: target.color }}
                  onClick={() => {
                    void moveUser(detail.id, target.key);
                    setDetail({ ...detail, leadStatus: target.key, _col: target.key });
                  }}
                >
                  {target.emoji} {target.label}
                </button>
              ))}
              <button className="btn-secondary" style={{ marginLeft: "auto" }} onClick={() => setDetail(null)}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
