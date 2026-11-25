import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import CameraStreamPreview from "./CameraStreamPreview";
import { osdSettingsFromCamera } from "../data/osdDefaults";
import { resolveOsdPreviewSettings } from "../utils/osdPreviewState";
import "../styles/configure-cameras-review.css";

/** Live-merge drawer draft onto camera OSD so the review table mirrors what will apply */
function resolveLiveCameraView(camera, liveDraft) {
  const baseOsd = osdSettingsFromCamera(camera);
  const fallbackTitle = `${camera.deviceId} - ${camera.alias}`;
  const appliedTitle =
    baseOsd.cameraTitleOn === "On" && baseOsd.cameraTitleText?.trim()
      ? baseOsd.cameraTitleText.trim()
      : fallbackTitle;

  if (!liveDraft) {
    return {
      osd: baseOsd,
      displayTitle: appliedTitle,
      previewSettings: resolveOsdPreviewSettings(camera),
    };
  }

  const osd = { ...baseOsd };
  const overlayKeys = [
    "systemLanguage",
    "lineFrequency",
    "imageCaptureMode",
    "imageRotation",
    "dayNightMode",
    "superDynamic",
    "dateTimeDisplay",
    "dateTimePosition",
    "osdFontSize",
    "backgroundTransparency",
    "statusIndicatorLed",
    "ntpSync",
  ];

  overlayKeys.forEach((key) => {
    const value = liveDraft[key];
    if (value !== "" && value != null) {
      osd[key] = value;
    }
  });

  let displayTitle = fallbackTitle;
  if (liveDraft.cameraTitlesEnabled) {
    const custom = (liveDraft.cameraTitles?.[camera.id] ?? "").trim();
    displayTitle = custom || fallbackTitle;
    osd.cameraTitleOn = "On";
    osd.cameraTitleText = displayTitle;
  } else {
    const hadTitles = Object.values(liveDraft.cameraTitles || {}).some((t) =>
      String(t ?? "").trim()
    );
    if (hadTitles) {
      osd.cameraTitleOn = "Off";
      osd.cameraTitleText = "";
      displayTitle = fallbackTitle;
    }
  }

  return {
    osd,
    displayTitle,
    previewSettings: {
      ...osd,
      cameraTitleOn: osd.cameraTitleOn,
      cameraTitleText: osd.cameraTitleText,
    },
  };
}

function SortIcon() {
  return (
    <svg className="config-review-sort" viewBox="0 0 8 12" fill="currentColor" aria-hidden="true">
      <path d="M4 0l3 4H1L4 0z" opacity="0.55" />
      <path d="M4 12L1 8h6L4 12z" opacity="0.55" />
    </svg>
  );
}

