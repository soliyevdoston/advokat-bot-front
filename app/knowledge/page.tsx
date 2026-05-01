"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type {
  AdminUnansweredQuestion,
  KnowledgeCategory,
  KnowledgeEntry,
  Paginated
} from "../../types";

type CategoryForm = {
  slug: string;
  title: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

type EntryForm = {
  categoryId: string;
  title: string;
  question: string;
  answer: string;
  notes: string;
  keywords: string;
  tags: string;
  exampleAnswer: string;
  routingHint: string;
  accessLevel: "FREE" | "PAID" | "BOTH";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: string;
};

const defaultCategoryForm: CategoryForm = {
  slug: "",
  title: "",
  description: "",
  sortOrder: "0",
  isActive: true
};

const defaultEntryForm: EntryForm = {
  categoryId: "",
  title: "",
  question: "",
  answer: "",
  notes: "",
  keywords: "",
  tags: "",
  exampleAnswer: "",
  routingHint: "",
  accessLevel: "FREE",
  status: "PUBLISHED",
  sortOrder: "0"
};

const toList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function KnowledgePage() {
  const toast = useToast();
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(defaultCategoryForm);
  const [entryForm, setEntryForm] = useState<EntryForm>(defaultEntryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [unanswered, setUnanswered] = useState<AdminUnansweredQuestion[]>([]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [categories]
  );

  const load = async () => {
    try {
      const [cats, entriesRes, unansweredRes] = await Promise.all([
        api.get<KnowledgeCategory[]>("/knowledge/categories?includeInactive=true"),
        api.get<Paginated<KnowledgeEntry>>("/knowledge/entries?page=1&limit=100"),
        api.get<{ items: AdminUnansweredQuestion[] }>("/admin/unanswered-questions?days=30&limit=40")
      ]);
      setCategories(cats);
      setEntries(entriesRes.items);
      setUnanswered(unansweredRes.items);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitCategory = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      slug: categoryForm.slug.trim().toLowerCase(),
      title: categoryForm.title.trim(),
      description: categoryForm.description.trim() || undefined,
      sortOrder: Number(categoryForm.sortOrder),
      isActive: categoryForm.isActive
    };

    try {
      if (editingCategoryId) {
        await api.patch(`/knowledge/categories/${editingCategoryId}`, payload);
      } else {
        await api.post("/knowledge/categories", payload);
      }
      setCategoryForm(defaultCategoryForm);
      setEditingCategoryId(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const submitEntry = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      categoryId: entryForm.categoryId || undefined,
      title: entryForm.title.trim(),
      question: entryForm.question.trim(),
      answer: entryForm.answer.trim(),
      notes: entryForm.notes.trim() || undefined,
      keywords: toList(entryForm.keywords),
      tags: toList(entryForm.tags),
      exampleAnswer: entryForm.exampleAnswer.trim() || undefined,
      routingHint: entryForm.routingHint.trim() || undefined,
      accessLevel: entryForm.accessLevel,
      status: entryForm.status,
      sortOrder: Number(entryForm.sortOrder)
    };

    try {
      if (editingEntryId) {
        await api.patch(`/knowledge/entries/${editingEntryId}`, payload);
      } else {
        await api.post("/knowledge/entries", payload);
      }
      setEntryForm(defaultEntryForm);
      setEditingEntryId(null);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const useAsDraft = (item: AdminUnansweredQuestion) => {
    const suggestedKeywords = item.normalized
      .split(" ")
      .filter((token) => token.length >= 4)
      .slice(0, 8)
      .join(", ");

    setEntryForm((prev) => ({
      ...prev,
      question: item.question,
      keywords: suggestedKeywords || prev.keywords,
      routingHint: `AI unanswered queue (${item.reasonModels.join(", ")})`
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AuthGuard>
      <main className="grid" style={{ gap: 16 }}>
        <section className="admin-split">
          <div className="surface panel">
            <h2 style={{ marginBottom: 16 }}>{editingCategoryId ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</h2>
            <form className="grid" onSubmit={submitCategory}>
              <input
                required
                placeholder="slug (oila-huquqi)"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                className="input"
              />
              <input
                required
                placeholder="Kategoriya nomi"
                value={categoryForm.title}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, title: e.target.value }))}
                className="input"
              />
              <textarea
                placeholder="Tavsif"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                className="input"
                rows={3}
              />
              <input
                type="number"
                placeholder="Tartib raqami"
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                className="input"
              />
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Faol
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" type="submit">
                  {editingCategoryId ? "Saqlash" : "Qo'shish"}
                </button>
                {editingCategoryId ? (
                  <button className="btn-danger" type="button" onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryForm(defaultCategoryForm);
                  }}>
                    Bekor
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="surface panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ marginBottom: 0 }}>Kategoriyalar</h2>
              <button className="btn-secondary" onClick={load}>Yangilash</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Slug</th>
                  <th>Holat</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state">Kategoriyalar yo'q</div></td></tr>
                ) : (
                  sortedCategories.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td style={{ fontSize: 13, color: "var(--muted)" }}>{item.slug}</td>
                      <td>
                        <span className={`tag ${item.isActive ? "tag-ok" : "tag-danger"}`}>
                          {item.isActive ? "Faol" : "Nofaol"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 13 }}
                            onClick={() => {
                              setEditingCategoryId(item.id);
                              setCategoryForm({
                                slug: item.slug,
                                title: item.title,
                                description: item.description || "",
                                sortOrder: String(item.sortOrder),
                                isActive: item.isActive
                              });
                            }}
                          >
                            Tahrir
                          </button>
                          <button
                            className="btn-danger"
                            style={{ fontSize: 13 }}
                            onClick={async () => {
                              if (!confirm("Kategoriyani arxivlashni tasdiqlaysizmi?")) return;
                              await api.delete(`/knowledge/categories/${item.id}`);
                              await load();
                            }}
                          >
                            Arxiv
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-split">
          <div className="surface panel">
            <h2 style={{ marginBottom: 16 }}>{editingEntryId ? "Maqolani tahrirlash" : "Yangi bilim maqolasi"}</h2>
            <form className="grid" onSubmit={submitEntry}>
              <select
                value={entryForm.categoryId}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="input"
              >
                <option value="">Kategoriyasiz</option>
                {sortedCategories.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>

              <input
                required
                placeholder="Sarlavha"
                value={entryForm.title}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, title: e.target.value }))}
                className="input"
              />
              <textarea
                required
                rows={3}
                placeholder="Mijozning tipik savoli"
                value={entryForm.question}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, question: e.target.value }))}
                className="input"
              />
              <textarea
                required
                rows={5}
                placeholder="Tasdiqlangan huquqiy javob"
                value={entryForm.answer}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, answer: e.target.value }))}
                className="input"
              />
              <textarea
                rows={3}
                placeholder="Izohlar"
                value={entryForm.notes}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="input"
              />
              <input
                placeholder="Kalit so'zlar, vergul bilan"
                value={entryForm.keywords}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, keywords: e.target.value }))}
                className="input"
              />
              <input
                placeholder="Teglar, vergul bilan"
                value={entryForm.tags}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, tags: e.target.value }))}
                className="input"
              />
              <input
                placeholder="Yo'naltirish izohi"
                value={entryForm.routingHint}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, routingHint: e.target.value }))}
                className="input"
              />
              <textarea
                rows={2}
                placeholder="Namuna javob"
                value={entryForm.exampleAnswer}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, exampleAnswer: e.target.value }))}
                className="input"
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <select
                  value={entryForm.accessLevel}
                  onChange={(e) => setEntryForm((prev) => ({ ...prev, accessLevel: e.target.value as EntryForm["accessLevel"] }))}
                  className="input"
                >
                  <option value="FREE">Bepul</option>
                  <option value="PAID">Pullik</option>
                  <option value="BOTH">Ikkalasi</option>
                </select>
                <select
                  value={entryForm.status}
                  onChange={(e) => setEntryForm((prev) => ({ ...prev, status: e.target.value as EntryForm["status"] }))}
                  className="input"
                >
                  <option value="DRAFT">Qoralama</option>
                  <option value="PUBLISHED">Nashr etilgan</option>
                  <option value="ARCHIVED">Arxivlangan</option>
                </select>
                <input
                  type="number"
                  value={entryForm.sortOrder}
                  onChange={(e) => setEntryForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  className="input"
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" type="submit">
                  {editingEntryId ? "Saqlash" : "Qo'shish"}
                </button>
                {editingEntryId ? (
                  <button className="btn-danger" type="button" onClick={() => {
                    setEditingEntryId(null);
                    setEntryForm(defaultEntryForm);
                  }}>
                    Bekor
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="surface panel">
            <h2 style={{ marginBottom: 8 }}>Bilim bazasi ({entries.length} ta)</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Sarlavha</th>
                  <th>Kategoriya</th>
                  <th>Kirish</th>
                  <th>Holat</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state">Maqolalar yo'q</div></td></tr>
                ) : (
                  entries.map((item) => (
                    <tr key={item.id}>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.question.slice(0, 100)}...</div>
                      </td>
                      <td>{item.category?.title || "–"}</td>
                      <td>
                        <span className={`tag ${item.accessLevel === "FREE" ? "tag-ok" : "tag-pending"}`}>
                          {item.accessLevel === "FREE" ? "Bepul" : item.accessLevel === "PAID" ? "Pullik" : "Ikkalasi"}
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${item.status === "PUBLISHED" ? "tag-ok" : item.status === "DRAFT" ? "tag-pending" : "tag-danger"}`}>
                          {item.status === "PUBLISHED" ? "Nashr" : item.status === "DRAFT" ? "Qoralama" : "Arxiv"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 13 }}
                            onClick={() => {
                              setEditingEntryId(item.id);
                              setEntryForm({
                                categoryId: item.categoryId || "",
                                title: item.title,
                                question: item.question,
                                answer: item.answer,
                                notes: item.notes || "",
                                keywords: item.keywords.join(", "),
                                tags: item.tags.join(", "),
                                exampleAnswer: item.exampleAnswer || "",
                                routingHint: item.routingHint || "",
                                accessLevel: item.accessLevel,
                                status: item.status,
                                sortOrder: String(item.sortOrder)
                              });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Tahrir
                          </button>
                          <button
                            className="btn-danger"
                            style={{ fontSize: 13 }}
                            onClick={async () => {
                              if (!confirm("Maqolani arxivlashni tasdiqlaysizmi?")) return;
                              await api.delete(`/knowledge/entries/${item.id}`);
                              await load();
                            }}
                          >
                            Arxiv
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ marginBottom: 0 }}>AI javob bermagan savollar (so'nggi 30 kun)</h2>
            <button className="btn-secondary" onClick={load}>Yangilash</button>
          </div>
          <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 14 }}>
            Foydalanuvchilar ko'p bergan, ammo AI to'liq javob bera olmagan savollar.
          </p>
          {unanswered.length === 0 ? (
            <div className="empty-state">Javob berilmagan savollar yo'q</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Savol</th>
                  <th>Soni</th>
                  <th>Oxirgi marta</th>
                  <th>Sabab</th>
                  <th>Foydalanuvchi</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {unanswered.map((item) => (
                  <tr key={`${item.normalized}-${item.conversationId}`}>
                    <td style={{ maxWidth: 380 }}>
                      <div>{item.question}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.normalized}</div>
                    </td>
                    <td><span className="tag tag-info">{item.count}</span></td>
                    <td style={{ fontSize: 13 }}>{formatDateTime(item.lastAskedAt)}</td>
                    <td style={{ fontSize: 13 }}>{item.reasonModels.join(", ")}</td>
                    <td>{item.user.fullName || item.user.username || item.user.id.slice(0, 8)}</td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => useAsDraft(item)}>
                        Qoralama
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
