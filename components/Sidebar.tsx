"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "../lib/auth";

const nav = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/requests", icon: "📋", label: "Navbat" },
  { href: "/payments", icon: "💳", label: "To'lovlar" },
  { href: "/conversations", icon: "💬", label: "Savollar" },
  { href: "/unresolved", icon: "⚠️", label: "Qabul so'rovlari" },
  { href: "/users", icon: "👥", label: "Mijozlar" },
  { href: "/knowledge", icon: "📚", label: "Bilim bazasi" },
  { href: "/tariffs", icon: "🏷️", label: "Tariflar" },
  { href: "/slots", icon: "🕒", label: "Vaqt jadvali" },
  { href: "/bookings", icon: "📅", label: "Bronlar" },
  { href: "/settings", icon: "⚙️", label: "Sozlamalar" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "rgba(5,18,23,0.92)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)"
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 2, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Advokat</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#ff8f2b", lineHeight: 1.2 }}>
          Turdimotov M.M.
        </div>
        <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>Admin panel</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: active ? 700 : 400,
                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                background: active ? "rgba(255,143,43,0.15)" : "transparent",
                borderLeft: active ? "3px solid #ff8f2b" : "3px solid transparent",
                transition: "all 120ms ease",
                textDecoration: "none"
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => {
            clearTokens();
            router.replace("/login");
          }}
          style={{
            width: "100%",
            background: "rgba(193,56,56,0.2)",
            color: "#f87171",
            border: "1px solid rgba(193,56,56,0.3)",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          🚪 Chiqish
        </button>
      </div>
    </aside>
  );
}
