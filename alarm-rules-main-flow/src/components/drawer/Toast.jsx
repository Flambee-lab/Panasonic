import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext";

const RECONFIGURE_FALLBACK_MS = 8000;

export default function Toast({ toast, onDismiss }) {
  const { navigateToNetwork, keepEditingAfterConfigure } = useApp();
  const duration = toast?.duration ?? 4200;
  const isReconfigure = toast?.type === "reconfigure-success";
  const isFirmwareSuccess = toast?.type === "firmware-success";
  const isDesignedSuccess = isReconfigure || isFirmwareSuccess;
  const toastMs = isReconfigure ? toast?.duration ?? RECONFIGURE_FALLBACK_MS : duration;
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(toastMs / 1000));

  useEffect(() => {
    if (!toast) return undefined;

    if (!isReconfigure) {
      const id = setTimeout(onDismiss, duration);
      return () => clearTimeout(id);
    }

    const startedAt = Date.now();
    setSecondsLeft(Math.ceil(toastMs / 1000));

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, toastMs - (Date.now() - startedAt));
      setSecondsLeft(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) {
        clearInterval(interval);
        navigateToNetwork();
        onDismiss();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [toast, onDismiss, duration, isReconfigure, toastMs, navigateToNetwork]);

  if (!toast) return null;

  const handleAction = () => {
    if (toast.action === "navigate-network") {
      navigateToNetwork();
    } else if (toast.action === "keep-editing") {
      keepEditingAfterConfigure?.();
    }
    onDismiss();
  };

  const node = isDesignedSuccess ? (
    <div
      className={`app-toast app-toast--reconfigure${isFirmwareSuccess ? " app-toast--top" : ""}`}
      role="status"
      aria-live="polite"
      style={{ "--toast-duration": `${toastMs}ms`, maxWidth: "none" }}
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
        <div className="app-toast__reconfigure-copy">
          <p className="app-toast__reconfigure-text">
            {isFirmwareSuccess ? toast.title || toast.message : toast.message}
          </p>
          <p className="app-toast__reconfigure-sub">
            {isFirmwareSuccess ? toast.message : `Back to dashboard in ${secondsLeft}`}
          </p>
        </div>
      </div>
      {toast.actionLabel && (
        <button type="button" className="app-toast__action" onClick={handleAction}>
          {toast.actionLabel}
        </button>
      )}
      <span className="app-toast__progress" aria-hidden="true" />
    </div>
  ) : (
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

  return createPortal(node, document.body);
}
