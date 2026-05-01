"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { clearTokens } from "../lib/auth";

const PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: dashboardIcon },
  { href: "/requests", label: "Navbat", icon: queueIcon },
  { href: "/payments", label: "To'lovlar", icon: paymentsIcon },
  { href: "/slots", label: "Vaqt", icon: slotsIcon }
];

const MORE = [
  { href: "/conversations", label: "Mijoz suhbati", icon: chatIcon },
  { href: "/unresolved", label: "Qabul so'rovlari", icon: warnIcon },
  { href: "/users", label: "Mijozlar", icon: usersIcon },
  { href: "/bookings", label: "Bronlar", icon: bookingIcon },
  { href: "/revenue", label: "Daromad", icon: revenueIcon },
  { href: "/tariffs", label: "Tariflar", icon: tariffsIcon },
  { href: "/knowledge", label: "Bilim bazasi", icon: bookIcon },
  { href: "/settings", label: "Sozlamalar", icon: settingsIcon },
  { href: "/account", label: "Hisob (parol)", icon: lockIcon }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isMoreActive = MORE.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );

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
      <nav className="bottom-nav" aria-label="Asosiy navigatsiya">
        {PRIMARY.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="bottom-nav-icon">{item.icon()}</span>
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`bottom-nav-item${isMoreActive || open ? " active" : ""}`}
          onClick={() => setOpen((p) => !p)}
          aria-expanded={open}
          aria-label="Boshqa bo'limlar"
        >
          <span className="bottom-nav-icon">{moreIcon()}</span>
          <span className="bottom-nav-label">Boshqalar</span>
        </button>
      </nav>

      {open && (
        <div
          className="sheet-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`sheet${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Boshqa bo'limlar"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <h2 className="sheet-title">Boshqalar</h2>
          <button
            type="button"
            className="sheet-close"
            onClick={() => setOpen(false)}
            aria-label="Yopish"
          >
            ×
          </button>
        </div>
        <div className="sheet-grid">
          {MORE.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sheet-link${active ? " active" : ""}`}
              >
                <span className="sheet-link-icon">{item.icon()}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="sheet-footer">
          <button type="button" className="btn-ghost" onClick={logout}>
            Chiqish
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Icon helpers ────────────────────────────────────────── */
function svg(children: React.ReactNode) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function dashboardIcon() {
  return svg(
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  );
}

function queueIcon() {
  return svg(
    <>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </>
  );
}

function paymentsIcon() {
  return svg(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  );
}

function slotsIcon() {
  return svg(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  );
}

function moreIcon() {
  return svg(
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  );
}

function chatIcon() {
  return svg(
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>
  );
}

function warnIcon() {
  return svg(
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  );
}

function usersIcon() {
  return svg(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  );
}

function bookingIcon() {
  return svg(
    <>
      <path d="M20 7H4a2 2 0 0 0-2 2v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  );
}

function revenueIcon() {
  return svg(
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  );
}

function tariffsIcon() {
  return svg(
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  );
}

function bookIcon() {
  return svg(
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  );
}

function settingsIcon() {
  return svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93a10 10 0 0 0 14.14 14.14" />
    </>
  );
}

function lockIcon() {
  return svg(
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  );
}
