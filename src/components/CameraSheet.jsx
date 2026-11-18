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

function groupMembers(groupId) {
  return CAMERAS.filter((camera) => camera.groupId === groupId);
}

function selectableMembers(groupId, eventTypeIds) {
  return groupMembers(groupId).filter((camera) => gapsFor(camera, eventTypeIds).length === 0);
}

const CAMERAS_BY_ID = new Map(CAMERAS.map((camera) => [camera.id, camera]));

function byId(id) {
  return CAMERAS_BY_ID.get(id);
}

export default function CameraSheet({ initialIds = [], eventTypeIds = [], onClose, onAssign, leaving = false }) {
  const titleId = useId();
  const pickedTitleId = useId();
  const [assigned, setAssigned] = useState(initialIds);
  const [query, setQuery] = useState("");
  const [pickedQuery, setPickedQuery] = useState("");
  const [trayOpen, setTrayOpen] = useState(false);
  const [serverId, setServerId] = useState("all");
  const [model, setModel] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState(null);
  const [revived, setRevived] = useState(() => new Set());
  const [report, setReport] = useState(null);
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  const panelRef = useRef(null);
  const trayRef = useRef(null);
  const [sheetLock, setSheetLock] = useState(0);
  const [trayLock, setTrayLock] = useState(0);
  const sheetLockRef = useRef(0);
  const trayLockRef = useRef(0);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (trayOpen) setTrayOpen(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, trayOpen]);

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return CAMERAS.filter((camera) => {
      if (text && !camera.name.toLowerCase().includes(text)) return false;
      if (serverId !== "all" && camera.groupId !== serverId) return false;
      if (groupId !== "all" && camera.groupId !== groupId) return false;
      if (model !== "all" && camera.model !== model) return false;
      if (scheduleFilter === "assigned" && !assigned.includes(camera.id)) return false;
      if (scheduleFilter === "off" && assigned.includes(camera.id)) return false;
      return true;
    });
  }, [assigned, groupId, model, query, scheduleFilter, serverId]);

  const assignedSet = useMemo(() => new Set(assigned), [assigned]);
  const withGaps = useMemo(
    () => shown.map((camera) => ({ camera, gaps: gapsFor(camera, eventTypeIds) })),
    [eventTypeIds, shown],
  );
  const availableShown = withGaps.filter((entry) => entry.gaps.length === 0);
  const blockedShown = withGaps.filter((entry) => entry.gaps.length > 0);
  const selectableIds = availableShown.map((entry) => entry.camera.id);
  const allShown = selectableIds.length > 0 && selectableIds.every((id) => assignedSet.has(id));
  const picked = assigned.map(byId).filter(Boolean);
  const pickedShown = picked.filter((camera) =>
    camera.name.toLowerCase().includes(pickedQuery.trim().toLowerCase()),
  );

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

  const toggleGroup = (id) => {
    const members = new Set(groupMembers(id).map((camera) => camera.id));
    const selectable = selectableMembers(id, eventTypeIds).map((camera) => camera.id);
    setAssigned((current) => {
      const all = selectable.length > 0 && selectable.every((item) => current.includes(item));
      if (all) return current.filter((item) => !members.has(item));
      const kept = current.filter((item) => !members.has(item));
      return [...kept, ...selectable];
    });
  };

  const fullGroups = CAMERA_GROUPS.filter((group) => {
    const selectable = selectableMembers(group.id, eventTypeIds);
    return selectable.length > 0 && selectable.every((camera) => assignedSet.has(camera.id));
  });

  const filtering =
    Boolean(query.trim()) || serverId !== "all" || model !== "all" || groupId !== "all" || scheduleFilter !== "all";

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

  const holdTray = (nextFiltering) => {
    if (nextFiltering) {
      if (!trayLockRef.current && trayRef.current) {
        trayLockRef.current = Math.round(trayRef.current.getBoundingClientRect().height);
        setTrayLock(trayLockRef.current);
      }
      return;
    }
    if (trayLockRef.current) {
      trayLockRef.current = 0;
      setTrayLock(0);
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
    if (gaps.length && !assignedSet.has(camera.id)) return;
    toggle(camera.id);
  };

  const renderCameraRow = (entry) => {
    const { camera, gaps } = entry;
    const on = assignedSet.has(camera.id);
    const blocked = gaps.length > 0;
    const unreachable = camera.offline && !revived.has(camera.id);
    const reason = [
      gaps.length ? gaps.map((gap) => `No ${gap.toLowerCase()}`).join(", ") : "",
      unreachable ? "Unreachable" : "",
    ]
      .filter(Boolean)
      .join(" · ");
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
        <Check on={on} />
        <span className="camera-sheet__row-name">{camera.name}</span>
        {reason ? (
          <span className="camera-sheet__row-reason" title={reason}>
            <img src="/assets/alarm-rules/exceptions/info.svg" alt="" />
            <span>{reason}</span>
          </span>
        ) : null}
      </button>
    );
  };

  const sheetClass = [
    "exception-sheet",
    trayOpen && !leaving ? "is-behind" : "",
    leaving ? "is-leaving" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
          <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>
        <div className="camera-sheet__body">
          <div className="camera-sheet__card">
            <div className="camera-sheet__intro">
              <p>List ({filtering ? shown.length : CAMERAS.length})</p>
              <button
                type="button"
                className="camera-sheet__tray"
                aria-expanded={trayOpen}
                onClick={() => setTrayOpen(true)}
              >
                <span key={assigned.length} className="camera-sheet__tray-count">
                  {assigned.length}
                </span>
                <span className="camera-sheet__tray-copy">Affected cameras</span>
              </button>
            </div>
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
                      Boolean(text.trim()) || serverId !== "all" || model !== "all" || groupId !== "all" || scheduleFilter !== "all",
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
                      { id: "assigned", label: "On this rule" },
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
                                    next.schedule !== "all",
                                );
                                filter.set(option.id);
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
                  <span className="camera-sheet__all-count">{selectableIds.length}</span>
                  <span>
                    {groupId !== "all"
                      ? `Select all in ${GROUPS.find((group) => group.id === groupId)?.name ?? "this group"}`
                      : serverId !== "all"
                        ? `Select all in ${SERVERS.find((group) => group.id === serverId)?.name ?? "this server"}`
                        : "Select all available"}
                  </span>
                </button>
                {availableShown.map((entry) => renderCameraRow(entry))}
                {blockedShown.length ? (
                  <button
                    type="button"
                    className={unavailableOpen ? "camera-sheet__fold is-open" : "camera-sheet__fold"}
                    aria-expanded={unavailableOpen}
                    onClick={() => setUnavailableOpen((open) => !open)}
                  >
                    <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
                    Unavailable ({blockedShown.length})
                  </button>
                ) : null}
                {unavailableOpen ? blockedShown.map((entry) => renderCameraRow(entry)) : null}
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
      {trayOpen ? (
        <div className="camera-picked" role="presentation">
          <button type="button" className="camera-picked__backdrop" aria-label="Close" onClick={() => setTrayOpen(false)} />
          <section
            ref={trayRef}
            className="camera-picked__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={pickedTitleId}
            style={trayLock ? { height: trayLock } : undefined}
          >
            <header className="camera-sheet__header">
              <button type="button" className="event-sheet__close" aria-label="Back" onClick={() => setTrayOpen(false)}>
                <img src="/assets/alarm-rules/exceptions/back.svg" alt="" />
              </button>
              <h2 id={pickedTitleId}>Assigned cameras ({assigned.length})</h2>
              <button type="button" className="event-sheet__close" aria-label="Close" onClick={() => setTrayOpen(false)}>
                <img src="/assets/alarm-rules/events/close.svg" alt="" />
              </button>
            </header>
            <div className="camera-picked__body">
              <label className="camera-picked__search">
                <img src="/assets/alarm-rules/cameras/search.svg" alt="" />
                <input
                  value={pickedQuery}
                  placeholder="Search assigned cameras"
                  aria-label="Search assigned cameras"
                  onChange={(event) => {
                    const text = event.target.value;
                    holdTray(Boolean(text.trim()));
                    setPickedQuery(text);
                  }}
                />
              </label>
              {pickedShown.length || fullGroups.length ? (
                <div className="camera-picked__list">
                  {fullGroups
                    .filter((group) => group.name.toLowerCase().includes(pickedQuery.trim().toLowerCase()) || !pickedQuery.trim())
                    .map((group) => {
                      const count = selectableMembers(group.id, eventTypeIds).length;
                      return (
                        <div className="camera-picked__row" key={group.id}>
                          <Check on />
                          <span className="camera-picked__name">
                            {group.name}
                            <em>
                              {group.kind} · {count} camera{count === 1 ? "" : "s"}
                            </em>
                          </span>
                          <button type="button" aria-label={`Remove ${group.name}`} onClick={() => toggleGroup(group.id)}>
                            <img src="/assets/alarm-rules/events/close.svg" alt="" />
                          </button>
                        </div>
                      );
                    })}
                  {pickedShown
                    .filter((camera) => !fullGroups.some((group) => group.id === camera.groupId && gapsFor(camera, eventTypeIds).length === 0))
                    .map((camera) => {
                    const gaps = gapsFor(camera, eventTypeIds);
                    return (
                    <div className={gaps.length ? "camera-picked__row is-blocked" : "camera-picked__row"} key={camera.id}>
                      <Check on />
                      <span className="camera-picked__name">
                        {camera.name}
                        {gaps.length ? (
                          <em>
                            <img src="/assets/alarm-rules/exceptions/info.svg" alt="" />
                            {gaps.map((gap) => `No ${gap.toLowerCase()}`).join(", ")}
                          </em>
                        ) : null}
                      </span>
                      <button type="button" aria-label={`Remove ${camera.name}`} onClick={() => toggle(camera.id)}>
                        <img src="/assets/alarm-rules/events/close.svg" alt="" />
                      </button>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="camera-picked__empty">
                  {picked.length ? "No assigned cameras match this search." : "No cameras assigned yet."}
                </p>
              )}
            </div>
          </section>
        </div>
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
