"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { api } from "../../lib/api";
import type { SettingItem } from "../../types";

const IMPORTANT_KEYS = [
  "payment_details",
  "ai_routing",
  "ai_voice",
  "ai_disclaimer",
  "advocate_redirect"
];

const keyLabel: Record<string, string> = {
  payment_details: "To'lov ma'lumotlari",
  ai_routing: "AI yo'naltirish",
  ai_voice: "AI uslubi",
  ai_disclaimer: "AI ogohlantirish",
  advocate_redirect: "Advokat yo'naltirish"
};

export default function SettingsPage() {
  const [items, setItems] = useState<SettingItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [description, setDescription] = useState("");
  const [valueText, setValueText] = useState("{}");

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.key.localeCompare(b.key)),
    [items]
  );

  const load = async () => {
    try {
      const rows = await api.get<SettingItem[]>("/settings");
      setItems(rows);
      if (!selectedKey && rows.length > 0) {
        setSelectedKey(rows[0].key);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const item = sorted.find((row) => row.key === selectedKey);
    if (!item) return;
    setDescription(item.description || "");
    setValueText(JSON.stringify(item.valueJson, null, 2));
  }, [selectedKey, sorted]);

  const save = async () => {
    if (!selectedKey.trim()) {
      alert("Kalit talab qilinadi.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(valueText);
    } catch (err) {
      alert(`Noto'g'ri JSON: ${(err as Error).message}`);
      return;
    }

    try {
      await api.put(`/settings/${selectedKey}`, {
        valueJson: parsed,
        description: description.trim() || undefined
      });
      await load();
      alert("Sozlamalar saqlandi.");
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <main className="admin-split">
        <section className="surface panel">
          <h2 style={{ marginBottom: 8 }}>Sozlama kalitlari</h2>
          <p style={{ color: "#4f6471", fontSize: 14, marginTop: 0 }}>
            To'lov ma'lumotlari, AI yo'naltirish va advokat eskalatsiyasini boshqarish.
          </p>

          <div className="grid" style={{ gap: 6, marginBottom: 16 }}>
            {IMPORTANT_KEYS.map((key) => (
              <button
                key={key}
                className="btn-secondary"
                style={{
                  opacity: selectedKey === key ? 1 : 0.75,
                  textAlign: "left",
                  justifyContent: "flex-start",
                  background: selectedKey === key ? "rgba(28,191,162,0.15)" : undefined,
                  borderColor: selectedKey === key ? "rgba(28,191,162,0.4)" : undefined
                }}
                onClick={() => setSelectedKey(key)}
              >
                {keyLabel[key] ?? key}
              </button>
            ))}
          </div>

          <hr style={{ margin: "12px 0", borderColor: "#d9e0d5" }} />

          <div className="grid" style={{ gap: 4, maxHeight: "48vh", overflowY: "auto" }}>
            {sorted.map((item) => (
              <button
                key={item.id}
                className="btn-secondary"
                style={{
                  opacity: selectedKey === item.key ? 1 : 0.7,
                  textAlign: "left",
                  justifyContent: "flex-start",
                  fontSize: 13,
                  background: selectedKey === item.key ? "rgba(28,191,162,0.15)" : undefined
                }}
                onClick={() => setSelectedKey(item.key)}
              >
                {item.key}
              </button>
            ))}
          </div>
        </section>

        <section className="surface panel">
          <h2 style={{ marginBottom: 16 }}>Sozlamani tahrirlash</h2>
          <div className="grid" style={{ gap: 12 }}>
            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "#4f6471", fontWeight: 600 }}>Kalit</span>
              <input
                className="input"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                placeholder="sozlama_kaliti"
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "#4f6471", fontWeight: 600 }}>Tavsif</span>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu sozlama nimani boshqaradi"
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "#4f6471", fontWeight: 600 }}>JSON qiymati</span>
              <textarea
                className="input"
                rows={18}
                value={valueText}
                onChange={(e) => setValueText(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={save}>
                Saqlash
              </button>
              <button className="btn-secondary" onClick={load}>
                Qayta yuklash
              </button>
            </div>
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
