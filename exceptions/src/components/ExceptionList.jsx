import { exceptionPresentation, exceptionTimeZone } from "../utils/exceptionPresentation";

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

export default function ExceptionList({ items, selectedIds, onToggle, zone }) {
  const selectedRows = new Map(withCoverage(items.filter((item) => selectedIds.includes(item.id))).map((item) => [item.id, item]));
  const rows = items.map((item) => selectedRows.get(item.id) ?? item);
  return (
    <div className="exception-list exception-list--selectable">
      <div className="exception-list__toolbar">
        <p>Select existing exceptions to apply to this rule. The weekly schedule resumes after each exception.</p>
      </div>
      <div className="exception-list__table">
        <div className="exception-list__head">
          <span>Name & type</span>
          <span>Dates & recurrence</span>
          <span>Applied behavior</span>
        </div>
        {rows.map((item) => {
          const row = exceptionPresentation(item, { timeZone: exceptionTimeZone(zone) });
          const selected = selectedIds.includes(item.id);
          return (
          <label
            className={`exception-list__row is-selectable${selected ? " is-selected" : ""}${selected && item.applies === false ? " is-lost" : ""}`}
            key={item.id}
          >
            <input
              type="checkbox"
              className="exception-list__select-input"
              aria-label={`Select ${row.name}`}
              checked={selected}
              onChange={() => onToggle(item.id)}
            />
            <span className={`camera-sheet__check${selected ? " is-on" : ""}`} aria-hidden="true">
              {selected ? <img src="/assets/alarm-rules/cameras/check.svg" alt="" /> : null}
            </span>
            <div className="exception-list__cells">
              <p className="exception-list__name">
                <strong>{row.name}</strong>
                <span>{row.type}</span>
                {selected && item.status && item.status !== "Applies" ? <em>{item.status}</em> : null}
              </p>
              <p className="exception-list__dates">
                <span>{row.date}</span>
                <em>{row.recurrence}</em>
              </p>
              <p className="exception-list__hours">
                {row.behavior.map((line, index) => <span key={index}>{line}</span>)}
              </p>
            </div>
          </label>
          );
        })}
      </div>
    </div>
  );
}
