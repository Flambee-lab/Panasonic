import { useEffect } from "react";
import CameraStreamPreview from "./CameraStreamPreview";
import { resolveOsdPreviewSettings } from "../utils/osdPreviewState";

export default function CameraPreviewModal({ camera, onClose }) {
  useEffect(() => {
    if (!camera) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [camera, onClose]);

  if (!camera) return null;

  const osdSettings = resolveOsdPreviewSettings(camera);

  return (
    <div
      className="camera-preview-modal-backdrop is-open"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="camera-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-preview-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="camera-preview-modal__head">
          <div>
            <h2 id="camera-preview-modal-title" className="camera-preview-modal__title">
              {camera.alias}
            </h2>
            <p className="camera-preview-modal__meta">
              {camera.model} · {camera.ip} · {camera.deviceId}
            </p>
          </div>
          <button
            type="button"
            className="camera-preview-modal__close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <CameraStreamPreview
          cameraId={camera.id}
          osdSettings={osdSettings}
          fallbackAlias={camera.alias}
          size="expanded"
          ariaLabel={`Live stream for ${camera.alias}`}
        />

        <p className="camera-preview-modal__hint">
          OSD layout reflects the settings applied to this camera in Configure Cameras.
        </p>
      </div>
    </div>
  );
}
