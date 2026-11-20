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

export default function ExceptionList({ items, onCreate, onEdit, onRemove, onShared, zone }) {
  const rows = withCoverage(items);
  return (
    <div className="exception-list">
      <div className="exception-list__toolbar">
        <p>Manage special dates and holiday lists. The weekly schedule resumes after each exception.</p>
        {onShared ? (
          <button type="button" onClick={onShared}>
            Use shared exception list
          </button>
        ) : null}
        <button type="button" className="is-new" onClick={onCreate}>
          New exception
        </button>
      </div>
      <div className="exception-list__table">
        <div className="exception-list__head">
          <span>Name & type</span>
          <span>Dates & recurrence</span>
          <span>Applied behavior</span>
        </div>
        {rows.map((item) => {
          const row = exceptionPresentation(item, { timeZone: exceptionTimeZone(zone) });
          return (
          <div className={item.applies ? "exception-list__row" : "exception-list__row is-lost"} key={item.id}>
            <div className="exception-list__cells">
              <p className="exception-list__name">
                <strong>{row.name}</strong>
                <span>{row.type}</span>
                {item.status && item.status !== "Applies" ? <em>{item.status}</em> : null}
              </p>
              <p className="exception-list__dates">
                <span>{row.date}</span>
                <em>{row.recurrence}</em>
              </p>
              <p className="exception-list__hours">
                {row.behavior.map((line, index) => <span key={index}>{line}</span>)}
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
          );
        })}
      </div>
    </div>
  );
}
