import { useEffect, useMemo, useState } from "react";
import { getCameraThumbUrl } from "../data/cameraThumbs";
import { buildOsdPreviewState, formatOsdClock } from "../utils/osdPreviewState";

export default function CameraStreamPreview({
  cameraId,
  thumbUrl,
  osdSettings,
  fallbackAlias = "",
  size = "hover",
  onClick,
  className = "",
  ariaLabel,
}) {
  const [clock, setClock] = useState(() => formatOsdClock(osdSettings?.dateTimeDisplay));
  const state = useMemo(
    () => buildOsdPreviewState(osdSettings, fallbackAlias),
    [osdSettings, fallbackAlias]
  );

  const resolvedThumb = thumbUrl ?? (cameraId ? getCameraThumbUrl(cameraId) : "");

  useEffect(() => {
    if (!state.showClock) {
      setClock("");
      return undefined;
    }
    const tick = () => setClock(formatOsdClock(state.dateTimeDisplay));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.showClock, state.dateTimeDisplay]);

  const overlayStyle = useMemo(
    () => ({
      fontSize: state.fontSize,
      background: state.overlayBg,
    }),
    [state.fontSize, state.overlayBg]
  );

  const rootClass = [
    "camera-stream-preview",
    `camera-stream-preview--${size}`,
    onClick ? "is-clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const monitorClass = [
    "osd-monitor",
    state.isWdr ? "is-wdr" : "",
    !state.showStream ? "is-empty" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const RootTag = onClick ? "button" : "div";

  return (
    <RootTag
      type={onClick ? "button" : undefined}
      className={rootClass}
      onClick={onClick}
      aria-label={ariaLabel ?? (onClick ? "Expand live camera preview" : undefined)}
    >
      <div className={monitorClass}>
        <div
          className={`osd-monitor__bg${state.isBw ? " is-bw" : ""}`}
          style={{
            backgroundImage:
              state.showStream && resolvedThumb ? `url(${resolvedThumb})` : undefined,
          }}
        />
        {state.showReticle && (
          <div
            className="osd-monitor__reticle"
            style={{ transform: `rotate(${state.rotation}deg)` }}
            aria-hidden="true"
          >
            <svg width="100" height="100" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="48" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
              <path
                d="M60 8v16M60 96v16M8 60h16M96 60h16"
                stroke="rgba(255,255,255,0.32)"
              />
            </svg>
          </div>
        )}
        {state.showLed && (
          <span
            className={`osd-monitor__led ${state.ledClass}`}
            aria-hidden="true"
          />
        )}
        {(state.showTitle || state.showClock) && (
          <div className={`osd-corner ${state.positionClass}`}>
            {state.showTitle && (
              <span className="osd-overlay-line" style={overlayStyle}>
                {state.titleText}
              </span>
            )}
            {state.showClock && (
              <span className="osd-overlay-line" style={overlayStyle}>
                {clock}
              </span>
            )}
          </div>
        )}
        {size === "expanded" && (
          <span className="camera-stream-preview__live" aria-hidden="true">
            LIVE
          </span>
        )}
      </div>
    </RootTag>
  );
}
