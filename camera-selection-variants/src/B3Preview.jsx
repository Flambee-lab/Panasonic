import { useCallback, useEffect, useRef, useState } from "react";
import CameraSheet from "./components/CameraSheet";
import { CAMERAS } from "./data/alarm-cameras";

const EVENT_TYPE_IDS = ["vmd"];
const INITIAL_CAMERA_IDS = CAMERAS
  .filter((camera) => !camera.offline && !(camera.unsupported ?? []).includes("vmd"))
  .slice(0, 72)
  .map((camera) => camera.id);
const CAMERAS_BY_ID = new Map(CAMERAS.map((camera) => [camera.id, camera]));
const SECTIONS = ["Name", "Event types", "Schedules", "Affected cameras"];
const requestedVariant = new URLSearchParams(window.location.search).get("variant");
const VARIANT = ["2", "3"].includes(requestedVariant) ? requestedVariant : "1";

function ContextSection({ id, label, children, action }) {
  return (
    <section className="alarm-rule__section" aria-labelledby={id}>
      <header className="alarm-rule__section-head">
        <span id={id}>{label}</span>
        {action}
      </header>
      <div className="alarm-rule__section-body b3-context__summary">{children}</div>
    </section>
  );
}

export default function B3Preview() {
  const [cameraIds, setCameraIds] = useState(() => [...INITIAL_CAMERA_IDS]);
  const [open, setOpen] = useState(true);
  const editRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const assign = useCallback((ids) => {
    setCameraIds([...ids]);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) editRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    document.title = `Panasonic — B3 Cameras · Variant ${VARIANT}`;
  }, []);

  const cameraCount = cameraIds.length;
  const sample = cameraIds.slice(0, 4).map((id) => CAMERAS_BY_ID.get(id)).filter(Boolean);

  return (
    <div className="b3-preview">
      <main className="alarm-rule b3-preview-context" inert={open || undefined} aria-hidden={open || undefined}>
        <div className="alarm-rule__plane">
          <span className="alarm-rule__close b3-context__close" aria-hidden="true">
            <img src="/assets/alarm-rules/close.svg" alt="" />
          </span>
          <div className="alarm-rule__body">
            <section className="alarm-rule__card">
              <header className="alarm-rule__header">
                <span className="alarm-rule__mark" aria-hidden="true">
                  <span className="alarm-rule__mark-spin">
                    <img src="/assets/alarm-rules/rule-mark.svg" alt="" />
                  </span>
                </span>
                <div className="alarm-rule__heading">
                  <h1>New alarm rule</h1>
                  <p>Choose which events and cameras trigger alarms in Live Events. Then set when those alarms appear using schedules and exceptions.</p>
                </div>
              </header>

              <div className="alarm-rule__review">
                <nav className="alarm-rule__nav b3-context__nav" aria-label="Rule sections">
                  {SECTIONS.map((label) => (
                    <span key={label} aria-current={label === "Affected cameras" ? "location" : undefined}>{label}</span>
                  ))}
                </nav>
                <div className="alarm-rule__review-main">
                  <div className="b3-context__name">
                    <span>Name</span>
                    <div className="alarm-rule__name b3-context__readonly-field">After hours</div>
                  </div>

                  <ContextSection id="b3-event-types" label="Event types">
                    <p className="b3-context__event">
                      <img src="/assets/alarm-rules/events/vmd.svg" alt="" />
                      <span>AI-VMD</span>
                    </p>
                  </ContextSection>

                  <ContextSection id="b3-schedules" label="Schedules">
                    <p>Monday–Friday · 6:00 PM–12:00 AM</p>
                    <p className="b3-context__secondary">(UTC-05:00) Eastern Time (US &amp; Canada)</p>
                  </ContextSection>

                  <ContextSection
                    id="b3-affected-cameras"
                    label="Affected cameras"
                    action={
                      <button ref={editRef} type="button" className="b3-context__edit" onClick={() => setOpen(true)}>
                        <img src="/assets/alarm-rules/edit.svg" alt="" />
                        Edit cameras
                      </button>
                    }
                  >
                    <p>{cameraCount} {cameraCount === 1 ? "camera" : "cameras"}</p>
                    {sample.length ? (
                      <div className="b3-context__camera-sample">
                        {sample.map((camera) => (
                          <span key={camera.id}>
                            <img src="/assets/alarm-rules/cameras/camera.svg" alt="" />
                            <span>{camera.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {cameraCount > sample.length ? <p className="b3-context__secondary">+{cameraCount - sample.length} more</p> : null}
                  </ContextSection>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {open ? <CameraSheet variant={VARIANT} initialIds={cameraIds} eventTypeIds={EVENT_TYPE_IDS} onClose={close} onAssign={assign} /> : null}
    </div>
  );
}
