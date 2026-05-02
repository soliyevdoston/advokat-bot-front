"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import type { Slot, SlotBooking } from "../../types";

const TZ = "Asia/Tashkent";

// Half-hour slots for full 24 hours
const WORK_SLOTS: { h: number; m: number }[] = [];
for (let h = 0; h <= 23; h++) {
  WORK_SLOTS.push({ h, m: 0 });
  WORK_SLOTS.push({ h, m: 30 });
}

const DAYS_UZ = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];
const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function slotKey(d: Date, hour: number, minute: number) {
  return `${dateKey(d)}_${hour}_${minute}`;
}

// Encode a slot as minutes-since-midnight for bulk state (e.g. 9:30 → 570)
function encodeSlot(h: number, m: number) { return h * 60 + m; }
function decodeSlot(v: number) { return { h: Math.floor(v / 60), m: v % 60 }; }

const DEFAULT_BULK_SLOTS = [9, 10, 11, 14, 15, 16].map(h => encodeSlot(h, 0));

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#16a34a",
  BOOKED: "#b45309",
  BLOCKED: "#dc2626",
};
const STATUS_BG: Record<string, string> = {
  AVAILABLE: "#f0fdf4",
  BOOKED: "#fffbeb",
  BLOCKED: "#fef2f2",
};
const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Bo'sh",
  BOOKED: "Band",
  BLOCKED: "Bloklangan",
};

