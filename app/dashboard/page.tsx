"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { LiveBadge } from "../../components/LiveBadge";
import { Sk } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { usePolling } from "../../lib/usePolling";
import { WaveChart, type WavePoint } from "../../components/WaveChart";
import type {
  AdminAnalytics,
  AdminDashboard,
  AdminRevenue,
  AIConversationListItem,
  Booking,
  EscalationItem,
  KnowledgeEntry,
  Paginated,
  Payment,
  Tariff,
  User
} from "../../types";



/* ─── DayRevenueSelector ─── */
function DayRevenueSelector({ dayStats }: { dayStats: AdminRevenue["dayStats"] }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [customResult, setCustomResult] = useState<{ amount: number; count: number; currency: string } | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  const handleSearch = async () => {
    if (!selectedDate) return;
    setCustomError("");
    const local = dayStats.find(d => d.date === selectedDate) ?? null;
    if (local) { setCustomResult(local); return; }
    setCustomLoading(true);
    try {
      const data = await api.get<AdminRevenue>(`/admin/revenue?from=${selectedDate}&to=${selectedDate}`);
      const day = data.dayStats.find(d => d.date === selectedDate);
      setCustomResult(day ?? { amount: 0, count: 0, currency: "UZS" });
    } catch {
      setCustomError("Ma'lumot yuklanmadi");
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="surface panel" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
          Kunlik daromad
        </span>
        <input
          type="date"
          className="input"
          style={{ width: 160, flex: "0 0 auto" }}
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setCustomResult(null); setCustomError(""); }}
          max={new Date().toISOString().slice(0, 10)}
        />
        <button className="btn-primary" style={{ padding: "9px 16px" }} onClick={handleSearch} disabled={!selectedDate || customLoading}>
          {customLoading ? "…" : "Ko'rish"}
        </button>
        {customResult && (
          <>
            <span style={{ fontWeight: 800, fontSize: 18, color: customResult.amount > 0 ? "var(--ok)" : "var(--muted)" }}>
              {customResult.amount > 0 ? formatMoney(customResult.amount, customResult.currency || "UZS") : "0 so'm"}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{customResult.count} ta to'lov</span>
            <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => { setCustomResult(null); setSelectedDate(""); }}>✕</button>
          </>
        )}
      </div>
      {customError && <div style={{ marginTop: 8, color: "var(--danger)", fontSize: 13 }}>{customError}</div>}
    </div>
  );
}

/* ─── helpers ─── */
function StatCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-number" style={{ color: color || "var(--ink)", fontSize: 22 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── empty states ─── */
const emptyStats: AdminDashboard = {
  totalUsers: 0, totalPaidRequests: 0, pendingPaymentApprovals: 0,
  unresolvedConversations: 0, unsatisfiedCount: 0, todayQuestions: 0,
  approvedPayments: 0, rejectedPayments: 0, redirectedToAdvocate: 0,
  knowledgeEntries: 0, tariffs: 0, recentActivity: []
};
const emptyAnalytics: AdminAnalytics = {
  rangeDays: 30,
  questions: { today: 0, week: 0, month: 0 },
  payments: {
    today: { pending: 0, approved: 0, rejected: 0 },
    week:  { pending: 0, approved: 0, rejected: 0 },
    month: { pending: 0, approved: 0, rejected: 0 }
  },
  satisfaction: { total: 0, unsatisfied: 0, unsatisfiedRate: 0 },
  escalations: { total: 0 },
  topQuestions: [], topTariffs: [], dayStats: []
};


