export default function RuleGuard({ title, children, confirmLabel, cancelLabel = "Go back", onConfirm, onCancel }) {
  return (
    <div className="rule-guard" role="presentation">
      <button type="button" className="rule-guard__backdrop" aria-label="Close" onClick={onCancel} />
      <section className="rule-guard__panel" role="dialog" aria-modal="true" aria-labelledby="rule-guard-title">
        <h2 id="rule-guard-title">{title}</h2>
        <div className="rule-guard__body">{children}</div>
        <div className="rule-guard__actions">
          <button type="button" className="event-sheet__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          {confirmLabel ? (
            <button type="button" className="event-sheet__save" onClick={onConfirm}>
              {confirmLabel}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
