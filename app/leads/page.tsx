"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { LeadStatus, Paginated, User } from "../../types";

const COLUMNS: { key: LeadStatus; label: string; color: string }[] = [
  { key: "NEW",       label: "Yangi",                color: "#3b82f6" },
  { key: "THINKING",  label: "O'ylayapti",            color: "#f59e0b" },
  { key: "NO_BUDGET", label: "Mablag' yetarli emas", color: "#ef4444" },
];

export default function LeadsPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOverCol = useRef<LeadStatus | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<User>>("/users?page=1&limit=200&role=CLIENT");
      setUsers(data.items.filter(u => u.leadStatus != null));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const moveUser = async (userId: string, status: LeadStatus) => {
    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, leadStatus: status } : u)
    );
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
    setDragging(null);
    setOverCol(null);
    dragOverCol.current = null;
  };

  const colUsers = (key: LeadStatus) => users.filter(u => u.leadStatus === key);

  return (
    <AuthGuard>
      <style>{`
        .kanban-board { display: flex; gap: 16px; align-items: flex-start; overflow-x: auto; padding-bottom: 8px; }
        .kanban-col { flex: 1; min-width: 260px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; }
        .kanban-col-header { padding: 14px 16px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
        .kanban-col-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .kanban-col-title { font-weight: 700; font-size: 14px; }
        .kanban-col-count { margin-left: auto; font-size: 12px; color: var(--muted); background: var(--bg); padding: 2px 8px; border-radius: 99px; }
        .kanban-drop-zone { flex: 1; padding: 10px; min-height: 140px; display: flex; flex-direction: column; gap: 8px; border-radius: 0 0 12px 12px; transition: background 0.15s; }
        .kanban-drop-zone.over { background: rgba(59,130,246,0.07); }
        .kanban-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; cursor: grab; transition: box-shadow 0.15s, opacity 0.15s; }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card.dragging { opacity: 0.4; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .kanban-card-name { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
        .kanban-card-username { font-size: 13px; color: #3b82f6; font-weight: 600; }
        .kanban-card-phone { font-size: 13px; margin-top: 4px; }
        .kanban-card-date { font-size: 11px; color: var(--muted); margin-top: 6px; }
        .kanban-card-actions { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
        .kanban-move-btn { font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid; background: transparent; cursor: pointer; }
        .kanban-move-btn:hover { opacity: 0.75; }
        .empty-col { color: var(--muted); font-size: 13px; text-align: center; padding: 28px 0; }
      `}</style>

      <main>
        <div className="page-header">
          <h1 className="page-title">Leadlar</h1>
          <button className="btn-secondary" onClick={load}>Yangilash</button>
        </div>

        {loading ? (
          <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda…</div>
        ) : (
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <span className="kanban-col-dot" style={{ background: col.color }} />
                  <span className="kanban-col-title">{col.label}</span>
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
                        <div className="kanban-card-name">{user.fullName || "–"}</div>
                        {user.username && (
                          <div className="kanban-card-username">@{user.username}</div>
                        )}
                        {user.phone && (
                          <div className="kanban-card-phone">📞 {user.phone}</div>
                        )}
                        {user.createdAt && (
                          <div className="kanban-card-date">{formatDateTime(user.createdAt)}</div>
                        )}
                        <div className="kanban-card-actions">
                          {COLUMNS.filter(c => c.key !== col.key).map(target => (
                            <button
                              key={target.key}
                              className="kanban-move-btn"
                              style={{ borderColor: target.color, color: target.color }}
                              onClick={() => moveUser(user.id, target.key)}
                            >
                              → {target.label}
                            </button>
                          ))}
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
    </AuthGuard>
  );
}
