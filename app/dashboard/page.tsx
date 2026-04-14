"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AdminAnalytics, AdminDashboard } from "../../types";

const emptyStats: AdminDashboard = {
  totalUsers: 0,
  totalPaidRequests: 0,
  pendingPaymentApprovals: 0,
  unresolvedConversations: 0,
  unsatisfiedCount: 0,
  todayQuestions: 0,
  approvedPayments: 0,
  rejectedPayments: 0,
  redirectedToAdvocate: 0,
  knowledgeEntries: 0,
  tariffs: 0,
  recentActivity: []
};

const emptyAnalytics: AdminAnalytics = {
  rangeDays: 30,
  questions: { today: 0, week: 0, month: 0 },
  payments: {
    today: { pending: 0, approved: 0, rejected: 0 },
    week: { pending: 0, approved: 0, rejected: 0 },
    month: { pending: 0, approved: 0, rejected: 0 }
  },
  satisfaction: { total: 0, unsatisfied: 0, unsatisfiedRate: 0 },
  escalations: { total: 0 },
  topQuestions: [],
  topTariffs: [],
  dayStats: []
};

const Stat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div className="surface panel stat-card">
    <div className="stat-number" style={{ color: color || "#11202a" }}>{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminDashboard>(emptyStats);
  const [analytics, setAnalytics] = useState<AdminAnalytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AdminDashboard>("/admin/dashboard"),
      api.get<AdminAnalytics>("/admin/analytics?rangeDays=30")
    ])
      .then(([dashboard, analyticsData]) => {
        setStats(dashboard);
        setAnalytics(analyticsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <main>
          <div className="surface panel" style={{ color: "#546573" }}>Yuklanmoqda...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <div style={{ fontSize: 13, opacity: 0.55 }}>Bugungi holat</div>
        </div>

        {/* Primary stats */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", marginBottom: 20 }}>
          <Stat label="Jami mijozlar" value={stats.totalUsers} />
          <Stat label="Tasdiqlangan to'lovlar" value={stats.approvedPayments} color="#1f8f53" />
          <Stat label="Kutilayotgan to'lovlar" value={stats.pendingPaymentApprovals} color="#9e6400" />
          <Stat label="Bugungi savollar" value={stats.todayQuestions} />
          <Stat label="Qabul so'rovlari" value={stats.unresolvedConversations} color="#c13838" />
          <Stat label="Qoniqmaganlar" value={stats.unsatisfiedCount} color="#c13838" />
          <Stat label="Rad etilgan to'lovlar" value={stats.rejectedPayments} color="#c13838" />
          <Stat label="Bilim bazasi" value={stats.knowledgeEntries} color="#0f7f7a" />
        </div>

        {/* Analytics */}
        <div className="surface panel" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16 }}>30 kunlik tahlil</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "#4f6471", textTransform: "uppercase", letterSpacing: "0.05em" }}>Savollar</div>
              <div style={{ display: "grid", gap: 4, fontSize: 14 }}>
                <div>Bugun: <strong>{analytics.questions.today}</strong></div>
                <div>Hafta: <strong>{analytics.questions.week}</strong></div>
                <div>Oy: <strong>{analytics.questions.month}</strong></div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "#4f6471", textTransform: "uppercase", letterSpacing: "0.05em" }}>To'lovlar (oy)</div>
              <div style={{ display: "grid", gap: 4, fontSize: 14 }}>
                <div>Kutilmoqda: <strong style={{ color: "#9e6400" }}>{analytics.payments.month.pending}</strong></div>
                <div>Tasdiqlangan: <strong style={{ color: "#1f8f53" }}>{analytics.payments.month.approved}</strong></div>
                <div>Rad etilgan: <strong style={{ color: "#c13838" }}>{analytics.payments.month.rejected}</strong></div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "#4f6471", textTransform: "uppercase", letterSpacing: "0.05em" }}>Qoniqish</div>
              <div style={{ display: "grid", gap: 4, fontSize: 14 }}>
                <div>Jami baholash: <strong>{analytics.satisfaction.total}</strong></div>
                <div>Qoniqmaganlar: <strong style={{ color: "#c13838" }}>{analytics.satisfaction.unsatisfied}</strong></div>
                <div>Qoniqmaslik %: <strong style={{ color: "#c13838" }}>{analytics.satisfaction.unsatisfiedRate}%</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top questions */}
        {analytics.topQuestions.length > 0 && (
          <div className="surface panel" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>Ko'p beriladigan savollar</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Savol</th>
                  <th>Soni</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topQuestions.map((row, idx) => (
                  <tr key={`${row.text}-${idx}`}>
                    <td style={{ color: "#4f6471", width: 40 }}>{idx + 1}</td>
                    <td>{row.text}</td>
                    <td><span className="tag tag-info">{row.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent activity */}
        {stats.recentActivity.length > 0 && (
          <div className="surface panel">
            <h2 style={{ marginBottom: 12 }}>So'nggi faollik</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>Amal</th>
                  <th>Manba</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: "nowrap", color: "#4f6471", fontSize: 12 }}>{formatDateTime(item.createdAt)}</td>
                    <td><code style={{ fontSize: 12 }}>{item.action}</code></td>
                    <td>{item.resource}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "#4f6471" }}>{item.resourceId?.slice(0, 10) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
