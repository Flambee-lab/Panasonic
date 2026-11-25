import { useApp } from "../../context/AppContext";
import OsdSettingsForm from "./OsdSettingsForm";

export default function OsdConfigPanel() {
  const {
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
        <OsdSettingsForm />
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
