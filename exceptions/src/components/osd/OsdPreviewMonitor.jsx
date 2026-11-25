import { useApp } from "../../context/AppContext";
import CameraStreamPreview from "../CameraStreamPreview";
import { draftToOsdPreviewSettings } from "../../utils/osdPreviewState";

export default function OsdPreviewMonitor() {
  const { osdDraft, previewCamera, batchCameras, selectPreviewCamera } = useApp();

  const osdSettings = draftToOsdPreviewSettings(osdDraft, previewCamera?.id);
  const isLive = Boolean(osdSettings.imageCaptureMode);

  return (
    <aside className="osd-stage osd-split__preview" aria-label="Camera OSD preview stage">
      <div className="osd-stage__base" aria-hidden="true" />

      <div className="osd-stage__content">
        <p className="osd-stage__eyebrow">Live stream preview</p>

        <div className={`osd-viewport-shell${isLive ? " is-live" : " is-offline"}`}>
          {isLive && (
            <div className="osd-viewport-shell__bezel">
              <span className="osd-viewport-shell__led" aria-hidden="true" />
              <span className="osd-viewport-shell__label">i-PRO · Stream (1)</span>
            </div>
          )}
          <CameraStreamPreview
            cameraId={previewCamera?.id}
            osdSettings={osdSettings}
            fallbackAlias={previewCamera?.alias}
            size="stage"
            className="osd-viewport-shell__monitor"
          />
        </div>

        <div className="osd-target-chips">
          <p className="osd-target-chips__label">
            Batch · {batchCameras.length} selected
          </p>
          <div className="osd-target-chips__row" role="list" aria-label="Target cameras in batch">
            {batchCameras.map((cam) => (
              <button
                key={cam.id}
                type="button"
                role="listitem"
                className={`osd-target-chip${previewCamera?.id === cam.id ? " is-active" : ""}`}
                onClick={() => selectPreviewCamera(cam.id)}
                aria-pressed={previewCamera?.id === cam.id}
                title={`${cam.alias} · ${cam.model} · ${cam.ip}`}
              >
                {cam.alias}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
