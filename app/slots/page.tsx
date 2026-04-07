"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { TopNav } from "../../components/TopNav";
import { api } from "../../lib/api";
import { formatDateTime, toDateKey } from "../../lib/format";
import type { Slot } from "../../types";

const defaultNewSlot = () => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 60);

  return {
    startsAt: start.toISOString().slice(0, 16),
    endsAt: end.toISOString().slice(0, 16),
    timezone: "Asia/Tashkent",
    note: ""
  };
};

export default function SlotsPage() {
  const [items, setItems] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "BOOKED" | "BLOCKED">("ALL");
  const [form, setForm] = useState(defaultNewSlot());

  const load = async () => {
    setLoading(true);
    const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
    try {
      const slots = await api.get<Slot[]>(`/slots${query}`);
      setItems(slots);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of items) {
      const key = toDateKey(slot.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const createSlot = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/slots", {
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        timezone: form.timezone,
        note: form.note || undefined
      });
      setForm(defaultNewSlot());
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const blockSlot = async (slotId: string) => {
    if (!confirm("Block this slot?")) return;
    try {
      await api.delete(`/slots/${slotId}`);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <TopNav />
      <main className="admin-split">
        <section className="surface panel">
          <h2 style={{ marginBottom: 12 }}>Create Slot</h2>
          <form onSubmit={createSlot} className="grid">
            <label className="grid" style={{ gap: 6 }}>
              <span>Start</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>
            <label className="grid" style={{ gap: 6 }}>
              <span>End</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>
            <label className="grid" style={{ gap: 6 }}>
              <span>Timezone</span>
              <input
                value={form.timezone}
                onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>
            <label className="grid" style={{ gap: 6 }}>
              <span>Note</span>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
              />
            </label>
            <button className="btn-primary" type="submit">
              Create
            </button>
          </form>
        </section>

        <section className="surface panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ marginBottom: 0 }}>Slots Calendar</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                style={{ borderRadius: 10, padding: "8px 10px", border: "1px solid #cbd6ca" }}
              >
                <option value="ALL">All</option>
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
                <option value="BLOCKED">Blocked</option>
              </select>
              <button className="btn-secondary" onClick={load}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? <p>Loading slots...</p> : null}

          {!loading && grouped.length === 0 ? <p>No slots found.</p> : null}

          <div className="grid">
            {grouped.map(([date, slots]) => (
              <div key={date} style={{ border: "1px solid #d9e0d5", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: "#eff2ea", padding: "10px 12px", fontWeight: 800 }}>{date}</div>
                <table className="table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>Interval</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id}>
                        <td>
                          {formatDateTime(slot.startsAt)} - {new Date(slot.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td>
                          <span
                            className={`tag ${
                              slot.status === "AVAILABLE"
                                ? "tag-ok"
                                : slot.status === "BOOKED"
                                  ? "tag-pending"
                                  : "tag-danger"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </td>
                        <td>{slot.note || "-"}</td>
                        <td>
                          {slot.status !== "BLOCKED" ? (
                            <button className="btn-danger" onClick={() => blockSlot(slot.id)}>
                              Block
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
