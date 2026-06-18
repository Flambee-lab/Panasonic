import { useApp } from "../../context/AppContext";
import OsdCameraTitlesSection from "./OsdCameraTitlesSection";
import { OsdSelectField } from "./OsdField";

const BASIC_FIELDS = {
  systemLanguage: ["English", "Japanese", "Spanish", "French", "German"],
  lineFrequency: ["50 Hz", "60 Hz"],
  statusIndicatorLed: ["On - Steady Green", "Off - Stealth Mode", "Blinking Red - Warning"],
  ntpSync: ["On - Sync with i-PRO", "Off - Manual"],
};

const IMAGE_FIELDS = {
  imageCaptureMode: ["JPEG", "H.265", "H.264"],
  imageRotation: ["0°", "90°", "180°", "270°"],
  dayNightMode: ["Color", "BW", "Auto"],
  superDynamic: ["Off", "On"],
  dateTimeDisplay: ["24h", "12h", "Off"],
  dateTimePosition: ["Upper Left", "Upper Right", "Lower Left", "Lower Right"],
  osdFontSize: ["Normal 14pt", "Large 18pt", "Small 10pt"],
  backgroundTransparency: [
    "Opaque Black 70%",
    "Semi-Transparent 40%",
    "Full Transparent 0%",
  ],
};

function SectionCard({ title, children, fullWidth }) {
  return (
    <div className="osd-section-card">
      <div className="osd-section-card__head">{title}</div>
      <div className={`osd-section-card__body${fullWidth ? " osd-section-card__body--full" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export default function OsdConfigPanel() {
  const {
    osdDraft,
    updateOsdDraft,
    propagateOsd,
    setPropagateOsd,
    applyBatchOsdSettings,
    canApplyOsd,
    cgiSender,
  } = useApp();

  return (
    <section className="osd-form-stage osd-split__form">
      <header className="osd-form-stage__head">
        <h2 className="osd-form-stage__title">Selected cameras</h2>
      </header>

      <div className="osd-form-stage__body">
        <div className="osd-form-stack">
          <OsdCameraTitlesSection />

          <SectionCard title="Image General">
            <OsdSelectField
              id="capture-mode"
              label="Image Capture Mode"
              value={osdDraft.imageCaptureMode}
              onChange={(v) => updateOsdDraft({ imageCaptureMode: v })}
              options={IMAGE_FIELDS.imageCaptureMode}
              mono
            />
            <OsdSelectField
              id="image-rotation"
              label="Image Rotation (Sensors)"
              value={osdDraft.imageRotation}
              onChange={(v) => updateOsdDraft({ imageRotation: v })}
              options={IMAGE_FIELDS.imageRotation}
            />
            <OsdSelectField
              id="day-night"
              label="Day/Night Mode (IR Cut-Filter)"
              value={osdDraft.dayNightMode}
              onChange={(v) => updateOsdDraft({ dayNightMode: v })}
              options={IMAGE_FIELDS.dayNightMode}
            />
            <OsdSelectField
              id="super-dynamic"
              label="Super Dynamic (WDR HDR)"
              value={osdDraft.superDynamic}
              onChange={(v) => updateOsdDraft({ superDynamic: v })}
              options={IMAGE_FIELDS.superDynamic}
            />
          </SectionCard>

          <SectionCard title="OSD">
            <OsdSelectField
              id="datetime-display"
              label="Date/Time Display Setting"
              value={osdDraft.dateTimeDisplay}
              onChange={(v) => updateOsdDraft({ dateTimeDisplay: v })}
              options={IMAGE_FIELDS.dateTimeDisplay}
            />
            <OsdSelectField
              id="datetime-position"
              label="Date/Time Position"
              value={osdDraft.dateTimePosition}
              onChange={(v) => updateOsdDraft({ dateTimePosition: v })}
              options={IMAGE_FIELDS.dateTimePosition}
            />
            <OsdSelectField
              id="osd-font-size"
              label="OSD Font Size"
              value={osdDraft.osdFontSize}
              onChange={(v) => updateOsdDraft({ osdFontSize: v })}
              options={IMAGE_FIELDS.osdFontSize}
            />
            <OsdSelectField
              id="osd-transparency"
              label="Background Transparency"
              value={osdDraft.backgroundTransparency}
              onChange={(v) => updateOsdDraft({ backgroundTransparency: v })}
              options={IMAGE_FIELDS.backgroundTransparency}
            />
          </SectionCard>

          <SectionCard title="System">
            <OsdSelectField
              id="system-language"
              label="System Language"
              value={osdDraft.systemLanguage}
              onChange={(v) => updateOsdDraft({ systemLanguage: v })}
              options={BASIC_FIELDS.systemLanguage}
            />
            <OsdSelectField
              id="line-frequency"
              label="Line Frequency"
              value={osdDraft.lineFrequency}
              onChange={(v) => updateOsdDraft({ lineFrequency: v })}
              options={BASIC_FIELDS.lineFrequency}
            />
            <OsdSelectField
              id="status-led"
              label="Status Indicator LED"
              value={osdDraft.statusIndicatorLed}
              onChange={(v) => updateOsdDraft({ statusIndicatorLed: v })}
              options={BASIC_FIELDS.statusIndicatorLed}
            />
          </SectionCard>

          <SectionCard title="Time &amp; Sync">
            <OsdSelectField
              id="ntp-sync"
              label="NTP Server Sync"
              value={osdDraft.ntpSync}
              onChange={(v) => updateOsdDraft({ ntpSync: v })}
              options={BASIC_FIELDS.ntpSync}
            />
          </SectionCard>

          <SectionCard title="Storage" fullWidth>
            <label className="osd-field-toggle osd-field-toggle--full">
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={osdDraft.sdOverwrite}
                  onChange={(e) => updateOsdDraft({ sdOverwrite: e.target.checked })}
                />
                <span className="toggle-slider" />
              </span>
              <span className="osd-field-toggle__copy">
                <span className="osd-field-toggle__label">SD Memory Card Automatic Overwrite</span>
                <span className="osd-field-toggle__hint">
                  When enabled, oldest recordings are purged automatically once the SD card
                  reaches capacity.
                </span>
              </span>
            </label>
          </SectionCard>
        </div>
      </div>

      <footer className="osd-form-stage__footer">
        <label className="osd-propagate" htmlFor="propagate-osd-cb">
          <input
            id="propagate-osd-cb"
            type="checkbox"
            checked={propagateOsd}
            onChange={(e) => setPropagateOsd(e.target.checked)}
          />
          Sync batch
        </label>
        <button
          type="button"
          className="osd-apply-btn"
          onClick={applyBatchOsdSettings}
          disabled={cgiSender.visible || !canApplyOsd}
        >
          Apply
        </button>
      </footer>
    </section>
  );
}
