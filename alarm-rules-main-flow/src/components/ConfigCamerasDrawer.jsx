import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import ConfigBatchForm from "./osd/ConfigBatchForm";
import "../styles/configure-cameras-review.css";
import "../styles/config-batch-drawer.css";

function EditBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" strokeLinejoin="round" />
      <path d="M13.5 5.5l3 3" strokeLinecap="round" />
    </svg>
  );
}

export default function ConfigCamerasDrawer() {
  const {
    configDrawerMode,
    closeConfigDrawer,
    batchCameras,
    sequentialIndex,
    applyBatchOsdSettings,
    applySequentialOsdSettings,
    canApplyOsd,
    cgiSender,
    setPropagateOsd,
  } = useApp();

  const open = Boolean(configDrawerMode);
  const isBatch = configDrawerMode === "batch";
  const isSequential = configDrawerMode === "sequential";
  const total = batchCameras.length;
  const currentCam = batchCameras[sequentialIndex] ?? null;
  const isLast = sequentialIndex >= total - 1;
  const stepLabel = `${sequentialIndex + 1} of ${total}`;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeConfigDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeConfigDrawer]);

  useEffect(() => {
    if (isBatch) setPropagateOsd(true);
    if (isSequential) setPropagateOsd(false);
  }, [isBatch, isSequential, setPropagateOsd]);

  if (!open) return null;

  const handleApply = () => {
    if (isBatch) {
      applyBatchOsdSettings();
      return;
    }
    applySequentialOsdSettings({ advance: !isLast, closeWhenDone: isLast });
  };

  if (isBatch || isSequential) {
    return (
      <aside
        className="config-batch-drawer is-open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-batch-drawer-title"
      >
        <header className="config-batch-drawer__header">
          <div className="config-batch-drawer__badge" aria-hidden="true">
            <EditBadgeIcon />
          </div>
          <h2 id="config-batch-drawer-title" className="config-batch-drawer__title">
            {isBatch ? `Config as batch (${total})` : "Config one by one"}
          </h2>
          <button
            type="button"
            className="config-batch-drawer__icon-btn"
            onClick={closeConfigDrawer}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="config-batch-drawer__body">
          <ConfigBatchForm
            mode={isSequential ? "sequential" : "batch"}
            cameraId={currentCam?.id ?? null}
          />
        </div>

        <footer className={`config-batch-drawer__footer${isSequential ? " config-batch-drawer__footer--sequential" : ""}`}>
          {isBatch ? (
            <>
              <button
                type="button"
                className="config-batch-drawer__btn config-batch-drawer__btn--outline"
                onClick={closeConfigDrawer}
              >
                Cancel
              </button>
              <button
                type="button"
                className="config-batch-drawer__btn config-batch-drawer__btn--primary"
                onClick={handleApply}
                disabled={cgiSender.visible || !canApplyOsd || total < 1}
              >
                Apply
              </button>
            </>
          ) : (
            <button
              type="button"
              className="config-batch-drawer__btn config-batch-drawer__btn--primary config-batch-drawer__btn--continue"
              onClick={handleApply}
              disabled={cgiSender.visible || !canApplyOsd || total < 1}
            >
              <span>{isLast ? "Apply" : "Apply, and continue"}</span>
              <span className="config-batch-drawer__step-count">{stepLabel}</span>
            </button>
          )}
        </footer>
      </aside>
    );
  }

  return null;
}
