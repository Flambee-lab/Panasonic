import { useEffect, useId, useRef, useState } from "react";
import { useReviewScope, useReviewState } from "../hooks/useReviewSession";
import {
  exceptionClock, exceptionDaySegments, exceptionFreeGaps, exceptionRangeDraft,
  nextExceptionDayRange, validateExceptionDayRanges, validateExceptionRangeDrafts,
} from "../utils/exceptionDayTimeline";
import ScheduleTimeInput from "./ScheduleTimeField";
import "../styles/exception-dates-hours.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const AXIS = [0, 240, 480, 720, 960, 1200, 1440];
const ZONES = [
  "(UTC-08:00) Pacific Time (US & Canada)",
  "(UTC-06:00) Central Time (US & Canada)",
  "(UTC-05:00) Eastern Time (US & Canada)",
  "(UTC-03:00) Buenos Aires",
];
const DAY = 1440;
const dateKey = (day) => day.getFullYear() + "-" + day.getMonth() + "-" + day.getDate();
const dateValue = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m, d).getTime(); };
const interval = (range) => exceptionClock(range.start) + " – " + exceptionClock(range.end) + (range.end >= DAY ? " (next day)" : "");

function calendarDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const count = Math.ceil((first.getDay() + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export default function ExceptionDatesHoursSheet({ initial = null, zone: inheritedZone, onBack, onClose, onSave }) {
  useReviewScope("ExceptionDatesHoursSheet");
  const titleId = useId();
  const repeatId = useId();
  const editorId = useId();
  const [cursor, setCursor] = useReviewState("ExceptionDatesHoursSheet:cursor", () => {
    const parts = initial?.dates?.[0]?.split("-").map(Number);
    const today = new Date();
    return parts ? new Date(parts[0], parts[1], 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selected, setSelected] = useReviewState("ExceptionDatesHoursSheet:dates", () => new Set(initial?.dates ?? []));
  const [repeatYearly, setRepeatYearly] = useReviewState("ExceptionDatesHoursSheet:repeat", initial?.repeatYearly ?? true);
  const [rows, setRows] = useReviewState("ExceptionDatesHoursSheet:chips", () => (initial?.ranges ?? []).map((range, index) => ({ ...range, id: "initial-" + index })));
  const [zone, setZone] = useReviewState("ExceptionDatesHoursSheet:zone", initial?.zone ?? inheritedZone ?? ZONES[0]);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [editorTouched, setEditorTouched] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [hover, setHover] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const zoneRef = useRef(null);
  const editorRef = useRef(null);
  const drag = useRef(null);
  const nextId = useRef(0);
  const validation = validateExceptionDayRanges(rows);
  const canSave = selected.size > 0 && validation.valid && !editor;
  const sortedRows = [...rows].sort((a, b) => a.start - b.start);
  const edited = editor ? validateExceptionRangeDrafts([editor]) : null;
  const editedRange = edited?.valid ? edited.ranges[0] : null;
  const otherRanges = editor ? rows.filter((row) => row.id !== editor.id) : rows;
  const overlap = editedRange && !validateExceptionDayRanges([...otherRanges, editedRange]).valid;
  const editorError = editor ? (edited.errors[0]?.start || edited.errors[0]?.end || edited.errors[0]?.range || (overlap ? "This time range overlaps another time range." : "")) : "";
  const canApplyEditor = Boolean(editedRange && !overlap);

  useEffect(() => {
    const escape = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (editor) setEditor(null);
      else if (zoneOpen) setZoneOpen(false);
      else onBack();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [editor, zoneOpen, onBack]);

  useEffect(() => {
    if (!zoneOpen) return;
    const outside = (event) => { if (!zoneRef.current?.contains(event.target)) setZoneOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [zoneOpen]);

  const chooseDate = (day) => {
    const key = dateKey(day);
    setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    if (day.getMonth() !== cursor.getMonth()) setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  const openRangeEditor = (range, isNew = false) => {
    setZoneOpen(false);
    setHover(null);
    setActiveId(range.id);
    setEditorTouched(false);
    setEditor({ ...exceptionRangeDraft(range, range.id), isNew });
    setMessage("");
  };
  const addRange = (range) => {
    if (!range) return;
    if (!validateExceptionDayRanges([...rows, range]).valid) {
      setMessage("Choose an empty part of the timeline. Time ranges cannot overlap.");
      return;
    }
    const id = "added-" + Date.now() + "-" + nextId.current++;
    setRows((current) => [...current, { ...range, id }]);
    setActiveId(id);
    setEditor(null);
    setMessage("");
  };
  const addNextRange = () => {
    const range = nextExceptionDayRange(rows, sortedRows.at(-1)?.end % DAY || 600);
    if (range) openRangeEditor({ ...range, id: "added-" + Date.now() + "-" + nextId.current++ }, true);
  };
  const updateField = (field, value) => setEditor((current) => current && current[field] !== value ? { ...current, [field]: value, fullDay: false, importedInvalid: false } : current);
  const applyEditor = () => {
    if (!canApplyEditor) return;
    const value = { ...editedRange, id: editor.id };
    setRows((current) => editor.isNew ? [...current, value] : current.map((row) => row.id === editor.id ? value : row));
    setActiveId(editor.id);
    setEditor(null);
    setMessage("");
  };
  const removeRange = (id) => {
    setRows((current) => current.filter((row) => row.id !== id));
    if (activeId === id) setActiveId(null);
    if (editor?.id === id) setEditor(null);
    setMessage("");
  };
  const pointedMinute = (event, snapped = false) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const raw = Math.max(0, Math.min(DAY, (event.clientX - bounds.left) / bounds.width * DAY));
    return snapped ? Math.round(raw / 15) * 15 : Math.round(raw);
  };
  const beginDrag = (event) => {
    if (event.button !== 0 || event.target.closest(".edh-range") || editor) return;
    event.preventDefault();
    const minute = pointedMinute(event, true);
    drag.current = { pointerId: event.pointerId, anchor: minute, current: minute, x: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePointer = (event) => {
    if (editor) return;
    const minute = pointedMinute(event);
    setHover(minute);
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.current = pointedMinute(event, true);
    if (Math.abs(event.clientX - current.x) >= 4) current.moved = true;
    if (current.moved) setPreview({ start: Math.min(current.anchor, current.current), end: Math.max(current.anchor, current.current) });
  };
  const endDrag = (event) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved) {
      const range = { start: Math.min(current.anchor, current.current), end: Math.max(current.anchor, current.current) };
      if (range.end > range.start) addRange(range);
      return;
    }
    const minute = Math.min(DAY - 1, pointedMinute(event));
    const gap = exceptionFreeGaps(rows).find((item) => minute >= item.start && minute < item.end);
    if (!gap) return;
    const start = Math.max(gap.start, Math.floor(minute / 15) * 15);
    openRangeEditor({ start, end: Math.min(gap.end, start + 60), id: "added-" + Date.now() + "-" + nextId.current++ }, true);
  };
  const hoverRange = rows.find((range) => exceptionDaySegments(range).some((piece) => hover >= piece.start && hover < piece.end));
  const marker = preview ? interval(preview) : hoverRange ? interval(hoverRange) : "Drag to select hours · " + (hover === DAY ? "12:00 AM (next day)" : exceptionClock(hover ?? 0));

  return <div className="exception-sheet is-stacked exception-dates-hours" role="presentation">
    <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={onClose} />
    <section className="exception-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="exception-new__header">
        <button type="button" className="event-sheet__close" aria-label="Back" onClick={onBack}><img src="/assets/alarm-rules/exceptions/back.svg" alt="" /></button>
        <h2 id={titleId}>Dates and hours</h2>
        <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}><img src="/assets/alarm-rules/events/close.svg" alt="" /></button>
      </header>
      <div className="edh-body">
        <section className="edh-calendar-card" aria-label="Exception dates">
          <div className="edh-section-heading"><h3>Select dates</h3><span>{selected.size ? selected.size + (selected.size === 1 ? " date selected" : " dates selected") : "No dates selected"}</span></div>
          <div className="exception-new__cal">
            <div className="exception-new__month">
              <button type="button" aria-label="Previous month" onClick={() => setCursor((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><img src="/assets/alarm-rules/exceptions/chevron-left.svg" alt="" /></button>
              <p>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
              <button type="button" className="is-next" aria-label="Next month" onClick={() => setCursor((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><img src="/assets/alarm-rules/exceptions/chevron-right.svg" alt="" /></button>
            </div>
            <div className="exception-new__week" aria-hidden="true">{WEEKDAYS.map((day, index) => <span key={index}>{day}</span>)}</div>
            <div className="exception-new__days">{calendarDays(cursor).map((day) => <button key={dateKey(day)} type="button" className={day.getMonth() !== cursor.getMonth() ? "is-outside" : undefined} aria-pressed={selected.has(dateKey(day))} aria-label={MONTHS[day.getMonth()] + " " + day.getDate() + ", " + day.getFullYear()} onClick={() => chooseDate(day)}>{day.getDate()}</button>)}</div>
          </div>
          <div className="exception-new__yearly">
            <button type="button" className="exception-new__repeat" aria-pressed={repeatYearly} aria-describedby={repeatId} onClick={() => setRepeatYearly((value) => !value)}>{repeatYearly ? <img src="/assets/alarm-rules/exceptions/check.svg" alt="" /> : <span className="exception-new__check-off" />}Repeat every year</button>
            <p id={repeatId} className="edh-repeat-note">{repeatYearly ? "Repeats on the same calendar dates each year." : "Applies only to the selected dates."}</p>
          </div>
        </section>
        <section className="edh-hours-card" aria-label="Exception hours">
          <div className="edh-hours-heading">
            <div><h3>Set hours</h3></div>
            <div className="schedule-sheet__zone" ref={zoneRef}>
              <button type="button" className="schedule-sheet__zone-btn" aria-label="Time zone" aria-haspopup="listbox" aria-expanded={zoneOpen} onClick={() => { setZoneOpen((open) => !open); setEditor(null); }}><span>{zone}</span><img src="/assets/alarm-rules/schedule/chevron.svg" alt="" /></button>
              {zoneOpen ? <div className="schedule-sheet__zone-menu" role="listbox" aria-label="Time zone">{ZONES.map((option) => <button type="button" key={option} role="option" aria-selected={option === zone} className={option === zone ? "is-active" : ""} onClick={() => { setZone(option); setZoneOpen(false); }}>{option}</button>)}</div> : null}
            </div>
          </div>
          <div className="edh-timeline">
            <div className="edh-axis" aria-hidden="true">{AXIS.map((minute) => <span key={minute} className={minute === 0 ? "is-start" : minute === DAY ? "is-end" : undefined} style={{ left: minute / DAY * 100 + "%" }}>{exceptionClock(minute)}{minute === DAY ? <small>Next day</small> : null}</span>)}</div>
            <div className="edh-track-surface" onPointerMove={movePointer} onPointerLeave={() => { if (!drag.current) setHover(null); }}>
              <div className="edh-track" role="group" tabIndex={0} aria-label="24-hour timeline. Add or edit time ranges" onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) { event.preventDefault(); addNextRange(); } }} onPointerDown={beginDrag} onPointerUp={endDrag} onPointerCancel={() => { drag.current = null; setPreview(null); setHover(null); }}>
                {rows.flatMap((item) => exceptionDaySegments(item).map((piece, index) => <button type="button" key={item.id + "-" + index} className={"edh-range" + (item.id === activeId ? " is-active" : "")} style={{ left: piece.start / DAY * 100 + "%", width: (piece.end - piece.start) / DAY * 100 + "%" }} aria-label={"Edit time range: " + interval(item)} onClick={() => openRangeEditor(item)}><span className="edh-range-label">{interval(item)}</span></button>))}
                {!rows.length && !preview ? <span className="edh-empty"><img src="/assets/alarm-rules/schedule/plus.svg" alt="" />Add time range</span> : null}
                {preview ? <div className="edh-drag" aria-hidden="true" style={{ left: preview.start / DAY * 100 + "%", width: (preview.end - preview.start) / DAY * 100 + "%" }} /> : null}
              </div>
              {(hover !== null || preview) && !editor ? <>
                <div className="edh-cursor" aria-hidden="true" style={{ left: (preview ? drag.current?.current ?? preview.end : hover) / DAY * 100 + "%" }} />
                <span className="edh-marker" aria-hidden="true" style={{ left: "clamp(110px, " + (preview ? drag.current?.current ?? preview.end : hover) / DAY * 100 + "%, calc(100% - 110px))" }}>{marker}</span>
              </> : null}
            </div>
          </div>
          {rows.length ? <div className="edh-chips-section">
            {rows.length ? <div className="edh-ranges-heading"><h3>Applied times ({rows.length})</h3></div> : null}
            {rows.length ? <div className="edh-chips">{sortedRows.map((row) => <div className={"edh-chip" + (row.id === activeId ? " is-active" : "")} key={row.id}>
              <button type="button" className="edh-chip-edit" aria-label={"Edit time range: " + interval(row)} onClick={() => openRangeEditor(row)}><img src="/assets/camera-monitor/clock.svg" alt="" /><span>{interval(row)}</span></button>
              <button type="button" className="edh-chip-remove" aria-label={"Remove time range: " + interval(row)} onClick={() => removeRange(row.id)}><img src="/assets/alarm-rules/events/close.svg" alt="" /></button>
            </div>)}</div> : null}
          </div> : null}
            {editor ? <div className="edh-editor" ref={editorRef} role="dialog" aria-modal="false" aria-labelledby={editorId} key={editor.id}>
              <div className="edh-editor-heading"><h4 id={editorId} className="edh-editor-title">{editor.isNew ? "Add time range" : "Edit time range"}</h4><button type="button" className="event-sheet__close" aria-label="Close time range editor" onClick={() => setEditor(null)}><img src="/assets/alarm-rules/events/close.svg" alt="" /></button></div>
              <div className="edh-input-row" onFocusCapture={() => setEditorTouched(false)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setEditorTouched(true); }}>
                <ScheduleTimeInput value={editor.start} label="Start time" invalid={editorTouched && Boolean(editorError)} describedBy={editorTouched && editorError ? editorId + "-error" : undefined} onValue={(value) => updateField("start", value)} autoFocus />
                <span className="edh-between" aria-hidden="true"><img src="/assets/alarm-rules/exceptions/arrow.svg" alt="" /></span>
                <ScheduleTimeInput value={editor.end} label="End time" invalid={editorTouched && Boolean(editorError)} describedBy={editorTouched && editorError ? editorId + "-error" : undefined} onValue={(value) => updateField("end", value)} />
              </div>
              <div className="edh-editor-status">{editorTouched && editorError ? <p className="edh-error" id={editorId + "-error"} role="alert">{editorError}</p> : editedRange?.end >= DAY ? <p className="edh-midnight">{editedRange.end - editedRange.start === DAY ? "24 hours" : "Ends the next day"}</p> : null}</div>
              <div className="edh-editor-actions"><button type="button" className="event-sheet__cancel" onClick={() => setEditor(null)}>Cancel</button><button type="button" className="event-sheet__save" disabled={!canApplyEditor} onClick={applyEditor}>Done</button></div>
            </div> : null}
          {message ? <p className="edh-error" role="alert">{message}</p> : null}
        </section>
      </div>
      <div className="event-sheet__actions exception-new__actions">
        <button type="button" className="event-sheet__cancel" onClick={onBack}>Cancel</button>
        <button type="button" className="event-sheet__save" disabled={!canSave} onClick={() => { if (canSave) onSave({ ...initial, dates: [...selected].sort((a, b) => dateValue(a) - dateValue(b)), repeatYearly, zone, type: "hours", ranges: sortedRows.map(({ start, end }) => ({ start, end })) }); }}>Save dates and hours</button>
      </div>
    </section>
  </div>;
}
