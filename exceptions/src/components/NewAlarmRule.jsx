import { useReviewState, useReviewScope, useReviewScroll } from "../hooks/useReviewSession";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CAMERAS } from "../data/alarm-cameras";
import EventTypesSheet, { EVENT_TYPES, ICONS } from "./EventTypesSheet";
import AppliedCameras from "./AppliedCameras";
import CameraSheet from "./CameraSheet";
import SummaryExceptions from "./SummaryExceptions";
import ExceptionSheet from "./ExceptionSheet";
import RuleGuard from "./RuleGuard";
import ScheduleSheet from "./ScheduleSheet";
import { PEOPLE } from "./PeoplePickerSheet";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = ["12:00 AM", "2:00 AM", "4:00 AM", "6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM", "10:00 PM"];
const DAY_MINUTES = 1440;

function clockPoint(minutes) {
  const total = Math.min(DAY_MINUTES, Math.max(0, Math.round(minutes)));
  const hour24 = Math.floor(total / 60) % 24;
  return `${hour24 % 12 || 12}:${String(total % 60).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

function placeSpan(start, end, day) {
  const left = Math.max(0, (start / day) * 100);
  const right = Math.min(100, (end / day) * 100);
  return { left: `${left}%`, width: `${Math.max(0, right - left)}%` };
}

function barPieces(ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const items = [];
  let cursor = 0;
  sorted.forEach((range) => {
    if (range.start > cursor) items.push({ kind: "gap", start: cursor, end: range.start });
    items.push({ kind: "range", start: range.start, end: range.end });
    cursor = range.end;
  });
  if (cursor < DAY_MINUTES) items.push({ kind: "gap", start: cursor, end: DAY_MINUTES });
  return items;
}

function summaryDays(schedule) {
  if (schedule.repeat === "daily") {
    const ranges = schedule.ranges.Everyday ?? [];
    return WEEK_DAYS.map((day) => ({ day, ranges }));
  }
  return WEEK_DAYS.map((day) => ({ day, ranges: schedule.ranges[day] ?? [] }));
}

const ADD_ROWS = [
  {
    id: "events",
    label: "Event types",
    action: "Add event types",
    hint: "Select the event types that will trigger alarms for this rule.",
  },
  {
    id: "schedules",
    label: "Schedules",
    action: "Add schedule",
    hint: "Set when alarms appear, or choose to show alarms at all times.",
  },
  {
    id: "exceptions",
    label: "Exceptions",
    action: "Add exceptions",
    hint: "Select existing exceptions for holidays or other special dates.",
  },
  {
    id: "cameras",
    label: "Affected cameras",
    action: "Add cameras",
    hint: "Select the cameras or camera groups where this alarm rule will apply.",
  },
];

function useSheet(open) {
  const [held, setHeld] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHeld(true);
      setLeaving(false);
      return undefined;
    }
    if (!held) return undefined;
    setLeaving(true);
    const timeout = setTimeout(() => {
      setHeld(false);
      setLeaving(false);
    }, 340);
    return () => clearTimeout(timeout);
  }, [open, held]);

  return { open: open || held, leaving: !open && leaving };
}

function draftKey(draft) {
  return JSON.stringify({
    name: draft.name ?? "",
    eventTypeIds: draft.eventTypeIds ?? [],
    peopleIds: draft.peopleIds ?? [],
    schedule: draft.schedule ?? null,
    exceptions: draft.exceptions ?? [],
    cameraIds: draft.cameraIds ?? [],
  });
}

export default function NewAlarmRule({ initial = null, rules = [], exceptionCatalog = [], onClose, onCreate, onDelete }) {
  useReviewScope("NewAlarmRule");
  const nameRef = useRef(null);
  const bodyRef = useRef(null);
  const anchorPositionRef = useRef(null);
  const [returnSection, setReturnSection] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [name, setName] = useReviewState("NewAlarmRule:name", initial?.name ?? "");
  const [eventsOpen, setEventsOpen] = useReviewState("NewAlarmRule:eventsOpen", false);
  const [scheduleOpen, setScheduleOpen] = useReviewState("NewAlarmRule:scheduleOpen", false);
  const [camerasOpen, setCamerasOpen] = useReviewState("NewAlarmRule:camerasOpen", false);
  const events = useSheet(eventsOpen);
  const schedule = useSheet(scheduleOpen);
  const cameras = useSheet(camerasOpen);
  const [savedCameraIds, setSavedCameraIds] = useReviewState("NewAlarmRule:savedCameraIds", initial?.cameraIds ?? []);
  const [exceptionsOpen, setExceptionsOpen] = useReviewState("NewAlarmRule:exceptionsOpen", false);
  const exceptions = useSheet(exceptionsOpen);
  const [savedExceptions, setSavedExceptions] = useReviewState("NewAlarmRule:savedExceptions", initial?.exceptions ?? []);
  const [selectedEventTypeIds, setEventTypeIds] = useReviewState("NewAlarmRule:eventTypeIds", initial?.eventTypeIds ?? []);
  const eventTypeIds = useMemo(() => selectedEventTypeIds.filter((id) => id === "people"), [selectedEventTypeIds]);
  const [savedPeopleIds, setSavedPeopleIds] = useReviewState("NewAlarmRule:savedPeopleIds", initial?.peopleIds ?? []);
  const [peopleExpanded, setPeopleExpanded] = useReviewState("NewAlarmRule:peopleExpanded", false);
  const [savedSchedule, setSavedSchedule] = useReviewState("NewAlarmRule:savedSchedule", initial?.schedule ?? null);
  const [attemptedSave, setAttemptedSave] = useReviewState("NewAlarmRule:attemptedSave", false);
  const [guard, setGuard] = useReviewState("NewAlarmRule:guard", null);
  const [baseKey] = useState(() =>
    draftKey({
      name: (initial?.name ?? "").trim(),
      eventTypeIds: initial?.eventTypeIds ?? [],
      peopleIds: initial?.peopleIds ?? [],
      schedule: initial?.schedule ?? null,
      exceptions: initial?.exceptions ?? [],
      cameraIds: initial?.cameraIds ?? [],
    }),
  );
  const [scheduleCursor, setScheduleCursor] = useReviewState("NewAlarmRule:scheduleCursor", null);
  const eventsApplied = eventTypeIds.length > 0;
  const schedulesApplied = savedSchedule
    ? Object.values(savedSchedule.ranges).some((list) => list?.length)
    : false;
  const savedTypes = EVENT_TYPES.filter((type) => eventTypeIds.includes(type.id));
  const savedPeople = savedPeopleIds
    .map((id) => PEOPLE.find((person) => person.id === id))
    .filter(Boolean);
  const missingPeople = savedPeopleIds.filter((id) => !PEOPLE.some((person) => person.id === id));
  const fieldErrors = {};
  if (!name.trim()) fieldErrors.name = "Enter a name for this rule.";
  else if (rules.some((rule) => rule.locked && rule.id !== initial?.id && rule.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    fieldErrors.name = "This name belongs to a locked rule. Enter a different name.";
  }
  if (!eventTypeIds.length) fieldErrors.events = "Choose at least one event type.";
  if (!initial && !savedSchedule) fieldErrors.schedules = "Add a schedule, or confirm that alarms should appear at all times.";
  if (!savedCameraIds.length) fieldErrors.cameras = "Choose at least one camera.";
  const invalidExceptions = savedExceptions.filter((item) => item.type === "day" && !(savedSchedule?.ranges?.[item.likeDay] ?? []).length);
  if (invalidExceptions.length) fieldErrors.exceptions = invalidExceptions.map((item) => `${item.likeDay} has no hours. Add hours for that day or select another exception.`).join(" ");
  const visibleErrors = attemptedSave ? fieldErrors : {};
  const fieldError = (id) => visibleErrors[id] ? (
    <p className="alarm-rule__field-error" id={`alarm-error-${id}`} role="alert">{visibleErrors[id]}</p>
  ) : null;

  const currentKey = draftKey({
    name: name.trim(),
    eventTypeIds,
    peopleIds: savedPeopleIds,
    schedule: savedSchedule,
    exceptions: savedExceptions,
    cameraIds: savedCameraIds,
  });
  const dirty = currentKey !== baseKey;
  const showActions = !initial || dirty;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.target.closest(".alarm-rule__kebab")) return;
      setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const askLeave = () => {
    if (!dirty) onClose();
    else setGuard({ kind: "leave" });
  };

  const commit = () => {
    const result = onCreate({
      name: name.trim(),
      eventTypeIds,
      peopleIds: savedPeople.filter((person) => person).map((person) => person.id),
      schedule: savedSchedule,
      exceptions: savedExceptions,
      cameraIds: savedCameraIds,
    });
    if (result?.ok === false) setGuard({ kind: "error", message: result.message });
  };

  const requestSave = (conflictAck = false) => {
    setAttemptedSave(true);
    const firstError = ["name", "events", "schedules", "exceptions", "cameras"].find((id) => fieldErrors[id]);
    if (firstError) {
      requestAnimationFrame(() => {
        const section = document.getElementById(`alarm-section-${firstError}`);
        const control = firstError === "name" ? nameRef.current : section?.querySelector("button");
        control?.focus({ preventScroll: true });
        (section ?? control)?.scrollIntoView({ block: "center" });
      });
      return;
    }
    if (initial?.revision > 1 && !conflictAck) {
      setGuard({ kind: "conflict" });
      return;
    }
    const hard = [];
    const soft = [];
    if (!schedulesApplied && !savedSchedule) soft.push("There is no schedule, so alarms would appear at all times. Add a schedule, or save anyway to keep it always on.");
    const blocked = savedCameraIds.filter((id) => {
      const camera = CAMERAS.find((item) => item.id === id);
      return (camera?.unsupported ?? []).some((gap) => eventTypeIds.includes(gap));
    });
    if (blocked.length) {
      soft.push(
        `${blocked.length} ${blocked.length === 1 ? "camera" : "cameras"} can't run the selected events. Remove them in Affected cameras, or save anyway and they will not trigger.`,
      );
    }
    const duplicate = rules.some(
      (rule) => rule.id !== initial?.id && rule.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicate) soft.push(`Another rule is already named ${name.trim()}. Rename this one so the list can tell them apart.`);
    if (missingPeople.length) {
      soft.push(
        missingPeople.length === 1
          ? "1 person on this rule was removed from the registry. Remove them in Event types, or save anyway and that person stays off the rule."
          : `${missingPeople.length} people on this rule were removed from the registry. Remove them in Event types, or save anyway and they stay off the rule.`,
      );
    }
    if (hard.length || soft.length) {
      setGuard({ kind: "save", hard, soft });
      return;
    }
    commit();
  };
  const [sectionId, setSectionId] = useReviewState("NewAlarmRule:sectionId", "name");
  const sections = [{ id: "name", label: "Name" }, ...ADD_ROWS.map((row) => ({ id: row.id, label: row.label }))];

  const syncScroll = (event) => {
    const body = bodyRef.current;
    if (!body) return;
    const overflows = body.scrollHeight > body.clientHeight + 8;
    const header = body.querySelector(".alarm-rule__header");
    const past = Boolean(overflows && header && header.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + 4);
    setScrolled((value) => (value === past ? value : past));
    if (!event || returnSection || events.open || schedule.open || cameras.open || exceptions.open) return;
    if (anchorPositionRef.current && Math.abs(body.scrollTop - anchorPositionRef.current.top) < 1) return;
    anchorPositionRef.current = null;
    const line = body.getBoundingClientRect().top + 60;
    let current = sections[0]?.id ?? "name";
    sections.forEach((item) => {
      const node = document.getElementById(`alarm-section-${item.id}`);
      if (node && node.getBoundingClientRect().top <= line) current = item.id;
    });
    setSectionId((value) => (value === current ? value : current));
  };

  const scrollToSection = (id) => {
    const body = bodyRef.current;
    const node = document.getElementById(`alarm-section-${id}`);
    if (!body || !node) return;
    const viewport = body.getBoundingClientRect();
    const bounds = node.getBoundingClientRect();
    const bottomInset = parseFloat(getComputedStyle(body).paddingBottom) || 16;
    const visibleBottom = viewport.bottom - bottomInset;
    const fullyVisible = bounds.top >= viewport.top + 58 && bounds.bottom <= visibleBottom;
    if (!fullyVisible) {
      // Scroll only far enough to reveal the section, within the real content bounds.
      const availableHeight = viewport.height - 58 - bottomInset;
      const above = bounds.top < viewport.top + 58;
      const offset = above || bounds.height > availableHeight
        ? bounds.top - viewport.top - 58
        : bounds.bottom - visibleBottom;
      const top = id === "name" ? 0 : body.scrollTop + offset;
      body.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
    anchorPositionRef.current = { top: body.scrollTop };
    setSectionId(id);
  };

  useReviewScroll("NewAlarmRule", bodyRef);

  useLayoutEffect(() => {
    if (bodyRef.current) anchorPositionRef.current = { top: bodyRef.current.scrollTop };
  }, []);

  useLayoutEffect(() => {
    if (returnSection && !events.open && !schedule.open && !cameras.open && !exceptions.open) {
      scrollToSection(returnSection);
      setReturnSection(null);
    } else {
      syncScroll();
    }
  }, [returnSection, events.open, schedule.open, cameras.open, exceptions.open, name, eventTypeIds, savedSchedule, savedExceptions, savedCameraIds]);

  const openRow = (row) => {
    if (row.id === "events") setEventsOpen(true);
    else if (row.id === "schedules") setScheduleOpen(true);
    else if (row.id === "exceptions") {
      setExceptionsOpen(true);
    } else if (row.id === "cameras") setCamerasOpen(true);
  };

  const showSection = (row, applied, editLabel, body) => {
    const onEdit = () => openRow(row);
    return (
      <section className={`alarm-rule__section${applied ? "" : " is-empty"}${sectionId === row.id ? " is-current" : ""}${visibleErrors[row.id] ? " has-error" : ""}`} id={`alarm-section-${row.id}`} key={row.id} aria-describedby={visibleErrors[row.id] ? `alarm-error-${row.id}` : undefined}>
        {applied ? <header className="alarm-rule__section-head">
          <span>{row.label}</span>
          <button type="button" className="alarm-rule__section-edit" aria-label={editLabel} aria-invalid={Boolean(visibleErrors[row.id])} aria-describedby={visibleErrors[row.id] ? `alarm-error-${row.id}` : undefined} onClick={onEdit}>
            <img src="/assets/alarm-rules/edit.svg" alt="" />
          </button>
        </header> : null}
        <div className={`alarm-rule__section-body is-${row.id}${applied ? "" : " is-empty"}`}>
          {applied ? body : (
            <div className="alarm-rule__add-shell">
              <button type="button" className="alarm-rule__add" aria-invalid={Boolean(visibleErrors[row.id])} aria-describedby={visibleErrors[row.id] ? `alarm-error-${row.id}` : undefined} onClick={onEdit}>
                <span className="alarm-rule__add-icon" aria-hidden="true" />
                <span className="alarm-rule__add-label">{row.action}</span>
                <span className="alarm-rule__pipe" aria-hidden="true">|</span>
                <span className="alarm-rule__hint">{row.hint}</span>
              </button>
            </div>
          )}
          {fieldError(row.id)}
        </div>
      </section>
    );
  };

  const kebab = initial ? (
    <div className="alarm-rule__kebab">
      <button
        type="button"
        aria-label="Rule actions"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <img src="/assets/alarm-rules/kebab.svg" alt="" />
      </button>
      {menuOpen ? (
        <div className="alarm-rule__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => setMenuOpen(false)}>
            Option 1
          </button>
          <button type="button" role="menuitem" onClick={() => setMenuOpen(false)}>
            Option 2
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() => {
              setMenuOpen(false);
              setGuard({ kind: "delete" });
            }}
          >
            Delete rule
          </button>
        </div>
      ) : null}
    </div>
  ) : null;

  const sheetOpen = eventsOpen || scheduleOpen || camerasOpen || exceptionsOpen;

  return (
    <main className={["alarm-rule", sheetOpen ? "is-behind" : "", scrolled ? "is-scrolled" : "", showActions ? "is-actions" : ""].filter(Boolean).join(" ")}>
      <div className="alarm-rule__plane">
      <button type="button" className="alarm-rule__close" aria-label="Close" onClick={askLeave}>
        <img src="/assets/alarm-rules/close.svg" alt="" />
      </button>
      <div className="alarm-rule__chrome" aria-hidden={!scrolled}>
        <span>{initial ? "Edit alarm rule" : "New alarm rule"}</span>
        {kebab}
      </div>

      <div className="alarm-rule__body" ref={bodyRef} onScroll={syncScroll}>
        <section className="alarm-rule__card">
          <header className="alarm-rule__header">
            <span className="alarm-rule__mark" aria-hidden="true">
              <span className="alarm-rule__mark-spin">
                <img src="/assets/alarm-rules/rule-mark.svg" alt="" />
              </span>
            </span>
            <div className="alarm-rule__heading">
              <h1>{initial ? "Edit alarm rule" : "New alarm rule"}</h1>
              <p>
                Choose which events and cameras trigger alarms in Live Events. Then set
                when those alarms appear using schedules and exceptions.
              </p>
            </div>
            {kebab}
          </header>

          <div className="alarm-rule__review">
              <nav className="alarm-rule__nav" aria-label="Rule sections">
                {sections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={sectionId === item.id ? "is-active" : undefined}
                    aria-current={sectionId === item.id ? "location" : undefined}
                    onClick={() => {
                      scrollToSection(item.id);
                      if (item.id === "name") nameRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            <div className="alarm-rule__review-main">
            <div className="alarm-rule__field-content" id="alarm-section-name">
            <input
              ref={nameRef}
              className={`alarm-rule__name is-review${sectionId === "name" ? " is-current" : ""}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. After hours alerts"
              aria-label="Name"
              aria-invalid={Boolean(visibleErrors.name)}
              aria-describedby={visibleErrors.name ? "alarm-error-name" : undefined}
              autoFocus
            />
            {fieldError("name")}
            </div>

          {ADD_ROWS.map((row) =>
            row.id === "events" && eventsApplied ? (
              showSection(row, true, "Edit event types",
                <div className="alarm-rule__applied">
                  {savedTypes.map((type) => (
                    <div className="alarm-rule__applied-item" key={type.id}>
                      <div className="alarm-rule__applied-lead">
                        <span className="alarm-rule__applied-icon" aria-hidden="true">
                          <img
                            src={type.id === "people" ? "/assets/alarm-rules/events/people-mark.svg" : ICONS[type.icon]}
                            alt=""
                          />
                        </span>
                        <span className="alarm-rule__applied-copy">
                          <strong>
                            {type.title.trim()}
                            {type.id === "people" && savedPeople.length > 0 ? (
                              <span className="alarm-rule__count"> ({savedPeople.length})</span>
                            ) : null}
                          </strong>
                          <span>{type.detail}</span>
                        </span>
                      </div>
                      {type.id === "people" && savedPeople.length > 0 ? (
                        <div className="alarm-rule__people">
                          <div className={`alarm-rule__applied-chips${peopleExpanded && savedPeople.length > 4 ? " is-wrapped" : ""}`}>
                            {(peopleExpanded ? savedPeople : savedPeople.slice(0, 4)).map((person) => (
                              <div className="alarm-rule__person" key={person.id}>
                                <span>{person.name}</span>
                                <span className="person-card__photo people-chip__photo">
                                  <img src={person.photo} alt="" />
                                </span>
                              </div>
                            ))}
                          </div>
                          {savedPeople.length > 4 ? (
                            <button
                              type="button"
                              className="alarm-rule__more"
                              aria-expanded={peopleExpanded}
                              onClick={() => setPeopleExpanded((open) => !open)}
                            >
                              <span className="stable-label">
                                <span className="is-current">{peopleExpanded ? "See less" : "See more"}</span>
                                <span aria-hidden="true">See more</span>
                              </span>
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {type.id === "people" && missingPeople.length ? (
                        <p className="alarm-rule__warn">
                          {missingPeople.length === 1
                            ? "1 person was removed from the registry."
                            : `${missingPeople.length} people were removed from the registry.`}
                          <button type="button" onClick={() => setSavedPeopleIds(savedPeople.map((person) => person.id))}>
                            Remove them
                          </button>
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )
            ) : row.id === "schedules" && schedulesApplied ? (
              showSection(row, true, "Edit schedules",
                <div
                  className="alarm-rule__schedule"
                  onMouseLeave={() => setScheduleCursor(null)}
                >
                  <div className="alarm-rule__week">
                    <div className="alarm-rule__week-hours" aria-hidden="true">
                      <span />
                      <div className="alarm-rule__week-scale">
                        {HOURS.map((hour, index) => (
                          <span key={hour} style={{ left: `${((index + 0.5) / HOURS.length) * 100}%` }}>
                            {hour}
                          </span>
                        ))}
                      </div>
                    </div>
                    {summaryDays(savedSchedule).map(({ day, ranges }) => (
                      <div className="alarm-rule__week-row" key={day}>
                        <span>{day}</span>
                        <div
                          className="alarm-rule__week-track"
                          onMouseMove={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
                            const week = event.currentTarget.closest(".alarm-rule__week").getBoundingClientRect();
                            setScheduleCursor({
                              left: event.clientX - week.left,
                              label: clockPoint(ratio * DAY_MINUTES),
                            });
                          }}
                        >
                          <div className="alarm-rule__week-grid" aria-hidden="true">
                            {HOURS.map((hour, index) => (
                              <span key={hour} style={{ left: `${((index + 0.5) / HOURS.length) * 100}%` }}>
                                <img src="/assets/alarm-rules/schedule/gridline.svg" alt="" />
                              </span>
                            ))}
                          </div>
                          <div className="alarm-rule__week-bar">
                            {barPieces(ranges).map((piece) => (
                              <span
                                key={`${piece.kind}-${piece.start}`}
                                className={piece.kind === "range" ? "is-range" : ""}
                                style={placeSpan(piece.start, piece.end, DAY_MINUTES)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {scheduleCursor ? (
                      <div className="alarm-rule__week-marker" style={{ left: scheduleCursor.left }}>
                        <span>{scheduleCursor.label}</span>
                        <img src="/assets/alarm-rules/schedule/hover-line.svg" alt="" />
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            ) : row.id === "exceptions" && savedExceptions.length ? (
              showSection(row, true, "Edit exceptions",
                <SummaryExceptions
                  items={savedExceptions}
                  zone={savedSchedule?.zone}
                />
              )
            ) : row.id === "schedules" && savedSchedule && !schedulesApplied ? (
              showSection(row, true, "Edit schedules", <div className="alarm-rule__always-on">Always on · Alarms appear at all times.</div>)
            ) : row.id === "cameras" && savedCameraIds.length ? (
              showSection(row, true, "Edit cameras", <AppliedCameras ids={savedCameraIds} eventTypeIds={eventTypeIds} />)
            ) : (
              showSection(row, false, `Edit ${row.label.toLowerCase()}`, null)
            ),
          )}
            </div>
          </div>
        </section>
      </div>

      {showActions ? (
      <footer className="alarm-rule__footer">
        <button type="button" className="alarm-rule__back" onClick={askLeave}>
          Cancel
        </button>
        <button
          type="button"
          className="alarm-rule__create"
          onClick={() => requestSave(false)}
        >
          {initial ? "Save" : "Create Alarm Rule"}
        </button>
      </footer>
      ) : null}
      </div>

      {events.open ? (
        <EventTypesSheet
          leaving={events.leaving}
          selectedIds={eventTypeIds}
          savedPeopleIds={savedPeopleIds}
          onClose={() => setEventsOpen(false)}
          onSave={(ids, peopleIds) => {
            setEventTypeIds(ids);
            setSavedPeopleIds(ids.includes("people") ? peopleIds : []);
            setReturnSection("events");
            setEventsOpen(false);
          }}
        />
      ) : null}

      {cameras.open ? (
        <CameraSheet
          leaving={cameras.leaving}
          initialIds={savedCameraIds}
          eventTypeIds={eventTypeIds}
          onClose={() => setCamerasOpen(false)}
          onAssign={(ids) => {
            setSavedCameraIds(ids);
            setReturnSection("cameras");
            setCamerasOpen(false);
          }}
        />
      ) : null}

      {exceptions.open ? (
        <ExceptionSheet
          leaving={exceptions.leaving}
          items={savedExceptions}
          zone={savedSchedule?.zone}
          availableItems={exceptionCatalog}
          onClose={() => setExceptionsOpen(false)}
          onSave={(next) => {
            setSavedExceptions(next);
            setReturnSection("exceptions");
            setExceptionsOpen(false);
          }}
        />
      ) : null}

      {schedule.open ? (
        <ScheduleSheet
          leaving={schedule.leaving}
          initialRanges={savedSchedule?.ranges ?? {}}
          onClose={() => setScheduleOpen(false)}
          initialZone={savedSchedule?.zone}
          onSave={(schedule) => {
            setSavedSchedule(schedule);
            setReturnSection("schedules");
            setScheduleOpen(false);
          }}
        />
      ) : null}
      {guard?.kind === "leave" ? (
        <RuleGuard
          title="Discard this rule?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onCancel={() => setGuard(null)}
          onConfirm={onClose}
        >
          <p>The name, events, schedule, exceptions, and cameras in this draft will be lost.</p>
        </RuleGuard>
      ) : null}
      {guard?.kind === "delete" ? (
        <RuleGuard
          title={`Delete ${name.trim() || "this rule"}?`}
          confirmLabel="Delete"
          cancelLabel="Keep it"
          onCancel={() => setGuard(null)}
          onConfirm={onDelete}
        >
          <p>
            You are about to delete this rule. Are you sure? It leaves the list. Alarms already in Live Events stay.
          </p>
        </RuleGuard>
      ) : null}
      {guard?.kind === "conflict" ? (
        <RuleGuard
          title="This rule changed"
          confirmLabel="Keep mine"
          cancelLabel="Discard mine"
          onCancel={onClose}
          onConfirm={() => {
            setGuard(null);
            requestSave(true);
          }}
        >
          <p>Someone updated this rule while it was open. Keeping yours overwrites that change.</p>
        </RuleGuard>
      ) : null}
      {guard?.kind === "error" ? (
        <RuleGuard title="This rule wasn't saved" confirmLabel="" cancelLabel="Keep editing" onCancel={() => setGuard(null)}>
          <p>{guard.message}</p>
        </RuleGuard>
      ) : null}
      {guard?.kind === "save" ? (
        <RuleGuard
          title={guard.hard.length ? "This rule can't be saved yet" : "Save with these warnings?"}
          confirmLabel={guard.hard.length ? "" : initial ? "Save anyway" : "Create anyway"}
          cancelLabel="Keep editing"
          onCancel={() => setGuard(null)}
          onConfirm={guard.hard.length ? undefined : commit}
        >
          <ul>
            {[...guard.hard, ...guard.soft].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </RuleGuard>
      ) : null}
    </main>
  );
}
