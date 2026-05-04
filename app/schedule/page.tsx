"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
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

function dateKey(d: Date) {
  const { year, month, day } = toTZ(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAYS_UZ = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const MONTHS_UZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

function dayLabel(date: Date) {
  const tz = toTZ(date);
  const now = toTZ(new Date());
  const tom = toTZ(new Date(Date.now() + 86400000));
  if (tz.year === now.year && tz.month === now.month && tz.day === now.day)
    return { short: "Bugun", full: `Bugun — ${tz.day} ${MONTHS_UZ[tz.month]}`, isToday: true };
  if (tz.year === tom.year && tz.month === tom.month && tz.day === tom.day)
    return { short: "Ertaga", full: `Ertaga — ${tz.day} ${MONTHS_UZ[tz.month]}`, isToday: false };
  return {
    short: DAYS_UZ[tz.dayOfWeek],
    full: `${DAYS_UZ[tz.dayOfWeek]}, ${tz.day} ${MONTHS_UZ[tz.month]} ${tz.year}`,
    isToday: false,
  };
}

const WORK_HOURS: { h: number; m: number }[] = [];
for (let h = 7; h <= 21; h++) { WORK_HOURS.push({ h, m: 0 }); WORK_HOURS.push({ h, m: 30 }); }
WORK_HOURS.push({ h: 22, m: 0 });

const BOOKING_COLOR: Record<string, string> = {
  PENDING: "#b45309", CONFIRMED: "#16a34a", CANCELLED: "#dc2626", COMPLETED: "#6b7280",
};
const BOOKING_BG: Record<string, string> = {
  PENDING: "#fffbeb", CONFIRMED: "#f0fdf4", CANCELLED: "#fef2f2", COMPLETED: "#f9fafb",
};
const BOOKING_LABEL: Record<string, string> = {
  PENDING: "Kutilmoqda", CONFIRMED: "Tasdiqlangan", CANCELLED: "Bekor", COMPLETED: "Yakunlangan",
};

// Quick date list: today + next 13 days
function getUpcomingDates(): Date[] {
  const today = toTZ(new Date());
  return Array.from({ length: 14 }, (_, i) => fromTZ(today.year, today.month, today.day + i, 0, 0));
}

export default function SchedulePage() {
  const toast = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState(() => {
    const t = toTZ(new Date());
    return `${t.year}-${String(t.month + 1).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  });
  const [addHour, setAddHour] = useState(9);
  const [addMin, setAddMin] = useState(0);
  const [addDuration, setAddDuration] = useState(60);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<Slot[]>("/slots");
      setSlots(data);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);
  usePolling(load, 15000);

  // Group booked slots by date (next 14 days)
  const upcomingDates = useMemo(() => getUpcomingDates(), []);

  const bookedByDate = useMemo(() => {
    const now = new Date();
    const map = new Map<string, Slot[]>();
    for (const d of upcomingDates) map.set(dateKey(d), []);
    for (const s of slots) {
      if (s.status !== "BOOKED") continue;
      const end = new Date(s.endsAt);
      if (end < now) continue;
      const key = dateKey(new Date(s.startsAt));
      if (map.has(key)) map.get(key)!.push(s);
    }
    for (const [, arr] of map) arr.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return map;
  }, [slots, upcomingDates]);

  // Days that have bookings
  const activeDays = useMemo(
    () => upcomingDates.filter(d => (bookedByDate.get(dateKey(d))?.length ?? 0) > 0),
    [upcomingDates, bookedByDate]
  );

  const totalUpcoming = useMemo(
    () => [...bookedByDate.values()].reduce((s, arr) => s + arr.length, 0),
    [bookedByDate]
  );

  const addSlot = async () => {
    setSaving(true);
    try {
      const [y, mo, dy] = addDate.split("-").map(Number);
      const start = fromTZ(y, mo - 1, dy, addHour, addMin);
      if (start < new Date()) { toast.error("O'tgan vaqtga slot qo'shib bo'lmaydi"); return; }
      const end = new Date(start.getTime() + addDuration * 60000);
      await api.post("/slots", { startsAt: start.toISOString(), endsAt: end.toISOString(), timezone: TZ });
      setAddOpen(false);
      await load();
      toast.success("Bo'sh vaqt qo'shildi ✅");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const todayKey = dateKey(new Date());
  const todaySlots = bookedByDate.get(todayKey) ?? [];

  return (
    <AuthGuard>
      <main>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">📅 Mening jadvalim</h1>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
              Toshkent vaqti · {totalUpcoming} ta kelgusi qabul
            </p>
          </div>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            + Bo'sh vaqt qo'shish
          </button>
        </div>

        {/* TODAY block — always visible, prominent */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
          }}>
            <div style={{
              background: "#1f2937", color: "#fff",
              borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 700,
            }}>Bugun</div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {(() => { const t = toTZ(new Date()); return `${t.day} ${MONTHS_UZ[t.month]} ${t.year}, ${DAYS_UZ[t.dayOfWeek]}`; })()}
            </span>
          </div>

          {todaySlots.length === 0 ? (
            <div className="surface panel" style={{ padding: "20px 20px", color: "var(--muted)", fontSize: 14 }}>
              Bugun hech qanday qabul yo'q.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todaySlots.map(slot => (
                <BookingCard key={slot.id} slot={slot} highlight />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming days */}
        {activeDays.filter(d => dateKey(d) !== todayKey).length === 0 ? (
          <div className="surface panel" style={{ padding: "20px", color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
            Kelgusi 14 kunda boshqa qabul yo'q.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {activeDays
              .filter(d => dateKey(d) !== todayKey)
              .map(d => {
                const lbl = dayLabel(d);
                const daySlots = bookedByDate.get(dateKey(d)) ?? [];
                return (
                  <div key={dateKey(d)}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: "var(--ink-2)",
                      textTransform: "uppercase", letterSpacing: 0.8,
                      marginBottom: 8, paddingLeft: 2,
                    }}>
                      {lbl.full}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {daySlots.map(slot => (
                        <BookingCard key={slot.id} slot={slot} highlight={false} />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Add slot modal */}
        {addOpen && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center", zIndex: 100 }}
            onClick={e => { if (e.target === e.currentTarget) setAddOpen(false); }}
          >
            <div className="surface panel" style={{ width: "100%", maxWidth: 380 }}>
              <h2 style={{ fontSize: 16, marginBottom: 16 }}>+ Bo'sh vaqt qo'shish</h2>
              <div className="grid" style={{ gap: 12 }}>

                <label className="grid" style={{ gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Sana</span>
                  <input
                    type="date" className="input"
                    value={addDate}
                    min={(() => { const t = toTZ(new Date()); return `${t.year}-${String(t.month+1).padStart(2,"0")}-${String(t.day).padStart(2,"0")}`; })()}
                    onChange={e => setAddDate(e.target.value)}
                  />
                </label>

                <label className="grid" style={{ gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Vaqt</span>
                  <select
                    className="input"
                    value={`${addHour}:${addMin}`}
                    onChange={e => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      setAddHour(h); setAddMin(m);
                    }}
                  >
                    {WORK_HOURS.map(({ h, m }) => (
                      <option key={`${h}:${m}`} value={`${h}:${m}`}>{fmtTime(h, m)}</option>
                    ))}
                  </select>
                </label>

                <label className="grid" style={{ gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Davomiyligi</span>
                  <select className="input" value={addDuration} onChange={e => setAddDuration(Number(e.target.value))}>
                    <option value={30}>30 daqiqa</option>
                    <option value={60}>1 soat</option>
                    <option value={90}>1.5 soat</option>
                    <option value={120}>2 soat</option>
                  </select>
                </label>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="btn-primary" disabled={saving} onClick={addSlot}>
                    {saving ? "Saqlanmoqda..." : "Qo'shish"}
                  </button>
                  <button className="btn-secondary" onClick={() => setAddOpen(false)}>Bekor</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}

function BookingCard({ slot, highlight }: { slot: Slot; highlight: boolean }) {
  const booking: SlotBooking | undefined = slot.bookings?.[0];
  const start = new Date(slot.startsAt);
  const end = new Date(slot.endsAt);
  const sTZ = toTZ(start);
  const eTZ = toTZ(end);
  const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);

  const status = booking?.status ?? "PENDING";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: 0,
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${highlight ? "#e5e7eb" : "var(--border)"}`,
      background: highlight ? "#fff" : "var(--surface)",
      boxShadow: highlight ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
    }}>
      {/* Time column */}
      <div style={{
        background: BOOKING_BG[status] ?? "#f9fafb",
        borderRight: `3px solid ${BOOKING_COLOR[status] ?? "#6b7280"}`,
        padding: "16px 14px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minWidth: 76,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(sTZ.hour, sTZ.minute)}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          {fmtTime(eTZ.hour, eTZ.minute)}
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
          {durationMins} min
        </div>
      </div>

      {/* Client info */}
      <div style={{ padding: "14px 16px" }}>
        {booking ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                {booking.user.fullName ?? "—"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: BOOKING_BG[status], color: BOOKING_COLOR[status],
              }}>
                {BOOKING_LABEL[status] ?? status}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {booking.user.phone ? (
                <a href={`tel:${booking.user.phone}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600,
                }}>
                  📞 {booking.user.phone}
                </a>
              ) : (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>📞 —</span>
              )}
              {booking.user.username && (
                <a href={`https://t.me/${booking.user.username}`} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 13, color: "#2563eb", textDecoration: "none",
                }}>
                  ✈️ @{booking.user.username}
                </a>
              )}
              {!booking.user.username && booking.user.telegramId && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  ✈️ tg:{booking.user.telegramId}
                </span>
              )}
            </div>

            {booking.meetLink && (
              <a href={booking.meetLink} target="_blank" rel="noreferrer" style={{
                display: "inline-block", marginTop: 6, fontSize: 12,
                color: "#7c3aed", textDecoration: "none",
              }}>
                🎥 {booking.meetLink}
              </a>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)", paddingTop: 8 }}>
            Mijoz ma'lumoti topilmadi
          </div>
        )}
      </div>
    </div>
  );
}
