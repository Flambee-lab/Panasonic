import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useRef, useState } from "react";
import RuleGuard from "./RuleGuard";
import TimeRangeDialog from "./TimeRangeDialog";

const HOURS = [
  "12:00 AM",
  "2:00 AM",
  "4:00 AM",
  "6:00 AM",
  "8:00 AM",
  "10:00 AM",
  "12:00 PM",
  "2:00 PM",
  "4:00 PM",
  "6:00 PM",
  "8:00 PM",
  "10:00 PM",
];

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ZONES = [
  "(UTC-08:00) Pacific Time (US & Canada)",
  "(UTC-06:00) Central Time (US & Canada)",
  "(UTC-05:00) Eastern Time (US & Canada)",
  "(UTC-03:00) Buenos Aires",
];

const ZONE_OFFSET = {
  "(UTC-08:00) Pacific Time (US & Canada)": -8 * 60,
  "(UTC-06:00) Central Time (US & Canada)": -6 * 60,
  "(UTC-05:00) Eastern Time (US & Canada)": -5 * 60,
  "(UTC-03:00) Buenos Aires": -3 * 60,
};

const DAY = 1440;

function clock(minutes) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${mins ? String(mins).padStart(2, "0") : "00"} ${suffix}`;
}

function spanLabel(start, end) {
  const hours = (end - start) / 60;
  const amount = Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 10) / 10);
  return `${clock(start)} → ${clock(end)} (${amount}hs)`;
}

function piecesOf(ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const items = [];
  let cursor = 0;
  sorted.forEach((range) => {
    if (range.start > cursor) items.push({ kind: "gap", start: cursor, end: range.start });
    items.push({ kind: "range", start: range.start, end: range.end, fresh: Boolean(range.fresh) });
    cursor = range.end;
  });
  if (cursor < DAY) items.push({ kind: "gap", start: cursor, end: DAY });
  return items;
}

function pieceAt(ranges, minutes) {
  return piecesOf(ranges).find((piece) => minutes >= piece.start && minutes < piece.end) ?? null;
}

function minutesFrom(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  return Math.min(DAY, Math.max(0, Math.round(ratio * DAY)));
}

function placeSpan(start, end, day) {
  const left = Math.max(0, (start / day) * 100);
  const right = Math.min(100, (end / day) * 100);
  return { left: `${left}%`, width: `${Math.max(0, right - left)}%` };
}

function pointedMinutes(ratio) {
  return Math.round(ratio * DAY);
}

function withoutRange(list, original) {
  if (!original) return list ?? [];
  return (list ?? []).filter((item) => item.start !== original.start || item.end !== original.end);
}

function withRange(list, range) {
  const next = [];
  (list ?? []).forEach((item) => {
    if (item.end <= range.start || item.start >= range.end) {
      next.push({ start: item.start, end: item.end });
      return;
    }
    if (item.start < range.start) next.push({ start: item.start, end: range.start });
    if (item.end > range.end) next.push({ start: range.end, end: item.end });
  });
  next.push({ start: range.start, end: range.end, fresh: false });
  return next;
}

function overlaps(list, range) {
  return (list ?? []).some((item) => item.end > range.start && item.start < range.end);
}

function shiftWeek(week, delta) {
  const shifted = Object.fromEntries(WEEK_DAYS.map((day) => [day, []]));
  WEEK_DAYS.forEach((day, index) => {
    (week[day] ?? []).forEach((range) => {
      let start = index * DAY + range.start + delta;
      const end = index * DAY + range.end + delta;
      while (start < end) {
        const dayIndex = Math.floor(start / DAY);
        const boundary = Math.min(end, (dayIndex + 1) * DAY);
        const target = WEEK_DAYS[((dayIndex % 7) + 7) % 7];
        shifted[target].push({ start: start - dayIndex * DAY, end: boundary - dayIndex * DAY });
        start = boundary;
      }
    });
  });
  return shifted;
}

function lostDays(before, after) {
  return WEEK_DAYS.filter((day) => {
    const previous = before[day] ?? [];
    const next = after[day] ?? [];
    return previous.some((range) => !next.some((item) => item.start === range.start && item.end === range.end)) && next.length > 0;
  });
}

function asWeekly(ranges) {
  const hasDay = WEEK_DAYS.some((day) => ranges?.[day]?.length);
  if (hasDay || !ranges?.Everyday?.length) return ranges ?? {};
  return Object.fromEntries(WEEK_DAYS.map((day) => [day, ranges.Everyday]));
}

export default function ScheduleSheet({ onClose, onSave, initialRanges = {}, initialZone, leaving = false }) {
  useReviewScope("ScheduleSheet");
  const titleId = useId();
  const [zone, setZone] = useReviewState("ScheduleSheet:zone", initialZone && ZONES.includes(initialZone) ? initialZone : ZONES[0]);
  const [zoneOpen, setZoneOpen] = useReviewState("ScheduleSheet:zoneOpen", false);
  const [rangesByRow, setRangesByRow] = useReviewState("ScheduleSheet:rangesByRow", () => asWeekly(initialRanges));
  const [notice, setNotice] = useState("");
  const [replaced, setReplaced] = useReviewState("ScheduleSheet:replaced", {});
  const [clearDay, setClearDay] = useReviewState("ScheduleSheet:clearDay", null);
  const [emptySave, setEmptySave] = useReviewState("ScheduleSheet:emptySave", false);
  const [barHover, setBarHover] = useState(null);
  const [trashHover, setTrashHover] = useState(null);
  const [copyFor, setCopyFor] = useReviewState("ScheduleSheet:copyFor", null);
  const [copyBox, setCopyBox] = useState(null);
  const [copyDays, setCopyDays] = useReviewState("ScheduleSheet:copyDays", () =>
    Object.fromEntries(WEEK_DAYS.map((day) => [day, day === "Monday"])),
  );
  const [editor, setEditor] = useReviewState("ScheduleSheet:editor", null);
  const [cursor, setCursor] = useState(null);
  const [drag, setDrag] = useState(null);
  const [recentRange, setRecentRange] = useState(null);
  const [overwrite, setOverwrite] = useReviewState("ScheduleSheet:overwrite", null);
  const dragRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (overwrite) setOverwrite(null);
      else if (clearDay) setClearDay(null);
      else if (emptySave) setEmptySave(false);
      else if (editor) setEditor(null);
      else if (copyFor) setCopyFor(null);
      else if (zoneOpen) setZoneOpen(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editor, overwrite, clearDay, emptySave, copyFor, zoneOpen, onClose]);

  useEffect(() => {
    if (!recentRange) return;
    const timer = window.setTimeout(() => setRecentRange(null), 1600);
    return () => window.clearTimeout(timer);
  }, [recentRange]);

  const rows = WEEK_DAYS;

  const commit = (recipe, note) => {
    const next = recipe(rangesByRow);
    const days = lostDays(rangesByRow, next);
    setNotice(note ?? (days.length ? `${days.join(", ")}: the new range replaced the hours it covered.` : ""));
    setReplaced(note ? {} : Object.fromEntries(days.map((day) => [day, true])));
    setRangesByRow(next);
  };

  const changeZone = (next) => {
    const delta = (ZONE_OFFSET[next] ?? 0) - (ZONE_OFFSET[zone] ?? 0);
    setZone(next);
    setZoneOpen(false);
    const hasHours = WEEK_DAYS.some((day) => (rangesByRow[day] ?? []).length);
    if (!delta || !hasHours) return;
    const hours = Math.abs(delta) / 60;
    const direction = delta > 0 ? "later" : "earlier";
    commit(
      (current) => shiftWeek(current, delta),
      `Hours moved ${hours} ${hours === 1 ? "hour" : "hours"} ${direction}. They are the same moment of the day in the new zone.`,
    );
  };

  const openEditor = (row, ranges, minutes) => {
    setRecentRange(null);
    setCursor(null);
    minutes = Math.min(DAY - 1, Math.max(0, minutes));
    const piece = ranges.length ? pieceAt(ranges, minutes) : null;
    const original = piece?.kind === "range" ? { start: piece.start, end: piece.end } : null;
    let start = original?.start;
    let end = original?.end;
    if (!original) {
      const host = piece?.kind === "gap" ? piece : { kind: "gap", start: 0, end: DAY };
      if (host.kind !== "gap" || host.end - host.start < 1) return;
      start = Math.max(host.start, Math.min(Math.floor(minutes / 60) * 60, host.end - 1));
      end = Math.min(host.end, start + 60);
      if (end <= start) return;
    }
    const activeDay = WEEK_DAYS.includes(row) ? row : "Monday";
    setEditor({
      row,
      original,
      start,
      end,
      days: Object.fromEntries(WEEK_DAYS.map((day) => [day, day === activeDay])),
    });
  };

  const applyEditor = ({ start, end, days }) => {
    if (!editor || end <= start) return;
    if (editor.fromDrag) {
      writeEditor({ start, end, days });
      return;
    }
    const range = { start, end };
    const chosen = WEEK_DAYS.filter((day) => days[day]);
    const targets = chosen;
    if (!targets.length) return;
    const hit = targets.some((day) =>
      overlaps(withoutRange(rangesByRow[day], editor.original), range),
    );
    if (hit) {
      setOverwrite({ start, end, days });
      return;
    }
    writeEditor({ start, end, days });
  };

  const writeEditor = ({ start, end, days }) => {
    if (!editor || end <= start) return;
    const targets = WEEK_DAYS.filter((day) => days[day]);
    if (!targets.length) return;
    commit((current) => {
      const next = { ...current };
      targets.forEach((day) => {
        next[day] = withRange(withoutRange(next[day], editor.original), { start, end });
      });
      return next;
    });
    setRecentRange({ start, end, days: targets });
    setEditor(null);
  };

  const removeEditor = (days) => {
    if (!editor?.original) return;
    const targets = WEEK_DAYS.filter((day) => days[day]);
    if (!targets.length) return;
    commit((current) => {
      const next = { ...current };
      targets.forEach((day) => {
        next[day] = withoutRange(next[day], editor.original);
      });
      return next;
    }, "The selected time range was removed from the selected days. Other ranges were kept.");
    setEditor(null);
  };

  const trackCursor = (event) => {
    const ranges = event.currentTarget.closest(".schedule-sheet__ranges");
    const track = ranges?.querySelector(".schedule-sheet__track");
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const dragging = Boolean(dragRef.current);
    if (!dragging && !event.target.closest(".schedule-sheet__bar")) setBarHover(null);
    if (!dragging && (event.clientX < trackRect.left || event.clientX > trackRect.right)) {
      setCursor(null);
      return;
    }
    const x = Math.min(trackRect.right, Math.max(trackRect.left, event.clientX));
    const ratio = trackRect.width ? (x - trackRect.left) / trackRect.width : 0;
    const rangesRect = ranges.getBoundingClientRect();
    setCursor({
      left: x - rangesRect.left,
      label: clock(pointedMinutes(ratio)),
    });
  };

  const beginDrag = (event, row) => {
    if (event.button !== 0) return;
    setRecentRange(null);
    event.preventDefault();
    const minutes = minutesFrom(event);
    const rowRanges = rangesByRow[row] ?? [];
    const piece = rowRanges.length ? pieceAt(rowRanges, minutes) : { kind: "empty" };
    setBarHover(piece ? { row, ...piece, minutes } : null);
    dragRef.current = {
      row,
      anchor: minutes,
      current: minutes,
      originX: event.clientX,
      moved: false,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    trackCursor(event);
  };

  const moveDrag = (event) => {
    const active = dragRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const minutes = minutesFrom(event);
    if (Math.abs(event.clientX - active.originX) >= 8) active.moved = true;
    active.current = minutes;
    if (active.moved) setDrag({ row: active.row, anchor: active.anchor, current: minutes });
  };

  const endDrag = (event, row, ranges) => {
    const active = dragRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    setBarHover(null);
    setCursor(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!active.moved) {
      openEditor(row, ranges, minutesFrom(event));
      return;
    }
    let start = Math.round(Math.min(active.anchor, active.current));
    let end = Math.round(Math.max(active.anchor, active.current));
    if (end <= start) end = Math.min(DAY, start + 1);
    if (start >= DAY || end <= start) return;
    setEditor({
      row,
      original: null,
      fromDrag: true,
      start,
      end,
      days: Object.fromEntries(WEEK_DAYS.map((day) => [day, day === row])),
    });
  };

  const cursorLabel = drag
    ? `${clock(Math.min(drag.anchor, drag.current))}–${clock(Math.max(drag.anchor, drag.current))}`
    : barHover?.kind === "range"
      ? spanLabel(barHover.start, barHover.end)
      : barHover
        ? `Drag to select hours · ${cursor?.label ?? clock(barHover.minutes ?? 0)}`
        : cursor?.label;

  return (
    <div className={leaving ? "schedule-sheet is-leaving" : "schedule-sheet"} role="presentation">
      <button type="button" className="schedule-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <section className="schedule-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="schedule-sheet__header">
          <div className="schedule-sheet__intro">
            <span className="event-sheet__mark" aria-hidden="true">
              <span className="event-sheet__mark-spin">
                <img src="/assets/alarm-rules/events/mark.svg" alt="" />
              </span>
            </span>
            <div className="schedule-sheet__heading">
              <h2 id={titleId}>Schedule dates and time</h2>
            </div>
          </div>
            <div className="schedule-sheet__end">
            <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
              <img src="/assets/alarm-rules/events/close.svg" alt="" />
            </button>
          </div>
        </header>

        <div className="schedule-sheet__body">
          {notice ? <p className="schedule-sheet__note">{notice}</p> : null}
          <div className="schedule-sheet__card">
            <div className="schedule-sheet__summary">
              <div className="schedule-sheet__description">
                <img src="/assets/alarm-rules/schedule/info.svg" alt="" />
                <p><span className="schedule-sheet__hours-emphasis">Event alarms will appear only during these hours</span>, unless an exception applies.</p>
              </div>
            <div className="schedule-sheet__zone">
              <button
                type="button"
                className="schedule-sheet__zone-btn"
                aria-expanded={zoneOpen}
                onClick={() => setZoneOpen((open) => !open)}
              >
                <span className="stable-label">
                  {ZONES.map((option) => (
                    <span key={option} className={option === zone ? "is-current" : undefined} aria-hidden={option !== zone}>
                      {option}
                    </span>
                  ))}
                </span>
                <img src="/assets/alarm-rules/schedule/chevron.svg" alt="" />
              </button>
              {zoneOpen ? (
                <div className="schedule-sheet__zone-menu" role="listbox" aria-label="Time zone">
                  {ZONES.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={option === zone ? "is-active" : ""}
                      onClick={() => changeZone(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            </div>
            <div
              className="schedule-sheet__ranges"
              onPointerMove={trackCursor}
              onPointerLeave={() => {
                if (dragRef.current) return;
                setCursor(null);
                setBarHover(null);
              }}
            >
              {cursor ? (
                <div className="schedule-sheet__marker" style={{ left: cursor.left }}>
                  <span role="tooltip">
                    {cursorLabel}
                  </span>
                  <span className="schedule-sheet__marker-line" aria-hidden="true" />
                </div>
              ) : null}
              <div className="schedule-sheet__hours" aria-hidden="true">
                <span className="schedule-sheet__hours-gap" />
                <div className="schedule-sheet__hours-track">
                  {HOURS.map((hour, index) => (
                    <span key={hour} style={{ left: `${((index + 0.5) / HOURS.length) * 100}%` }}>
                      {hour}
                    </span>
                  ))}
                </div>
                <span className="schedule-sheet__hours-actions" />
              </div>

              {rows.map((row) => {
                const ranges = rangesByRow[row] ?? [];
                const hot = editor?.row === row
                  ? (editor.original ? { kind: "range", ...editor.original } : { kind: "empty", ...pieceAt(ranges, editor.start) })
                  : (barHover?.row === row ? barHover : null);
                return (
                <div className="schedule-sheet__row" key={row}>
                  <span className="schedule-sheet__day">
                    {row}
                    {replaced[row] ? <em>Replaced</em> : null}
                  </span>
                  <div className="schedule-sheet__track">
                    <div
                      className="schedule-sheet__bar"
                      role="button"
                      tabIndex={0}
                      aria-label={`${row}: add or edit time ranges`}
                      aria-description="Click or drag to add a time range. Press Enter to open the time editor."
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openEditor(row, ranges, ranges[0]?.start ?? 0);
                        }
                      }}
                      onMouseMove={(event) => {
                        if (dragRef.current) return;
                        const minutes = minutesFrom(event);
                        if (!ranges.length) {
                          setBarHover({ row, kind: "empty", minutes });
                          return;
                        }
                        const piece = pieceAt(ranges, minutes);
                        setBarHover(piece ? { row, ...piece, minutes } : null);
                      }}
                      onMouseLeave={() => setBarHover((current) => (current?.row === row ? null : current))}
                      onPointerDown={(event) => beginDrag(event, row)}
                      onPointerMove={moveDrag}
                      onPointerUp={(event) => endDrag(event, row, ranges)}
                      onPointerCancel={() => {
                        dragRef.current = null;
                        setDrag(null);
                        setBarHover(null);
                        setCursor(null);
                      }}
                    >
                      {ranges.length === 0 ? (
                        <div
                          className={`schedule-sheet__empty${hot?.kind === "empty" || (editor?.row === row && !editor.original) ? " is-hot" : ""}`}
                        >
                          <img src="/assets/alarm-rules/schedule/plus.svg" alt="" />
                          <span>Click or drag to add time</span>
                        </div>
                      ) : (
                        <div className="schedule-sheet__segments">
                          {piecesOf(ranges).map((piece) => {
                            const active =
                              hot?.kind === piece.kind && hot.start === piece.start && hot.end === piece.end;
                            const wide = piece.end - piece.start >= 240;
                            const recent = piece.kind === "range" && recentRange?.days.includes(row)
                              && piece.start === recentRange.start && piece.end === recentRange.end;
                            return (
                              <div
                                key={`${piece.kind}-${piece.start}`}
                                data-start={piece.start}
                                data-end={piece.end}
                                className={`schedule-sheet__segment is-${piece.kind}${active ? " is-hot" : ""}${wide ? " is-wide" : ""}${piece.fresh ? " is-new" : ""}${recent ? " is-recent" : ""}`}
                                style={placeSpan(piece.start, piece.end, DAY)}
                              >
                                {piece.kind === "range" && piece.fresh ? <em>New</em> : null}
                                {piece.kind === "range" && active ? (
                                  <img className="schedule-sheet__pencil" src="/assets/alarm-rules/schedule/pencil.svg" alt="" />
                                ) : null}
                                {piece.kind === "gap" && (active || piece.start === 0) ? (
                                  <img
                                    className={`${wide || piece.start === 0 ? "schedule-sheet__lead-plus" : "schedule-sheet__gap-plus"}${active ? "" : " schedule-sheet__idle-plus"}`}
                                    src="/assets/alarm-rules/schedule/plus.svg"
                                    alt=""
                                  />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {drag?.row === row || (editor?.fromDrag && editor.row === row) ? (
                        <div
                          className="schedule-sheet__drag"
                          style={placeSpan(
                            drag?.row === row ? Math.min(drag.anchor, drag.current) : editor.start,
                            drag?.row === row ? Math.max(drag.anchor, drag.current) : editor.end,
                            DAY,
                          )}
                        >
                          <img className="schedule-sheet__lead-plus" src="/assets/alarm-rules/schedule/plus.svg" alt="" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="schedule-sheet__tools">
                    <button
                      type="button"
                      className={`schedule-sheet__tool${ranges.length ? " is-ready" : ""}${trashHover === row ? " is-hot" : ""}`}
                      aria-label={`Remove all ${row} time ranges`}
                      disabled={!ranges.length}
                      onMouseEnter={() => ranges.length && setTrashHover(row)}
                      onMouseLeave={() => setTrashHover((current) => (current === row ? null : current))}
                      onClick={() => {
                        if (!(rangesByRow[row] ?? []).length) return;
                        setClearDay(row);
                      }}
                    >
                      <img src="/assets/alarm-rules/schedule/trash.svg" alt="" />
                      {trashHover === row ? <span className="schedule-sheet__tip">Remove all time ranges</span> : null}
                    </button>
                    <button
                      type="button"
                      className={`schedule-sheet__tool${ranges.length ? " is-ready" : ""}`}
                      disabled={!ranges.length}
                      aria-label={`Repeat ${row} weekly`}
                      aria-expanded={copyFor === row}
                      onClick={(event) => {
                        if (copyFor === row) {
                          setCopyFor(null);
                          setCopyBox(null);
                          return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        const height = 332;
                        const top = Math.max(16, Math.min(rect.top, window.innerHeight - height - 16));
                        setCopyDays(Object.fromEntries(WEEK_DAYS.map((day) => [day, day === row])));
                        setCopyBox({ top, left: rect.left - 228 });
                        setCopyFor(row);
                      }}
                    >
                      <img src="/assets/alarm-rules/schedule/copy.svg" alt="" />
                    </button>
                    {copyFor === row && copyBox ? (
                      <div className="schedule-sheet__copy" style={{ top: copyBox.top, left: copyBox.left }}>
                        <p>Repeat ranges on...</p>
                        {WEEK_DAYS.map((day) => (
                          <button
                            type="button"
                            key={day}
                            className={copyDays[day] ? "is-checked" : ""}
                            aria-pressed={copyDays[day]}
                            onClick={() => setCopyDays((current) => ({ ...current, [day]: !current[day] }))}
                          >
                            <span>{day}</span>
                            <img
                              src={
                                copyDays[day]
                                  ? "/assets/alarm-rules/people/check-on.svg"
                                  : "/assets/alarm-rules/people/check-off.svg"
                              }
                              alt=""
                            />
                          </button>
                        ))}
                        <button
                          type="button"
                          className="schedule-sheet__copy-apply"
                          onClick={() => {
                            commit((current) => {
                              const source = (current[row] ?? []).map((range) => ({ ...range }));
                              const next = { ...current };
                              WEEK_DAYS.forEach((day) => {
                                if (copyDays[day]) next[day] = source.map((range) => ({ ...range }));
                              });
                              return next;
                            });
                            setCopyFor(null);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="schedule-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="event-sheet__save"
            onClick={() => {
              if (!WEEK_DAYS.some((day) => (rangesByRow[day] ?? []).length)) setEmptySave(true);
              else onSave({ repeat: "weekly", ranges: rangesByRow, zone });
            }}
          >
            Save time ranges
          </button>
        </div>
      </section>
      {overwrite ? (
        <RuleGuard
          title="This time is already set"
          confirmLabel="Overwrite"
          cancelLabel="Keep it"
          onCancel={() => setOverwrite(null)}
          onConfirm={() => {
            const pending = overwrite;
            setOverwrite(null);
            writeEditor(pending);
          }}
        >
          <p>
            {overwrite.row ? `${overwrite.row} already has hours here.` : "These hours are already set."} Overwrite the part you covered? The rest of that block stays.
          </p>
        </RuleGuard>
      ) : null}
      {clearDay ? (
        <RuleGuard
          title={`Remove ${clearDay}'s hours?`}
          confirmLabel="Remove hours"
          cancelLabel="Keep them"
          onCancel={() => setClearDay(null)}
          onConfirm={() => {
            const day = clearDay;
            setClearDay(null);
            commit((current) => ({ ...current, [day]: [] }));
          }}
        >
          <p>This day already has hours. Clearing it means no alarms that day. Other days keep their hours.</p>
        </RuleGuard>
      ) : null}
      {emptySave ? (
        <RuleGuard
          title="Alarms would show at all times"
          confirmLabel="Save as always on"
          onCancel={() => setEmptySave(false)}
          onConfirm={() => {
            setEmptySave(false);
            onSave({ repeat: "weekly", ranges: rangesByRow, zone });
          }}
        >
          <p>This week has no hours. Saving it means the rule shows alarms all day, every day, until you add a schedule.</p>
        </RuleGuard>
      ) : null}
      {editor ? (
        <TimeRangeDialog
          start={editor.start}
          end={editor.end}
          days={editor.days}
          editing={Boolean(editor.original)}
          onRemove={removeEditor}
          onClose={() => setEditor(null)}
          onApply={applyEditor}
        />
      ) : null}
    </div>
  );
}
