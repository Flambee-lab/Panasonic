import { useApp } from "../context/AppContext";

export default function FirmwareAlertBanner() {
  const { firmwareUpdateCameras, openFirmwareDrawer } = useApp();
  const count = firmwareUpdateCameras.length;
  if (count === 0) return null;

  return (
    <div className="dash-alert-banner dash-alert-banner--firmware">
      <div className="dash-alert-banner__inner">
        <div className="dash-alert-banner__copy">
          <p className="dash-alert-banner__title">Firmware updates available</p>
          <p className="dash-alert-banner__desc">
            {count} {count === 1 ? "camera available to be upgraded" : "cameras available to be upgraded"}
          </p>
        </div>
        <div className="dash-alert-actions">
          <button
            type="button"
            className="dash-alert-cta dash-alert-cta--firmware"
            onClick={openFirmwareDrawer}
          >
            Update firmware
            <span className="dash-alert-cta__badge">{count}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
