"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { Paginated, User } from "../../types";

export default function UsersPage() {
  const toast = useToast();
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (query = search) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: "80" });
      if (query.trim()) params.set("search", query.trim());
      const data = await api.get<Paginated<User>>(`/users?${params.toString()}`);
      setItems(data.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await load();
  };

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, {
        isActive: !(user.isActive ?? true)
      });
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title">Mijozlar</h1>
          <button className="btn-secondary" onClick={() => load()}>Yangilash</button>
        </div>

        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, username yoki telefon bo'yicha qidirish"
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn-primary" type="submit">Qidirish</button>
        </form>

        {loading ? <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda...</div> : null}
        {error ? <div className="surface panel" style={{ color: "var(--danger)" }}>{error}</div> : null}

        {!loading && !error ? (
          <div className="surface panel">
            {items.length === 0 ? (
              <div className="empty-state">Foydalanuvchilar topilmadi</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Foydalanuvchi</th>
                    <th>Aloqa</th>
                    <th>Til</th>
                    <th>Rol</th>
                    <th>Holat</th>
                    <th>Ro'yxatdan o'tgan</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{user.fullName || user.username || user.id.slice(0, 8)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>id: {user.id.slice(0, 8)}...</div>
                      </td>
                      <td>
                        <div>{user.phone || "–"}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.telegramId ? `tg:${user.telegramId}` : "–"}</div>
                      </td>
                      <td>{user.language}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`tag ${user.isActive === false ? "tag-danger" : "tag-ok"}`}>
                          {user.isActive === false ? "Nofaol" : "Faol"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{user.createdAt ? formatDateTime(user.createdAt) : "–"}</td>
                      <td>
                        <button
                          className={user.isActive === false ? "btn-secondary" : "btn-danger"}
                          style={{ fontSize: 13 }}
                          onClick={() => toggleActive(user)}
                        >
                          {user.isActive === false ? "Faollashtirish" : "O'chirish"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
