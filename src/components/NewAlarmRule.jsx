import { useEffect, useRef, useState } from "react";
import { CAMERAS } from "../data/alarm-cameras";
import EventTypesSheet, { EVENT_TYPES, ICONS } from "./EventTypesSheet";
import AppliedCameras from "./AppliedCameras";
import CameraSheet from "./CameraSheet";
import ExceptionList from "./ExceptionList";
import ExceptionSheet from "./ExceptionSheet";
import RuleGuard from "./RuleGuard";
import ScheduleSheet from "./ScheduleSheet";
import { PEOPLE } from "./PeoplePickerSheet";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = ["12:00 AM", "2:00 AM", "4:00 AM", "6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM", "10:00 PM"];
const DAY_MINUTES = 1440;

function clockPoint(minutes) {
  const span = DAY_MINUTES * 60;
  const total = ((Math.round(minutes * 60) % span) + span) % span;
  const hour24 = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} ${suffix}`;
}

function placeSpan(start, end, day) {
  const left = Math.max(0, ((start + 60) / day) * 100);
  const right = Math.min(100, ((end + 60) / day) * 100);
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
    hint: "Set when alarms appear. Without a schedule, alarms appear at all times.",
  },
  {
    id: "exceptions",
    label: "Exceptions",
    action: "Add exceptions",
    hint: "Set different alarm display hours for holidays or other special dates.",
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

export default function NewAlarmRule({ initial = null, rules = [], onClose, onCreate, onDelete }) {
  const nameRef = useRef(null);
  const bodyRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [eventsOpen, setEventsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [camerasOpen, setCamerasOpen] = useState(false);
  const events = useSheet(eventsOpen);
  const schedule = useSheet(scheduleOpen);
  const cameras = useSheet(camerasOpen);
  const [savedCameraIds, setSavedCameraIds] = useState(initial?.cameraIds ?? []);
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const exceptions = useSheet(exceptionsOpen);
  const [exceptionDraft, setExceptionDraft] = useState(null);
  const [exceptionLibrary, setExceptionLibrary] = useState(false);
  const [savedExceptions, setSavedExceptions] = useState(initial?.exceptions ?? []);
  const [eventTypeIds, setEventTypeIds] = useState(initial?.eventTypeIds ?? []);
  const [savedPeopleIds, setSavedPeopleIds] = useState(initial?.peopleIds ?? []);
  const [peopleExpanded, setPeopleExpanded] = useState(false);
  const [savedSchedule, setSavedSchedule] = useState(initial?.schedule ?? null);
  const [guard, setGuard] = useState(null);
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
  const [scheduleCursor, setScheduleCursor] = useState(null);
  const eventsApplied = eventTypeIds.length > 0;
  const schedulesApplied = savedSchedule
    ? Object.values(savedSchedule.ranges).some((list) => list?.length)
    : false;
  const savedTypes = EVENT_TYPES.filter((type) => eventTypeIds.includes(type.id));
  const savedPeople = savedPeopleIds
    .map((id) => PEOPLE.find((person) => person.id === id))
    .filter(Boolean);
  const missingPeople = savedPeopleIds.filter((id) => !PEOPLE.some((person) => person.id === id));
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
  const otherRules = rules.filter((rule) => rule.id !== initial?.id);
  const namedSchedules = otherRules
    .filter((rule) => !rule.locked && Object.values(rule.schedule?.ranges ?? {}).some((list) => list?.length))
    .map((rule) => ({ id: rule.id, name: rule.name }));
  const unavailableSchedules = otherRules
    .filter((rule) => rule.locked || !Object.values(rule.schedule?.ranges ?? {}).some((list) => list?.length))
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
      reason: rule.locked || "It has no weekly hours, so it cannot be used.",
    }));

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
    if (initial?.revision > 1 && !conflictAck) {
      setGuard({ kind: "conflict" });
      return;
    }
    const hard = [];
    const soft = [];
    if (!name.trim()) hard.push("This rule needs a name. Type one in Name, then save again.");
    if (!eventTypeIds.length) hard.push("Choose at least one event type. Open Event types, pick one, and save again.");
    if (!savedCameraIds.length) hard.push("Choose at least one camera. Open Affected cameras and select one that can run these events.");
    const lockedName = rules.find(
      (rule) => rule.locked && rule.name.trim().toLowerCase() === name.trim().toLowerCase() && rule.id !== initial?.id,
    );
    if (lockedName) {
      setGuard({
        kind: "error",
        message: `${lockedName.name} is locked, so this rule can't use that name. Rename it, then save again.`,
      });
      return;
    }
    const emptyLike = savedExceptions.filter((item) => {
      if (item.type !== "day") return false;
      return !((savedSchedule?.ranges?.[item.likeDay] ?? []).length);
    });
    emptyLike.forEach((item) =>
      hard.push(`${item.likeDay} has no hours, so “${item.name}” would not change the week. Add hours on ${item.likeDay}, or choose another day.`),
    );
    if (!schedulesApplied) soft.push("There is no schedule, so alarms would appear at all times. Add a schedule, or save anyway to keep it always on.");
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
  const review = savedCameraIds.length > 0;
  const [sectionId, setSectionId] = useState("name");
  const sections = [{ id: "name", label: "Name" }, ...ADD_ROWS.map((row) => ({ id: row.id, label: row.label }))];

  const syncScroll = () => {
    const body = bodyRef.current;
    if (!body) return;
    const overflows = body.scrollHeight > body.clientHeight + 8;
    const header = body.querySelector(".alarm-rule__header");
    const past = Boolean(overflows && header && header.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + 4);
    setScrolled((value) => (value === past ? value : past));
    if (!review) return;
    const line = body.getBoundingClientRect().top + 72;
    let current = sections[0]?.id ?? "name";
    sections.forEach((item) => {
      const node = document.getElementById(`alarm-section-${item.id}`);
      if (node && node.getBoundingClientRect().top <= line) current = item.id;
    });
    setSectionId((value) => (value === current ? value : current));
  };

  useEffect(() => {
    syncScroll();
  }, [review, name, eventTypeIds.length, schedulesApplied, savedExceptions.length, savedCameraIds.length]);

  const openRow = (row) => {
    if (row.id === "events") setEventsOpen(true);
    else if (row.id === "schedules") setScheduleOpen(true);
    else if (row.id === "exceptions") {
      setExceptionDraft(null);
      setExceptionsOpen(true);
    } else if (row.id === "cameras") setCamerasOpen(true);
  };

  const showSection = (row, applied, editLabel, body) => {
    const onEdit = () => openRow(row);
    if (review) {
      return (
        <section className="alarm-rule__section" id={`alarm-section-${row.id}`} key={row.id}>
          <header className="alarm-rule__section-head">
            <span>{row.label}</span>
            <button type="button" className="alarm-rule__section-edit" aria-label={editLabel} onClick={onEdit}>
              <img src="/assets/alarm-rules/edit.svg" alt="" />
            </button>
          </header>
          <div className={`alarm-rule__section-body is-${row.id}${applied ? "" : " is-empty"}`}>
            {applied ? (
              body
            ) : (
              <div className="alarm-rule__add-shell">
                <button type="button" className="alarm-rule__add" onClick={onEdit}>
                  <span className="alarm-rule__add-icon" aria-hidden="true" />
                  <span className="alarm-rule__add-label">{row.action}</span>
                  <span className="alarm-rule__pipe" aria-hidden="true">
                    |
                  </span>
                  <span className="alarm-rule__hint">{row.hint}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (!applied) {
      return (
        <div className="alarm-rule__row" key={row.id}>
          <div className="alarm-rule__label">
            <span>{row.label}</span>
          </div>
          <div className="alarm-rule__add-shell">
            <button type="button" className="alarm-rule__add" onClick={onEdit}>
              <span className="alarm-rule__add-icon" aria-hidden="true" />
              <span className="alarm-rule__add-label">{row.action}</span>
              <span className="alarm-rule__pipe" aria-hidden="true">
                |
              </span>
              <span className="alarm-rule__hint">{row.hint}</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="alarm-rule__row is-review" key={row.id}>
        <div className="alarm-rule__label">
          <span>{row.label}</span>
          <button type="button" className="alarm-rule__edit" aria-label={editLabel} onClick={onEdit}>
            <img src="/assets/alarm-rules/pencil.svg" alt="" />
          </button>
        </div>
        {body}
      </div>
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

          <div className={review ? "alarm-rule__review" : "alarm-rule__stack"}>
            {review ? (
              <nav className="alarm-rule__nav" aria-label="Rule sections">
                {sections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={sectionId === item.id ? "is-active" : undefined}
                    onClick={() => {
                      setSectionId(item.id);
                      document.getElementById(`alarm-section-${item.id}`)?.scrollIntoView({ block: "start" });
                      if (item.id === "name") nameRef.current?.focus();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : null}
            <div className={review ? "alarm-rule__review-main" : "alarm-rule__stack"}>
          {review ? (
            <input
              id="alarm-section-name"
              ref={nameRef}
              className="alarm-rule__name is-review"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. After hours alerts"
              aria-label="Name"
              autoFocus
            />
          ) : (
          <div className={`alarm-rule__row${eventsApplied ? " is-review is-name" : ""}`}>
            <div className="alarm-rule__label">
              <span>Name</span>
              {eventsApplied ? (
                <button
                  type="button"
                  className="alarm-rule__edit"
                  aria-label="Edit name"
                  onClick={() => nameRef.current?.focus()}
                >
                  <img src="/assets/alarm-rules/pencil.svg" alt="" />
                </button>
              ) : null}
            </div>
            <input
              ref={nameRef}
              className={`alarm-rule__name${eventsApplied ? " is-review" : ""}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. After hours alerts"
              aria-label="Name"
              autoFocus
            />
          </div>
          )}

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
                          <div className="alarm-rule__applied-chips">
                            {(peopleExpanded ? savedPeople : savedPeople.slice(0, 3)).map((person) => (
                              <div className="alarm-rule__person" key={person.id}>
                                <span>{person.name}</span>
                                <span className="person-card__photo people-chip__photo">
                                  <img src={person.photo} alt="" />
                                </span>
                              </div>
                            ))}
                          </div>
                          {savedPeople.length > 3 ? (
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
                  <div className="alarm-rule__schedule-lead">
                    <span className="alarm-rule__schedule-mark" aria-hidden="true">
                      <img src="/assets/alarm-rules/schedule/repeat.svg" alt="" />
                    </span>
                    <strong>{savedSchedule.repeat === "weekly" ? "Repeats weekly" : "Repeats daily"}</strong>
                  </div>
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
                              label: clockPoint(ratio * DAY_MINUTES - 60),
                            });
                          }}
                        >
                          <div className="alarm-rule__week-grid" aria-hidden="true">
                            {HOURS.map((hour, index) => (
                              index === 0 ? null : (
                              <span key={hour} style={{ left: `${(index / HOURS.length) * 100}%` }}>
                                <img src="/assets/alarm-rules/schedule/gridline.svg" alt="" />
                              </span>
                              )
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
                <div className="alarm-rule__applied">
                  <ExceptionList
                    items={savedExceptions}
                    onCreate={() => {
                      setExceptionDraft({ id: null });
                      setExceptionLibrary(false);
                      setExceptionsOpen(true);
                    }}
                    onEdit={(item) => {
                      setExceptionDraft(item);
                      setExceptionsOpen(true);
                    }}
                    onRemove={(id) => setSavedExceptions((current) => current.filter((entry) => entry.id !== id))}
                    onShared={() => {
                      setExceptionDraft(null);
                      setExceptionLibrary(true);
                      setExceptionsOpen(true);
                    }}
                  />
                </div>
              )
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
        {initial && onDelete ? (
          <button type="button" className="alarm-rule__delete" onClick={() => setGuard({ kind: "delete" })}>
            Delete rule
          </button>
        ) : null}
        <button type="button" className="alarm-rule__back" onClick={askLeave}>
          Cancel
        </button>
        <button
          type="button"
          className="alarm-rule__create"
          disabled={!initial && (!name.trim() || !eventTypeIds.length || !schedulesApplied || !savedCameraIds.length)}
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
            setCamerasOpen(false);
          }}
        />
      ) : null}

      {exceptions.open ? (
        <ExceptionSheet
          leaving={exceptions.leaving}
          items={savedExceptions}
          initialDraft={exceptionDraft}
          scheduleRanges={savedSchedule?.ranges ?? null}
          namedSchedules={namedSchedules}
          unavailableSchedules={unavailableSchedules}
          initialLibrary={exceptionLibrary}
          onItemsChange={setSavedExceptions}
          onClose={() => {
            setExceptionDraft(null);
            setExceptionLibrary(false);
            setExceptionsOpen(false);
          }}
          onSave={() => {
            setExceptionDraft(null);
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
            const applied = Object.values(schedule.ranges).some((list) => list?.length);
            setSavedSchedule(applied ? schedule : null);
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
