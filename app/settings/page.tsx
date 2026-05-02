"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import type { SettingItem } from "../../types";

const IMPORTANT_KEYS = [
  "payment_details",
  "ai_routing",
  "ai_clarification",
  "ai_voice",
  "ai_models",
  "ai_openai_policy",
  "ai_limits",
  "ai_disclaimer",
  "advocate_redirect"
];

const keyLabel: Record<string, string> = {
  payment_details: "To'lov ma'lumotlari",
  ai_routing: "AI yo'naltirish",
  ai_clarification: "AI aniqlik filtri",
  ai_voice: "AI uslubi",
  ai_models: "AI modellari",
  ai_openai_policy: "AI chaqirish siyosati",
  ai_limits: "AI token limitlari",
  ai_disclaimer: "AI ogohlantirish",
  advocate_redirect: "Advokat yo'naltirish"
};

export default function SettingsPage() {
  const toast = useToast();
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
      toast.error((err as Error).message);
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
      toast.error("Kalit talab qilinadi.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(valueText);
    } catch (err) {
      toast.error(`Noto'g'ri JSON: ${(err as Error).message}`);
      return;
    }

    try {
      await api.put(`/settings/${selectedKey}`, {
        valueJson: parsed,
        description: description.trim() || undefined
      });
      await load();
      toast.success("Sozlamalar saqlandi.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <main className="admin-split">
        <section className="surface panel">
          <h2 style={{ marginBottom: 8 }}>Sozlama kalitlari</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>
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
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Kalit</span>
              <input
                className="input"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                placeholder="sozlama_kaliti"
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Tavsif</span>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu sozlama nimani boshqaradi"
              />
            </label>

            <label className="grid" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>JSON qiymati</span>
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

        {/* PIN section */}
        <PinSection />
      </main>
    </AuthGuard>
  );
}

function PinSection() {
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!/^\d{4}$/.test(pin)) { toast.error("PIN 4 ta raqamdan iborat bo'lishi kerak"); return; }
    if (pin !== confirm) { toast.error("PIN kodlar mos kelmadi"); return; }
    setSaving(true);
    try {
      await api.post("/auth/set-pin", { pin });
      toast.success("PIN kodi o'rnatildi");
      setPin(""); setConfirm("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface panel">
      <h2 style={{ marginBottom: 4, fontSize: 15, fontWeight: 700 }}>PIN kodi</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Login sahifasida parol o'rniga 4 xonali PIN bilan kirish uchun
      </p>
      <div style={{ display: "grid", gap: 12, maxWidth: 320 }}>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Yangi PIN (4 ta raqam)</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
          />
        </label>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Tasdiqlash</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirm}
            onChange={e => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
          />
        </label>
        <button
          className="btn-primary"
          disabled={saving || pin.length !== 4 || confirm.length !== 4}
          onClick={submit}
          style={{ width: "fit-content" }}
        >
          {saving ? "Saqlanmoqda..." : "PIN o'rnatish"}
        </button>
      </div>
    </section>
  );
}
