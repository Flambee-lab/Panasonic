import { useEffect } from "react";
import { useApp } from "../../context/AppContext";

export default function Toast({ toast, onDismiss }) {
  const { navigateToNetwork } = useApp();
  const duration = toast?.duration ?? 4200;
  const isReconfigure = toast?.type === "reconfigure-success";

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;

  const handleAction = () => {
    if (toast.action === "navigate-network") {
      navigateToNetwork();
    }
    onDismiss();
  };

  if (isReconfigure) {
    return (
      <div
        className="app-toast app-toast--reconfigure"
        role="status"
        aria-live="polite"
        style={{ "--toast-duration": `${duration}ms`, maxWidth: "none" }}
      >
        <div className="app-toast__reconfigure-main">
          <div className="app-toast__check-wrap" aria-hidden="true">
            <svg className="app-toast__check" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#00e17b" />
              <path
                d="M7.5 12.2l3 3 6-6.2"
                stroke="#0b1a14"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="app-toast__reconfigure-text">{toast.message}</p>
        </div>
        {toast.actionLabel && (
          <button type="button" className="app-toast__action" onClick={handleAction}>
            {toast.actionLabel}
          </button>
        )}
        <span className="app-toast__progress" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={`app-toast app-toast--${toast.type ?? "info"}`}
      role="status"
      aria-live="polite"
    >
      <div className="app-toast__body">
        {toast.title ? <strong className="app-toast__title">{toast.title}</strong> : null}
        {toast.message ? <p className="app-toast__message">{toast.message}</p> : null}
      </div>
      <button type="button" className="app-toast__close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
