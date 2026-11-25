import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useMemo } from "react";
import ExceptionList from "./ExceptionList";
import { buildExceptionCatalog } from "../utils/exceptionCatalog";

export default function ExceptionSheet({
  items = [],
  availableItems = [],
  zone,
  onClose,
  onSave,
  leaving = false,
}) {
  useReviewScope("ExceptionSheet");
  const titleId = useId();
  const catalog = useMemo(
    () => {
      const definitions = new Map(availableItems.filter((item) => item.id != null).map((item) => [item.id, item]));
      const selectedItems = items.map((item) => definitions.get(item.id) ?? item);
      return buildExceptionCatalog(availableItems, selectedItems);
    },
    [availableItems, items],
  );
  const [selectedIds, setSelectedIds] = useReviewState("ExceptionSheet:selectedIds", () => buildExceptionCatalog([], items).map((item) => item.id));

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (id) => setSelectedIds((current) =>
    current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
  );

  return (
    <div className={leaving ? "exception-sheet is-leaving" : "exception-sheet"} role="presentation">
      <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <section className="exception-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="event-sheet__header">
          <div className="event-sheet__intro">
            <span className="event-sheet__mark" aria-hidden="true">
              <span className="event-sheet__mark-spin">
                <img src="/assets/alarm-rules/events/mark.svg" alt="" />
              </span>
            </span>
            <div className="event-sheet__heading">
              <h2 id={titleId}>Exceptions</h2>
            </div>
          </div>
          <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>
        <div className="exception-sheet__body">
          <ExceptionList items={catalog} selectedIds={selectedIds} onToggle={toggle} zone={zone} />
        </div>
        <div className="event-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="event-sheet__save"
            onClick={() => onSave(structuredClone(catalog.filter((item) => selectedIds.includes(item.id))))}
          >
            Save &amp; continue
          </button>
        </div>
      </section>
    </div>
  );
}
