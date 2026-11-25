import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { CURRENT_FIRMWARE, TARGET_FIRMWARE } from "../data/initialCameras";
import closeHeaderIcon from "../assets/report/close-header.svg";
import checkIcon from "../assets/report/check.svg";
import checkGreenIcon from "../assets/report/check-green.svg";
import loaderIcon from "../assets/report/loader.svg";
import rowCloseIcon from "../assets/report/row-close.svg";
import "../styles/report-drawer.css";
import "../styles/firmware-drawer.css";

const CAMERA_MS = 2200;

export default function FirmwareDrawer() {
  const {
    drawerOpen,
    drawerFlowType,
    drawerPhase,
    setDrawerPhase,
    closeDrawer,
    drawerCameras,
    removeCameraFromFirmware,
    finishFirmwareUpdate,
  } = useApp();

  const open = drawerOpen && drawerFlowType === "firmware";
  const canClose = drawerPhase === "plan";

  const [rowStatuses, setRowStatuses] = useState(() => drawerCameras.map(() => "queued"));
  const [activeIndex, setActiveIndex] = useState(0);
  const [installPct, setInstallPct] = useState(0);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || !open || !canClose) return;
      closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, canClose, closeDrawer]);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setRowStatuses([]);
      setActiveIndex(0);
      setInstallPct(0);
    }
  }, [open, clearTimers]);

  useEffect(() => {
    if (open && drawerPhase === "plan") {
      setRowStatuses(drawerCameras.map(() => "queued"));
    }
  }, [open, drawerPhase, drawerCameras]);

  useEffect(() => {
    if (!open || drawerPhase !== "processing") return undefined;

    setRowStatuses(drawerCameras.map(() => "queued"));
    setActiveIndex(0);
    setInstallPct(0);
    clearTimers();

    drawerCameras.forEach((_, index) => {
      schedule(() => {
        setActiveIndex(index);
        setInstallPct(0);
        setRowStatuses((prev) => {
          const next = [...prev];
          next[index] = "installing";
          return next;
        });
      }, index * CAMERA_MS);

      schedule(() => {
        setInstallPct(100);
        setRowStatuses((prev) => {
          const next = [...prev];
          next[index] = "done";
          return next;
        });
      }, (index + 1) * CAMERA_MS - 80);
    });

    return clearTimers;
  }, [open, drawerPhase, drawerCameras, clearTimers, schedule]);

  useEffect(() => {
    if (!open || drawerPhase !== "processing") return undefined;
    const id = setInterval(() => {
      setInstallPct((prev) => Math.min(99, prev + 3));
    }, 90);
    return () => clearInterval(id);
  }, [open, drawerPhase, activeIndex]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const cameraCount = drawerCameras.length;
  const doneCount = rowStatuses.filter((status) => status === "done").length;
  const installing = rowStatuses.some((status) => status === "installing");
  const overallProgress =
    cameraCount === 0
      ? 0
      : Math.round(((doneCount + (installing ? installPct / 100 : 0)) / cameraCount) * 100);

  const handleStart = () => {
    if (cameraCount === 0) return;
    setDrawerPhase("processing");
  };

  const installComplete = cameraCount > 0 && doneCount === cameraCount && !installing;

  const handleDone = () => {
    if (!installComplete) return;
    finishFirmwareUpdate();
  };

  const currentVersion = drawerCameras[0]?.firmware ?? CURRENT_FIRMWARE;
  const latestVersion = drawerCameras[0]?.latestFirmware ?? TARGET_FIRMWARE;

  return (
    <>
      <div
        className={`ip-drawer-backdrop${open ? " is-open" : " is-closed"}`}
        onClick={canClose ? closeDrawer : undefined}
        aria-hidden={!open}
      />

      <aside
        className={`ip-drawer-panel ip-drawer-panel--report report-drawer firmware-drawer${
          open ? " is-open" : " is-closed"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="firmware-drawer-title"
        aria-hidden={!open}
      >
        <header className="report-drawer__header">
          <span className="report-drawer__badge firmware-drawer__badge" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M12 5v10m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19h14" strokeLinecap="round" />
            </svg>
          </span>
          <h2 id="firmware-drawer-title" className="report-drawer__title">
            Update firmware
          </h2>
          <button
            type="button"
            className="report-drawer__close"
            onClick={closeDrawer}
            aria-label="Close"
            disabled={!canClose}
          >
            <img src={closeHeaderIcon} alt="" width={16} height={16} className="report-drawer__icon" />
          </button>
        </header>

        <div className="report-drawer__body">
          {drawerPhase === "plan" && (
            <>
              <div className="report-drawer__intro">
                <p className="report-drawer__kicker">Firmware versions</p>
                <p className="report-drawer__copy">
                  Cameras in this list will be upgraded. Remove any to skip.
                </p>
              </div>
              <div className="fw-versions">
                <div className="fw-versions__item">
                  <p className="fw-versions__label">Current version</p>
                  <p className="fw-versions__value">{currentVersion}</p>
                </div>
                <div className="fw-versions__item">
                  <p className="fw-versions__label">Latest available</p>
                  <p className="fw-versions__value fw-versions__value--latest">{latestVersion}</p>
                </div>
              </div>
              <div className="report-drawer__list" role="list">
                {drawerCameras.map((cam) => (
                  <div key={cam.id} className="report-drawer__row" role="listitem">
                    <div className="report-drawer__row-main">
                      <img src={checkIcon} alt="" width={16} height={16} className="report-drawer__icon" />
                      <span className="report-drawer__row-name">
                        {cam.deviceId} - {cam.alias}
                      </span>
                    </div>
                    <div className="report-drawer__row-meta">
                      <span className="report-drawer__row-ip">{cam.ip}</span>
                      <button
                        type="button"
                        className="report-drawer__row-remove"
                        onClick={() => removeCameraFromFirmware(cam.id)}
                        aria-label={`Remove ${cam.alias} from firmware update`}
                      >
                        <img src={rowCloseIcon} alt="" width={16} height={16} className="report-drawer__icon" />
                      </button>
                    </div>
                  </div>
                ))}
                {drawerCameras.length === 0 && (
                  <p className="report-drawer__empty">No cameras selected.</p>
                )}
              </div>
            </>
          )}

          {drawerPhase === "processing" && (
            <>
              <p className="report-drawer__copy">
                Installing firmware on each camera. Keep this panel open until the update finishes.
              </p>
              <div
                className="report-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overallProgress}
                aria-label="Firmware install progress"
              >
                <div className="report-progress__fill" style={{ width: `${overallProgress}%` }} />
              </div>
              <p className="fw-install-label">Installing {overallProgress}%</p>
              <div className="report-drawer__list" role="list">
                {drawerCameras.map((cam, i) => {
                  const status = rowStatuses[i] ?? "queued";
                  const done = status === "done";
                  const isInstalling = status === "installing";
                  return (
                    <div
                      key={cam.id}
                      className={`report-drawer__row${
                        done ? " is-done" : isInstalling ? " is-scanning" : ""
                      }`}
                      role="listitem"
                    >
                      <div className="report-drawer__row-main">
                        {done ? (
                          <img
                            src={checkGreenIcon}
                            alt=""
                            width={16}
                            height={16}
                            className="report-drawer__icon"
                          />
                        ) : isInstalling ? (
                          <img
                            src={loaderIcon}
                            alt=""
                            width={16}
                            height={16}
                            className="report-drawer__icon report-scan__spinner"
                          />
                        ) : (
                          <img src={checkIcon} alt="" width={16} height={16} className="report-drawer__icon" />
                        )}
                        <span className="report-drawer__row-name">
                          {cam.deviceId} - {cam.alias}
                        </span>
                      </div>
                      <span className={`report-drawer__row-ip${isInstalling ? " is-installing" : ""}`}>
                        {isInstalling ? `Installing ${installPct}%` : done ? "Updated" : cam.ip}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="report-drawer__footer">
          {drawerPhase === "plan" && (
            <button
              type="button"
              className="report-drawer__next"
              onClick={handleStart}
              disabled={cameraCount === 0}
            >
              Update firmware
            </button>
          )}
          {drawerPhase === "processing" && (
            <button
              type="button"
              className="report-drawer__next"
              onClick={handleDone}
              disabled={!installComplete}
            >
              Done
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
