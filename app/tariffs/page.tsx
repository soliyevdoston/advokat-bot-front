"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
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
    throw new Error("Narx 0 dan katta bo'lishi kerak");
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
  const toast = useToast();
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
      toast.error((err as Error).message);
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
    if (!confirm(`"${tariff.code}" tarifini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await api.delete(`/tariffs/${tariff.id}`);
      await load();
      if (editingId === tariff.id) {
        clearForm();
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="grid" style={{ gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );

  return (
    <AuthGuard>
      <main className="admin-split">
        <section className="surface panel">
          <h2 style={{ marginBottom: 16 }}>{editingId ? "Tarifni tahrirlash" : "Yangi tarif"}</h2>
          <form onSubmit={onSubmit} className="grid">
            <Field label="Kod">
              <input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="STANDART"
                className="input"
                required
              />
            </Field>

            <Field label="Nomi (UZ)">
              <input
                value={form.titleUz}
                onChange={(e) => setForm((prev) => ({ ...prev, titleUz: e.target.value }))}
                className="input"
                required
              />
            </Field>

            <Field label="Nomi (RU)">
              <input
                value={form.titleRu}
                onChange={(e) => setForm((prev) => ({ ...prev, titleRu: e.target.value }))}
                className="input"
                required
              />
            </Field>

            <Field label="Nomi (EN)">
              <input
                value={form.titleEn}
                onChange={(e) => setForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                className="input"
                required
              />
            </Field>

            <Field label="Tavsif (UZ)">
              <textarea
                rows={2}
                value={form.descriptionUz}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionUz: e.target.value }))}
                className="input"
              />
            </Field>

            <Field label="Tavsif (RU)">
              <textarea
                rows={2}
                value={form.descriptionRu}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionRu: e.target.value }))}
                className="input"
              />
            </Field>

            <Field label="Tavsif (EN)">
              <textarea
                rows={2}
                value={form.descriptionEn}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                className="input"
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Narx">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="input"
                  required
                />
              </Field>
              <Field label="Valyuta">
                <input
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  className="input"
                  required
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Davomiylik (daq.)">
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  className="input"
                  required
                />
              </Field>
              <Field label="Tartib raqami">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  className="input"
                  required
                />
              </Field>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Faol
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saqlanmoqda..." : editingId ? "Saqlash" : "Qo'shish"}
              </button>
              {editingId ? (
                <button className="btn-danger" type="button" onClick={clearForm}>
                  Bekor
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="surface panel">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 className="page-title" style={{ fontSize: 18 }}>Tariflar ro'yxati</h2>
            <button className="btn-secondary" onClick={load}>Yangilash</button>
          </div>

          {loading ? <p style={{ color: "var(--muted)" }}>Yuklanmoqda...</p> : null}
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

          {!loading && !error ? (
            sortedItems.length === 0 ? (
              <div className="empty-state">Tariflar topilmadi</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Nomlar</th>
                    <th>Narx</th>
                    <th>Davomiylik</th>
                    <th>Tartib</th>
                    <th>Holat</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.code}</strong></td>
                      <td>
                        <div style={{ fontSize: 13 }}>UZ: {item.titleI18n?.uz || "–"}</div>
                        <div style={{ fontSize: 13 }}>RU: {item.titleI18n?.ru || "–"}</div>
                        <div style={{ fontSize: 13 }}>EN: {item.titleI18n?.en || "–"}</div>
                      </td>
                      <td>{formatMoney(item.priceMinor, item.currency)}</td>
                      <td>{item.durationMinutes} daq.</td>
                      <td>{item.sortOrder}</td>
                      <td>
                        <span className={`tag ${item.isActive ? "tag-ok" : "tag-danger"}`}>
                          {item.isActive ? "Faol" : "Nofaol"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => onEdit(item)}>
                            Tahrir
                          </button>
                          <button className="btn-danger" style={{ fontSize: 13 }} onClick={() => onDelete(item)}>
                            O'chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}
