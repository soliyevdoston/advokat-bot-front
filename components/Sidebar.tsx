"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { clearTokens, getAccessToken } from "../lib/auth";

const nav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "Mening jadvalim",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: "/requests",
    label: "Navbat",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    ),
  },
  {
    href: "/payments",
    label: "To'lovlar",
    badge: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    href: "/conversations",
    label: "Savollar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/unresolved",
    label: "Qabul so'rovlari",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    href: "/users",
    label: "Mijozlar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/knowledge",
    label: "Bilim bazasi",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    href: "/revenue",
    label: "Daromad",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    href: "/tariffs",
    label: "Tariflar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href: "/slots",
    label: "Vaqt jadvali",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/bookings",
    label: "Bronlar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Sozlamalar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93a10 10 0 0 0 14.14 14.14"/>
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Hisob (parol)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

// In-page toast for new payment alert
function PaymentToast({ count, onClose }: { count: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "#1f2937", color: "#fff",
      padding: "14px 20px", borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", gap: 12,
      fontSize: 14, fontWeight: 600, maxWidth: 320,
      animation: "slideUp 0.25s ease",
    }}>
      <span style={{ fontSize: 22 }}>💳</span>
      <div>
        <div>{count} ta yangi to'lov kutmoqda!</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af", marginTop: 2 }}>
          To'lovlar sahifasini tekshiring
        </div>
      </div>
      <button onClick={onClose} style={{
        marginLeft: "auto", background: "none", border: "none",
        color: "#9ca3af", cursor: "pointer", fontSize: 18, lineHeight: 1,
      }}>✕</button>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const prevCountRef = useRef<number | null>(null);
  const notifPermRef = useRef(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission().then(p => {
        notifPermRef.current = p === "granted";
      });
    } else {
      notifPermRef.current = Notification.permission === "granted";
    }
  }, []);

  // Poll pending payments count every 15s
  useEffect(() => {
    const check = async () => {
      if (!getAccessToken()) return;
      try {
        const data = await api.get<{ pendingPaymentApprovals: number }>("/admin/dashboard");
        const count = data.pendingPaymentApprovals ?? 0;
        setPendingCount(count);

        // Only alert if count increased (not on first load)
        if (prevCountRef.current !== null && count > prevCountRef.current) {
          const diff = count - prevCountRef.current;
          // In-page toast
          setShowToast(true);
          // Browser notification
          if (notifPermRef.current) {
            new Notification("💳 Yangi to'lov!", {
              body: `${diff} ta yangi to'lov tasdiqlash kutmoqda`,
              icon: "/icon-192.png",
            });
          }
        }
        prevCountRef.current = count;
      } catch {
        // ignore auth/network errors
      }
    };

    void check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // best-effort
    }
    clearTokens();
    router.replace("/login");
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {showToast && (
        <PaymentToast count={pendingCount} onClose={() => setShowToast(false)} />
      )}

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        aria-controls="admin-sidebar"
      >
        ☰ Menyu
        {pendingCount > 0 && (
          <span style={{
            marginLeft: 8, background: "#ef4444", color: "#fff",
            borderRadius: 99, fontSize: 11, fontWeight: 700,
            padding: "1px 7px", lineHeight: "18px",
          }}>{pendingCount}</span>
        )}
      </button>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside id="admin-sidebar" className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-brand">
          <p className="sidebar-eyebrow">Admin Panel</p>
          <p className="sidebar-title">Turdimotov M.M.</p>
          <p className="sidebar-subtitle">Advokat boshqaruv tizimi</p>
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const hasBadge = item.badge && pendingCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${active ? " active" : ""}`}
              >
                <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {hasBadge && (
                  <span style={{
                    background: "#ef4444", color: "#fff",
                    borderRadius: 99, fontSize: 11, fontWeight: 700,
                    padding: "1px 7px", lineHeight: "18px", flexShrink: 0,
                  }}>{pendingCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="sidebar-logout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Chiqish
          </button>
        </div>
      </aside>
    </>
  );
}
