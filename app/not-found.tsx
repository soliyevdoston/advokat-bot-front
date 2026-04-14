import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20
      }}
    >
      <div className="surface panel" style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          404
        </p>
        <h1 style={{ marginTop: 10, marginBottom: 10 }}>Sahifa topilmadi</h1>
        <p style={{ marginTop: 0, marginBottom: 18, color: "var(--muted)" }}>
          Havola noto'g'ri yoki sahifa o'chirilgan bo'lishi mumkin.
        </p>
        <Link href="/dashboard" className="btn-primary" style={{ display: "inline-block" }}>
          Dashboardga qaytish
        </Link>
      </div>
    </main>
  );
}
