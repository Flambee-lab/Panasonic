import { useApp } from "../../context/AppContext";

export default function OsdCameraTitlesSection() {
  const {
    osdDraft,
    updateOsdDraft,
    batchCameras,
    previewCameraId,
    selectPreviewCamera,
  } = useApp();

  const titles = osdDraft.cameraTitles ?? {};
  const sectionEnabled = Boolean(osdDraft.cameraTitlesEnabled);

  const setTitle = (cameraId, text) => {
    updateOsdDraft({
      cameraTitles: { ...titles, [cameraId]: text },
    });
  };

  return (
    <div className="osd-section-card osd-camera-titles-card">
      <div className="osd-section-card__head osd-section-card__head--with-toggle">
        <span>Camera titles</span>
        <label className="osd-section-head-toggle" htmlFor="camera-titles-section-toggle">
          <span className="toggle-switch">
            <input
              id="camera-titles-section-toggle"
              type="checkbox"
              checked={sectionEnabled}
              onChange={(e) => updateOsdDraft({ cameraTitlesEnabled: e.target.checked })}
            />
            <span className="toggle-slider" />
          </span>
        </label>
      </div>

      {sectionEnabled && (
        <div className="osd-camera-titles">
          <ul className="osd-camera-titles__list" aria-label="Per-camera title names">
            {batchCameras.map((cam) => {
              const isActive = previewCameraId === cam.id;
              const hasCustomName = Boolean((titles[cam.id] ?? "").trim());

              return (
                <li
                  key={cam.id}
                  className={`osd-camera-titles__row${isActive ? " is-active" : ""}${hasCustomName ? " has-name" : ""}`}
                >
                  <button
                    type="button"
                    className="osd-camera-titles__select"
                    onClick={() => selectPreviewCamera(cam.id)}
                    aria-pressed={isActive}
                  >
                    <span className="osd-camera-titles__alias">{cam.alias}</span>
                    <span className="osd-camera-titles__meta">
                      {cam.model} · {cam.ip}
                    </span>
                  </button>
                  <div className="osd-camera-titles__field">
                    <input
                      id={`camera-title-${cam.id}`}
                      className="osd-camera-titles__input"
                      type="text"
                      value={titles[cam.id] ?? ""}
                      onChange={(e) => setTitle(cam.id, e.target.value)}
                      onFocus={() => selectPreviewCamera(cam.id)}
                      placeholder={cam.alias}
                      aria-label={`On-screen name for ${cam.alias}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
