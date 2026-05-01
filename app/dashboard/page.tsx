"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
      {children}
    </div>
  );
}

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
      <SectionTitle>Yaqin uchrashuvlar (24 soat)</SectionTitle>
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

function MiniBar({ dayStats }: { dayStats: AdminRevenue["dayStats"] }) {
  const max = Math.max(...dayStats.map((d) => d.amount), 1);
  if (dayStats.every((d) => d.amount === 0)) return <p style={{ color: "var(--muted)", fontSize: 13 }}>Ma'lumot yo'q</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64, minWidth: dayStats.length * 16 }}>
        {dayStats.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${formatMoney(d.amount, d.currency || "UZS")} (${d.count} ta)`}
            style={{
              flex: "0 0 12px",
              height: `${Math.max((d.amount / max) * 100, d.amount > 0 ? 5 : 1)}%`,
              background: d.amount > 0 ? "var(--ink)" : "var(--border)",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--muted)" }}>
        <span>{dayStats[0]?.date}</span>
        <span>{dayStats[dayStats.length - 1]?.date}</span>
      </div>
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

  const load = async () => {
    setLoading(true);
    const [dashboardResult, analyticsResult, revenueResult, upcomingResult] = await Promise.allSettled([
      api.get<AdminDashboard>("/admin/dashboard"),
      api.get<AdminAnalytics>("/admin/analytics?rangeDays=30"),
      api.get<AdminRevenue>("/admin/revenue"),
      api.get<Booking[]>("/bookings?upcoming=true")
    ]);

    let nextStats = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
    let nextAnalytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
    let nextRevenue = revenueResult.status === "fulfilled" ? revenueResult.value : null;

    if (!nextStats || !nextAnalytics || !nextRevenue) {
      const fallback = await loadDashboardFallbackData();
      if (!nextStats) nextStats = buildDashboardFromFallback(fallback);
      if (!nextAnalytics) nextAnalytics = buildAnalyticsFromFallback(fallback);
      if (!nextRevenue) nextRevenue = buildRevenueFromApprovedPayments(fallback.approvedPayments);
    }

    setStats(nextStats ?? emptyStats);
    setAnalytics(nextAnalytics ?? emptyAnalytics);
    setRevenue(nextRevenue);
    setUpcoming(upcomingResult.status === "fulfilled" ? upcomingResult.value : []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <AuthGuard>
        <main>
          <div className="surface panel" style={{ color: "var(--muted)" }}>Yuklanmoqda...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title">Dashboard</h1>
          <button className="btn-secondary" onClick={load}>Yangilash</button>
        </div>

        {/* ── 0. Yaqin uchrashuvlar ── */}
        <UpcomingBookingsWidget items={upcoming} />

        {/* ── 1. Daromad ── */}
        <div className="surface panel" style={{ marginBottom: 20 }}>
          <SectionTitle>Daromad — tasdiqlangan to'lovlar</SectionTitle>
          {revenue ? (
            <>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
                {(["today", "week", "month", "year"] as const).map((p) => {
                  const lbl = { today: "Bugun", week: "Hafta", month: "Oy", year: "Yil" }[p];
                  const d = revenue[p];
                  return (
                    <StatCard
                      key={p}
                      label={lbl}
                      value={formatRevAmount(d.byCurrency)}
                      color="var(--ok)"
                      sub={`${d.count} ta to'lov`}
                    />
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>So'nggi 30 kun grafigi</div>
              <MiniBar dayStats={revenue.dayStats} />
            </>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Ma'lumot yuklanmadi</p>
          )}
        </div>

        {/* ── 2. Asosiy ko'rsatkichlar ── */}
        <div className="surface panel" style={{ marginBottom: 20 }}>
          <SectionTitle>Asosiy ko'rsatkichlar</SectionTitle>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            <StatCard label="Jami mijozlar"           value={stats.totalUsers} />
            <StatCard label="Bugungi savollar"        value={stats.todayQuestions} />
            <StatCard label="Tasdiqlangan to'lovlar"  value={stats.approvedPayments}        color="var(--ok)" />
            <StatCard label="Kutilayotgan to'lovlar"  value={stats.pendingPaymentApprovals} color="var(--warn)" />
            <StatCard label="Rad etilgan to'lovlar"   value={stats.rejectedPayments}        color="var(--danger)" />
            <StatCard label="Qabul so'rovlari"        value={stats.unresolvedConversations} color="var(--danger)" />
            <StatCard label="Qoniqmaganlar"           value={stats.unsatisfiedCount}        color="var(--danger)" />
            <StatCard label="Jami pullik so'rovlar"   value={stats.totalPaidRequests} />
            <StatCard label="Advokatlarga yo'naltirilgan" value={stats.redirectedToAdvocate} />
            <StatCard label="Bilim bazasi"            value={stats.knowledgeEntries} />
            <StatCard label="Tariflar"                value={stats.tariffs} />
          </div>
        </div>

        {/* ── 3. Savollar + To'lovlar + Qoniqish ── */}
        <div className="surface panel" style={{ marginBottom: 20 }}>
          <SectionTitle>30 kunlik tahlil</SectionTitle>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 24 }}>

            {/* Savollar */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Savollar</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {[
                    ["Bugun", analytics.questions.today],
                    ["Hafta", analytics.questions.week],
                    ["Oy",    analytics.questions.month],
                  ].map(([lbl, val]) => (
                    <tr key={String(lbl)}>
                      <td style={{ padding: "5px 0", color: "var(--muted)" }}>{lbl}</td>
                      <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* To'lovlar — bugun */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>To'lovlar · Bugun</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Kutilmoqda</td>  <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--warn)" }}>{analytics.payments.today.pending}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Tasdiqlangan</td><td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--ok)" }}>{analytics.payments.today.approved}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Rad etilgan</td> <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--danger)" }}>{analytics.payments.today.rejected}</td></tr>
                </tbody>
              </table>
            </div>

            {/* To'lovlar — hafta */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>To'lovlar · Hafta</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Kutilmoqda</td>  <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--warn)" }}>{analytics.payments.week.pending}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Tasdiqlangan</td><td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--ok)" }}>{analytics.payments.week.approved}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Rad etilgan</td> <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--danger)" }}>{analytics.payments.week.rejected}</td></tr>
                </tbody>
              </table>
            </div>

            {/* To'lovlar — oy */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>To'lovlar · Oy</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Kutilmoqda</td>  <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--warn)" }}>{analytics.payments.month.pending}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Tasdiqlangan</td><td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--ok)" }}>{analytics.payments.month.approved}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Rad etilgan</td> <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--danger)" }}>{analytics.payments.month.rejected}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Qoniqish */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Qoniqish darajasi</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Jami baholash</td>    <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right" }}>{analytics.satisfaction.total}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Qoniqmaganlar</td>    <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--danger)" }}>{analytics.satisfaction.unsatisfied}</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Qoniqmaslik %</td>    <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right", color: "var(--danger)" }}>{analytics.satisfaction.unsatisfiedRate}%</td></tr>
                  <tr><td style={{ padding: "5px 0", color: "var(--muted)" }}>Eskalatsiyalar</td>   <td style={{ padding: "5px 0", fontWeight: 700, textAlign: "right" }}>{analytics.escalations.total}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 4. Top tariflar ── */}
        <div className="surface panel" style={{ marginBottom: 20 }}>
          <SectionTitle>Eng ko'p sotib olingan tariflar (30 kun)</SectionTitle>
          {analytics.topTariffs.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Ma'lumot yo'q</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>#</th><th>Tarif</th><th>Sotilgan</th></tr>
              </thead>
              <tbody>
                {analytics.topTariffs.map((t, i) => (
                  <tr key={t.tariffId}>
                    <td style={{ color: "var(--muted)", width: 40 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{(t.titleI18n as Record<string,string>)?.UZ || (t.titleI18n as Record<string,string>)?.RU || t.code}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.code}</div>
                    </td>
                    <td><span className="tag tag-ok">{t.count} ta</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 5. Ko'p beriladigan savollar ── */}
        <div className="surface panel" style={{ marginBottom: 20 }}>
          <SectionTitle>Ko'p beriladigan savollar (30 kun)</SectionTitle>
          {analytics.topQuestions.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Ma'lumot yo'q</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>#</th><th>Savol</th><th>Soni</th></tr>
              </thead>
              <tbody>
                {analytics.topQuestions.map((row, idx) => (
                  <tr key={`${row.text}-${idx}`}>
                    <td style={{ color: "var(--muted)", width: 40 }}>{idx + 1}</td>
                    <td style={{ fontSize: 13 }}>{row.text}</td>
                    <td><span className="tag tag-info">{row.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 6. So'nggi faollik ── */}
        <div className="surface panel">
          <SectionTitle>So'nggi faollik</SectionTitle>
          {stats.recentActivity.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Faollik yo'q</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr><th>Vaqt</th><th>Amal</th><th>Manba</th><th>ID</th></tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{formatDateTime(item.createdAt)}</td>
                      <td><code style={{ fontSize: 12 }}>{item.action}</code></td>
                      <td style={{ fontSize: 13 }}>{item.resource}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>{item.resourceId?.slice(0, 10) || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
