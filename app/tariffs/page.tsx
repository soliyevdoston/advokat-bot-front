"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { TopNav } from "../../components/TopNav";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { Tariff } from "../../types";

type TariffForm = {
  code: string;
  titleUz: string;
  titleRu: string;
  titleEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
  price: string;
  currency: string;
  durationMinutes: string;
  sortOrder: string;
  isActive: boolean;
};

const defaultForm = (): TariffForm => ({
  code: "",
  titleUz: "",
  titleRu: "",
  titleEn: "",
  descriptionUz: "",
  descriptionRu: "",
  descriptionEn: "",
  price: "",
  currency: "UZS",
  durationMinutes: "60",
  sortOrder: "0",
  isActive: true
});

const toForm = (tariff: Tariff): TariffForm => ({
  code: tariff.code,
  titleUz: tariff.titleI18n?.uz ?? "",
  titleRu: tariff.titleI18n?.ru ?? "",
  titleEn: tariff.titleI18n?.en ?? "",
  descriptionUz: tariff.descriptionI18n?.uz ?? "",
  descriptionRu: tariff.descriptionI18n?.ru ?? "",
  descriptionEn: tariff.descriptionI18n?.en ?? "",
  price: (tariff.priceMinor / 100).toFixed(2),
  currency: tariff.currency,
  durationMinutes: String(tariff.durationMinutes),
  sortOrder: String(tariff.sortOrder),
  isActive: tariff.isActive
});

const toPayload = (form: TariffForm) => {
  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be greater than 0");
  }

  const descriptionI18n: Record<string, string> = {};
  if (form.descriptionUz.trim()) descriptionI18n.uz = form.descriptionUz.trim();
  if (form.descriptionRu.trim()) descriptionI18n.ru = form.descriptionRu.trim();
  if (form.descriptionEn.trim()) descriptionI18n.en = form.descriptionEn.trim();

  return {
    code: form.code.trim().toUpperCase(),
    titleI18n: {
      uz: form.titleUz.trim(),
      ru: form.titleRu.trim(),
      en: form.titleEn.trim()
    },
    descriptionI18n: Object.keys(descriptionI18n).length ? descriptionI18n : undefined,
    priceMinor: Math.round(price * 100),
    currency: form.currency.trim().toUpperCase(),
    durationMinutes: Number(form.durationMinutes),
    sortOrder: Number(form.sortOrder),
    isActive: form.isActive
  };
};

export default function TariffsPage() {
  const [items, setItems] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TariffForm>(defaultForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.code.localeCompare(b.code);
      }),
    [items]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Tariff[]>("/tariffs/admin");
      setItems(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clearForm = () => {
    setEditingId(null);
    setForm(defaultForm());
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        await api.patch(`/tariffs/${editingId}`, payload);
      } else {
        await api.post("/tariffs", payload);
      }
      await load();
      clearForm();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (tariff: Tariff) => {
    setEditingId(tariff.id);
    setForm(toForm(tariff));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (tariff: Tariff) => {
    if (!confirm(`Disable tariff "${tariff.code}"?`)) return;
    try {
      await api.delete(`/tariffs/${tariff.id}`);
      await load();
      if (editingId === tariff.id) {
        clearForm();
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <TopNav />
      <main className="admin-split">
        <section className="surface panel">
          <h2 style={{ marginBottom: 12 }}>{editingId ? "Edit Subscription Tariff" : "Create Subscription Tariff"}</h2>
          <form onSubmit={onSubmit} className="grid">
            <label className="grid" style={{ gap: 6 }}>
              <span>Code</span>
              <input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="STANDARD"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span>Title (UZ)</span>
              <input
                value={form.titleUz}
                onChange={(e) => setForm((prev) => ({ ...prev, titleUz: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span>Title (RU)</span>
              <input
                value={form.titleRu}
                onChange={(e) => setForm((prev) => ({ ...prev, titleRu: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span>Title (EN)</span>
              <input
                value={form.titleEn}
                onChange={(e) => setForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                required
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span>Description (UZ)</span>
              <textarea
                rows={2}
                value={form.descriptionUz}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionUz: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span>Description (RU)</span>
              <textarea
                rows={2}
                value={form.descriptionRu}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionRu: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span>Description (EN)</span>
              <textarea
                rows={2}
                value={form.descriptionEn}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="grid" style={{ gap: 6 }}>
                <span>Price</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                  required
                />
              </label>
              <label className="grid" style={{ gap: 6 }}>
                <span>Currency</span>
                <input
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                  required
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="grid" style={{ gap: 6 }}>
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                  required
                />
              </label>
              <label className="grid" style={{ gap: 6 }}>
                <span>Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd6ca" }}
                  required
                />
              </label>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Active
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              {editingId ? (
                <button className="btn-danger" type="button" onClick={clearForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="surface panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ marginBottom: 0 }}>Subscription Tariffs</h2>
            <button className="btn-secondary" onClick={load}>
              Refresh
            </button>
          </div>

          {loading ? <p>Loading tariffs...</p> : null}
          {error ? <p>{error}</p> : null}

          {!loading && !error ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Titles</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No tariffs found.</td>
                  </tr>
                ) : (
                  sortedItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>
                        <div>UZ: {item.titleI18n?.uz || "-"}</div>
                        <div>RU: {item.titleI18n?.ru || "-"}</div>
                        <div>EN: {item.titleI18n?.en || "-"}</div>
                      </td>
                      <td>{formatMoney(item.priceMinor, item.currency)}</td>
                      <td>{item.durationMinutes} min</td>
                      <td>{item.sortOrder}</td>
                      <td>
                        <span className={`tag ${item.isActive ? "tag-ok" : "tag-danger"}`}>
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-secondary" onClick={() => onEdit(item)}>
                            Edit
                          </button>
                          <button className="btn-danger" onClick={() => onDelete(item)}>
                            Disable
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}
