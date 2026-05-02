"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface DialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface DialogState extends DialogOptions {
  resolve: (ok: boolean) => void;
}

const Ctx = createContext<(opts: DialogOptions) => Promise<boolean>>(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(Ctx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((opts: DialogOptions) =>
    new Promise<boolean>(resolve => {
      setDialog({ ...opts, resolve });
    }), []);

  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(3px)",
            display: "grid", placeItems: "center",
            padding: 16,
            animation: "fade-in 140ms ease-out",
          }}
          onClick={e => { if (e.target === e.currentTarget) close(false); }}
        >
          <div
            className="surface"
            style={{
              width: "100%", maxWidth: 380,
              borderRadius: 16,
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,.18)",
              animation: "fade-in 160ms ease-out",
            }}
          >
            {dialog.title && (
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                {dialog.title}
              </h3>
            )}
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5 }}>
              {dialog.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                onClick={() => close(false)}
                style={{ minWidth: 90 }}
              >
                Bekor
              </button>
              <button
                className={dialog.danger ? "btn-danger" : "btn-primary"}
                onClick={() => close(true)}
                style={{ minWidth: 90 }}
                autoFocus
              >
                {dialog.confirmLabel ?? "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
