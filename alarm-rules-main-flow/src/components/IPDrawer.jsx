import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import DrawerSelectionHeader from "./drawer/DrawerSelectionHeader";
import ProcessStatusIcon from "./drawer/ProcessStatusIcon";
import SecurityCredentialsCard, {
  useSecurityFormValid,
} from "./drawer/SecurityCredentialsCard";
import SuccessCelebration from "./drawer/SuccessCelebration";
import TypingIp from "./drawer/TypingIp";

const STEPS = [
  { id: "plan", label: "1. Plan" },
  { id: "processing", label: "2. Processing" },
  { id: "success", label: "3. Success" },
];

function Stepper({ phase }) {
  const activeIndex = STEPS.findIndex((s) => s.id === phase);
  const isSuccess = phase === "success";

  return (
    <div
      className={`ip-drawer-stepper${isSuccess ? " is-success" : ""}`}
      aria-label="Assistant progress"
    >
      {STEPS.map((step, index) => {
        const done = index < activeIndex || isSuccess;
        const active = index === activeIndex && !isSuccess;
        return (
          <React.Fragment key={step.id}>
            <div className={`ip-drawer-step${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
              <div className="ip-drawer-step__track" />
              <span className="ip-drawer-step__label">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <span className="ip-drawer-step__sep" aria-hidden="true">
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const ROW_LABELS = {
  queued: "Queued",
  writing: "Writing IP…",
  done: "Done / Verified",
};

const SECURITY_STEPS = [
  { id: "form", label: "1. Credentials" },
  { id: "success", label: "2. Complete" },
];

function SecurityStepper({ phase }) {
  const activeIndex = SECURITY_STEPS.findIndex((s) => s.id === phase);
  const isSuccess = phase === "success";
  return (
    <div className="ip-drawer-stepper" aria-label="Security progress">
      {SECURITY_STEPS.map((step, index) => {
        const done = index < activeIndex || isSuccess;
        const active = index === activeIndex && !isSuccess;
        return (
          <React.Fragment key={step.id}>
            <div className={`ip-drawer-step${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
              <div className="ip-drawer-step__track" />
              <span className="ip-drawer-step__label">{step.label}</span>
            </div>
            {index < SECURITY_STEPS.length - 1 && (
              <span className="ip-drawer-step__sep" aria-hidden="true">
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function IPDrawer() {
  const {
    drawerOpen,
    drawerFlowType,
    drawerPhase,
    setDrawerPhase,
    securityPhase,
    closeDrawer,
    applyIpChanges,
    finishIpResolution,
    submitSecurityCredentials,
    finishSecurityResolution,
    drawerCameras,
    baseIp,
    setBaseIp,
    subnetMask,
    setSubnetMask,
    gateway,
    setGateway,
    proposedIps,
    appliedIps,
    canApplyIps,
    duplicateIp,
  } = useApp();

  const displayIps = appliedIps ?? proposedIps;
  const isIpFlow = drawerFlowType === "ip";
  const isSecurityFlow = drawerFlowType === "security";
  const panelOpen = drawerOpen && (isIpFlow || isSecurityFlow);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mirrorEnabled, setMirrorEnabled] = useState(true);
  const [cameraPassword, setCameraPassword] = useState("");
  const [cameraConfirm, setCameraConfirm] = useState("");
  const [recorderPassword, setRecorderPassword] = useState("");
  const [recorderConfirm, setRecorderConfirm] = useState("");
  const [rowStatuses, setRowStatuses] = useState(() => drawerCameras.map(() => "queued"));
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timersRef = useRef([]);

  const securityValid = useSecurityFormValid(
    mirrorEnabled,
    cameraPassword,
    cameraConfirm,
    recorderPassword,
    recorderConfirm
  );

  useEffect(() => {
    if (!mirrorEnabled) return;
    setRecorderPassword(cameraPassword);
    setRecorderConfirm(cameraConfirm);
  }, [mirrorEnabled, cameraPassword, cameraConfirm]);

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
    if (!panelOpen) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [panelOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || !panelOpen) return;
      const canClose =
        (isIpFlow && drawerPhase === "plan") ||
        (isSecurityFlow && securityPhase === "form");
      if (canClose) closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, drawerPhase, securityPhase, isIpFlow, isSecurityFlow, closeDrawer]);

  useEffect(() => {
    if (!isIpFlow || drawerPhase !== "processing") return undefined;

    const count = drawerCameras.length;
    setRowStatuses(drawerCameras.map(() => "queued"));
    setProgress(0);
    setElapsedSec(0);
    clearTimers();

    const startedAt = Date.now();
    const stagger = 1100;
    const writeDuration = 950;

    drawerCameras.forEach((_, index) => {
      schedule(() => {
        setRowStatuses((prev) => {
          const next = [...prev];
          next[index] = "writing";
          return next;
        });
        setProgress(Math.round(((index + 0.35) / count) * 100));
      }, index * stagger);

      schedule(() => {
        setRowStatuses((prev) => {
          const next = [...prev];
          next[index] = "done";
          return next;
        });
        setProgress(Math.round(((index + 1) / count) * 100));
      }, index * stagger + writeDuration);
    });

    const totalDuration = count * stagger + writeDuration;
    schedule(() => {
      setProgress(100);
      setElapsedSec(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      setDrawerPhase("success");
    }, totalDuration + 800);

    return clearTimers;
  }, [isIpFlow, drawerPhase, drawerCameras, clearTimers, schedule, setDrawerPhase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!drawerOpen) {
      clearTimers();
      setRowStatuses(drawerCameras.map(() => "queued"));
      setProgress(0);
      setAdvancedOpen(false);
      setMirrorEnabled(true);
      setCameraPassword("");
      setCameraConfirm("");
      setRecorderPassword("");
      setRecorderConfirm("");
    }
  }, [drawerOpen, drawerCameras, clearTimers]);

  useEffect(() => {
    if (drawerOpen && drawerCameras.length > 0) {
      setRowStatuses(drawerCameras.map(() => "queued"));
    }
  }, [drawerOpen, drawerCameras]);

  return (
    <>
      <div
        className={`ip-drawer-backdrop${panelOpen ? " is-open" : " is-closed"}`}
        onClick={
          (isIpFlow && drawerPhase === "plan") ||
          (isSecurityFlow && securityPhase === "form")
            ? closeDrawer
            : undefined
        }
        aria-hidden={!panelOpen}
      />

      <aside
        className={`ip-drawer-panel${panelOpen ? " is-open" : " is-closed"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ip-drawer-title"
        aria-hidden={!panelOpen}
      >
        <header className="ip-drawer-header">
          <h2 id="ip-drawer-title" className="ip-drawer-title">
            {isSecurityFlow ? "Security registry" : "IP address assignment"}
          </h2>
          <p className="ip-drawer-subtitle">
            {isSecurityFlow
              ? "Network & security · i-PRO Configuration Tool"
              : "Conflict resolution · i-PRO Configuration Tool"}
          </p>
          {isIpFlow ? <Stepper phase={drawerPhase} /> : <SecurityStepper phase={securityPhase} />}
        </header>

        <div className="ip-drawer-body">
          <DrawerSelectionHeader cameras={drawerCameras} />

          {isSecurityFlow && securityPhase === "form" && (
            <SecurityCredentialsCard
              mirrorEnabled={mirrorEnabled}
              onMirrorChange={setMirrorEnabled}
              cameraPassword={cameraPassword}
              onCameraPasswordChange={setCameraPassword}
              cameraConfirm={cameraConfirm}
              onCameraConfirmChange={setCameraConfirm}
              recorderPassword={recorderPassword}
              onRecorderPasswordChange={setRecorderPassword}
              recorderConfirm={recorderConfirm}
              onRecorderConfirmChange={setRecorderConfirm}
            />
          )}

          {isSecurityFlow && securityPhase === "success" && (
            <div className="ip-drawer-form ip-drawer-form--success">
              <SuccessCelebration />
              <h3 className="ip-drawer-success__title">Credentials registered</h3>
              <p className="ip-drawer-success__text">
                Admin passwords were applied to {drawerCameras.length} device
                {drawerCameras.length === 1 ? "" : "s"} in this batch.
              </p>
            </div>
          )}

          {isIpFlow && drawerPhase === "plan" && (
            <div className="ip-drawer-form">
              <div className="ip-drawer-field">
                <label htmlFor="base-ip">Starting network IP</label>
                <input
                  id="base-ip"
                  type="text"
                  value={baseIp}
                  onChange={(e) => setBaseIp(e.target.value)}
                  placeholder="192.168.0.20"
                  spellCheck={false}
                />
                <p className="ip-drawer-field-hint">
                  {canApplyIps
                    ? `Sequential free IPs will be assigned to ${drawerCameras.length} camera(s) in conflict.`
                    : "Enter a valid IPv4 address (e.g. 192.168.0.20) to continue."}
                </p>
              </div>

              <ul className="ip-drawer-list">
                {drawerCameras.map((cam, i) => (
                  <li key={cam.id} className="ip-drawer-list-item">
                    <div className="ip-drawer-list-item__name">{cam.alias}</div>
                    <div className="ip-drawer-list-item__ips">
                      <span className="ip-drawer-list-item__old">{duplicateIp}</span>
                      <span className="ip-drawer-list-item__arrow">→</span>
                      <span className="ip-drawer-list-item__new">{displayIps[i] ?? "—"}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="ip-drawer-accordion">
                <button
                  type="button"
                  className="ip-drawer-accordion__trigger"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  aria-expanded={advancedOpen}
                >
                  Advanced network options
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                  </svg>
                </button>
                {advancedOpen && (
                  <div className="ip-drawer-accordion__body">
                    <div className="ip-drawer-field">
                      <label htmlFor="subnet">Subnet mask</label>
                      <input
                        id="subnet"
                        type="text"
                        value={subnetMask}
                        onChange={(e) => setSubnetMask(e.target.value)}
                      />
                    </div>
                    <div className="ip-drawer-field">
                      <label htmlFor="gateway">Gateway</label>
                      <input
                        id="gateway"
                        type="text"
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isIpFlow && drawerPhase === "processing" && (
            <div className="ip-drawer-form ip-drawer-form--processing">
              <div className="proc-meter-card">
                <div
                  className="proc-meter"
                  style={{ "--proc-pct": `${progress}` }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 120 120" className="proc-meter__svg">
                    <circle className="proc-meter__bg" cx="60" cy="60" r="52" />
                    <circle className="proc-meter__arc" cx="60" cy="60" r="52" />
                  </svg>
                  <div className="proc-meter__core">
                    <span className="proc-meter__value">{progress}%</span>
                    <span className="proc-meter__label">Network</span>
                  </div>
                  <span className="proc-meter__spark proc-meter__spark--1" />
                  <span className="proc-meter__spark proc-meter__spark--2" />
                  <span className="proc-meter__spark proc-meter__spark--3" />
                </div>
                <div className="proc-meter-copy">
                  <p className="proc-meter-copy__title">Syncing devices</p>
                  <p className="proc-meter-copy__sub">
                    Writing IP · verifying {drawerCameras.length} camera
                    {drawerCameras.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="ip-drawer-progress-block">
                <div className="ip-drawer-progress-meta">
                  <span>Overall progress</span>
                  <span className="proc-progress-pct">{progress}%</span>
                </div>
                <div className="ip-drawer-progress-track">
                  <div className="ip-drawer-progress-fill" style={{ width: `${progress}%` }}>
                    <span className="ip-drawer-progress-shine" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <ul className="ip-drawer-list ip-process-list">
                {drawerCameras.map((cam, i) => {
                  const rowStatus = rowStatuses[i];
                  return (
                    <li
                      key={cam.id}
                      className={`ip-process-row ip-process-row--${rowStatus}`}
                    >
                      <div className="ip-process-row__main">
                        <ProcessStatusIcon status={rowStatus} />
                        <div className="ip-process-row__body">
                          <div className="ip-drawer-list-item__name">{cam.alias}</div>
                          <div className="ip-process-row__ip">
                            <TypingIp
                              ip={displayIps[i] ?? ""}
                              active={rowStatus === "writing"}
                            />
                          </div>
                          {rowStatus === "writing" && (
                            <div className="proc-data-bars" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                              <span />
                              <span />
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`ip-process-row__label ip-process-row__label--${rowStatus}`}>
                        {ROW_LABELS[rowStatus]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {isIpFlow && drawerPhase === "success" && (
            <div className="ip-drawer-form ip-drawer-form--success">
              <SuccessCelebration />
              <h3 className="ip-drawer-success__title">Configuration complete</h3>
              <p className="ip-drawer-success__text">
                {drawerCameras.length} camera{drawerCameras.length === 1 ? "" : "s"} updated and verified
                on the network.
              </p>
              <div className="ip-drawer-summary">
                <dl>
                  <div>
                    <dt>Elapsed time</dt>
                    <dd>{elapsedSec || "—"} s</dd>
                  </div>
                  <div>
                    <dt>Cameras OK</dt>
                    <dd className="is-ok">
                      {drawerCameras.length} / {drawerCameras.length}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        <footer className="ip-drawer-footer">
          {isSecurityFlow && securityPhase === "form" && (
            <div className="wizard-actions">
              <button type="button" className="btn ghost" onClick={closeDrawer}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={submitSecurityCredentials}
                disabled={!securityValid}
              >
                Register credentials
              </button>
            </div>
          )}

          {isSecurityFlow && securityPhase === "success" && (
            <div className="wizard-actions">
              <button
                type="button"
                className="btn primary btn--full"
                onClick={() => finishSecurityResolution()}
              >
                Finish and return to Dashboard
              </button>
            </div>
          )}

          {isIpFlow && drawerPhase === "plan" && (
            <div className="wizard-actions">
              <button type="button" className="btn ghost" onClick={closeDrawer}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={applyIpChanges}
                disabled={!canApplyIps}
              >
                Apply changes
              </button>
            </div>
          )}

          {isIpFlow && drawerPhase === "processing" && (
            <div className="ip-drawer-processing-note">
              <span className="proc-footer-wave" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <p>Applying network configuration… Do not close this panel.</p>
            </div>
          )}

          {isIpFlow && drawerPhase === "success" && (
            <div className="wizard-actions">
              <button
                type="button"
                className="btn primary btn--full"
                onClick={() => finishIpResolution()}
              >
                Finish and return to Dashboard
              </button>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}
