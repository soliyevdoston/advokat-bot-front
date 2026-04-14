"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "../lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requests", label: "Queue" },
  { href: "/payments", label: "Payments" },
  { href: "/conversations", label: "Questions" },
  { href: "/unresolved", label: "Unresolved" },
  { href: "/users", label: "Users" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/tariffs", label: "Tariffs" },
  { href: "/slots", label: "Slots" },
  { href: "/bookings", label: "Schedule" },
  { href: "/settings", label: "Settings" }
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(8px)",
        background: "rgba(5, 18, 23, 0.78)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)"
      }}
    >
      <main style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <strong style={{ fontSize: 18, whiteSpace: "nowrap" }}>Advocate Admin</strong>
            <span style={{ opacity: 0.6 }}>|</span>
            <nav style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    opacity: pathname === link.href ? 1 : 0.72,
                    fontWeight: pathname === link.href ? 700 : 500,
                    borderBottom:
                      pathname === link.href ? "2px solid #ff8f2b" : "2px solid transparent",
                    whiteSpace: "nowrap"
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <button
            className="btn-danger"
            onClick={() => {
              clearTokens();
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>
      </main>
    </header>
  );
}
