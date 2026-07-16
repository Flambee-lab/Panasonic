import { useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { BATCH_IMAGE_DEFAULTS } from "../../data/osdDefaults";

const CAPTURE_OPTIONS = ["Auto", "JPEG", "H.264"];
const MODE_OPTIONS = [
  { value: "Auto", label: "Auto", icon: "auto" },
  { value: "Color", label: "Day", icon: "day" },
  { value: "BW", label: "Night", icon: "night" },
];
const ROTATION_OPTIONS = ["0°", "90°", "180°", "270°"];
const TIME_OPTIONS = ["Off", "24h", "12h"];
const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "Small 10pt" },
  { label: "Normal", value: "Normal 14pt" },
  { label: "Large", value: "Large 18pt" },
];
const CONTRAST_OPTIONS = [
  { label: "High", value: "Opaque Black 70%" },
  { label: "Tint", value: "Semi-Transparent 40%" },
  { label: "Off", value: "Full Transparent 0%" },
];
const POSITION_OPTIONS = [
  { value: "Upper Left", className: "is-ul" },
  { value: "Upper Right", className: "is-ur" },
  { value: "Lower Left", className: "is-ll" },
  { value: "Lower Right", className: "is-lr" },
];
function ModeIcon({ type }) {
  if (type === "day") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "night") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <path
          d="M13.2 9.4A5.2 5.2 0 0 1 6.6 2.8 5.6 5.6 0 1 0 13.2 9.4Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M13.2 9.4A5.2 5.2 0 0 1 6.6 2.8 5.6 5.6 0 1 0 13.2 9.4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M10.2 3.2l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4.4-1.1z" fill="currentColor" />
    </svg>
  );
}

