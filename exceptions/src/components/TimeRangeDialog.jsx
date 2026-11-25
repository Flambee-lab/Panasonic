import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useRef } from "react";
import { TimeField } from "./ScheduleTimeField";
import { scheduleMinutesToParts as toParts, schedulePartsToMinutes as fromParts } from "../utils/scheduleTimeParts";

const DAY_OPTIONS = [
  ["Monday", "Mon"],
  ["Tuesday", "Tue"],
  ["Wednesday", "Wed"],
  ["Thursday", "Thu"],
  ["Friday", "Fri"],
  ["Saturday", "Sat"],
  ["Sunday", "Sun"],
];

export default function TimeRangeDialog({ start, end, days, onClose, onApply, editing = false, onRemove }) {
  useReviewScope("TimeRangeDialog");
  const titleId = useId();
  const endMinuteRef = useRef(null);
  const initialStart = toParts(start);
  const initialEnd = toParts(end);
  const [startHour, setStartHour] = useReviewState("TimeRangeDialog:startHour", initialStart.hour);
  const [startMinute, setStartMinute] = useReviewState("TimeRangeDialog:startMinute", initialStart.minute);
  const [startPeriod, setStartPeriod] = useReviewState("TimeRangeDialog:startPeriod", initialStart.period);
  const [endHour, setEndHour] = useReviewState("TimeRangeDialog:endHour", initialEnd.hour);
  const [endMinute, setEndMinute] = useReviewState("TimeRangeDialog:endMinute", initialEnd.minute);
  const [endPeriod, setEndPeriod] = useReviewState("TimeRangeDialog:endPeriod", initialEnd.period);
  const [selected, setSelected] = useReviewState("TimeRangeDialog:selected", days);

  useEffect(() => {
    endMinuteRef.current?.focus();
    endMinuteRef.current?.select();
  }, []);

  const nextStart = fromParts(startHour, startMinute, startPeriod);
  const rawEnd = fromParts(endHour, endMinute, endPeriod);
  const nextEnd = rawEnd === 0 ? 1440 : rawEnd;
  const hasDays = Object.values(selected).some(Boolean);
  const hasTimes = nextStart !== null && rawEnd !== null;
  const valid = hasTimes && nextEnd > nextStart && hasDays;
  const message = !hasTimes ? "Enter a valid start and end time."
    : nextEnd <= nextStart ? "End time must be after start time. For overnight hours, add a range on each day."
    : !hasDays ? "Select at least one day." : "";

  return (
    <div className="range-dialog" role="presentation">
      <button type="button" className="range-dialog__backdrop" aria-label="Close" onClick={onClose} />
      <section className="range-dialog__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="range-dialog__header">
          <h2 id={titleId}>{editing ? "Edit time range" : "New time range"}</h2>
          <button type="button" className="range-dialog__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/schedule/range/close.svg" alt="" />
          </button>
        </header>
        <div className="range-dialog__body">
          <div className="range-dialog__times">
            <TimeField
              label="Start time"
              hour={startHour}
              minute={startMinute}
              period={startPeriod}
              onHour={setStartHour}
              onMinute={setStartMinute}
              onPeriod={setStartPeriod}
            />
            <img className="range-dialog__arrow" src="/assets/alarm-rules/schedule/range/arrow.svg" alt="" />
            <TimeField
              label="End time"
              hour={endHour}
              minute={endMinute}
              period={endPeriod}
              onHour={setEndHour}
              onMinute={setEndMinute}
              onPeriod={setEndPeriod}
              minuteRef={endMinuteRef}
            />
          </div>
          <div className="range-dialog__repeat">
            <p>Repeat range on...</p>
            <div className="range-dialog__days">
              {DAY_OPTIONS.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={selected[id] ? "is-selected" : ""}
                  aria-pressed={selected[id]}
                  onClick={() => setSelected((current) => ({ ...current, [id]: !current[id] }))}
                >
                  <img
                    src={
                      selected[id]
                        ? "/assets/alarm-rules/schedule/range/check-on.svg"
                        : "/assets/alarm-rules/schedule/range/check-off.svg"
                    }
                    alt=""
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          {message ? <p className="range-dialog__validation" role="status">{message}</p> : null}
        </div>
        <footer className="range-dialog__footer">
          <button type="button" className={`range-dialog__cancel${editing ? " is-remove" : ""}`} disabled={editing && !hasDays} onClick={editing ? () => onRemove(selected) : onClose}>
            {editing ? "Remove" : "Cancel"}
          </button>
          <button
            type="button"
            className="range-dialog__add"
            disabled={!valid}
            onClick={() =>
              onApply({
                start: nextStart,
                end: nextEnd,
                days: selected,
              })
            }
          >
            {editing ? "Save" : "Add new time range"}
          </button>
        </footer>
      </section>
    </div>
  );
}