function UpcomingBookingsWidget({ items }: { items: Booking[] }) {
  const now = Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  const sorted = items
    .filter((b) => b.slot && new Date(b.slot.startsAt).getTime() >= now)
    .filter((b) => b.slot && new Date(b.slot.startsAt).getTime() <= horizon)
    .sort((a, b) => new Date(a.slot!.startsAt).getTime() - new Date(b.slot!.startsAt).getTime())
    .slice(0, 6);

  return (
    <div className="surface panel" style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Yaqin uchrashuvlar (24 soat)</div>
      {sorted.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Yaqin 24 soat ichida uchrashuvlar yo'q.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {sorted.map((b) => {
            const start = new Date(b.slot!.startsAt);
            const minutesUntil = Math.round((start.getTime() - now) / 60000);
            const soon = minutesUntil <= 15;
            const name = b.user?.fullName || b.user?.username || b.user?.phone || "Mijoz";
            return (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: soon ? "rgba(255, 165, 0, 0.08)" : "var(--surface)",
                  border: `1px solid ${soon ? "var(--warn)" : "var(--border)"}`,
                  fontSize: 14
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {formatDateTime(b.slot!.startsAt)}
                    {b.payment?.tariff?.code === "premium_booking" ? " · ⭐ Premium" : ""}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: soon ? "var(--warn)" : "var(--muted)",
                    textAlign: "right"
                  }}
                >
                  {minutesUntil <= 0
                    ? "Hozir"
                    : minutesUntil < 60
                      ? `${minutesUntil} daq`
                      : `${Math.round(minutesUntil / 60)} soat`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRevAmount(byCurrency: Record<string, number>) {
  const entries = Object.entries(byCurrency);
  if (entries.length === 0) return "0";
  return entries.map(([cur, minor]) => formatMoney(minor, cur)).join(" + ");
}

type DashboardFallbackData = {
  usersTotal: number;
  pendingPayments: Payment[];
  approvedPayments: Payment[];
  rejectedPayments: Payment[];
  conversations: AIConversationListItem[];
  escalationsTotal: number;
  knowledgeEntriesTotal: number;
  tariffs: Tariff[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 30;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addCurrency(target: Record<string, number>, currency: string, amountMinor: number) {
  target[currency] = (target[currency] ?? 0) + amountMinor;
}

function buildRevenueFromApprovedPayments(approvedPayments: Payment[]): AdminRevenue {
  const now = new Date();
  const todayStart = startOfToday(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const periods = {
    today: { count: 0, byCurrency: {} as Record<string, number> },
    week: { count: 0, byCurrency: {} as Record<string, number> },
    month: { count: 0, byCurrency: {} as Record<string, number> },
    year: { count: 0, byCurrency: {} as Record<string, number> }
  };

  const dayBuckets = new Map<string, { amount: number; count: number; currency: string }>();
  for (let i = RANGE_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(todayStart.getTime() - i * DAY_MS);
    dayBuckets.set(dayKey(day), { amount: 0, count: 0, currency: "UZS" });
  }

  approvedPayments.forEach((payment) => {
    const created = parseDate(payment.createdAt);
    if (!created) return;

    if (created >= yearStart) {
      periods.year.count += 1;
      addCurrency(periods.year.byCurrency, payment.currency, payment.amountMinor);
    }
    if (created >= monthStart) {
      periods.month.count += 1;
      addCurrency(periods.month.byCurrency, payment.currency, payment.amountMinor);
    }
    if (created >= weekStart) {
      periods.week.count += 1;
      addCurrency(periods.week.byCurrency, payment.currency, payment.amountMinor);
    }
    if (created >= todayStart) {
      periods.today.count += 1;
      addCurrency(periods.today.byCurrency, payment.currency, payment.amountMinor);
    }

    const key = dayKey(created);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      bucket.amount += payment.amountMinor;
      bucket.count += 1;
      bucket.currency = payment.currency;
    }
  });

  return {
    today: periods.today,
    week: periods.week,
    month: periods.month,
    year: periods.year,
    dayStats: Array.from(dayBuckets.entries()).map(([date, bucket]) => ({
      date,
      amount: bucket.amount,
      count: bucket.count,
      currency: bucket.currency
    }))
  };
}

function buildDashboardFromFallback(data: DashboardFallbackData): AdminDashboard {
  const todayStart = startOfToday();

  const allFeedback = data.conversations.flatMap((item) => item.satisfaction);
  const unsatisfiedCount = allFeedback.filter((item) => !item.isSatisfied).length;

  const todayQuestions = data.conversations.filter((item) => {
    const created = parseDate(item.startedAt || item.createdAt);
    return Boolean(created && created >= todayStart);
  }).length;

  const unresolvedFromConversations = data.conversations.filter(
    (item) => !item.isResolved || item.status !== "CLOSED"
  ).length;

  return {
    totalUsers: data.usersTotal,
    totalPaidRequests: data.pendingPayments.length + data.approvedPayments.length + data.rejectedPayments.length,
    pendingPaymentApprovals: data.pendingPayments.length,
    unresolvedConversations: data.escalationsTotal || unresolvedFromConversations,
    unsatisfiedCount,
    todayQuestions,
    approvedPayments: data.approvedPayments.length,
    rejectedPayments: data.rejectedPayments.length,
    redirectedToAdvocate: data.conversations.filter((item) => item.needsLawyer).length,
    knowledgeEntries: data.knowledgeEntriesTotal,
    tariffs: data.tariffs.length,
    recentActivity: []
  };
}

function buildAnalyticsFromFallback(data: DashboardFallbackData): AdminAnalytics {
  const now = new Date();
  const todayStart = startOfToday(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paymentCounts = {
    today: { pending: 0, approved: 0, rejected: 0 },
    week: { pending: 0, approved: 0, rejected: 0 },
    month: { pending: 0, approved: 0, rejected: 0 }
  };

  const countPaymentsByRange = (
    items: Payment[],
    key: "pending" | "approved" | "rejected"
  ) => {
    items.forEach((item) => {
      const created = parseDate(item.createdAt);
      if (!created) return;
      if (created >= monthStart) paymentCounts.month[key] += 1;
      if (created >= weekStart) paymentCounts.week[key] += 1;
      if (created >= todayStart) paymentCounts.today[key] += 1;
    });
  };

  countPaymentsByRange(data.pendingPayments, "pending");
  countPaymentsByRange(data.approvedPayments, "approved");
  countPaymentsByRange(data.rejectedPayments, "rejected");

  const questionCounts = { today: 0, week: 0, month: 0 };
  const topQuestionMap: Record<string, number> = {};
  const dayMap = new Map<string, { questions: number; approvedPayments: number }>();

  for (let i = RANGE_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(todayStart.getTime() - i * DAY_MS);
    dayMap.set(dayKey(day), { questions: 0, approvedPayments: 0 });
  }

  data.conversations.forEach((item) => {
    const created = parseDate(item.startedAt || item.createdAt);
    if (!created) return;

    if (created >= monthStart) questionCounts.month += 1;
    if (created >= weekStart) questionCounts.week += 1;
    if (created >= todayStart) questionCounts.today += 1;

    const bucket = dayMap.get(dayKey(created));
    if (bucket) bucket.questions += 1;

    if (created >= monthStart) {
      const firstUserQuestion = item.messages.find((m) => m.sender === "USER" && m.content.trim())?.content.trim();
      if (firstUserQuestion) {
        const normalized = firstUserQuestion.replace(/\s+/g, " ").slice(0, 140);
        topQuestionMap[normalized] = (topQuestionMap[normalized] ?? 0) + 1;
      }
    }
  });

  data.approvedPayments.forEach((item) => {
    const created = parseDate(item.createdAt);
    if (!created) return;
    const bucket = dayMap.get(dayKey(created));
    if (bucket) bucket.approvedPayments += 1;
  });

  const tariffMap = new Map<string, { tariffId: string; code: string; titleI18n: Record<string, string>; count: number }>();
  data.approvedPayments.forEach((item) => {
    const created = parseDate(item.createdAt);
    if (!created || created < monthStart) return;
    const existing = tariffMap.get(item.tariffId);
    if (existing) {
      existing.count += 1;
      return;
    }
    tariffMap.set(item.tariffId, {
      tariffId: item.tariffId,
      code: item.tariff.code,
      titleI18n: item.tariff.titleI18n,
      count: 1
    });
  });

  const allFeedback = data.conversations.flatMap((item) => item.satisfaction);
  const unsatisfied = allFeedback.filter((item) => !item.isSatisfied).length;
  const unsatisfiedRate = allFeedback.length === 0
    ? 0
    : Math.round((unsatisfied / allFeedback.length) * 1000) / 10;

  return {
    rangeDays: RANGE_DAYS,
    questions: questionCounts,
    payments: paymentCounts,
    satisfaction: {
      total: allFeedback.length,
      unsatisfied,
      unsatisfiedRate
    },
    escalations: { total: data.escalationsTotal },
    topQuestions: Object.entries(topQuestionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([text, count]) => ({ text, count })),
    topTariffs: Array.from(tariffMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    dayStats: Array.from(dayMap.entries()).map(([date, value]) => ({
      date,
      questions: value.questions,
      approvedPayments: value.approvedPayments
    }))
  };
}

async function loadDashboardFallbackData(): Promise<DashboardFallbackData> {
  const [
    usersResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    conversationsResult,
    escalationsResult,
    knowledgeResult,
    tariffsResult
  ] = await Promise.allSettled([
    api.get<Paginated<User>>("/users?page=1&limit=1"),
    api.get<Payment[]>("/payments?status=PENDING"),
    api.get<Payment[]>("/payments?status=APPROVED"),
    api.get<Payment[]>("/payments?status=REJECTED"),
    api.get<Paginated<AIConversationListItem>>("/ai/conversations?page=1&limit=500"),
    api.get<Paginated<EscalationItem>>("/ai/escalations?page=1&limit=1"),
    api.get<Paginated<KnowledgeEntry>>("/knowledge/entries?page=1&limit=1"),
    api.get<Tariff[]>("/tariffs/admin")
  ]);

  return {
    usersTotal: usersResult.status === "fulfilled" ? usersResult.value.total : 0,
    pendingPayments: pendingResult.status === "fulfilled" ? pendingResult.value : [],
    approvedPayments: approvedResult.status === "fulfilled" ? approvedResult.value : [],
    rejectedPayments: rejectedResult.status === "fulfilled" ? rejectedResult.value : [],
    conversations: conversationsResult.status === "fulfilled" ? conversationsResult.value.items : [],
    escalationsTotal: escalationsResult.status === "fulfilled" ? escalationsResult.value.total : 0,
    knowledgeEntriesTotal: knowledgeResult.status === "fulfilled" ? knowledgeResult.value.total : 0,
    tariffs: tariffsResult.status === "fulfilled" ? tariffsResult.value : []
  };
}

/* ─── page ─── */
export default function DashboardPage() {
  const [stats, setStats]     = useState<AdminDashboard>(emptyStats);
  const [analytics, setAnalytics] = useState<AdminAnalytics>(emptyAnalytics);
  const [revenue, setRevenue] = useState<AdminRevenue | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const [dashboardResult, analyticsResult, revenueResult, upcomingResult] = await Promise.allSettled([
      api.get<AdminDashboard>("/admin/dashboard"),
      api.get<AdminAnalytics>("/admin/analytics?rangeDays=30"),
      api.get<AdminRevenue>("/admin/revenue"),
      api.get<Booking[]>("/bookings?upcoming=true")
    ]);

    let nextStats = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
    let nextAnalytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
    let nextRevenue = revenueResult.status === "fulfilled" ? revenueResult.value : null;

    if (!silent && (!nextStats || !nextAnalytics || !nextRevenue)) {
      const fallback = await loadDashboardFallbackData();
      if (!nextStats) nextStats = buildDashboardFromFallback(fallback);
      if (!nextAnalytics) nextAnalytics = buildAnalyticsFromFallback(fallback);
      if (!nextRevenue) nextRevenue = buildRevenueFromApprovedPayments(fallback.approvedPayments);
    }

    if (nextStats) setStats(nextStats);
    if (nextAnalytics) setAnalytics(nextAnalytics);
    if (nextRevenue) setRevenue(nextRevenue);
    setUpcoming(upcomingResult.status === "fulfilled" ? upcomingResult.value : []);
    if (!silent) setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  usePolling(() => load(true), 120000); // 2 daqiqa

  if (loading) {
    return (
      <AuthGuard>
        <main>
          <Sk.PageHeader />
          <Sk.Hero />
          <Sk.StatGrid cols={3} />
        </main>
      </AuthGuard>
    );
  }

  const revenueWave: WavePoint[] = (revenue?.dayStats ?? []).map((d) => ({
    label: d.date.slice(5),
    value: d.amount / 100,
    caption: `${d.date} · ${d.count} ta to'lov`
  }));

  const todayRevenue = revenue?.today;
  const todayRevenueText = todayRevenue ? formatRevAmount(todayRevenue.byCurrency) : "—";
  const weekRevenueText  = revenue ? formatRevAmount(revenue.week.byCurrency) : "—";
  const monthRevenueText = revenue ? formatRevAmount(revenue.month.byCurrency) : "—";
  const yearRevenueText  = revenue ? formatRevAmount(revenue.year.byCurrency) : "—";

  return (
    <AuthGuard>
      <main>
        {/* ── Header ── */}
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Dashboard <LiveBadge />
          </h1>
          <button className="btn-secondary" onClick={() => load()}>Yangilash</button>
        </div>

        {/* ── Kunlik daromad qidirish (tepada) ── */}
        <DayRevenueSelector dayStats={revenue?.dayStats ?? []} />

        {/* ── HERO ── */}
        <section className="dash-hero" style={{ marginBottom: 20 }}>
          <div className="dash-hero-grid">
            <div>
              <p className="dash-hero-eyebrow">Bugungi daromad</p>
              <p className="dash-hero-amount count-up-anim">{todayRevenueText}</p>
              <p className="dash-hero-sub">
                {todayRevenue?.count ?? 0} ta tasdiqlangan to'lov · {analytics.questions.today} ta savol
              </p>
            </div>
            <div className="dash-hero-stats">
              <div className="dash-hero-stat">
                <div className="dash-hero-stat-value">{weekRevenueText}</div>
                <div className="dash-hero-stat-label">Bu hafta</div>
              </div>
              <div className="dash-hero-stat">
                <div className="dash-hero-stat-value">{monthRevenueText}</div>
                <div className="dash-hero-stat-label">Bu oy</div>
              </div>
              <div className="dash-hero-stat">
                <div className="dash-hero-stat-value">{yearRevenueText}</div>
                <div className="dash-hero-stat-label">Bu yil</div>
              </div>
              <div className="dash-hero-stat">
                <div className="dash-hero-stat-value">{stats.totalUsers}</div>
                <div className="dash-hero-stat-label">Mijoz</div>
              </div>
            </div>
          </div>
          <div className="dash-hero-wave">
            <WaveChart
              data={revenueWave}
              height={110}
              color="#7aa2ff"
              gradientFrom="#7aa2ff"
              gradientTo="#7aa2ff"
              ariaLabel="So'nggi 30 kunlik daromad to'lqini"
            />
          </div>
        </section>

        {/* ── 3 asosiy ko'rsatkich ── */}
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}
        >
          <StatCard label="Kutilayotgan to'lovlar" value={stats.pendingPaymentApprovals} color="var(--warn)" />
          <StatCard label="Qoniqmagan mijozlar"    value={stats.unsatisfiedCount}         color="var(--danger)" />
          <StatCard label="Advokatga yo'naltirilgan" value={stats.redirectedToAdvocate} />
        </div>

        {/* ── Yaqin uchrashuvlar ── */}
        <UpcomingBookingsWidget items={upcoming} />
      </main>
    </AuthGuard>
  );
}
