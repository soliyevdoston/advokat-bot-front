"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastApi = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback so non-wrapped callers don't crash; logs to console.
    return {
      show: (m) => console.warn("[toast]", m),
      success: (m) => console.warn("[toast:success]", m),
      error: (m) => console.error("[toast:error]", m),
      info: (m) => console.warn("[toast:info]", m)
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, variant, message }]);
      setTimeout(() => dismiss(id), variant === "error" ? 6000 : 4000);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info")
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  items,
  onDismiss
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-viewport" role="region" aria-live="polite">
      {items.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onDismiss(toast.id), 180);
  };

  useEffect(() => {
    const t = setTimeout(close, toast.variant === "error" ? 5800 : 3800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`toast toast-${toast.variant}${closing ? " toast-closing" : ""}`}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <span className="toast-icon" aria-hidden="true">
        {toast.variant === "success" ? "✓" : toast.variant === "error" ? "!" : "i"}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={close}
        aria-label="Yopish"
      >
        ×
      </button>
    </div>
  );
}
