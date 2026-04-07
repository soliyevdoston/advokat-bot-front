"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { TopNav } from "../../components/TopNav";
import { api } from "../../lib/api";
import type { Booking, Payment, Slot } from "../../types";

export default function DashboardPage() {
  const [pendingPayments, setPendingPayments] = useState(0);
  const [availableSlots, setAvailableSlots] = useState(0);
  const [allBookings, setAllBookings] = useState(0);
  const [activeTariffs, setActiveTariffs] = useState(0);
  const [openRequests, setOpenRequests] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<Payment[]>("/payments?status=PENDING"),
      api.get<Payment[]>("/payments?status=APPROVED"),
      api.get<Slot[]>("/slots?status=AVAILABLE"),
      api.get<Booking[]>("/bookings?upcoming=true"),
      api.get("/tariffs")
    ])
      .then(([pending, approved, slots, upcomingBookings, tariffs]) => {
        const waitingSlot = approved.filter((item) => !item.booking).length;
        setPendingPayments(pending.length);
        setAvailableSlots(slots.length);
        setAllBookings(upcomingBookings.length);
        setActiveTariffs((tariffs as { id: string }[]).length);
        setOpenRequests(pending.length + waitingSlot + upcomingBookings.length);
      })
      .catch(() => {
        setPendingPayments(0);
        setAvailableSlots(0);
        setAllBookings(0);
        setActiveTariffs(0);
        setOpenRequests(0);
      });
  }, []);

  return (
    <AuthGuard>
      <TopNav />
      <main>
        <h1 style={{ marginBottom: 12 }}>Dashboard</h1>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div className="surface panel">
            <h3>Pending Payments</h3>
            <p style={{ fontSize: 38, margin: 0, fontWeight: 800, color: "#9e6400" }}>{pendingPayments}</p>
          </div>
          <div className="surface panel">
            <h3>Available Slots</h3>
            <p style={{ fontSize: 38, margin: 0, fontWeight: 800, color: "#1f8f53" }}>{availableSlots}</p>
          </div>
          <div className="surface panel">
            <h3>Upcoming Bookings</h3>
            <p style={{ fontSize: 38, margin: 0, fontWeight: 800, color: "#0d5e93" }}>{allBookings}</p>
          </div>
          <div className="surface panel">
            <h3>Active Tariffs</h3>
            <p style={{ fontSize: 38, margin: 0, fontWeight: 800, color: "#0f7f7a" }}>{activeTariffs}</p>
          </div>
          <div className="surface panel">
            <h3>Open Requests</h3>
            <p style={{ fontSize: 38, margin: 0, fontWeight: 800, color: "#c13838" }}>{openRequests}</p>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
