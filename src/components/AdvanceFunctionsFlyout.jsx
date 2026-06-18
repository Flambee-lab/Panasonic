import { useEffect, useId, useState } from "react";
import { useApp } from "../context/AppContext";

const FLYOUT_ACTIONS = [
  {
    id: "config-cams",
    label: "Config. Cams",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 19h8" strokeLinecap="round" />
        <path d="M12 17v2" strokeLinecap="round" />
      </svg>
    ),
    action: "configure",
  },
  {
    id: "cgi-list",
    label: "CGI List",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
      </svg>
    ),
    action: "stub",
  },
  {
    id: "ieee",
    label: "Config. IEEE 802.1x",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" />
        <path d="M9 12h6" strokeLinecap="round" />
      </svg>
    ),
    action: "stub",
  },
  {
    id: "records",
    label: "Config Records",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5v3M12 16v3M5 12h3M16 12h3" strokeLinecap="round" />
      </svg>
    ),
    action: "stub",
  },
];

export function AdvanceFunctionsPanel({ open, onAction }) {
  return (
    <div
      id="advanceFunctionsFlyout"
      className={`change-ip-flyout${open ? " is-open" : ""}`}
      hidden={!open}
      aria-hidden={!open}
    >
      <span className="change-ip-flyout__rule" aria-hidden="true" />
      {FLYOUT_ACTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="pill-action change-ip-flyout__btn"
          onClick={() => onAction(item.action)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function AdvanceFunctionsToggle({ open, onOpenChange }) {
  const toggleId = useId();

  return (
    <label className="switch-inline dash-toggle" htmlFor={toggleId}>
      Advance functions
      <span className="toggle-switch">
        <input
          id={toggleId}
          type="checkbox"
          checked={open}
          onChange={(e) => onOpenChange(e.target.checked)}
          aria-controls="advanceFunctionsFlyout"
          aria-expanded={open}
        />
        <span className="toggle-slider" />
      </span>
    </label>
  );
}

export function useAdvanceFunctions() {
  const { openConfigureCameras, showToast } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleAction = (action) => {
    if (action === "configure") {
      openConfigureCameras();
      return;
    }
    showToast("Feature", "This advanced function is currently under construction.", "info");
  };

  return { open, setOpen, handleAction };
}
