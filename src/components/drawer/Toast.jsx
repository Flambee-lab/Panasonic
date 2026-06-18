import { useEffect } from "react";

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onDismiss, 4200);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`app-toast app-toast--${toast.type ?? "info"}`}
      role="status"
      aria-live="polite"
    >
      <div className="app-toast__body">
        <strong className="app-toast__title">{toast.title}</strong>
        <p className="app-toast__message">{toast.message}</p>
      </div>
      <button type="button" className="app-toast__close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
