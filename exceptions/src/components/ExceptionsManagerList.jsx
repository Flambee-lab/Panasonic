import { exceptionPresentation } from "../utils/exceptionPresentation";

export default function ExceptionsManagerList({ items, rules = [], onCreate, onEdit, onRemove }) {
  return (
    <>
      <p>Create and manage exceptions for holidays and other special dates.</p>
      <button type="button" className="access-dialog__new" onClick={onCreate}>
        New exception
      </button>
      {items.length ? (
        <div className="access-dialog__list">
          {items.map((item) => {
            const row = exceptionPresentation({ ...item, sharedName: "" });
            const dates = `${row.date} · ${row.recurrence}`;
            const behavior = [row.type, ...row.behavior].join(" · ");
            const assignedRules = rules.filter((rule) => (rule.exceptions ?? []).some((entry) => entry.id === item.id));
            const assignment = `Applies to ${assignedRules.length} ${assignedRules.length === 1 ? "rule" : "rules"}`;
            return (
              <div className="access-dialog__row is-on b2-exception-row" key={item.id}>
                <p>
                  <span className="access-dialog__name">
                    <strong title={item.name || row.name}>{item.name || row.name}</strong>
                    {assignedRules.length > 0 ? <span className="b2-exception-rule-count" title={assignedRules.map((rule) => rule.name).join(", ")}>{assignment}</span> : null}
                  </span>
                  <span className="access-dialog__detail" title={dates}>{dates}</span>
                  <span className="access-dialog__detail" title={behavior}>{behavior}</span>
                </p>
                <div className="b2-exception-tools">
                  <button
                    type="button"
                    className="access-dialog__edit"
                    aria-label={`Edit ${item.name || row.name}`}
                    onClick={() => onEdit(item)}
                  >
                    <img src="/assets/alarm-rules/pencil.svg" alt="" />
                  </button>
                  <button
                    type="button"
                    className="access-dialog__edit"
                    aria-label={`Delete ${item.name || row.name}`}
                    onClick={() => onRemove(item)}
                  >
                    <img src="/assets/alarm-rules/schedule/trash.svg" alt="" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="b2-exception-empty">No exceptions created yet.</p>
      )}
    </>
  );
}
