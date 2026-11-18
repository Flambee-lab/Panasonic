import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CAMERA_GROUPS, CAMERAS } from "../data/alarm-cameras";
import RuleGuard from "./RuleGuard";

const MODELS = [...new Set(CAMERAS.map((camera) => camera.model))];
const SERVERS = CAMERA_GROUPS.filter((group) => group.kind === "Server");
const GROUPS = CAMERA_GROUPS.filter((group) => group.kind === "Camera group");
const EVENT_LABELS = {
  people: "People",
  vehicles: "Vehicles",
  sound: "Sound",
  vmd: "AI-VMD",
  extension: "Extension",
  scene: "Scene change",
  lpr: "LPR",
  ocr: "OCR",
  container: "Container",
  vca: "VCA",
};

function gapsFor(camera, eventTypeIds) {
  return (camera.unsupported ?? []).filter((id) => eventTypeIds.includes(id)).map((id) => EVENT_LABELS[id] ?? id);
}

const CAMERAS_BY_ID = new Map(CAMERAS.map((camera) => [camera.id, camera]));

function byId(id) {
  return CAMERAS_BY_ID.get(id);
}

export default function CameraSheet({ initialIds = [], eventTypeIds = [], onClose, onAssign, leaving = false }) {
  useReviewScope("CameraSheet");
  const titleId = useId();
  const [assigned, setAssigned] = useReviewState("CameraSheet:assigned", initialIds);
  const [query, setQuery] = useReviewState("CameraSheet:query", "");
  const [view, setView] = useReviewState("CameraSheet:view", "all");
  const [serverId, setServerId] = useReviewState("CameraSheet:serverId", "all");
  const [model, setModel] = useReviewState("CameraSheet:model", "all");
  const [groupId, setGroupId] = useReviewState("CameraSheet:groupId", "all");
  const [scheduleFilter, setScheduleFilter] = useReviewState("CameraSheet:scheduleFilter", "all");
  const [openFilter, setOpenFilter] = useState(null);
  const [revived, setRevived] = useReviewState("CameraSheet:revived", () => new Set());
  const [report, setReport] = useState(null);
  const [unavailableOpen, setUnavailableOpen] = useReviewState("CameraSheet:unavailableOpen", false);
  const panelRef = useRef(null);
  const [sheetLock, setSheetLock] = useState(0);
  const sheetLockRef = useRef(0);
  const previousCount = useRef(initialIds.length);
  const [landed, setLanded] = useState(0);

  useEffect(() => {
    if (assigned.length > previousCount.current) setLanded((tick) => tick + 1);
    previousCount.current = assigned.length;
  }, [assigned.length]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (serverId !== "all") setUnavailableOpen(true);
  }, [serverId]);

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return CAMERAS.filter((camera) => {
      if (text && !camera.name.toLowerCase().includes(text)) return false;
      if (serverId !== "all" && camera.groupId !== serverId) return false;
      if (groupId !== "all" && camera.groupId !== groupId) return false;
      if (model !== "all" && camera.model !== model) return false;
      if (view === "selected" && !assigned.includes(camera.id)) return false;
      if (scheduleFilter === "assigned" && !assigned.includes(camera.id)) return false;
      if (scheduleFilter === "off" && assigned.includes(camera.id)) return false;
      return true;
    });
  }, [assigned, groupId, model, query, scheduleFilter, serverId, view]);

  const assignedSet = useMemo(() => new Set(assigned), [assigned]);
  const withGaps = useMemo(() => {
    const entries = shown.map((camera) => ({ camera, gaps: gapsFor(camera, eventTypeIds) }));
    if (serverId === "all") return entries;
    let kept = 0;
    return entries.map((entry) => {
      if (entry.gaps.length) return entry;
      if (kept < 6) {
        kept += 1;
        return entry;
      }
      return { ...entry, gaps: ["demo"] };
    });
  }, [eventTypeIds, serverId, shown]);
  const availableShown = withGaps.filter(
    (entry) => entry.gaps.length === 0 && !(entry.camera.offline && !revived.has(entry.camera.id)),
  );
  const blockedShown = withGaps.filter(
    (entry) => entry.gaps.length > 0 || (entry.camera.offline && !revived.has(entry.camera.id)),
  );
  const selectableIds = availableShown.map((entry) => entry.camera.id);
  const allShown = selectableIds.length > 0 && selectableIds.every((id) => assignedSet.has(id));

  const toggle = (id) => {
    setAssigned((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleShown = () => {
    setAssigned((current) => {
      const selectable = new Set(selectableIds);
      if (allShown) return current.filter((id) => !selectable.has(id));
      const currentSet = new Set(current);
      return [...current, ...selectableIds.filter((id) => !currentSet.has(id))];
    });
  };

  const holdSheet = (nextFiltering) => {
    if (nextFiltering) {
      if (!sheetLockRef.current && panelRef.current) {
        sheetLockRef.current = Math.round(panelRef.current.getBoundingClientRect().height);
        setSheetLock(sheetLockRef.current);
      }
      return;
    }
    if (sheetLockRef.current) {
      sheetLockRef.current = 0;
      setSheetLock(0);
    }
  };

  const requestApply = () => {
    const failed = assigned.map(byId).filter((camera) => camera?.offline && !revived.has(camera.id));
    const kept = assigned.filter((id) => {
      const camera = byId(id);
      return camera && !(camera.offline && !revived.has(camera.id));
    });
    const blockedKept = kept.filter((id) => gapsFor(byId(id), eventTypeIds).length > 0);
    if (failed.length || blockedKept.length) {
      setReport({ kept, failed, blockedKept });
      return;
    }
    onAssign(kept);
  };

  const pressRow = (camera, gaps) => {
    const unreachable = camera.offline && !revived.has(camera.id);
    if ((gaps.length || unreachable) && !assignedSet.has(camera.id)) return;
    toggle(camera.id);
  };

  const renderCameraRow = (entry) => {
    const { camera, gaps } = entry;
    const on = assignedSet.has(camera.id);
    const blocked = gaps.length > 0;
    const unreachable = camera.offline && !revived.has(camera.id);
    const quiet = blocked || unreachable;
    return (
      <button
        type="button"
        key={camera.id}
        className={["camera-sheet__row", on ? "is-on" : "", blocked ? "is-blocked" : "", unreachable ? "is-offline" : ""]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={on}
        aria-disabled={blocked && !on ? true : undefined}
        onClick={() => pressRow(camera, gaps)}
      >
        {quiet ? null : <Check on={on} />}
        <span className="camera-sheet__row-copy">
          <span className="camera-sheet__row-name">{camera.name}</span>
          {quiet ? <span className="camera-sheet__row-note">Not available</span> : null}
        </span>
      </button>
    );
  };

  const sheetClass = ["exception-sheet", leaving ? "is-leaving" : ""].filter(Boolean).join(" ");

  return (
    <div className={sheetClass} role="presentation">
      <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <section
        ref={panelRef}
        className="exception-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={sheetLock ? { height: sheetLock } : undefined}
      >
        <header className="camera-sheet__header">
          <h2 id={titleId}>Affected cameras</h2>
          <div className="camera-sheet__tools">
            <button
              type="button"
              className={view === "selected" ? "camera-sheet__chip is-on" : "camera-sheet__chip"}
              aria-pressed={view === "selected"}
              aria-label={view === "selected" ? "Showing cameras selected" : "Show cameras selected"}
              onClick={() => {
                const nextView = view === "selected" ? "all" : "selected";
                if (nextView === "selected" && scheduleFilter === "off") setScheduleFilter("all");
                holdSheet(
                  Boolean(query.trim()) ||
                    serverId !== "all" ||
                    model !== "all" ||
                    groupId !== "all" ||
                    (nextView === "selected" ? false : scheduleFilter !== "all") ||
                    nextView === "selected",
                );
                setView(nextView);
              }}
            >
              <img
                src={view === "selected" ? "/assets/alarm-rules/cameras/eye.svg" : "/assets/alarm-rules/cameras/eye-off.svg"}
                alt=""
              />
              <em>{assigned.length === 1 ? "Camera selected" : "Cameras selected"}</em>
              <span key={landed} className={landed ? "is-landed" : undefined}>{assigned.length}</span>
              {landed ? <i key={`land-${landed}`} /> : null}
            </button>
            <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
              <img src="/assets/alarm-rules/events/close.svg" alt="" />
            </button>
          </div>
        </header>
        <div className="camera-sheet__body">
          <div className="camera-sheet__card">
            <div className="camera-sheet__search">
              <label>
                <img src="/assets/alarm-rules/cameras/search.svg" alt="" />
                <img src="/assets/alarm-rules/cameras/divider.svg" alt="" />
                <input
                  value={query}
                  placeholder="Search for a server or select below"
                  aria-label="Search for a server or select below"
                  onChange={(event) => {
                    const text = event.target.value;
                    holdSheet(
                      Boolean(text.trim()) ||
                        serverId !== "all" ||
                        model !== "all" ||
                        groupId !== "all" ||
                        scheduleFilter !== "all" ||
                        view === "selected",
                    );
                    setQuery(text);
                  }}
                />
              </label>
              <div className="camera-sheet__filters">
                {[
                  {
                    id: "server",
                    value: serverId,
                    set: setServerId,
                    options: [{ id: "all", label: "All servers" }, ...SERVERS.map((group) => ({ id: group.id, label: group.name }))],
                  },
                  {
                    id: "model",
                    value: model,
                    set: setModel,
                    options: [{ id: "all", label: "All models" }, ...MODELS.map((name) => ({ id: name, label: name }))],
                  },
                  {
                    id: "group",
                    value: groupId,
                    set: setGroupId,
                    options: [{ id: "all", label: "All groups" }, ...GROUPS.map((group) => ({ id: group.id, label: group.name }))],
                  },
                  {
                    id: "schedule",
                    value: scheduleFilter,
                    set: setScheduleFilter,
                    options: [
                      { id: "all", label: "Any schedule" },
                      { id: "off", label: "Not on this rule" },
                    ],
                  },
                ].map((filter) => {
                  const current = filter.options.find((option) => option.id === filter.value) ?? filter.options[0];
                  return (
                    <div className="camera-sheet__filter" key={filter.id}>
                      <button
                        type="button"
                        className={filter.value !== "all" ? "is-on" : undefined}
                        aria-expanded={openFilter === filter.id}
                        onClick={() => setOpenFilter((open) => (open === filter.id ? null : filter.id))}
                      >
                        <span>{current.label}</span>
                        <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
                      </button>
                      {openFilter === filter.id ? (
                        <div className="camera-sheet__filter-menu" role="listbox">
                          {filter.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              role="option"
                              aria-selected={option.id === filter.value}
                              onClick={() => {
                                const nextView = filter.id === "schedule" && option.id === "off" ? "all" : view;
                                const next = {
                                  server: serverId,
                                  model,
                                  group: groupId,
                                  schedule: scheduleFilter,
                                  [filter.id]: option.id,
                                };
                                holdSheet(
                                  Boolean(query.trim()) ||
                                    next.server !== "all" ||
                                    next.model !== "all" ||
                                    next.group !== "all" ||
                                    next.schedule !== "all" ||
                                    nextView === "selected",
                                );
                                filter.set(option.id);
                                if (nextView === "all" && view === "selected") setView("all");
                                setOpenFilter(null);
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="camera-sheet__scroll">
              <div className="camera-sheet__grid">
                <button
                  type="button"
                  className="camera-sheet__all"
                  aria-pressed={allShown}
                  disabled={selectableIds.length === 0}
                  onClick={toggleShown}
                >
                  <Check on={allShown} />
                  <span>Select all</span>
                  <span className="camera-sheet__all-count">{selectableIds.length}</span>
                </button>
                {view === "selected" && shown.length === 0 ? (
                  <p className="camera-sheet__empty">
                    {assigned.length
                      ? "No selected cameras match these filters."
                      : "No cameras selected yet."}
                  </p>
                ) : null}
                {availableShown.map((entry) => renderCameraRow(entry))}
                <button
                  type="button"
                  className={unavailableOpen ? "camera-sheet__fold is-open" : "camera-sheet__fold"}
                  aria-expanded={unavailableOpen}
                  disabled={blockedShown.length === 0}
                  onClick={() => setUnavailableOpen((open) => !open)}
                >
                  <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
                  Unavailable ({blockedShown.length})
                </button>
                {unavailableOpen && blockedShown.length ? blockedShown.map((entry) => renderCameraRow(entry)) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="event-sheet__actions camera-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="event-sheet__save" disabled={assigned.length === 0} onClick={requestApply}>
            Apply
          </button>
        </div>
      </section>
      {report ? (
        <RuleGuard
          title={
            report.failed.length
              ? `${report.failed.length} camera${report.failed.length === 1 ? "" : "s"} couldn't be reached`
              : "Some cameras can't run these events"
          }
          confirmLabel={report.failed.length ? "Apply the rest" : "Keep them"}
          onCancel={() => setReport(null)}
          onConfirm={() => onAssign(report.kept)}
        >
          <p>
            {report.failed.length
              ? `${report.kept.length} can be assigned. ${report.failed.length} did not answer, so they stay off this rule unless you retry them.`
              : `${report.blockedKept.length} selected cameras can't run the events on this rule. They stay on the rule only if you keep them.`}
          </p>
          {report.failed.slice(0, 3).map((camera) => (
            <p key={camera.id}>{camera.name}</p>
          ))}
          {report.failed.length ? (
            <button
              type="button"
              className="rule-guard__retry"
              onClick={() => {
                const next = new Set(revived);
                report.failed.forEach((camera) => next.add(camera.id));
                setRevived(next);
                onAssign([...report.kept, ...report.failed.map((camera) => camera.id)]);
              }}
            >
              Retry unreachable
            </button>
          ) : (
            <button
              type="button"
              className="rule-guard__retry"
              onClick={() => onAssign(report.kept.filter((id) => !report.blockedKept.includes(id)))}
            >
              Remove them
            </button>
          )}
        </RuleGuard>
      ) : null}
    </div>
  );
}

function Check({ on, mixed = false }) {
  return (
    <span className={["camera-sheet__check", on ? "is-on" : "", mixed ? "is-mixed" : ""].filter(Boolean).join(" ")}>
      {on ? <img src="/assets/alarm-rules/cameras/check.svg" alt="" /> : mixed ? <i /> : null}
    </span>
  );
}
