import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CAMERA_GROUPS, CAMERAS } from "../data/alarm-cameras";
import { sortCameraEntries } from "../utils/cameraNameSort";
import "../styles/b3-camera-filters.css";
import RuleGuard from "./RuleGuard";

const MODELS = [...new Set(CAMERAS.map((camera) => camera.model))];
const SERVERS = CAMERA_GROUPS.filter((group) => group.kind === "Server");
const GROUPS = CAMERA_GROUPS.filter((group) => group.kind === "Camera group");
const FILTER_CATEGORIES = [
  { id: "time", label: "Time & Camera" },
  { id: "objects", label: "Objects" },
  { id: "events", label: "Events" },
];
const EVENT_LABELS = {
  people: "Registered people detection",
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

function selectedValues(value) {
  return Array.isArray(value) ? value : value && value !== "all" ? [value] : [];
}

function byId(id) {
  return CAMERAS_BY_ID.get(id);
}

export default function CameraSheet({ initialIds = [], eventTypeIds = [], onClose, onAssign, leaving = false, variant = "1" }) {
  useReviewScope("CameraSheet");
  const compact = String(variant) === "2";
  const sidebar = String(variant) === "3";
  const [expandedSections, setExpandedSections] = useState(["time"]);
  const titleId = useId();
  const categoryTitleId = useId();
  const categoryPopoverId = useId();
  const [assigned, setAssigned] = useReviewState("CameraSheet:assigned", initialIds);
  const [query, setQuery] = useReviewState("CameraSheet:query", "");
  const [view, setView] = useReviewState("CameraSheet:view", "all");
  const [panelHeight, setPanelHeight] = useReviewState("CameraSheet:fixedHeight", null);
  const panelRef = useRef(null);
  const [serverSelection, setServerIds] = useReviewState("CameraSheet:serverId", []);
  const [modelSelection, setModels] = useReviewState("CameraSheet:model", []);
  const [groupSelection, setGroupIds] = useReviewState("CameraSheet:groupId", []);
  const [scheduleSelection, setScheduleFilters] = useReviewState("CameraSheet:scheduleFilter", []);
  const serverIds = useMemo(() => selectedValues(serverSelection), [serverSelection]);
  const models = useMemo(() => selectedValues(modelSelection), [modelSelection]);
  const groupIds = useMemo(() => selectedValues(groupSelection), [groupSelection]);
  const scheduleFilters = useMemo(() => selectedValues(scheduleSelection), [scheduleSelection]);
  const [openFilter, setOpenFilter] = useState(null);
  const [sortDirection, setSortDirection] = useReviewState("CameraSheet:sortDirection", "asc");
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryPosition, setCategoryPosition] = useState({ left: 0, top: 38, width: 300 });
  const categoriesRef = useRef(null);
  const categoryButtons = useRef(new Map());
  const suppressBackdropClick = useRef(false);
  const [revived, setRevived] = useReviewState("CameraSheet:revived", () => new Set());
  const [report, setReport] = useState(null);
  const [unavailableOpen, setUnavailableOpen] = useReviewState("CameraSheet:unavailableOpen", false);
  const previousCount = useRef(initialIds.length);
  const [landed, setLanded] = useState(0);
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const removalTimers = useRef(new Map());
  const previousPositions = useRef(new Map());
  const reflowAnimations = useRef([]);
  const assignedRef = useRef(assigned);

  useLayoutEffect(() => { assignedRef.current = assigned; }, [assigned]);

  useEffect(() => () => {
    removalTimers.current.forEach(timer => window.clearTimeout(timer));
    reflowAnimations.current.forEach(animation => animation.cancel());
  }, []);

  useEffect(() => {
    if (view === "selected" || !removalTimers.current.size) return;
    removalTimers.current.forEach(timer => window.clearTimeout(timer));
    removalTimers.current.clear();
    setRemovingIds(new Set());
  }, [view]);

  useLayoutEffect(() => {
    const previous = previousPositions.current;
    previousPositions.current = new Map();
    if (!previous.size || view !== "selected" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    reflowAnimations.current.forEach(animation => animation.cancel());
    reflowAnimations.current = [];
    panelRef.current?.querySelectorAll("[data-camera-id]:not(.is-removing)").forEach(row => {
      const old = previous.get(row.dataset.cameraId);
      if (!old) return;
      const current = row.getBoundingClientRect();
      const dx = old.left - current.left;
      const dy = old.top - current.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      reflowAnimations.current.push(row.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ], { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
    });
  }, [removingIds, view]);


  useLayoutEffect(() => {
    if (!panelHeight && panelRef.current) setPanelHeight(panelRef.current.offsetHeight);
  }, [panelHeight]);

  useEffect(() => {
    const dismiss = (event) => {
      if (!event.target.closest(".camera-sheet__filter")) setOpenFilter(null);
      if (activeCategory && !categoriesRef.current?.contains(event.target)) {
        if (event.target.closest(".exception-sheet__backdrop")) suppressBackdropClick.current = true;
        setActiveCategory(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [activeCategory]);

  useEffect(() => {
    if (!activeCategory) return;
    const close = () => setActiveCategory(null);
    const body = panelRef.current?.querySelector(".camera-sheet__body");
    body?.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      body?.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [activeCategory]);

  useEffect(() => {
    if (assigned.length > previousCount.current) setLanded((tick) => tick + 1);
    previousCount.current = assigned.length;
  }, [assigned.length]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (openFilter && compact) {
          event.preventDefault();
          setOpenFilter(null);
        } else if (activeCategory) {
          event.preventDefault();
          setActiveCategory(null);
          categoryButtons.current.get(activeCategory)?.focus();
        } else if (openFilter) setOpenFilter(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeCategory, compact, onClose, openFilter]);

  useEffect(() => {
    if (serverIds.length) setUnavailableOpen(true);
  }, [serverIds]);

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    // Keep the North Campus demo sample stable while searching or filtering it.
    let selectableCount = 0;
    let unavailableCount = 0;
    const northIds = new Set(CAMERAS.filter((camera) => {
      if (camera.groupId !== "north") return false;
      const unavailable = gapsFor(camera, eventTypeIds).length > 0 || (camera.offline && !revived.has(camera.id));
      if (unavailable) return unavailableCount++ < 8;
      return selectableCount++ < 20;
    }).map((camera) => camera.id));
    const pool = serverIds.includes("north")
      ? CAMERAS.filter((camera) => camera.groupId !== "north" || northIds.has(camera.id))
      : CAMERAS;
    return pool.filter((camera) => {
      if (text && !camera.name.toLowerCase().includes(text)) return false;
      if (serverIds.length && !serverIds.includes(camera.groupId)) return false;
      if (groupIds.length && !groupIds.includes(camera.groupId)) return false;
      if (models.length && !models.includes(camera.model)) return false;
      const retained = view === "selected" && removingIds.has(camera.id);
      if (view === "selected" && !assigned.includes(camera.id) && !retained) return false;
      const assignment = assigned.includes(camera.id) || retained ? "assigned" : "off";
      if (scheduleFilters.length && !scheduleFilters.includes(assignment)) return false;
      return true;
    });
  }, [assigned, eventTypeIds, groupIds, models, query, removingIds, revived, scheduleFilters, serverIds, view]);

  const assignedSet = useMemo(() => new Set(assigned), [assigned]);
  const withGaps = useMemo(
    () => shown.map((camera) => ({ camera, gaps: gapsFor(camera, eventTypeIds) })),
    [eventTypeIds, shown],
  );
  const availableShown = sortCameraEntries(withGaps.filter(
    (entry) => entry.gaps.length === 0 && !(entry.camera.offline && !revived.has(entry.camera.id)),
  ), sortDirection);
  const blockedShown = sortCameraEntries(withGaps.filter(
    (entry) => entry.gaps.length > 0 || (entry.camera.offline && !revived.has(entry.camera.id)),
  ), sortDirection);
  const selectableIds = availableShown.filter(entry => view !== "selected" || !removingIds.has(entry.camera.id)).map(entry => entry.camera.id);
  const allShown = selectableIds.length > 0 && selectableIds.every((id) => assignedSet.has(id));

  const toggle = (id) => {
    if (removingIds.has(id)) return;
    const removing = view === "selected" && assignedSet.has(id);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (removing && !reducedMotion) {
      setRemovingIds(current => new Set([...current, id]));
      const timer = window.setTimeout(() => {
        removalTimers.current.delete(id);
        const viewport = panelRef.current?.querySelector(".camera-sheet__body")?.getBoundingClientRect();
        const positions = new Map();
        panelRef.current?.querySelectorAll("[data-camera-id]").forEach(row => {
          const rect = row.getBoundingClientRect();
          if (viewport && rect.bottom >= viewport.top && rect.top <= viewport.bottom) positions.set(row.dataset.cameraId, rect);
        });
        previousPositions.current = positions;
        setRemovingIds(current => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        if (!assignedRef.current.length) setView("all");
      }, 680);
      removalTimers.current.set(id, timer);
    } else if (removing && assigned.length === 1) {
      setView("all");
    }
    setAssigned(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const toggleShown = () => {
    if (allShown && view === "selected") setView("all");
    setAssigned((current) => {
      const selectable = new Set(selectableIds);
      if (allShown) return current.filter((id) => !selectable.has(id));
      const currentSet = new Set(current);
      return [...current, ...selectableIds.filter((id) => !currentSet.has(id))];
    });
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
    const removing = view === "selected" && removingIds.has(camera.id);
    const blocked = gaps.length > 0;
    const unreachable = camera.offline && !revived.has(camera.id);
    const quiet = blocked || unreachable;
    const reason = blocked
      ? `Does not support: ${gaps.join(", ")}.`
      : unreachable ? "Camera offline. Cannot connect." : null;
    return (
      <button
        type="button"
        key={camera.id}
        className={["camera-sheet__row", on ? "is-on" : "", blocked ? "is-blocked" : "", unreachable ? "is-offline" : "", removing ? "is-removing" : ""]
          .filter(Boolean)
          .join(" ")}
        data-camera-id={camera.id}
        aria-pressed={on}
        aria-disabled={removing || (quiet && !on) ? true : undefined}
        onClick={() => pressRow(camera, gaps)}
      >
        {quiet ? <span className="camera-sheet__check is-placeholder" aria-hidden="true" /> : <Check on={on} />}
        <span className="camera-sheet__row-copy">
          <span className="camera-sheet__row-name">{camera.name}</span>
          {removing ? <span className="camera-sheet__removed-label" role="status">Camera removed</span> : reason ? <span className="camera-sheet__row-note" title={reason}>{reason}</span> : null}
        </span>
      </button>
    );
  };

  const openCategory = (category, button) => {
    setOpenFilter(null);
    if (activeCategory === category.id) {
      setActiveCategory(null);
      return;
    }
    const row = categoriesRef.current.getBoundingClientRect();
    const anchor = button.getBoundingClientRect();
    const body = panelRef.current.querySelector(".camera-sheet__body").getBoundingClientRect();
    const width = Math.min(compact && category.id === "time" ? 360 : 300, row.width);
    const below = body.bottom - anchor.bottom - 72;
    const above = anchor.top - body.top;
    const neededHeight = compact && category.id === "time" ? 310 : 112;
    const placeAbove = below < neededHeight && above > below && above >= neededHeight;
    setCategoryPosition({
      width,
      left: Math.max(0, Math.min(anchor.left - row.left, row.width - width)),
      ...(placeAbove
        ? { bottom: row.bottom - anchor.top + 6 }
        : { top: anchor.bottom - row.top + 6 }),
    });
    setActiveCategory(category.id);
  };

  const cameraFilterCount = serverIds.length + models.length + groupIds.length + scheduleFilters.length;
  const renderCameraFilters = () => (
                <div className={`camera-sheet__filters${compact || sidebar ? " b3-camera-field-filters" : ""}`}>
                  {[
                    {
                      id: "server", label: "Servers", allLabel: "All servers", values: serverIds, set: setServerIds,
                      options: SERVERS.map((group) => ({ id: group.id, label: group.name })),
                    },
                    {
                      id: "model", label: "Models", allLabel: "All models", values: models, set: setModels,
                      options: MODELS.map((name) => ({ id: name, label: name })),
                    },
                    {
                      id: "group", label: "Groups", allLabel: "All groups", values: groupIds, set: setGroupIds,
                      options: GROUPS.map((group) => ({ id: group.id, label: group.name })),
                    },
                    {
                      id: "schedule", label: "Schedules", allLabel: "Any schedule", values: scheduleFilters, set: setScheduleFilters,
                      options: [
                        { id: "assigned", label: "On this rule" },
                        { id: "off", label: "Not on this rule" },
                      ],
                    },
                  ].map((filter) => {
                    const label = filter.values.length ? filter.label : filter.allLabel;
                    const options = [{ id: "all", label: filter.allLabel }, ...filter.options];
                    const control = (
                      <div className="camera-sheet__filter">
                        <button
                          type="button"
                          className={filter.values.length ? "is-on" : undefined}
                          aria-expanded={openFilter === filter.id}
                          aria-haspopup="listbox"
                          data-filter-trigger={filter.id}
                          aria-label={filter.values.length ? `${filter.label}: ${filter.values.length} selected` : filter.allLabel}
                          onClick={() => {
                            if (!compact) setActiveCategory(null);
                            setOpenFilter((open) => (open === filter.id ? null : filter.id));
                          }}
                        >
                          <span>{label}</span>
                          {filter.values.length ? <span className="camera-sheet__filter-count">{filter.values.length}</span> : null}
                          <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
                        </button>
                        {openFilter === filter.id ? (
                          <div className="camera-sheet__filter-menu" role="listbox" aria-label={filter.label} aria-multiselectable="true">
                            {options.map((option) => {
                              const selected = option.id === "all" ? filter.values.length === 0 : filter.values.includes(option.id);
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    const next = option.id === "all" ? [] : selected
                                      ? filter.values.filter((value) => value !== option.id)
                                      : [...filter.values, option.id];
                                    filter.set(next);
                                    if (filter.id === "schedule" && next.length === 1 && next.includes("off")) setView("all");
                                  }}
                                >
                                  <Check on={selected} />
                                  <span>{option.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                    return compact || sidebar ? (
                      <div className="b3-camera-filter-field" key={filter.id}>
                        <span className="b3-camera-field-label">{filter.label}</span>
                        {control}
                      </div>
                    ) : <Fragment key={filter.id}>{control}</Fragment>;
                  })}
                </div>
  );

  const sheetClass = ["exception-sheet", "b3-camera-sheet", compact ? "is-compact" : "", sidebar ? "is-sidebar" : "", leaving ? "is-leaving" : ""].filter(Boolean).join(" ");

  return (
    <div className={sheetClass} role="presentation">
      <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={() => {
        if (suppressBackdropClick.current) {
          suppressBackdropClick.current = false;
          return;
        }
        if (activeCategory) setActiveCategory(null);
        else onClose();
      }} />
      <section
        className="exception-sheet__panel"
        ref={panelRef}
        style={panelHeight ? { height: panelHeight } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="event-sheet__header">
          <div className="event-sheet__intro">
            <span className="event-sheet__mark" aria-hidden="true">
              <span className="event-sheet__mark-spin">
                <img src="/assets/alarm-rules/events/mark.svg" alt="" />
              </span>
            </span>
            <div className="event-sheet__heading">
              <h2 id={titleId}>Affected cameras</h2>
              <p>Choose the cameras that can trigger alarms for this rule.</p>
            </div>
          </div>
          <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>
        <div className="camera-sheet__body">
          <div className="camera-sheet__card">
            {sidebar ? (
              <aside className="b3-camera-filter-rail" aria-label="Camera filters">
                <h3 className="b3-camera-rail-title">Filters</h3>
                {FILTER_CATEGORIES.map((category) => {
                  const expanded = expandedSections.includes(category.id);
                  return (
                    <section className="b3-camera-rail-section" key={category.id}>
                      <button type="button" className="b3-camera-rail-toggle" aria-expanded={expanded} aria-controls={`${categoryPopoverId}-${category.id}`} onClick={() => {
                        setOpenFilter(null);
                        setExpandedSections((current) => expanded ? current.filter((id) => id !== category.id) : [...current, category.id]);
                      }}>
                        <span className={`b3-camera-category-marker is-${category.id}`} aria-hidden="true" />
                        <span>{category.label}</span>
                        {category.id === "time" && cameraFilterCount ? <span className="b3-camera-category-count">{cameraFilterCount}</span> : null}
                        <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
                      </button>
                      {expanded ? <div id={`${categoryPopoverId}-${category.id}`} className="b3-camera-rail-content">
                        {category.id === "time" ? renderCameraFilters() : <p className="b3-camera-category-placeholder">No filter options configured.</p>}
                      </div> : null}
                    </section>
                  );
                })}
              </aside>
            ) : null}
            <div className="b3-camera-content">
            <div className="camera-sheet__search-header">
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

                      setQuery(text);
                    }}
                  />
                </label>
                {(query || serverIds.length || models.length || groupIds.length || scheduleFilters.length || view === "selected") ? (
                  <button type="button" className="camera-sheet__clear-filters" onClick={() => {
                    setQuery("");
                    setServerIds([]);
                    setModels([]);
                    setGroupIds([]);
                    setScheduleFilters([]);
                    setView("all");
                    setOpenFilter(null);
                  }}>Clear filters</button>
                ) : null}
                {!compact && !sidebar ? renderCameraFilters() : null}
              </div>
                <button
                  type="button"
                  className={view === "selected" ? "camera-sheet__chip is-on" : "camera-sheet__chip"}
                  aria-pressed={view === "selected"}
                  aria-label={`See selected ${assigned.length}`}
                  onClick={() => {
                    const nextView = view === "selected" ? "all" : "selected";
                    if (nextView === "selected") {
                      if (scheduleFilters.length === 1 && scheduleFilters.includes("off")) setScheduleFilters([]);
                    }
                    setView(nextView);
                  }}
                >
                  <img src="/assets/alarm-rules/cameras/funnel.svg" alt="" />
                  <em>See selected</em>
                  <span key={landed} className={landed ? "is-landed" : undefined}>{assigned.length}</span>
                  {landed ? <i key={`land-${landed}`} /> : null}
                </button>
            </div>
            {!sidebar ? <div className="b3-camera-filters" ref={categoriesRef} onKeyDownCapture={(event) => {
              if (event.key !== "Escape" || !activeCategory) return;
              event.preventDefault();
              event.stopPropagation();
              if (openFilter && compact) {
                setOpenFilter(null);
                categoriesRef.current?.querySelector(`[data-filter-trigger="${openFilter}"]`)?.focus();
                return;
              }
              setActiveCategory(null);
              categoryButtons.current.get(activeCategory)?.focus();
            }}>
              <span className="b3-camera-filters-label">Filters</span>
              {FILTER_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  ref={(button) => {
                    if (button) categoryButtons.current.set(category.id, button);
                    else categoryButtons.current.delete(category.id);
                  }}
                  type="button"
                  className={`b3-camera-category-button${activeCategory === category.id ? " is-open" : ""}`}
                  aria-haspopup="dialog"
                  aria-expanded={activeCategory === category.id}
                  aria-controls={activeCategory === category.id ? categoryPopoverId : undefined}
                  onClick={(event) => openCategory(category, event.currentTarget)}
                >
                  <span className={`b3-camera-category-marker is-${category.id}`} aria-hidden="true" />
                  <span>{category.label}</span>
                  {compact && category.id === "time" && cameraFilterCount ? <span className="b3-camera-category-count">{cameraFilterCount}</span> : <span className="b3-camera-category-plus" aria-hidden="true">+</span>}
                </button>
              ))}
              {activeCategory ? (
                <div
                  id={categoryPopoverId}
                  className={`b3-camera-category-popover${compact && activeCategory === "time" ? " has-camera-filters" : ""}`}
                  style={categoryPosition}
                  role="dialog"
                  aria-labelledby={categoryTitleId}
                >
                  <header>
                    <h3 id={categoryTitleId}>{FILTER_CATEGORIES.find((category) => category.id === activeCategory).label}</h3>
                    <button type="button" className="event-sheet__close" aria-label="Close filter options" onClick={() => {
                      setActiveCategory(null);
                      categoryButtons.current.get(activeCategory)?.focus();
                    }}>
                      <img src="/assets/alarm-rules/events/close.svg" alt="" />
                    </button>
                  </header>
                  {compact && activeCategory === "time" ? renderCameraFilters() : <p className="b3-camera-category-placeholder">No filter options configured.</p>}
                </div>
              ) : null}
            </div> : null}
            <div className="b3-camera-list-heading">
              <h3>Cameras ({shown.length})</h3>
              <div className="b3-camera-sort">
                <select aria-label="Sort cameras by name" value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}>
                  <option value="asc">Name: A–Z</option>
                  <option value="desc">Name: Z–A</option>
                </select>
                <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
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
                  <span>{allShown ? "Remove all" : "Select all"}</span>
                  <span className="camera-sheet__all-count">{selectableIds.length}</span>
                </button>
                {shown.length === 0 ? (
                  <p className="camera-sheet__empty">
                    {view === "selected"
                      ? assigned.length ? "No selected cameras match these filters." : "No cameras selected yet."
                      : "No cameras match these filters."}
                  </p>
                ) : null}
                {availableShown.map((entry) => renderCameraRow(entry))}
                {blockedShown.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className={unavailableOpen ? "camera-sheet__fold is-open" : "camera-sheet__fold"}
                      aria-expanded={unavailableOpen}
                      onClick={() => setUnavailableOpen((open) => !open)}
                    >
                      <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />
                      Unavailable ({blockedShown.length})
                    </button>
                    {unavailableOpen ? blockedShown.map((entry) => renderCameraRow(entry)) : null}
                  </>
                ) : null}
              </div>
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
