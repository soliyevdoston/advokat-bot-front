"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { ToastProvider } from "./Toast";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    api
      .get("/auth/me")
      .then(() => setLoading(false))
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  if (loading) {
    return (
      <ToastProvider>
        <div className="page-shell">
          <Sidebar />
          <main>
            <div className="surface panel" style={{ color: "var(--muted)" }}>
              Yuklanmoqda...
            </div>
          </main>
          <BottomNav />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="page-shell">
        <Sidebar />
        {children}
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