export default function SlotsPage() {
  const toast = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [weekBase, setWeekBase] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [adding, setAdding] = useState<{ day: Date; hour: number; minute: number } | null>(null);
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSlots, setBulkSlots] = useState<number[]>(DEFAULT_BULK_SLOTS);
  const [bulkDays, setBulkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [bulkWeeks, setBulkWeeks] = useState(1);

  const [detailSlot, setDetailSlot] = useState<Slot | null>(null);
  const currentRowRef = useRef<HTMLDivElement | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);

  const load = async () => {
    try {
      const data = await api.get<Slot[]>("/slots");
      setSlots(data);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: "instant", block: "center" });
  }, []);

  const slotMap = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const s of slots) {
      const start = new Date(s.startsAt);
      const end = new Date(s.endsAt);
      const startMins = start.getHours() * 60 + start.getMinutes();
      const endMins = end.getHours() * 60 + end.getMinutes();
      for (let min = startMins; min < endMins; min += 30) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        map.set(slotKey(start, h, m), s);
      }
    }
    return map;
  }, [slots]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPast = (d: Date, hour: number, minute: number) => {
    const t = new Date(d);
    t.setHours(hour, minute, 0, 0);
    return t < new Date();
  };

  const openAdd = (day: Date, hour: number, minute: number) => {
    if (isPast(day, hour, minute)) return;
    const key = slotKey(day, hour, minute);
    if (slotMap.has(key)) return;
    setNote("");
    setDuration(60);
    setAdding({ day, hour, minute });
  };

  const saveSlot = async () => {
    if (!adding) return;
    setSaving(true);
    try {
      const start = new Date(adding.day);
      start.setHours(adding.hour, adding.minute, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + duration);
      await api.post("/slots", {
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        timezone: TZ,
        note: note || undefined,
      });
      setAdding(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const blockSlot = async (slotId: string) => {
    if (!confirm("Bu vaqtni bloklashni tasdiqlaysizmi?")) return;
    try {
      await api.patch(`/slots/${slotId}`, { status: "BLOCKED" });
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteSlot = async (slotId: string) => {
    if (!confirm("Bu vaqtni butunlay o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/slots/${slotId}`);
      await load();
      toast.success("Vaqt o'chirildi");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const prevWeek = () => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setWeekBase(d); };

  const toggleBulkSlot = (key: number) =>
    setBulkSlots(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key].sort((a, b) => a - b));
  const toggleBulkDay = (d: number) =>
    setBulkDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b));

  const saveBulk = async () => {
    if (bulkDays.length === 0 || bulkSlots.length === 0) return;
    setSaving(true);
    try {
      const base = new Date(weekBase);
      base.setHours(0, 0, 0, 0);
      const toCreate: { startsAt: string; endsAt: string; timezone: string }[] = [];
      for (let w = 0; w < bulkWeeks; w++) {
        for (const dayIdx of bulkDays) {
          const d = new Date(base);
          d.setDate(base.getDate() + dayIdx + w * 7);
          for (const encoded of bulkSlots) {
            const { h, m } = decodeSlot(encoded);
            const start = new Date(d);
            start.setHours(h, m, 0, 0);
            if (start < new Date()) continue;
            const key = slotKey(d, h, m);
            if (slotMap.has(key)) continue;
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 60);
            toCreate.push({ startsAt: start.toISOString(), endsAt: end.toISOString(), timezone: TZ });
          }
        }
      }
      for (const s of toCreate) {
        await api.post("/slots", s);
      }
      setBulkMode(false);
      await load();
      toast.success(`${toCreate.length} ta vaqt qo'shildi`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const weekLabel = `${weekDays[0].getDate()} ${MONTHS_UZ[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS_UZ[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  return (
    <AuthGuard>
      <main>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 className="page-title">Vaqt jadvali</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={() => { setBulkMode(m => !m); }}>
              {bulkMode ? "✕ Yopish" : "⚡ Ommaviy qo'shish"}
            </button>
            <button className="btn-secondary" onClick={load}>↻ Yangilash</button>
          </div>
        </div>

        {/* Bulk add panel */}
        {bulkMode && (
          <div className="surface panel" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>⚡ Ommaviy vaqt qo'shish</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Kunlar (haftaning):</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {DAYS_UZ.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleBulkDay(i)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "none",
                        background: bulkDays.includes(i) ? "var(--ink)" : "var(--hover)",
                        color: bulkDays.includes(i) ? "#fff" : "var(--ink-2)",
                        fontWeight: bulkDays.includes(i) ? 700 : 400,
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Vaqtlar:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {WORK_SLOTS.map(({ h, m }) => {
                    const key = encodeSlot(h, m);
                    const active = bulkSlots.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleBulkSlot(key)}
                        style={{
                          padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "none",
                          background: active ? "var(--ink)" : "var(--hover)",
                          color: active ? "#fff" : "var(--ink-2)",
                          fontWeight: active ? 700 : 400,
                          opacity: m === 30 ? 0.85 : 1,
                        }}
                      >{fmtTime(h, m)}</button>
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
                className="input" style={{ width: 80 }}
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

        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={prevWeek}>←</button>
          <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={nextWeek}>→</button>
          <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={goToday}>Bugun</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{weekLabel}</span>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, flexWrap: "wrap" }}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[k] }} />
              <span style={{ color: "var(--muted)" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--hover)", border: "1px dashed var(--border-2)" }} />
            <span style={{ color: "var(--muted)" }}>Bosib qo'shish</span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="surface panel" style={{ padding: 0, overflow: "hidden" }}>
          {/* Day headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "52px repeat(7, 1fr)",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--muted)" }} />
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={i}
                  style={{
                    padding: "10px 4px",
                    textAlign: "center",
                    fontWeight: isToday ? 800 : 600,
                    fontSize: 13,
                    color: isToday ? "var(--ink)" : "var(--ink-2)",
                    borderLeft: "1px solid var(--border)",
                    background: isToday ? "var(--hover)" : "transparent",
                  }}
                >
                  <div>{DAYS_UZ[i]}</div>
                  <div style={{ fontSize: 18, marginTop: 2 }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Time rows — one per half-hour */}
          {WORK_SLOTS.map(({ h, m }) => {
            const nowRef = new Date();
            const isCurrentRow = h === nowRef.getHours() && m === (nowRef.getMinutes() < 30 ? 0 : 30);
            return (
            <div
              key={`${h}_${m}`}
              ref={isCurrentRow ? currentRowRef : null}
              style={{
                display: "grid",
                gridTemplateColumns: "52px repeat(7, 1fr)",
                borderBottom: m === 0 ? "1px solid var(--border)" : "1px dashed var(--border)",
                background: isCurrentRow ? "rgba(59,130,246,0.04)" : undefined,
              }}
            >
              <div style={{
                padding: "4px 4px",
                textAlign: "center",
                fontSize: m === 0 ? 11 : 10,
                color: isCurrentRow ? "#3b82f6" : m === 0 ? "var(--muted)" : "var(--border-2)",
                fontWeight: isCurrentRow || m === 0 ? 700 : 400,
                borderRight: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {fmtTime(h, m)}
              </div>
              {weekDays.map((day, di) => {
                const key = slotKey(day, h, m);
                const slot = slotMap.get(key);
                const past = isPast(day, h, m);
                const slotStart = slot ? new Date(slot.startsAt) : null;
                const isSlotStart = !!(slot && slotStart!.getHours() === h && slotStart!.getMinutes() === m);

                return (
                  <div
                    key={di}
                    onClick={() => {
                      if (!slot) { openAdd(day, h, m); return; }
                      if (slot.status === "BOOKED" && isSlotStart) setDetailSlot(slot);
                    }}
                    style={{
                      borderLeft: "1px solid var(--border)",
                      minHeight: 36,
                      padding: isSlotStart ? 4 : 0,
                      cursor: (!slot && !past) || (slot?.status === "BOOKED" && isSlotStart) ? "pointer" : "default",
                      background: slot
                        ? STATUS_BG[slot.status]
                        : past
                          ? "#f9f9fa"
                          : "transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => {
                      if (!slot && !past) (e.currentTarget as HTMLDivElement).style.background = "var(--hover)";
                    }}
                    onMouseLeave={e => {
                      if (!slot && !past) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    {slot ? (
                      isSlotStart ? (
                        <div style={{ fontSize: 11, padding: "2px 4px" }}>
                          <div style={{
                            fontWeight: 700,
                            color: STATUS_COLOR[slot.status],
                            marginBottom: 2,
                          }}>
                            {STATUS_LABEL[slot.status]}
                          </div>
                          {slot.note && (
                            <div style={{ color: "var(--muted)", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {slot.note}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                            {slot.status === "AVAILABLE" && (
                              <button
                                onClick={e => { e.stopPropagation(); blockSlot(slot.id); }}
                                style={{
                                  fontSize: 10, padding: "2px 5px",
                                  background: "var(--danger-bg)", color: "var(--danger)",
                                  border: "1px solid #fecaca", borderRadius: 4, cursor: "pointer",
                                }}
                              >
                                Blok
                              </button>
                            )}
                            {slot.status !== "BOOKED" && (
                              <button
                                onClick={e => { e.stopPropagation(); deleteSlot(slot.id); }}
                                style={{
                                  fontSize: 10, padding: "2px 5px",
                                  background: "#1f2937", color: "#fff",
                                  border: "none", borderRadius: 4, cursor: "pointer",
                                }}
                              >
                                O'chirish
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          minHeight: 36,
                          background: STATUS_COLOR[slot.status],
                          opacity: 0.25,
                        }} />
                      )
                    ) : past ? null : (
                      <div style={{
                        width: "100%", height: "100%", minHeight: 28,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--border-2)", fontSize: 16, fontWeight: 300,
                      }}>+</div>
                    )}
                  </div>
                );
              })}
            </div>
          ); })}
        </div>

        {/* Add slot modal */}
        {adding && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
              display: "grid", placeItems: "center", zIndex: 100,
            }}
            onClick={e => { if (e.target === e.currentTarget) setAdding(null); }}
          >
            <div className="surface panel" style={{ width: "100%", maxWidth: 400 }}>
              <h2 style={{ marginBottom: 4, fontSize: 16 }}>Yangi vaqt qo'shish</h2>
              <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 16, fontSize: 14 }}>
                📅 {DAYS_UZ[adding.day.getDay() === 0 ? 6 : adding.day.getDay() - 1]},{" "}
                {adding.day.getDate()} {MONTHS_UZ[adding.day.getMonth()]} — {fmtTime(adding.hour, adding.minute)}
              </p>
              <div className="grid" style={{ gap: 12 }}>
                <label className="grid" style={{ gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Davomiyligi</span>
                  <select
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="input"
                  >
                    <option value={30}>30 daqiqa</option>
                    <option value={60}>1 soat</option>
                    <option value={90}>1.5 soat</option>
                    <option value={120}>2 soat</option>
                  </select>
                </label>
                <label className="grid" style={{ gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Izoh (ixtiyoriy)</span>
                  <input
                    className="input"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="masalan: Dastlabki maslahat"
                  />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    disabled={saving}
                    onClick={saveSlot}
                  >
                    {saving ? "Saqlanmoqda..." : "Qo'shish"}
                  </button>
                  <button className="btn-secondary" onClick={() => setAdding(null)}>Bekor</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking detail modal */}
        {detailSlot && (() => {
          const booking: SlotBooking | undefined = detailSlot.bookings?.[0];
          const start = new Date(detailSlot.startsAt);
          const end = new Date(detailSlot.endsAt);
          const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
          const BOOKING_STATUS: Record<string, string> = {
            PENDING: "Kutilmoqda", CONFIRMED: "Tasdiqlangan",
            CANCELLED: "Bekor qilingan", COMPLETED: "Yakunlangan",
          };
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

                {/* Time */}
                <div style={{ background: "var(--hover)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                    📅 {start.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                    🕐 {fmtTime(start.getHours(), start.getMinutes())} – {fmtTime(end.getHours(), end.getMinutes())}
                    <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>({durationMins} daqiqa)</span>
                  </div>
                </div>

                {booking ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {/* User */}
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

                    {/* Booking status + meet link */}
                    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Bron holati</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                          background: booking.status === "CONFIRMED" ? "#f0fdf4" : booking.status === "CANCELLED" ? "#fef2f2" : "#fffbeb",
                          color: booking.status === "CONFIRMED" ? "#16a34a" : booking.status === "CANCELLED" ? "#dc2626" : "#b45309",
                        }}>
                          {BOOKING_STATUS[booking.status] ?? booking.status}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {new Date(booking.bookedAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {booking.meetLink && (
                        <a href={booking.meetLink} target="_blank" rel="noreferrer"
                          style={{ display: "inline-block", marginTop: 8, fontSize: 13, color: "#3b82f6", textDecoration: "none", wordBreak: "break-all" }}>
                          🎥 {booking.meetLink}
                        </a>
                      )}
                    </div>

                    {/* Payment */}
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
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Bron ma'lumotlari topilmadi.</div>
                )}
              </div>
            </div>
          );
        })()}
      </main>
    </AuthGuard>
  );
}
