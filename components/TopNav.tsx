"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "../lib/auth";

const links = [
  { href: "/requests", label: "Requests" },
  { href: "/tariffs", label: "Tariffs" },
  { href: "/slots", label: "Slots" },
  { href: "/dashboard", label: "Dashboard" }
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
        backdropFilter: "blur(6px)",
        background: "rgba(5, 18, 23, 0.7)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)"
      }}
    >
      <main style={{ paddingTop: 12, paddingBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <strong style={{ fontSize: 18 }}>Advokat Admin</strong>
          <span style={{ opacity: 0.7 }}>|</span>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                opacity: pathname === link.href ? 1 : 0.7,
                fontWeight: pathname === link.href ? 700 : 500,
                borderBottom: pathname === link.href ? "2px solid #ff8f2b" : "2px solid transparent"
              }}
            >
              {link.label}
            </Link>
          ))}
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
      </main>
    </header>
  );
}