function StatusIcon({ on }) {
  if (on) {
    return (
      <svg className="config-review-status-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.2 8.2l3.1 3.1 6.5-6.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className="config-review-status-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SuccessAppliedMark() {
  return (
    <span className="config-review-applied" aria-label="Applied">
      <span className="config-review-applied__skeleton" aria-hidden="true" />
      <svg className="config-review-applied__check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          className="config-review-applied__path"
          d="M3.2 8.2l3.1 3.1 6.5-6.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function NightIcon() {
  return (
    <svg className="config-review-night-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.2 9.4A5.2 5.2 0 0 1 6.6 2.8 5.6 5.6 0 1 0 13.2 9.4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" strokeLinejoin="round" />
      <path d="M13.5 5.5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function formatRotation(value) {
  if (!value) return "—";
  if (value === "0°") return "0° (Default)";
  return value;
}

function formatDateTimeLabel(osd) {
  if (!osd.dateTimeDisplay || osd.dateTimeDisplay === "Off") {
    return { on: false, format: "Off", position: null };
  }
  const format =
    osd.dateTimeDisplay === "24h"
      ? "24hs"
      : osd.dateTimeDisplay === "12h"
        ? "12hs"
        : osd.dateTimeDisplay;
  return { on: true, format, position: osd.dateTimePosition || "Upper Left" };
}

function formatTitleDisplay(osd) {
  if (osd.cameraTitleOn !== "On") {
    return { on: false, label: "Off" };
  }
  return { on: true, label: osd.dateTimePosition || "Upper Left" };
}

const EXTRA_SPEC_HEADERS = [
  "Mac Address",
  "Firmware",
  "Audio",
  "Privacy mask",
  "Slot 1",
  "Slot 2",
  "Slot 3",
];

function slotValue(camera, slot) {
  const seed = (camera.id?.charCodeAt(camera.id.length - 1) ?? 0) + slot;
  if (slot === 1) return seed % 2 === 0 ? "On" : "Off";
  if (slot === 2) return seed % 3 === 0 ? "Active" : "Idle";
  return `CH-${(seed % 4) + 1}`;
}

function SpecColumnHeaders({ leadingSticky = false }) {
  return (
    <>
      <th className={leadingSticky ? "config-review-table__preview config-review-table__sticky" : undefined}>
        Preview
      </th>
      <th className={leadingSticky ? "config-review-table__cam-col config-review-table__sticky" : undefined}>
        <span className="config-review-th">
          Camera title <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Model <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Ip Address <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Title display <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Date/Time <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Language <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Capture mode <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Mode <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th">
          Image rotation <SortIcon />
        </span>
      </th>
      <th>
        <span className="config-review-th config-review-th--stack">
          <span>Super Dynamic</span>
          <span className="config-review-th__sub">(WDR HDR)</span>
        </span>
      </th>
      {EXTRA_SPEC_HEADERS.map((label) => (
        <th key={label}>
          <span className="config-review-th">
            {label} <SortIcon />
          </span>
        </th>
      ))}
    </>
  );
}

/** Longest filter labels — reserve column width so live edits don't reflow the table. */
const COL_SIZER = {
  camTitle: "R101 - Development Room XX",
  titleDisplay: "Upper Right",
  dateTime: { format: "24hs", position: "Upper Right" },
  language: "Japanese",
  capture: "H.264",
  mode: "Night",
  rotation: "0° (Default)",
  superDynamic: "Off",
};

function StableCell({ sizer, children, className = "" }) {
  return (
    <span className={`config-review-stable${className}`}>
      <span className="config-review-stable__sizer" aria-hidden="true">
        {sizer}
      </span>
      <span className="config-review-stable__value">{children}</span>
    </span>
  );
}

function CameraSpecCells({ camera, muted = false, success = false, liveDraft = null, leadingSticky = false }) {
  const { osd, displayTitle, previewSettings } = resolveLiveCameraView(camera, liveDraft);
  const titleDisplay = formatTitleDisplay(osd);
  const dateTime = formatDateTimeLabel(osd);
  const tone = muted ? " is-muted" : "";
  const audioOn = (camera.id?.length ?? 0) % 2 === 0;
  const privacyOn = (camera.deviceId?.length ?? 0) % 2 === 1;
  const modeLabel =
    osd.dayNightMode === "Color"
      ? "Day"
      : osd.dayNightMode === "BW"
        ? "Night"
        : osd.dayNightMode || "—";

  return (
    <>
      <td className={leadingSticky ? "config-review-table__preview config-review-table__sticky" : undefined}>
        <div className={`config-review-table__thumb${success ? " is-success" : ""}`}>
          <CameraStreamPreview
            cameraId={camera.id}
            osdSettings={previewSettings}
            fallbackAlias={camera.alias}
            size="inline"
          />
        </div>
      </td>
      <td className={leadingSticky ? "config-review-table__cam-col config-review-table__sticky" : undefined}>
        <StableCell
          className={tone}
          sizer={
            <span className="config-review-table__cam-title">{COL_SIZER.camTitle}</span>
          }
        >
          <span className="config-review-table__cam-title">{displayTitle}</span>
        </StableCell>
      </td>
      <td className={tone || undefined}>{camera.model}</td>
      <td>
        <span className={`config-review-table__mono${tone}`}>{camera.ip}</span>
      </td>
      <td>
        <StableCell
          className={tone}
          sizer={
            <span className="config-review-status">
              <StatusIcon on />
              {COL_SIZER.titleDisplay}
            </span>
          }
        >
          <span className="config-review-status">
            <StatusIcon on={titleDisplay.on} />
            {titleDisplay.label}
          </span>
        </StableCell>
      </td>
      <td>
        <StableCell
          className={tone}
          sizer={
            <span className="config-review-status">
              <StatusIcon on />
              <span className="config-review-status__stack">
                <span>{COL_SIZER.dateTime.format}</span>
                <span>{COL_SIZER.dateTime.position}</span>
              </span>
            </span>
          }
        >
          <span className="config-review-status">
            <StatusIcon on={dateTime.on} />
            {dateTime.on ? (
              <span className="config-review-status__stack">
                <span>{dateTime.format}</span>
                <span>{dateTime.position}</span>
              </span>
            ) : (
              dateTime.format
            )}
          </span>
        </StableCell>
      </td>
      <td>
        <StableCell className={tone} sizer={COL_SIZER.language}>
          {osd.systemLanguage || "—"}
        </StableCell>
      </td>
      <td>
        <StableCell className={tone} sizer={COL_SIZER.capture}>
          {osd.imageCaptureMode || "—"}
        </StableCell>
      </td>
      <td>
        <StableCell
          className={tone}
          sizer={
            <span className="config-review-mode">
              <NightIcon />
              {COL_SIZER.mode}
            </span>
          }
        >
          <span className="config-review-mode">
            <NightIcon />
            {modeLabel}
          </span>
        </StableCell>
      </td>
      <td>
        <StableCell className={tone} sizer={COL_SIZER.rotation}>
          {formatRotation(osd.imageRotation)}
        </StableCell>
      </td>
      <td>
        <StableCell className={tone} sizer={COL_SIZER.superDynamic}>
          {osd.superDynamic || "—"}
        </StableCell>
      </td>
      <td>
        <span className={`config-review-table__mono${tone}`}>{camera.mac || "—"}</span>
      </td>
      <td className={tone || undefined}>{camera.firmware || "—"}</td>
      <td>
        <span className={`config-review-status${tone}`}>
          <StatusIcon on={audioOn} />
          {audioOn ? "On" : "Off"}
        </span>
      </td>
      <td>
        <span className={`config-review-status${tone}`}>
          <StatusIcon on={privacyOn} />
          {privacyOn ? "On" : "Off"}
        </span>
      </td>
      <td className={tone || undefined}>{slotValue(camera, 1)}</td>
      <td className={tone || undefined}>{slotValue(camera, 2)}</td>
      <td className={tone || undefined}>{slotValue(camera, 3)}</td>
    </>
  );
}

/** Informational batch groups — pencil marks rows being edited; no add/remove. */
function BatchGroupTable({ title, cameras, variant }) {
  const isBatch = variant === "batch";

  return (
    <div className="config-review-group">
      <div className="config-review-table-wrap">
        <table className="config-review-table config-review-table--batch-groups">
          <thead>
            <tr>
              <th className="config-review-table__action">
                <span className="config-review-group__title">{title}</span>
              </th>
              {Array.from({ length: 11 + EXTRA_SPEC_HEADERS.length }, (_, i) => (
                <th key={i} />
              ))}
            </tr>
          </thead>
          <tbody>
            {cameras.map((camera) => (
              <tr
                key={camera.id}
                className={isBatch ? "is-selected is-batch-row" : "is-out-row"}
              >
                <td className="config-review-table__action">
                  {isBatch ? (
                    <span className="config-review-edit-ico" aria-hidden="true" title="Editing">
                      <EditIcon />
                    </span>
                  ) : null}
                </td>
                <CameraSpecCells camera={camera} muted={!isBatch} />
              </tr>
            ))}
            {cameras.length === 0 && (
              <tr className="config-review-empty-row">
                <td colSpan={12 + EXTRA_SPEC_HEADERS.length}>
                  {isBatch ? "No cameras in this batch." : "No cameras outside the batch."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Informational one-by-one table — pencil on the camera currently being edited. */
function SequentialGroupTable({ title, cameras, currentId, doneIds }) {
  return (
    <div className="config-review-group">
      <div className="config-review-table-wrap">
        <table className="config-review-table config-review-table--batch-groups config-review-table--sequential">
          <thead>
            <tr>
              <th className="config-review-table__action">
                <span className="config-review-group__title">{title}</span>
              </th>
              {Array.from({ length: 11 + EXTRA_SPEC_HEADERS.length }, (_, i) => (
                <th key={i} />
              ))}
            </tr>
          </thead>
          <tbody>
            {cameras.map((camera) => {
              const isCurrent = camera.id === currentId;
              const isDone = doneIds.has(camera.id);
              return (
                <tr
                  key={camera.id}
                  className={
                    isCurrent
                      ? "is-selected is-batch-row is-current"
                      : isDone
                        ? "is-done"
                        : "is-out-row is-pending"
                  }
                >
                  <td className="config-review-table__action">
                    {isCurrent ? (
                      <span className="config-review-edit-ico" aria-hidden="true" title="Editing">
                        <EditIcon />
                      </span>
                    ) : null}
                  </td>
                  <CameraSpecCells
                    camera={camera}
                    muted={!isCurrent && !isDone}
                    success={isDone && !isCurrent}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ConfigureCamerasReview() {
  const {
    batchCameras,
    notInBatchCameras,
    poolCameras,
    navigateToNetwork,
    startBatchConfigure,
    startSequentialConfigure,
    configDrawerMode,
    closeConfigDrawer,
    recentlyConfiguredIds,
    sequentialIndex,
  } = useApp();

  const isBatchEditing = configDrawerMode === "batch";
  const isSequentialEditing = configDrawerMode === "sequential";
  const isDrawerEditing = isBatchEditing || isSequentialEditing;
  const isSuccessState = !isDrawerEditing && recentlyConfiguredIds.length > 0;
  const currentSequentialCam = isSequentialEditing
    ? batchCameras[sequentialIndex] ?? null
    : null;
  const recentlyConfiguredSet = useMemo(
    () => new Set(recentlyConfiguredIds),
    [recentlyConfiguredIds]
  );

  const [reviewSelectedIds, setReviewSelectedIds] = useState(
    () => new Set(batchCameras.map((c) => c.id))
  );

  useEffect(() => {
    if (isDrawerEditing) return;
    if (isSuccessState) {
      setReviewSelectedIds(new Set());
      return;
    }
    setReviewSelectedIds(new Set(poolCameras.map((c) => c.id)));
  }, [poolCameras, isDrawerEditing, isSuccessState]);

  const selectedCount = reviewSelectedIds.size;
  const reviewCameras = useMemo(() => {
    const base = poolCameras.length > 0 ? poolCameras : batchCameras;
    if (!isSuccessState) return base;
    const configured = [];
    const rest = [];
    base.forEach((cam) => {
      if (recentlyConfiguredSet.has(cam.id)) configured.push(cam);
      else rest.push(cam);
    });
    return [...configured, ...rest];
  }, [poolCameras, batchCameras, isSuccessState, recentlyConfiguredSet]);

  const allSelected = reviewCameras.length > 0 && selectedCount === reviewCameras.length;
  const someSelected = selectedCount > 0 && selectedCount < reviewCameras.length;
  const canBatch = selectedCount >= 2;
  const canOneByOne = selectedCount >= 1;

  const selectedIdsList = useMemo(() => Array.from(reviewSelectedIds), [reviewSelectedIds]);

  const toggleAll = useCallback(() => {
    setReviewSelectedIds((prev) => {
      if (prev.size === reviewCameras.length) return new Set();
      return new Set(reviewCameras.map((c) => c.id));
    });
  }, [reviewCameras]);

  const toggleRow = useCallback((id) => {
    setReviewSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllRef = useCallback(
    (node) => {
      if (node) node.indeterminate = someSelected;
    },
    [someSelected]
  );

  const selectionTableRef = useRef(null);

  useEffect(() => {
    const el = selectionTableRef.current;
    if (!el || isBatchEditing || isSequentialEditing) return undefined;

    let rafId = 0;
    const syncScrollState = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const { scrollLeft, clientWidth, scrollWidth } = el;
        el.classList.toggle("is-scrolled-x", scrollLeft > 0);
        const atEnd = scrollWidth <= clientWidth + 1 || scrollLeft + clientWidth >= scrollWidth - 1;
        el.classList.toggle("is-scrolled-end-x", atEnd);
        el.closest(".config-review__body")?.classList.toggle("is-scrolled-end-x", atEnd);
      });
    };

    syncScrollState();
    el.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
      el.classList.remove("is-scrolled-x", "is-scrolled-end-x");
      el.closest(".config-review__body")?.classList.remove("is-scrolled-end-x");
    };
  }, [isBatchEditing, isSequentialEditing, reviewCameras.length]);

  const runBatch = () => {
    if (!canBatch) return;
    startBatchConfigure(selectedIdsList);
  };

  const runOneByOne = () => {
    if (!canOneByOne) return;
    startSequentialConfigure(selectedIdsList);
  };

  return (
    <div
      className={`content-shell config-review${isBatchEditing ? " is-batch-editing" : ""}${
        isSequentialEditing ? " is-sequential-editing" : ""
      }${isSuccessState ? " is-success-state" : ""}`}
    >
      <header className="config-review__header">
        <button
          type="button"
          className="config-review__back"
          onClick={isDrawerEditing ? closeConfigDrawer : navigateToNetwork}
          aria-label={isDrawerEditing ? "Close configuration drawer" : "Back to network dashboard"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="config-review__title">Cameras current configuration</h1>
      </header>

      <div
        className={`config-review__body${
          isBatchEditing || isSequentialEditing ? " config-review__body--batch" : ""
        }`}
      >
        {isBatchEditing ? (
          <div className="config-review-batch-layout">
            <BatchGroupTable
              title="Configuring as batch"
              cameras={batchCameras}
              variant="batch"
            />
            <BatchGroupTable
              title="Not in the batch"
              cameras={notInBatchCameras}
              variant="out"
            />
          </div>
        ) : isSequentialEditing ? (
          <div className="config-review-batch-layout">
            <SequentialGroupTable
              title="Configuring one by one"
              cameras={batchCameras}
              currentId={currentSequentialCam?.id}
              doneIds={recentlyConfiguredSet}
            />
          </div>
        ) : (
          <div
            ref={selectionTableRef}
            className="config-review-table-wrap config-review-table-wrap--selection"
          >
            <table className="config-review-table config-review-table--selection">
              <thead>
                <tr>
                  <th className="config-review-table__check">
                    {isSuccessState ? (
                      <span className="config-review-applied config-review-applied--header" aria-hidden="true">
                        <svg className="config-review-applied__check" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3.2 8.2l3.1 3.1 6.5-6.6"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : (
                      <input
                        ref={selectAllRef}
                        className="check"
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all cameras"
                      />
                    )}
                  </th>
                  <SpecColumnHeaders leadingSticky />
                </tr>
              </thead>
              <tbody>
                {reviewCameras.map((camera, index) => {
                  const isSelected = reviewSelectedIds.has(camera.id);
                  const isSuccess = recentlyConfiguredSet.has(camera.id);
                  return (
                    <tr
                      key={camera.id}
                      className={`${isSelected ? "is-selected" : ""}${isSuccess ? " is-success" : ""}`.trim()}
                      style={
                        isSuccess
                          ? { "--success-stagger": `${Math.min(index, 12) * 55}ms` }
                          : undefined
                      }
                      onClick={(e) => {
                        if (isSuccessState) return;
                        if (e.target.closest('input.check[type="checkbox"]')) return;
                        toggleRow(camera.id);
                      }}
                    >
                      <td className="config-review-table__check">
                        {isSuccess ? (
                          <SuccessAppliedMark />
                        ) : (
                          <input
                            className="check"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(camera.id)}
                            aria-label={`Select ${camera.alias}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </td>
                      <CameraSpecCells camera={camera} success={isSuccess} leadingSticky />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reviewCameras.length === 0 && !isBatchEditing && !isSequentialEditing && (
          <p className="config-review__empty">No cameras selected. Go back and pick cameras from the table.</p>
        )}
      </div>

      {!isDrawerEditing && !isSuccessState && (
        <div className="config-review-dock" role="region" aria-label="Configuration actions">
          <p className="config-review-dock__hint">
            Select two or more cameras to configure as a batch.
          </p>
          <button
            type="button"
            className="config-review-dock__btn config-review-dock__btn--outline"
            onClick={runBatch}
            disabled={!canBatch}
          >
            Config as batch ({selectedCount})
          </button>
          <span className="config-review-dock__or">or</span>
          <button
            type="button"
            className="config-review-dock__btn config-review-dock__btn--primary"
            onClick={runOneByOne}
            disabled={!canOneByOne}
          >
            Config one by one
          </button>
        </div>
      )}
    </div>
  );
}