function Segmented({ value, options, onChange, renderOption, disabled = false }) {
  return (
    <div className={`batch-seg${disabled ? " is-disabled" : ""}`} role="group" aria-disabled={disabled || undefined}>
      {options.map((opt) => {
        const optValue = typeof opt === "string" ? opt : opt.value;
        const selected = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            className={`batch-seg__btn${selected ? " is-selected" : ""}`}
            onClick={() => onChange(optValue)}
            aria-pressed={selected}
            disabled={disabled}
          >
            {renderOption ? renderOption(opt, selected) : typeof opt === "string" ? opt : opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`batch-toggle${checked ? " is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="batch-toggle__knob" />
    </button>
  );
}

function FieldLabel({ children }) {
  return <p className="batch-field__label">{children}</p>;
}

export default function ConfigBatchForm({ mode = "batch", cameraId = null }) {
  const { osdDraft, updateOsdDraft, batchSelectedCameraIds, batchCameras } = useApp();
  const isSequential = mode === "sequential";
  const activeCameraId = isSequential
    ? cameraId ?? batchSelectedCameraIds[0] ?? null
    : null;
  const activeCamera = batchCameras.find((c) => c.id === activeCameraId) ?? null;

  const sharedTitle = useMemo(() => {
    if (isSequential && activeCameraId) {
      const custom = osdDraft.cameraTitles?.[activeCameraId];
      if (custom != null && custom !== "") return custom;
      if (activeCamera) return `${activeCamera.deviceId} - ${activeCamera.alias}`;
      return "";
    }
    const titles = batchSelectedCameraIds
      .map((id) => osdDraft.cameraTitles?.[id] ?? "")
      .filter(Boolean);
    if (titles.length === 0) return "";
    const first = titles[0];
    return titles.every((t) => t === first) ? first : first;
  }, [
    activeCamera,
    activeCameraId,
    batchSelectedCameraIds,
    isSequential,
    osdDraft.cameraTitles,
  ]);

  const titleOn = Boolean(osdDraft.cameraTitlesEnabled);
  const osdOn =
    osdDraft.dateTimeDisplay !== "" ||
    osdDraft.osdFontSize !== "" ||
    osdDraft.backgroundTransparency !== "" ||
    osdDraft.dateTimePosition !== "";
  const wdrOn = osdDraft.superDynamic === "On";

  const captureMode = osdDraft.imageCaptureMode || BATCH_IMAGE_DEFAULTS.imageCaptureMode;
  const dayNightMode = osdDraft.dayNightMode || BATCH_IMAGE_DEFAULTS.dayNightMode;
  const imageRotation = osdDraft.imageRotation || BATCH_IMAGE_DEFAULTS.imageRotation;
  const dateTimeDisplay = osdDraft.dateTimeDisplay || "Off";
  const osdFontSize = osdDraft.osdFontSize || "Small 10pt";
  const backgroundTransparency = osdDraft.backgroundTransparency || "Opaque Black 70%";
  const dateTimePosition = osdDraft.dateTimePosition || "Upper Left";

  const setSharedTitle = (text) => {
    const nextTitles = { ...osdDraft.cameraTitles };
    if (isSequential && activeCameraId) {
      nextTitles[activeCameraId] = text;
    } else {
      batchSelectedCameraIds.forEach((id) => {
        nextTitles[id] = text;
      });
    }
    updateOsdDraft({
      cameraTitles: nextTitles,
      cameraTitlesEnabled: titleOn || text.trim() !== "",
    });
  };

  const setTitleOn = (on) => {
    updateOsdDraft({ cameraTitlesEnabled: on });
  };

  const setOsdOn = (on) => {
    if (on) {
      updateOsdDraft({
        dateTimeDisplay: osdDraft.dateTimeDisplay || "Off",
        osdFontSize: osdDraft.osdFontSize || "Small 10pt",
        backgroundTransparency: osdDraft.backgroundTransparency || "Opaque Black 70%",
        dateTimePosition: osdDraft.dateTimePosition || "Upper Left",
      });
      return;
    }
    updateOsdDraft({
      dateTimeDisplay: "",
      osdFontSize: "",
      backgroundTransparency: "",
      dateTimePosition: "",
    });
  };

  return (
    <div className="batch-form">
      <section className="batch-card">
        <header className="batch-card__head">Title</header>
        <div className="batch-card__body">
          <div className="batch-title-row">
            <input
              className="batch-title-row__input"
              type="text"
              value={sharedTitle}
              onChange={(e) => setSharedTitle(e.target.value)}
              placeholder="Click to type"
            />
            <span className="batch-title-row__state">{titleOn ? "On" : "Off"}</span>
            <Toggle checked={titleOn} onChange={setTitleOn} label="Camera title on" />
          </div>
        </div>
      </section>

      <section className="batch-card">
        <header className="batch-card__head">Image</header>
        <div className="batch-card__body batch-card__body--grid">
          <div className="batch-field">
            <FieldLabel>Capture mode</FieldLabel>
            <Segmented
              value={captureMode}
              options={CAPTURE_OPTIONS}
              onChange={(v) => updateOsdDraft({ imageCaptureMode: v })}
            />
          </div>
          <div className="batch-field">
            <FieldLabel>Mode</FieldLabel>
            <Segmented
              value={dayNightMode}
              options={MODE_OPTIONS}
              onChange={(v) => updateOsdDraft({ dayNightMode: v })}
              renderOption={(opt) => (
                <>
                  <ModeIcon type={opt.icon} />
                  {opt.label}
                </>
              )}
            />
          </div>
          <div className="batch-field">
            <FieldLabel>Rotation</FieldLabel>
            <Segmented
              value={imageRotation}
              options={ROTATION_OPTIONS}
              onChange={(v) => updateOsdDraft({ imageRotation: v })}
              renderOption={(opt) => (opt === "0°" ? "0˚" : opt.replace("°", "˚"))}
            />
          </div>
          <div className="batch-field">
            <FieldLabel>Super Dynamic (WDR HDR)</FieldLabel>
            <div className="batch-inline-toggle">
              <span>{wdrOn ? "On" : "Off"}</span>
              <Toggle
                checked={wdrOn}
                onChange={(on) => updateOsdDraft({ superDynamic: on ? "On" : "Off" })}
                label="Super Dynamic"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="batch-card">
        <header className="batch-card__head batch-card__head--with-toggle">
          <span>
            OSD <span className="batch-card__head-sub">On screen user inteface</span>
          </span>
          <Toggle checked={osdOn} onChange={setOsdOn} label="OSD section" />
        </header>
        <div className={`batch-card__body batch-card__body--stack${osdOn ? "" : " is-disabled"}`}>
          <div className="batch-field-row">
            <div className="batch-field">
              <FieldLabel>Time display</FieldLabel>
              <Segmented
                value={dateTimeDisplay}
                options={TIME_OPTIONS}
                onChange={(v) => updateOsdDraft({ dateTimeDisplay: v })}
                disabled={!osdOn}
              />
            </div>
            <div className="batch-field">
              <FieldLabel>Font Size</FieldLabel>
              <Segmented
                value={osdFontSize}
                options={FONT_SIZE_OPTIONS}
                onChange={(v) => updateOsdDraft({ osdFontSize: v })}
                renderOption={(opt) => opt.label}
                disabled={!osdOn}
              />
            </div>
          </div>
          <div className="batch-field-row">
            <div className="batch-field">
              <FieldLabel>Font Background Contrast</FieldLabel>
              <Segmented
                value={backgroundTransparency}
                options={CONTRAST_OPTIONS}
                onChange={(v) => updateOsdDraft({ backgroundTransparency: v })}
                renderOption={(opt) => opt.label}
                disabled={!osdOn}
              />
            </div>
            <div className="batch-field">
              <FieldLabel>Position</FieldLabel>
              <div className={`batch-pos${osdOn ? "" : " is-disabled"}`} role="group" aria-label="OSD position">
                {POSITION_OPTIONS.map((pos) => {
                  const selected = dateTimePosition === pos.value;
                  return (
                    <button
                      key={pos.value}
                      type="button"
                      className={`batch-pos__slot ${pos.className}${selected ? " is-selected" : ""}`}
                      onClick={() => updateOsdDraft({ dateTimePosition: pos.value })}
                      aria-pressed={selected}
                      aria-label={pos.value}
                      disabled={!osdOn}
                    >
                      {selected ? (
                        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                          <path
                            d="M3.5 8.2l3 3 6-6.2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="batch-pos__box" />
                      )}
                    </button>
                  );
                })}
                <span className="batch-pos__center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                    <path d="M9 7.5v9l8-4.5-8-4.5z" fill="currentColor" opacity="0.45" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
