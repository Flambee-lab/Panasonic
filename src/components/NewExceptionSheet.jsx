import { useEffect, useId, useRef, useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const TYPES = [
  { id: "hours", label: "Different hours" },
  { id: "day", label: "Like another day" },
  { id: "schedule", label: "Another schedule" },
];
const LIKE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ENDS = [
  { id: "today-18", label: "Today, 6:00 PM" },
  { id: "tomorrow-6", label: "Tomorrow, 6:00 AM" },
  { id: "tomorrow-8", label: "Tomorrow, 8:00 AM" },
];

function hoursFor(ranges, day) {
  if (!ranges || !day) return [];
  if (ranges[day]?.length) return ranges[day];
  const named = LIKE_DAYS.some((name) => ranges[name]?.length);
  if (!named && ranges.Everyday?.length) return ranges.Everyday;
  return [];
}

function firstLikeDay(ranges, preferred) {
  if (hoursFor(ranges, preferred).length) return preferred;
  return LIKE_DAYS.find((day) => hoursFor(ranges, day).length) ?? "";
}

function clock(minutes) {
  const h24 = Math.floor(minutes / 60) % 24;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const hour = h24 % 12 || 12;
  return `${hour}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month, day);
}

function repeatSentence(keys, repeatYearly) {
  if (!keys.length) {
    return repeatYearly
      ? "The dates you select repeat every year."
      : "The dates you select apply only this year.";
  }
  const first = dateFromKey(keys[0]);
  const weekday = WEEKDAY_NAMES[first.getDay()];
  const label = `${MONTHS_SHORT[first.getMonth()]} ${first.getDate()}, ${first.getFullYear()}`;
  const weekend = first.getDay() === 0 || first.getDay() === 6;
  if (!repeatYearly) {
    return weekend ? `${label} is a ${weekday}. These dates apply only this year.` : "The dates you select apply only this year.";
  }
  const next = new Date(first.getFullYear() + 1, first.getMonth(), first.getDate());
  const nextWeekday = WEEKDAY_NAMES[next.getDay()];
  const moved = weekday !== nextWeekday ? " A holiday that moves, like the fourth Thursday, will not follow this fixed date." : "";
  const weekendNote = weekend ? " It falls on a weekend." : "";
  return `${label} is a ${weekday}. In ${next.getFullYear()} that same date is a ${nextWeekday}.${moved}${weekendNote}`;
}

function monthCells(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    cells.push(day);
  }
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks.filter((week) => week.some((day) => day.getMonth() === cursor.getMonth()));
}

export default function NewExceptionSheet({
  initial = null,
  scheduleRanges = null,
  namedSchedules = [],
  unavailableSchedules = [],
  onBack,
  onClose,
  onSave,
  leaving = false,
}) {
  const titleId = useId();
  const nameRef = useRef(null);
  const [name, setName] = useState(initial?.name ?? "After hours");
  const [cursor, setCursor] = useState(() => {
    const first = initial?.dates?.[0];
    if (!first) return new Date(2026, 10, 1);
    const [year, month] = first.split("-").map(Number);
    return new Date(year, month, 1);
  });
  const [selected, setSelected] = useState(() => new Set(initial?.dates ?? []));
  const [repeatYearly, setRepeatYearly] = useState(initial?.repeatYearly ?? true);
  const [type, setType] = useState(initial?.type ?? "hours");
  const [ranges, setRanges] = useState(initial?.ranges?.length ? initial.ranges : [{ start: 10 * 60, end: 12 * 60 }]);
  const [likeDay, setLikeDay] = useState(() => firstLikeDay(scheduleRanges, initial?.likeDay ?? "Monday"));
  const [scheduleId, setScheduleId] = useState(initial?.scheduleId ?? namedSchedules[0]?.id ?? "");
  const [endsId, setEndsId] = useState(initial?.endsId ?? ENDS[1].id);
  const [block, setBlock] = useState("");
  const dayHours = hoursFor(scheduleRanges, likeDay).length;
  const daysWithHours = LIKE_DAYS.filter((day) => hoursFor(scheduleRanges, day).length).length;
  const chosenSchedule = namedSchedules.find((schedule) => schedule.id === scheduleId) ?? null;

  useEffect(() => {
    const input = nameRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  useEffect(() => {
    setLikeDay((current) => {
      if (hoursFor(scheduleRanges, current).length) return current;
      return LIKE_DAYS.find((day) => hoursFor(scheduleRanges, day).length) ?? "";
    });
  }, [scheduleRanges]);

  const shiftMonth = (amount) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const toggleDate = (day) => {
    const key = dateKey(day);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (day.getMonth() !== cursor.getMonth() || day.getFullYear() !== cursor.getFullYear()) {
      setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const addRange = () => {
    setRanges((rows) => {
      if (!rows.length) return [{ start: 10 * 60, end: 12 * 60 }];
      const start = rows[rows.length - 1].end;
      if (start >= 23 * 60) return rows;
      return [...rows, { start, end: Math.min(start + 60, 24 * 60) }];
    });
  };

  return (
    <div className={leaving ? "exception-sheet is-stacked is-leaving" : "exception-sheet is-stacked"} role="presentation">
      <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <section className="exception-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="exception-new__header">
          <button type="button" className="event-sheet__close" aria-label="Back" onClick={onBack}>
            <img src="/assets/alarm-rules/exceptions/back.svg" alt="" />
          </button>
          <h2 id={titleId}>New exception</h2>
          <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>
        <div className="exception-new__body">
          <section className="exception-new__col is-name" aria-label="Exception name">
            <div className="exception-new__name">
              <div className="exception-new__name-top">
                <h3>1. Exception name</h3>
                <input
                  ref={nameRef}
                  value={name}
                  aria-label="Exception name"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <p>Think of a name that describes their intended use. Ex: "Example 1", "Example 2" or "Example 3".</p>
            </div>
          </section>
          <section className="exception-new__col is-dates" aria-label="Exception dates">
            <div className="exception-new__card">
              <div className="exception-new__dates">
                <h3>
                  {type === "temporary" ? (
                    "2. This change starts now"
                  ) : (
                    <>
                      2. Select the date(s)
                      <br />
                      you want to assign exceptions to
                    </>
                  )}
                </h3>
                {type === "temporary" ? (
                  <p className="exception-new__prompt">
                    It ends {ENDS.find((option) => option.id === endsId)?.label?.toLowerCase()}. You do not pick dates, and you do not have to delete it later.
                  </p>
                ) : null}
                <div className="exception-new__cal" hidden={type === "temporary"}>
                  <div className="exception-new__month">
                    <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                      <img src="/assets/alarm-rules/exceptions/chevron-left.svg" alt="" />
                    </button>
                    <p>
                      {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                    </p>
                    <button type="button" className="is-next" aria-label="Next month" onClick={() => shiftMonth(1)}>
                      <img src="/assets/alarm-rules/exceptions/chevron-right.svg" alt="" />
                    </button>
                  </div>
                  <div className="exception-new__week" aria-hidden="true">
                    {WEEKDAYS.map((label, index) => (
                      <span key={`${label}-${index}`}>{label}</span>
                    ))}
                  </div>
                  <div className="exception-new__days">
                    {monthCells(cursor).map((week) =>
                      week.map((day) => {
                        const outside = day.getMonth() !== cursor.getMonth();
                        const key = dateKey(day);
                        const pressed = selected.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={outside ? "is-outside" : undefined}
                            aria-pressed={pressed}
                            aria-label={`${MONTHS[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`}
                            onClick={() => toggleDate(day)}
                          >
                            {day.getDate()}
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>
              </div>
              <div className="exception-new__yearly" hidden={type === "temporary"}>
                <button
                  type="button"
                  className="exception-new__repeat"
                  aria-pressed={repeatYearly}
                  aria-describedby="exception-repeat-note"
                  onClick={() => setRepeatYearly((current) => !current)}
                >
                  {repeatYearly ? (
                    <img src="/assets/alarm-rules/exceptions/check.svg" alt="" />
                  ) : (
                    <span className="exception-new__check-off" />
                  )}
                  Repeat every year
                </button>
                <p id="exception-repeat-note" className="exception-new__repeat-note">
                  {repeatSentence([...selected], repeatYearly)}
                </p>
              </div>
            </div>
          </section>
          <section className="exception-new__col is-type" aria-label="Exception type">
            <div className="exception-new__card is-type">
              <div className="exception-new__type-head">
                <h3>3. Exception type</h3>
                <div className="exception-new__types" role="radiogroup" aria-label="Exception type">
                  {TYPES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={type === option.id}
                      className={type === option.id ? "is-selected" : undefined}
                      onClick={() => setType(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {type === "hours" ? (
                <div className="exception-new__hours">
                  <div className="exception-new__hours-stack">
                    <div className="exception-new__hours-label">
                      <p>Adjust hours to display alarms during (Pacific Time)</p>
                      <button type="button" aria-label="Add time range" onClick={addRange}>
                        <img src="/assets/alarm-rules/exceptions/plus.svg" alt="" />
                      </button>
                    </div>
                    {ranges.map((range, index) => (
                      <div className="exception-new__time-row" key={`${range.start}-${range.end}-${index}`}>
                        <div>{clock(range.start)}</div>
                        <span>
                          <img src="/assets/alarm-rules/exceptions/arrow.svg" alt="" />
                        </span>
                        <div>{clock(range.end)}</div>
                        <button
                          type="button"
                          aria-label="Remove time range"
                          onClick={() => setRanges((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                        >
                          <img src="/assets/alarm-rules/schedule/trash.svg" alt="" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="exception-new__note">
                    <img src="/assets/alarm-rules/exceptions/info.svg" alt="" />
                    <p>Outside these hours, alarms are hidden for these dates.</p>
                  </div>
                </div>
              ) : null}
              {type === "day" ? (
                <div className="exception-new__hours">
                  <p className="exception-new__prompt">These dates follow a day that already has hours on this schedule.</p>
                  <div className="exception-new__like" role="radiogroup" aria-label="Day to follow">
                    {LIKE_DAYS.map((day) => {
                      const open = hoursFor(scheduleRanges, day).length > 0;
                      return (
                        <button
                          key={day}
                          type="button"
                          role="radio"
                          aria-checked={likeDay === day}
                          disabled={!open}
                          className={likeDay === day ? "is-selected" : undefined}
                          onClick={() => setLikeDay(day)}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="exception-new__note is-explain">
                    <img src="/assets/alarm-rules/exceptions/info.svg" alt="" />
                    <p>
                      {daysWithHours === 0
                        ? "No day has hours on this schedule yet. Set hours for a day and it can be followed."
                        : daysWithHours === LIKE_DAYS.length
                          ? "Every day on this schedule has hours, so any of them can be followed."
                          : "Only days with hours on this schedule can be selected. Set hours for another day and it becomes available here."}
                    </p>
                  </div>
                </div>
              ) : null}
              {type === "schedule" ? (
                <div className="exception-new__hours">
                  <p className="exception-new__prompt">These dates use the schedule you pick.</p>
                  <div className="exception-new__schedules" role="radiogroup" aria-label="Schedule to use">
                    {namedSchedules.length ? (
                      namedSchedules.map((schedule) => (
                        <button
                          key={schedule.id}
                          type="button"
                          role="radio"
                          aria-checked={scheduleId === schedule.id}
                          className={scheduleId === schedule.id ? "is-selected" : undefined}
                          onClick={() => setScheduleId(schedule.id)}
                        >
                          {schedule.name}
                        </button>
                      ))
                    ) : (
                      <p className="exception-new__prompt">There is no other schedule with weekly hours to use.</p>
                    )}
                  </div>
                  {unavailableSchedules.length ? (
                    <div className="exception-new__note">
                      <img src="/assets/alarm-rules/exceptions/info.svg" alt="" />
                      <p>
                        {unavailableSchedules.map((schedule) => `${schedule.name}: ${schedule.reason}`).join(" ")}
                      </p>
                    </div>
                  ) : null}
                  <div className="exception-new__note">
                    <img src="/assets/alarm-rules/exceptions/info.svg" alt="" />
                    <p>The dates you select follow that schedule instead of this rule’s weekly plan.</p>
                  </div>
                </div>
              ) : null}
              {type === "temporary" ? (
                <div className="exception-new__hours">
                  <p className="exception-new__prompt">Starts now and ends on its own. Nothing to undo later.</p>
                  <div className="exception-new__schedules" role="radiogroup" aria-label="When it ends">
                    {ENDS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={endsId === option.id}
                        className={endsId === option.id ? "is-selected" : undefined}
                        onClick={() => setEndsId(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
        <div className="event-sheet__actions exception-new__actions">
          {block ? <p className="exception-new__block">{block}</p> : null}
          <button type="button" className="event-sheet__cancel" onClick={onBack}>
            Cancel
          </button>
          <button
            type="button"
            className="event-sheet__save"
            disabled={
              !name.trim() ||
              (type !== "temporary" && selected.size === 0) ||
              (type === "day" && dayHours === 0) ||
              (type === "schedule" && !chosenSchedule)
            }
            onClick={() => {
              if (!name.trim()) {
                setBlock("Name this exception.");
                return;
              }
              if (type !== "temporary" && selected.size === 0) {
                setBlock("Select at least one date.");
                return;
              }
              if (type === "day" && dayHours === 0) {
                setBlock(`${likeDay} has no hours on this rule, so this exception would not change anything.`);
                return;
              }
              if (type === "schedule" && !chosenSchedule) {
                setBlock("Pick a schedule that exists, or choose another exception type.");
                return;
              }
              setBlock("");
              onSave({
                name: name.trim(),
                dates: type === "temporary" ? [] : [...selected],
                repeatYearly: type === "temporary" ? false : repeatYearly,
                type,
                ranges,
                likeDay,
                scheduleId: chosenSchedule?.id ?? "",
                scheduleName: chosenSchedule?.name ?? "",
                endsId,
                endsLabel: ENDS.find((option) => option.id === endsId)?.label ?? "",
              });
            }}
          >
            Save Exception
          </button>
        </div>
      </section>
    </div>
  );
}
