import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import ProcessStatusIcon from "./drawer/ProcessStatusIcon";
import TypingIp from "./drawer/TypingIp";
import SuccessCelebration from "./drawer/SuccessCelebration";

const STEPS = [
  { id: "plan", label: "1. Plan" },
  { id: "processing", label: "2. Procesando" },
  { id: "success", label: "3. Éxito" },
];

function Stepper({ phase }) {
  const activeIndex = STEPS.findIndex((s) => s.id === phase);
  const isSuccess = phase === "success";

  return (
    <div
      className={`ip-drawer-stepper${isSuccess ? " is-success" : ""}`}
      aria-label="Progreso del asistente"
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
  queued: "En cola",
  writing: "Escribiendo IP…",
  done: "Listo / Verificado",
};

export default function IPDrawer() {
  const {
    drawerOpen,
    drawerPhase,
    setDrawerPhase,
    closeDrawer,
    applyIpChanges,
    finishResolution,
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

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rowStatuses, setRowStatuses] = useState(() => drawerCameras.map(() => "queued"));
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
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
    if (!drawerOpen) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && drawerOpen && drawerPhase === "plan") {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, drawerPhase, closeDrawer]);

  useEffect(() => {
    if (drawerPhase !== "processing") return undefined;

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
  }, [drawerPhase, drawerCameras, clearTimers, schedule, setDrawerPhase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!drawerOpen) {
      clearTimers();
      setRowStatuses(drawerCameras.map(() => "queued"));
      setProgress(0);
      setAdvancedOpen(false);
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
        className={`ip-drawer-backdrop${drawerOpen ? " is-open" : " is-closed"}`}
        onClick={drawerPhase === "plan" ? closeDrawer : undefined}
        aria-hidden={!drawerOpen}
      />

      <aside
        className={`ip-drawer-panel${drawerOpen ? " is-open" : " is-closed"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ip-drawer-title"
        aria-hidden={!drawerOpen}
      >
        <header className="ip-drawer-header">
          <h2 id="ip-drawer-title" className="ip-drawer-title">
            Asignación de direcciones IP
          </h2>
          <p className="ip-drawer-subtitle">Resolución de conflicto · i-PRO Configuration Tool</p>
          <Stepper phase={drawerPhase} />
        </header>

        <div className="ip-drawer-body">
          {drawerPhase === "plan" && (
            <div className="ip-drawer-form">
              <div className="ip-drawer-field">
                <label htmlFor="base-ip">IP inicial de red</label>
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
                    ? `Se asignarán IPs secuenciales libres a ${drawerCameras.length} cámara(s) en conflicto.`
                    : "Introduce una IPv4 válida (ej. 192.168.0.20) para continuar."}
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
                  Opciones avanzadas de red
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                  </svg>
                </button>
                {advancedOpen && (
                  <div className="ip-drawer-accordion__body">
                    <div className="ip-drawer-field">
                      <label htmlFor="subnet">Máscara de subred</label>
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

          {drawerPhase === "processing" && (
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
                    <span className="proc-meter__label">Red</span>
                  </div>
                  <span className="proc-meter__spark proc-meter__spark--1" />
                  <span className="proc-meter__spark proc-meter__spark--2" />
                  <span className="proc-meter__spark proc-meter__spark--3" />
                </div>
                <div className="proc-meter-copy">
                  <p className="proc-meter-copy__title">Sincronizando dispositivos</p>
                  <p className="proc-meter-copy__sub">
                    Escritura de IP · verificación en {drawerCameras.length} cámara
                    {drawerCameras.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="ip-drawer-progress-block">
                <div className="ip-drawer-progress-meta">
                  <span>Progreso global</span>
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

          {drawerPhase === "success" && (
            <div className="ip-drawer-form ip-drawer-form--success">
              <SuccessCelebration />
              <h3 className="ip-drawer-success__title">Configuración completada</h3>
              <p className="ip-drawer-success__text">
                {drawerCameras.length} cámara{drawerCameras.length === 1 ? "" : "s"} actualizada
                {drawerCameras.length === 1 ? "" : "s"} y verificada
                {drawerCameras.length === 1 ? "" : "s"} en la red.
              </p>
              <div className="ip-drawer-summary">
                <dl>
                  <div>
                    <dt>Tiempo transcurrido</dt>
                    <dd>{elapsedSec || "—"} s</dd>
                  </div>
                  <div>
                    <dt>Cámaras OK</dt>
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
          {drawerPhase === "plan" && (
            <div className="wizard-actions">
              <button type="button" className="btn ghost" onClick={closeDrawer}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={applyIpChanges}
                disabled={!canApplyIps}
              >
                Aplicar cambios
              </button>
            </div>
          )}

          {drawerPhase === "processing" && (
            <div className="ip-drawer-processing-note">
              <span className="proc-footer-wave" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <p>Aplicando configuración de red… No cierre este panel.</p>
            </div>
          )}

          {drawerPhase === "success" && (
            <div className="wizard-actions">
              <button type="button" className="btn primary btn--full" onClick={finishResolution}>
                Finalizar y volver al Dashboard
              </button>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}
