"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useConfirm } from "../../components/ConfirmDialog";
import { LiveBadge } from "../../components/LiveBadge";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { usePolling } from "../../lib/usePolling";
import type { Slot, SlotBooking } from "../../types";

const TZ = "Asia/Tashkent";
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function toTZ(date: Date) {
  const d = new Date(date.getTime() + TZ_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    dayOfWeek: d.getUTCDay(),
  };
}

function fromTZ(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month, day, hour, minute, 0) - TZ_OFFSET_MS);
}

function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtSlotTime(slot: Slot) {
  const s = toTZ(new Date(slot.startsAt));
  const e = toTZ(new Date(slot.endsAt));
  return `${fmtTime(s.hour, s.minute)} – ${fmtTime(e.hour, e.minute)}`;
}

function dateKey(d: Date) {
  const { year, month, day } = toTZ(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAYS_UZ = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

function fmtDayLabel(date: Date) {
  const { year, month, day, dayOfWeek } = toTZ(date);
  const now = toTZ(new Date());
  const tomorrow = toTZ(new Date(Date.now() + 86400000));
  if (year === now.year && month === now.month && day === now.day) return `Bugun, ${day} ${MONTHS_UZ[month]}`;
  if (year === tomorrow.year && month === tomorrow.month && day === tomorrow.day) return `Ertaga, ${day} ${MONTHS_UZ[month]}`;
  return `${DAYS_UZ[dayOfWeek]}, ${day} ${MONTHS_UZ[month]} ${year}`;
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor",
  COMPLETED: "Yakunlangan",
};
const BOOKING_STATUS_COLOR: Record<string, string> = {
  PENDING: "#b45309",
  CONFIRMED: "#16a34a",
  CANCELLED: "#dc2626",
  COMPLETED: "#6b7280",
};
const BOOKING_STATUS_BG: Record<string, string> = {
  PENDING: "#fffbeb",
  CONFIRMED: "#f0fdf4",
  CANCELLED: "#fef2f2",
  COMPLETED: "#f3f4f6",
};

const WORK_SLOTS: { h: number; m: number }[] = [];
for (let h = 7; h <= 22; h++) {
  WORK_SLOTS.push({ h, m: 0 });
  if (h < 22) WORK_SLOTS.push({ h, m: 30 });
}

function encodeSlot(h: number, m: number) { return h * 60 + m; }
function decodeSlot(v: number) { return { h: Math.floor(v / 60), m: v % 60 }; }
const DEFAULT_BULK_SLOTS = [9, 10, 11, 14, 15, 16].map(h => encodeSlot(h, 0));
const DAYS_SHORT = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];

export default function SlotsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSlots, setBulkSlots] = useState<number[]>(DEFAULT_BULK_SLOTS);
  const [bulkDays, setBulkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [bulkWeeks, setBulkWeeks] = useState(1);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "booked" | "available">("all");
  const [detailSlot, setDetailSlot] = useState<Slot | null>(null);

  const load = async () => {
    try {
      const data = await api.get<Slot[]>("/slots");
      setSlots(data);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);
  usePolling(load, 10000);

  // Group upcoming slots by date
  const grouped = useMemo(() => {
    const now = new Date();
    const filtered = slots
      .filter(s => {
        const end = new Date(s.endsAt);
        if (end < now) return false;
        if (filter === "booked") return s.status === "BOOKED";
        if (filter === "available") return s.status === "AVAILABLE";
        return true;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    const groups = new Map<string, { label: string; date: Date; slots: Slot[] }>();
    for (const s of filtered) {
      const start = new Date(s.startsAt);
      const key = dateKey(start);
      if (!groups.has(key)) {
        groups.set(key, { label: fmtDayLabel(start), date: start, slots: [] });
      }
      groups.get(key)!.slots.push(s);
    }
    return [...groups.values()];
  }, [slots, filter]);

  const blockSlot = async (slotId: string) => {
    const ok = await confirm({ title: "Vaqtni bloklash", message: "Mijozlar bu vaqtni bron qila olmaydi.", confirmLabel: "Bloklash", danger: true });
    if (!ok) return;
    try {
      await api.patch(`/slots/${slotId}`, { status: "BLOCKED" });
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteSlot = async (slotId: string) => {
    const ok = await confirm({ title: "Vaqtni o'chirish", message: "Bu amalni qaytarib bo'lmaydi.", confirmLabel: "O'chirish", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/slots/${slotId}`);
      await load();
      toast.success("O'chirildi");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const toggleBulkSlot = (key: number) =>
    setBulkSlots(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key].sort((a, b) => a - b));
  const toggleBulkDay = (d: number) =>
    setBulkDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b));

  // Compute monday of current week in TZ
  const getThisMonday = () => {
    const now = toTZ(new Date());
    const dow = now.dayOfWeek === 0 ? 6 : now.dayOfWeek - 1;
    return fromTZ(now.year, now.month, now.day - dow, 0, 0);
  };

  const saveBulk = async () => {
    if (bulkDays.length === 0 || bulkSlots.length === 0) return;
    setSaving(true);
    try {
      const monday = getThisMonday();
      const mondayTZ = toTZ(monday);
      const toCreate: { startsAt: string; endsAt: string; timezone: string }[] = [];
      for (let w = 0; w < bulkWeeks; w++) {
        for (const dayIdx of bulkDays) {
          for (const encoded of bulkSlots) {
            const { h, m } = decodeSlot(encoded);
            const start = fromTZ(mondayTZ.year, mondayTZ.month, mondayTZ.day + dayIdx + w * 7, h, m);
            if (start < new Date()) continue;
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            toCreate.push({ startsAt: start.toISOString(), endsAt: end.toISOString(), timezone: TZ });
          }
        }
      }
      for (const s of toCreate) await api.post("/slots", s);
      setBulkMode(false);
      await load();
      toast.success(`${toCreate.length} ta vaqt qo'shildi`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const bookedCount = slots.filter(s => s.status === "BOOKED").length;
  const availableCount = slots.filter(s => s.status === "AVAILABLE" && new Date(s.endsAt) > new Date()).length;

  return (
    <AuthGuard>
      <main>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Qabul jadvali <LiveBadge />
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={() => setBulkMode(m => !m)}>
              {bulkMode ? "✕ Yopish" : "⚡ Vaqt qo'shish"}
            </button>
            <button className="btn-secondary" onClick={load}>↻</button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ padding: "8px 16px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700, border: "1px solid #bbf7d0" }}>
            📅 Band: {bookedCount}
          </div>
          <div style={{ padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 13, fontWeight: 700, border: "1px solid #bfdbfe" }}>
            🟢 Bo'sh: {availableCount}
          </div>
        </div>

        {/* Bulk add panel */}
        {bulkMode && (
          <div className="surface panel" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>⚡ Ommaviy bo'sh vaqt qo'shish (joriy hafta)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Kunlar:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {DAYS_SHORT.map((label, i) => (
                    <button key={i} onClick={() => toggleBulkDay(i)} style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "none",
                      background: bulkDays.includes(i) ? "var(--ink)" : "var(--hover)",
                      color: bulkDays.includes(i) ? "#fff" : "var(--ink-2)",
                      fontWeight: bulkDays.includes(i) ? 700 : 400,
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Vaqtlar:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {WORK_SLOTS.filter(s => s.m === 0).map(({ h, m }) => {
                    const key = encodeSlot(h, m);
                    const active = bulkSlots.includes(key);
                    return (
                      <button key={key} onClick={() => toggleBulkSlot(key)} style={{
                        padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "none",
                        background: active ? "var(--ink)" : "var(--hover)",
                        color: active ? "#fff" : "var(--ink-2)",
                        fontWeight: active ? 700 : 400,
                      }}>{fmtTime(h, m)}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Necha hafta:</label>
              <input
                type="number" min={1} max={8} value={bulkWeeks}
                onChange={e => setBulkWeeks(Math.max(1, Math.min(8, Number(e.target.value))))}
                className="input" style={{ width: 72 }}
              />
              <button
                className="btn-primary"
                disabled={saving || bulkDays.length === 0 || bulkSlots.length === 0}
                onClick={saveBulk}
              >
                {saving ? "Saqlanmoqda..." : `Qo'shish (${bulkDays.length * bulkSlots.length * bulkWeeks} ta)`}
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {(["all", "booked", "available"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "none",
                background: filter === f ? "var(--ink)" : "var(--hover)",
                color: filter === f ? "#fff" : "var(--ink-2)",
                fontWeight: filter === f ? 700 : 400,
              }}
            >
              {f === "all" ? "Barchasi" : f === "booked" ? "Band" : "Bo'sh"}
            </button>
          ))}
        </div>

        {/* Schedule list */}
        {grouped.length === 0 ? (
          <div className="surface panel" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
            Hozircha kelgusi vaqtlar yo'q
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {grouped.map(group => (
              <div key={group.label}>
                {/* Date header */}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "var(--ink-2)",
                  textTransform: "uppercase", letterSpacing: 1,
                  marginBottom: 8, paddingLeft: 4,
                }}>
                  📆 {group.label}
                </div>

                {/* Slots in this day */}
                <div className="surface panel" style={{ padding: 0, overflow: "hidden" }}>
                  {group.slots.map((slot, idx) => {
                    const booking: SlotBooking | undefined = slot.bookings?.[0];
                    const isLast = idx === group.slots.length - 1;

                    return (
                      <div
                        key={slot.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "110px 1fr auto",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderBottom: isLast ? "none" : "1px solid var(--border)",
                          background: slot.status === "BLOCKED" ? "#fef9f9" : "transparent",
                          cursor: slot.status === "BOOKED" ? "pointer" : "default",
                        }}
                        onClick={() => { if (slot.status === "BOOKED") setDetailSlot(slot); }}
                      >
                        {/* Time */}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                            {fmtSlotTime(slot)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {Math.round((new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60000)} min
                          </div>
                        </div>

                        {/* Client / status info */}
                        <div>
                          {booking ? (
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                                {booking.user.fullName ?? "—"}
                              </span>
                              {booking.user.phone && (
                                <a href={`tel:${booking.user.phone}`} onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>
                                  📞 {booking.user.phone}
                                </a>
                              )}
                              {booking.user.username && (
                                <a href={`https://t.me/${booking.user.username}`} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>
                                  ✈️ @{booking.user.username}
                                </a>
                              )}
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                background: BOOKING_STATUS_BG[booking.status] ?? "#f3f4f6",
                                color: BOOKING_STATUS_COLOR[booking.status] ?? "#6b7280",
                              }}>
                                {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
                              </span>
                              {booking.meetLink && (
                                <a href={booking.meetLink} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 12, color: "#7c3aed", textDecoration: "none" }}>
                                  🎥 Link
                                </a>
                              )}
                            </div>
                          ) : slot.status === "BLOCKED" ? (
                            <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>🔒 Bloklangan</span>
                          ) : (
                            <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>✅ Bo'sh (bron qilish mumkin)</span>
                          )}
                          {slot.note && (
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{slot.note}</div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 6 }}>
                          {slot.status === "AVAILABLE" && (
                            <button
                              onClick={e => { e.stopPropagation(); blockSlot(slot.id); }}
                              style={{
                                fontSize: 11, padding: "4px 8px",
                                background: "var(--danger-bg)", color: "var(--danger)",
                                border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer",
                              }}
                            >Blok</button>
                          )}
                          {slot.status !== "BOOKED" && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteSlot(slot.id); }}
                              style={{
                                fontSize: 11, padding: "4px 8px",
                                background: "#1f2937", color: "#fff",
                                border: "none", borderRadius: 6, cursor: "pointer",
                              }}
                            >O'chirish</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking detail modal */}
        {detailSlot && (() => {
          const booking: SlotBooking | undefined = detailSlot.bookings?.[0];
          const start = new Date(detailSlot.startsAt);
          const end = new Date(detailSlot.endsAt);
          const startTZ = toTZ(start);
          const endTZ = toTZ(end);
          const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
          return (
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100 }}
              onClick={e => { if (e.target === e.currentTarget) setDetailSlot(null); }}
            >
              <div className="surface panel" style={{ width: "100%", maxWidth: 440 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>Bron tafsilotlari</h2>
                  <button onClick={() => setDetailSlot(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--muted)" }}>✕</button>
                </div>

                <div style={{ background: "var(--hover)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                    📅 {DAYS_UZ[startTZ.dayOfWeek]}, {startTZ.day} {MONTHS_UZ[startTZ.month]} {startTZ.year}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                    🕐 {fmtTime(startTZ.hour, startTZ.minute)} – {fmtTime(endTZ.hour, endTZ.minute)}
                    <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>({durationMins} daqiqa)</span>
                  </div>
                </div>

                {booking ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Mijoz</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                        {booking.user.fullName ?? "—"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {booking.user.phone && (
                          <a href={`tel:${booking.user.phone}`} style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>
                            📞 {booking.user.phone}
                          </a>
                        )}
                        {booking.user.username && (
                          <a href={`https://t.me/${booking.user.username}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>
                            ✈️ @{booking.user.username}
                          </a>
                        )}
                        {!booking.user.username && booking.user.telegramId && (
                          <a href={`tg://user?id=${booking.user.telegramId}`} style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>
                            ✈️ Telegram ID: {booking.user.telegramId}
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Holat</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                          background: BOOKING_STATUS_BG[booking.status] ?? "#f3f4f6",
                          color: BOOKING_STATUS_COLOR[booking.status] ?? "#6b7280",
                        }}>
                          {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {new Date(booking.bookedAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })}
                        </span>
                      </div>
                      {booking.meetLink && (
                        <a href={booking.meetLink} target="_blank" rel="noreferrer"
                          style={{ display: "inline-block", marginTop: 8, fontSize: 13, color: "#3b82f6", textDecoration: "none", wordBreak: "break-all" }}>
                          🎥 {booking.meetLink}
                        </a>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>To'lov</div>
                      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
                        {booking.payment.tariff.titleI18n?.uz ?? booking.payment.tariff.code}
                        <span style={{ marginLeft: 8, fontWeight: 700, color: "var(--ink)" }}>
                          {(booking.payment.amountMinor / 100).toLocaleString()} {booking.payment.currency}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: 11, color: booking.payment.status === "APPROVED" ? "#16a34a" : "#b45309" }}>
                          {booking.payment.status === "APPROVED" ? "✓ To'langan" : "⏳ Kutilmoqda"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Ma'lumot topilmadi.</div>
                )}
              </div>
            </div>
          );
        })()}
      </main>
    </AuthGuard>
  );
}
