import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import downloadIcon from "../assets/report/download.svg";
import closeHeaderIcon from "../assets/report/close-header.svg";
import checkIcon from "../assets/report/check.svg";
import checkGreenIcon from "../assets/report/check-green.svg";
import completeCheckIcon from "../assets/report/complete-check.svg";
import fileDownloadIcon from "../assets/report/file-download.svg";
import loaderIcon from "../assets/report/loader.svg";
import rowCloseIcon from "../assets/report/row-close.svg";
import radioOnIcon from "../assets/report/radio-on.svg";
import radioOffIcon from "../assets/report/radio-off.svg";
import toggleOnIcon from "../assets/report/toggle-on.svg";
import "../styles/report-drawer.css";

function sanitizeFilename(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "_");
  return cleaned || "Inspection_Report";
}

function formatGeneratedAt(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `Generated today at ${hours}:${minutes}:${seconds}`;
}

function buildReportFile({ format, reportName, description, cameras }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = sanitizeFilename(reportName);
  if (format === "excel") {
    const header = "Alias,Device ID,Model,IP,MAC,Firmware,Status";
    const rows = cameras.map((cam) =>
      [cam.alias, cam.deviceId, cam.model, cam.ip, cam.mac, cam.firmware, cam.status]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    return {
      filename: `${base}_${stamp}.xlsx`,
      mime: "text/csv;charset=utf-8",
      content: [header, ...rows].join("\n"),
      generatedAt: new Date(),
    };
  }

  const payload = {
    format: "XSPS",
    name: reportName,
    description,
    generatedAt: new Date().toISOString(),
    cameras: cameras.map((cam) => ({
      id: cam.id,
      alias: cam.alias,
      deviceId: cam.deviceId,
      model: cam.model,
      ip: cam.ip,
      mac: cam.mac,
      firmware: cam.firmware,
      status: cam.status,
    })),
  };

  return {
    filename: `${base}_${stamp}.xps`,
    mime: "application/xml",
    content: `<?xml version="1.0" encoding="UTF-8"?>\n<xsps-report>\n${JSON.stringify(payload, null, 2)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}\n</xsps-report>\n`,
    generatedAt: new Date(),
  };
}

function downloadBlob({ filename, mime, content }) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportDrawer() {
  const {
    drawerOpen,
    drawerFlowType,
    drawerPhase,
    setDrawerPhase,
    closeDrawer,
    drawerCameras,
    removeCameraFromReport,
  } = useApp();

  const open = drawerOpen && drawerFlowType === "report";
  const canClose = drawerPhase === "plan" || drawerPhase === "setup" || drawerPhase === "success";

  const [format, setFormat] = useState("excel");
  const [coverPage, setCoverPage] = useState(true);
  const [reportName, setReportName] = useState("");
  const [client, setClient] = useState("");
  const [siteName, setSiteName] = useState("");
  const [installer, setInstaller] = useState("Panasonic");
  const [rowStatuses, setRowStatuses] = useState(() => drawerCameras.map(() => "queued"));
  const [fileMeta, setFileMeta] = useState(null);
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
      setFormat("excel");
      setCoverPage(true);
      setReportName("");
      setClient("");
      setSiteName("");
      setInstaller("Panasonic");
      setRowStatuses([]);
      setFileMeta(null);
    }
  }, [open, clearTimers]);

  useEffect(() => {
    if (open && drawerPhase === "plan") {
      setRowStatuses(drawerCameras.map(() => "queued"));
    }
  }, [open, drawerPhase, drawerCameras]);

  useEffect(() => {
    if (!open || drawerPhase !== "processing") return undefined;

    setRowStatuses(drawerCameras.map(() => "scanning"));
    clearTimers();

    const stagger = 850;

    drawerCameras.forEach((_, index) => {
      schedule(() => {
        setRowStatuses((prev) => {
          const next = [...prev];
          next[index] = "done";
          return next;
        });
      }, (index + 1) * stagger);
    });

    return clearTimers;
  }, [open, drawerPhase, drawerCameras, clearTimers, schedule]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleConfirmNext = () => {
    if (drawerCameras.length === 0) return;
    setDrawerPhase("setup");
  };

  const handleNext = () => {
    if (drawerCameras.length === 0) return;
    const name = reportName.trim();
    setFileMeta(
      buildReportFile({
        format,
        reportName: name,
        description: [client, siteName, installer].filter(Boolean).join(" · "),
        cameras: drawerCameras,
      })
    );
    setDrawerPhase("processing");
  };

  const handleDownload = () => {
    if (!fileMeta) return;
    downloadBlob(fileMeta);
  };

  const canContinue = drawerCameras.length > 0;
  const setupReady =
    canContinue &&
    reportName.trim() !== "" &&
    client.trim() !== "" &&
    siteName.trim() !== "" &&
    installer.trim() !== "";
  const formatLabel = format === "excel" ? "Excel" : "XPS";
  const cameraCount = drawerCameras.length;
  const doneCount = rowStatuses.filter((status) => status === "done").length;
  const progress = cameraCount > 0 ? Math.round((doneCount / cameraCount) * 100) : 0;
  const scanComplete =
    drawerPhase === "processing" &&
    cameraCount > 0 &&
    rowStatuses.length === cameraCount &&
    doneCount === cameraCount;

  return (
    <>
      <div
        className={`ip-drawer-backdrop${open ? " is-open" : " is-closed"}`}
        onClick={canClose ? closeDrawer : undefined}
        aria-hidden={!open}
      />

      <aside
        className={`ip-drawer-panel ip-drawer-panel--report report-drawer${open ? " is-open" : " is-closed"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-drawer-title"
        aria-hidden={!open}
      >
        <header className="report-drawer__header">
          <span className="report-drawer__badge" aria-hidden="true">
            <img src={downloadIcon} alt="" width={16} height={16} className="report-drawer__icon" />
          </span>
          <h2 id="report-drawer-title" className="report-drawer__title">
            Generate and download report
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

        <div
          className={`report-drawer__body${
            drawerPhase === "setup"
              ? " report-drawer__body--setup"
              : drawerPhase === "success"
                ? " report-drawer__body--success"
                : ""
          }`}
        >
          {drawerPhase === "plan" && (
            <>
              <div className="report-drawer__intro">
                <p className="report-drawer__kicker">Confirm Selected Cameras</p>
                <p className="report-drawer__copy">
                  These cameras will be captured for the inspection report.
                  <br />
                  You can go back to the dashboard to change your selection.
                </p>
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
                        onClick={() => removeCameraFromReport(cam.id)}
                        aria-label={`Remove ${cam.alias} from report`}
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

          {drawerPhase === "setup" && (
            <>
              <p className="report-drawer__copy">
                Configure the output for your inspection report. A live image will be captured from each of
                your {cameraCount} selected {cameraCount === 1 ? "camera" : "cameras"}.
              </p>

              <section className="report-setup__format">
                <p className="report-drawer__kicker">Output Format</p>
                <div className="report-chips" role="group" aria-label="Output format">
                  <button
                    type="button"
                    className={`report-chip${format === "excel" ? " is-selected" : ""}`}
                    onClick={() => setFormat("excel")}
                    aria-pressed={format === "excel"}
                  >
                    <img
                      src={format === "excel" ? radioOnIcon : radioOffIcon}
                      alt=""
                      width={16}
                      height={16}
                      className="report-drawer__icon"
                    />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    className={`report-chip${format === "xsps" ? " is-selected" : ""}`}
                    onClick={() => setFormat("xsps")}
                    aria-pressed={format === "xsps"}
                  >
                    <img
                      src={format === "xsps" ? radioOnIcon : radioOffIcon}
                      alt=""
                      width={16}
                      height={16}
                      className="report-drawer__icon"
                    />
                    <span>XPS (.xps)</span>
                  </button>
                </div>
                <p className="report-setup__hint">Excel is recommended for editable reports</p>
              </section>

              <hr className="report-setup__rule" />

              <section className="report-setup__cover">
                <div className="report-setup__cover-head">
                  <div className="report-setup__cover-copy">
                    <p className="report-setup__cover-title">Cover Page</p>
                    <p className="report-setup__cover-sub">Add a branded title page with project details</p>
                  </div>
                  <button
                    type="button"
                    className={`report-toggle${coverPage ? " is-on" : ""}`}
                    onClick={() => setCoverPage((v) => !v)}
                    aria-pressed={coverPage}
                    aria-label="Cover page"
                  >
                    {coverPage ? (
                      <img
                        src={toggleOnIcon}
                        alt=""
                        width={39}
                        height={24.5}
                        className="report-toggle__asset"
                      />
                    ) : (
                      <span className="report-toggle__track" aria-hidden="true">
                        <span className="report-toggle__knob" />
                      </span>
                    )}
                  </button>
                </div>

                <div className="report-setup__fields">
                    <label className="report-setup__field">
                      <span>Document title</span>
                      <input
                        type="text"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="e.g., Security Camera Inspection"
                      />
                    </label>
                    <label className="report-setup__field">
                      <span>Client / Recipient</span>
                      <input
                        type="text"
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                        placeholder="e.g., Building Management"
                      />
                    </label>
                    <label className="report-setup__field">
                      <span>Site name</span>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="e.g., Warehouse Complex A"
                      />
                    </label>
                    <label className="report-setup__field">
                      <span>Installer / Company</span>
                      <input
                        type="text"
                        value={installer}
                        onChange={(e) => setInstaller(e.target.value)}
                        placeholder="Panasonic"
                      />
                    </label>
                </div>
              </section>
            </>
          )}

          {drawerPhase === "processing" && (
            <>
              <div className="report-scan-intro">
                <p className="report-drawer__copy">
                  Generating{" "}
                  <span className="report-scan-intro__name">{reportName.trim() || "your report"}</span>{" "}
                  from the cover details you entered and each selected camera…
                </p>
                <p className="report-scan-intro__meta">
                  {[
                    formatLabel,
                    coverPage ? "Cover page" : null,
                    client.trim() || null,
                    siteName.trim() || null,
                    `${cameraCount} ${cameraCount === 1 ? "camera" : "cameras"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div
                className="report-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Report generation progress"
              >
                <div className="report-progress__fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="report-drawer__list" role="list">
                {drawerCameras.map((cam, i) => {
                  const done = (rowStatuses[i] ?? "scanning") === "done";
                  return (
                    <div
                      key={cam.id}
                      className={`report-drawer__row${done ? " is-done" : " is-scanning"}`}
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
                        ) : (
                          <img
                            src={loaderIcon}
                            alt=""
                            width={16}
                            height={16}
                            className="report-drawer__icon report-scan__spinner"
                          />
                        )}
                        <span className="report-drawer__row-name">
                          {cam.deviceId} - {cam.alias}
                        </span>
                      </div>
                      <span className="report-drawer__row-ip">{cam.ip}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {drawerPhase === "success" && (
            <>
              <div className="report-complete">
                <div className="report-complete__badge" aria-hidden="true">
                  <img src={completeCheckIcon} alt="" width={24} height={24} className="report-complete__check" />
                </div>
                <div className="report-complete__copy">
                  <p className="report-complete__title">Generation Complete</p>
                  <p className="report-complete__time">
                    {formatGeneratedAt(fileMeta?.generatedAt ? new Date(fileMeta.generatedAt) : new Date())}
                  </p>
                </div>
              </div>

              <div className="report-file">
                <div className="report-file__icon-wrap" aria-hidden="true">
                  <img src={fileDownloadIcon} alt="" width={20} height={20} className="report-file__icon" />
                </div>
                <div className="report-file__text">
                  <p className="report-file__name">{fileMeta?.filename ?? "Inspection_Report.xlsx"}</p>
                  <p className="report-file__meta">
                    {formatLabel} • {cameraCount} camera{cameraCount === 1 ? "" : "s"} •{" "}
                    {(cameraCount * 0.11).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="report-drawer__footer">
          {drawerPhase === "plan" && (
            <button
              type="button"
              className="report-drawer__next"
              onClick={handleConfirmNext}
              disabled={!canContinue}
            >
              Next
            </button>
          )}

          {drawerPhase === "setup" && (
            <button
              type="button"
              className="report-drawer__next"
              onClick={handleNext}
              disabled={!setupReady}
            >
              Next
            </button>
          )}

          {drawerPhase === "processing" && (
            <button
              type="button"
              className="report-drawer__next"
              onClick={() => setDrawerPhase("success")}
              disabled={!scanComplete}
            >
              Done
            </button>
          )}

          {drawerPhase === "success" && (
            <button type="button" className="report-drawer__download" onClick={handleDownload}>
              Download Report
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
