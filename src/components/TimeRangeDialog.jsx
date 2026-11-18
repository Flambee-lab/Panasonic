import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useRef, useState } from "react";

const DAY_OPTIONS = [
  ["Monday", "Mon"],
  ["Tuesday", "Tue"],
  ["Wednesday", "Wed"],
  ["Thursday", "Thu"],
  ["Friday", "Fri"],
  ["Saturday", "Sut"],
  ["Sunday", "Sun"],
];

function toParts(total) {
  const hour24 = Math.floor(total / 60) % 24;
  const minute = total % 60;
  return {
    hour: String(hour24 % 12 || 12),
    minute: String(minute).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

function fromParts(hour, minute, period) {
  const parsedHour = Math.min(12, Math.max(1, Number(hour) || 12));
  const parsedMinute = Math.min(59, Math.max(0, Number(minute) || 0));
  let hour24 = parsedHour % 12;
  if (period === "PM") hour24 += 12;
  return hour24 * 60 + parsedMinute;
}

function digits(value, max) {
  const next = value.replace(/\D/g, "").slice(0, 2);
  if (next === "") return "";
  return Number(next) > max ? String(max) : next;
}

function TimeField({ label, hour, minute, period, onHour, onMinute, onPeriod, minuteRef }) {
  return (
    <div className="range-dialog__field">
      <span>{label}</span>
      <div className="range-dialog__well">
        <div className="range-dialog__clock">
          <input
            aria-label={`${label} hour`}
            inputMode="numeric"
            value={hour}
            onChange={(event) => onHour(digits(event.target.value, 12))}
            onBlur={() => onHour(hour === "" || hour === "0" ? "12" : String(Number(hour)))}
          />
          <span>:</span>
          <input
            ref={minuteRef}
            aria-label={`${label} minute`}
            inputMode="numeric"
            value={minute}
            onChange={(event) => onMinute(digits(event.target.value, 59))}
            onBlur={() => onMinute((minute === "" ? "0" : minute).padStart(2, "0"))}
          />
        </div>
        <div className="range-dialog__period">
          {["AM", "PM"].map((value) => (
            <button
              type="button"
              key={value}
              className={period === value ? "is-selected" : ""}
              aria-pressed={period === value}
              onClick={() => onPeriod(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TimeRangeDialog({ start, end, days, onClose, onApply }) {
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
  }, []);

  return (
    <div className="range-dialog" role="presentation">
      <button type="button" className="range-dialog__backdrop" aria-label="Close" onClick={onClose} />
      <section className="range-dialog__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="range-dialog__header">
          <h2 id={titleId}>New time range</h2>
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
        </div>
        <footer className="range-dialog__footer">
          <button type="button" className="range-dialog__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="range-dialog__add"
            onClick={() =>
              onApply({
                start: fromParts(startHour, startMinute, startPeriod),
                end: fromParts(endHour, endMinute, endPeriod),
                days: selected,
              })
            }
          >
            Add new time range
          </button>
        </footer>
      </section>
    </div>
  );
}
