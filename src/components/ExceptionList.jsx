const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TYPE_LABELS = {
  hours: "Different hours",
  day: "Like another day",
  schedule: "Another schedule",
  temporary: "Temporary change",
};

function rankOf(item, index) {
  const span = item.type === "temporary" ? 400 : (item.dates ?? []).length <= 1 ? 300 : 200;
  const ownHours = item.type === "hours" || item.type === "temporary" ? 20 : 0;
  return span + ownHours + index;
}

function withCoverage(items) {
  const winners = new Map();
  items.forEach((item, index) => {
    const dates = item.type === "temporary" ? ["now"] : (item.dates ?? []);
    dates.forEach((key) => {
      const rank = rankOf(item, index);
      const current = winners.get(key);
      if (!current || rank >= current.rank) winners.set(key, { id: item.id, rank });
    });
  });
  return items.map((item) => {
    const dates = item.type === "temporary" ? ["now"] : (item.dates ?? []);
    if (!dates.length) return { ...item, applies: false, status: "No dates selected." };
    const lost = dates.filter((key) => winners.get(key)?.id !== item.id);
    if (!lost.length) {
      return {
        ...item,
        applies: true,
        status: item.type === "temporary" ? "Starts now and ends on its own." : "Applies",
      };
    }
    if (lost.length === dates.length) {
      return { ...item, applies: false, status: "Doesn't apply. A more specific exception covers these dates." };
    }
    return { ...item, applies: true, status: `Applies on ${dates.length - lost.length} of ${dates.length} dates.` };
  });
}

function clockList(minutes) {
  const h24 = Math.floor(minutes / 60) % 24;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const hour = String(h24 % 12 || 12).padStart(2, "0");
  return `${hour}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

function formatDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return `${MONTHS_SHORT[month]} ${day}, ${year}.`;
}

function onlyThisYear(keys) {
  const years = [...new Set(sortedDates(keys).map((key) => key.split("-")[0]))];
  if (years.length === 1) return `Only in ${years[0]}`;
  if (years.length > 1) return "Only in the selected years";
  return "Only this year";
}

function sortedDates(keys) {
  return [...(keys ?? [])].sort((left, right) => {
    const [leftYear, leftMonth, leftDay] = left.split("-").map(Number);
    const [rightYear, rightMonth, rightDay] = right.split("-").map(Number);
    return leftYear - rightYear || leftMonth - rightMonth || leftDay - rightDay;
  });
}

export default function ExceptionList({ items, onCreate, onEdit, onRemove, onShared }) {
  const rows = withCoverage(items);
  return (
    <div className="exception-list">
      <div className="exception-list__toolbar">
        <p>Your alarm rule follows its regular schedule. Add an exception for a specific date.</p>
        <button type="button" className="is-new" onClick={onCreate}>
          New exception
        </button>
        {onShared ? (
          <button type="button" onClick={onShared}>
            Use shared exception list
          </button>
        ) : null}
      </div>
      <div className="exception-list__table">
        <div className="exception-list__head">
          <span>Early closing & Type</span>
          <span>Alarms during</span>
          <span>Date range</span>
        </div>
        {rows.map((item) => (
          <div className={item.applies ? "exception-list__row" : "exception-list__row is-lost"} key={item.id}>
            <div className="exception-list__cells">
              <p className="exception-list__name">
                <strong>{item.name || "Exception"}</strong>
                <span>{TYPE_LABELS[item.type] ?? TYPE_LABELS.hours}</span>
                {item.status ? <em>{item.status}</em> : null}
              </p>
              <p className="exception-list__dates">
                {sortedDates(item.dates).map((key) => (
                  <span key={key}>{formatDate(key)}</span>
                ))}
                {item.repeatYearly ? <em>Repeats every year</em> : <em>{onlyThisYear(item.dates)}</em>}
              </p>
              <p className="exception-list__hours">
                {item.type === "day" ? <span>Like {item.likeDay}</span> : null}
                {item.type === "schedule" ? <span>{item.scheduleName}</span> : null}
                {item.type === "temporary" ? <span>Until {item.endsLabel}</span> : null}
                {item.type !== "day" && item.type !== "schedule" && item.type !== "temporary"
                  ? (item.ranges ?? []).map((range) => (
                      <span key={`${range.start}-${range.end}`}>
                        {clockList(range.start)} → {clockList(range.end)}
                      </span>
                    ))
                  : null}
              </p>
            </div>
            <div className="exception-list__tools">
              <button
                type="button"
                aria-label={`Remove ${item.name || "exception"}`}
                onClick={() => onRemove(item.id)}
              >
                <img src="/assets/alarm-rules/schedule/trash.svg" alt="" />
              </button>
              <button type="button" aria-label={`Edit ${item.name || "exception"}`} onClick={() => onEdit(item)}>
                <img src="/assets/alarm-rules/pencil.svg" alt="" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
