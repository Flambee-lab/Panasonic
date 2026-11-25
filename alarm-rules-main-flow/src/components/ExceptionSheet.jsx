import useSheetContentTransition from "../hooks/useSheetContentTransition";
import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useRef } from "react";
import ExceptionList from "./ExceptionList";
import NewExceptionSheet from "./NewExceptionSheet";
import RuleGuard from "./RuleGuard";

const SHARED_LISTS = [
  {
    id: "bank",
    name: "Bank holidays",
    detail: "Used by After hours · 72 cameras. Repeats every year.",
    items: [
      {
        name: "Thanksgiving",
        type: "day",
        likeDay: "Sunday",
        dates: ["2026-10-26"],
        repeatYearly: true,
      },
    ],
  },
  {
    id: "district",
    name: "District calendar 2026–27",
    detail: "Used by Midday lunch ours · 90 cameras.",
    items: [
      {
        name: "Winter weekend",
        type: "day",
        likeDay: "Saturday",
        dates: ["2026-10-28"],
        repeatYearly: false,
      },
    ],
  },
];

export default function ExceptionSheet({
  items,
  onItemsChange,
  initialDraft = null,
  initialLibrary = false,
  scheduleRanges = null,
  zone,
  namedSchedules = [],
  unavailableSchedules = [],
  onClose,
  onSave,
  leaving = false,
}) {
  useReviewScope("ExceptionSheet");
  const titleId = useId();
  const [draft, setDraft] = useReviewState("ExceptionSheet:draft", initialDraft);
  const panelRef = useRef(null);
  const editorTitleId = useId();
  const [library, setLibrary] = useReviewState("ExceptionSheet:library", initialLibrary);
  const changeDraft = useSheetContentTransition(draft ?? (library ? "library" : null), (next) => {
    setLibrary(next === "library");
    setDraft(next === "library" ? null : next);
  }, panelRef, ".exception-sheet__body > *, .exception-new__col > *");
  const changeLibrary = (open) => changeDraft(open ? "library" : null);
  const [dropShared, setDropShared] = useReviewState("ExceptionSheet:dropShared", null);

  const closeDraft = () => changeDraft(null);

  useEffect(() => {
    if (draft) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [draft, onClose]);

  const sheetClass = [
    "exception-sheet",
    leaving ? "is-leaving" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={sheetClass} role="presentation">
      <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <section ref={panelRef} className="exception-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={draft ? editorTitleId : titleId}>
        {draft ? (
        <NewExceptionSheet
          embedded
          titleId={editorTitleId}
          initial={draft.id ? draft : null}
          scheduleRanges={scheduleRanges}
          zone={zone}
          namedSchedules={namedSchedules}
          unavailableSchedules={unavailableSchedules}
          onBack={closeDraft}
          onClose={onClose}
          onSave={(next) => {
            onItemsChange(
              draft.id
                ? items.map((item) => (item.id === draft.id ? { ...next, id: draft.id } : item))
                : [...items, { ...next, id: crypto.randomUUID() }],
            );
            closeDraft();
          }}
        />
        ) : (
          <>
        <header className={library ? "exception-new__header exception-shared__header" : "event-sheet__header"}>
          {library ? (
            <button type="button" className="event-sheet__close" aria-label="Back" onClick={() => changeLibrary(false)}>
              <img src="/assets/alarm-rules/exceptions/back.svg" alt="" />
            </button>
          ) : null}
          <div className="event-sheet__intro">
            {!library ? <span className="event-sheet__mark" aria-hidden="true">
              <span className="event-sheet__mark-spin">
                <img src="/assets/alarm-rules/events/mark.svg" alt="" />
              </span>
            </span> : null}
            <div className="event-sheet__heading">
              <h2 id={titleId}>{library ? "Shared exception lists" : `Exceptions${items.length ? ` (${items.length})` : ""}`}</h2>
            </div>
          </div>
          <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>
        <div className="exception-sheet__body">
          {library ? (
            <div className="exception-shared">
              <p className="exception-shared__description">Adding a list copies it onto this rule. The list stays in use by the other rules named here.</p>
              {SHARED_LISTS.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  className="exception-shared__item"
                  onClick={() => {
                    onItemsChange([
                      ...items,
                      ...list.items.map((item) => ({
                        ...item,
                        id: crypto.randomUUID(),
                        sharedId: list.id,
                        sharedName: list.name,
                        sharedDetail: list.detail,
                      })),
                    ]);
                    changeLibrary(false);
                  }}
                >
                  <strong>{list.name}</strong>
                  <span>{list.detail}</span>
                </button>
              ))}
            </div>
          ) : items.length ? (
            <ExceptionList
              items={items}
              zone={zone}
              onCreate={() => changeDraft({ id: null })}
              onEdit={changeDraft}
              onRemove={(id) => {
                const item = items.find((entry) => entry.id === id);
                if (item?.sharedName) {
                  setDropShared(item);
                  return;
                }
                onItemsChange(items.filter((entry) => entry.id !== id));
              }}
              onShared={() => changeLibrary(true)}
            />
          ) : (
            <div className="exception-sheet__empty">
              <div className="exception-sheet__message">
                <h3>No exceptions added</h3>
                <p>Manage special dates and holiday lists. The weekly schedule resumes after each exception.</p>
              </div>
              <div className="exception-sheet__choices">
                <button type="button" onClick={() => changeLibrary(true)}>
                  Use shared exception list
                </button>
                <button type="button" className="is-filled" onClick={() => changeDraft({ id: null })}>
                  New exception
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="event-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="event-sheet__save" disabled={items.length === 0} onClick={onSave}>
            Save & continue
          </button>
        </div>
          </>
        )}
      </section>
      {dropShared ? (
        <RuleGuard
          title={`Remove ${dropShared.name}?`}
          confirmLabel="Remove from this rule"
          onCancel={() => setDropShared(null)}
          onConfirm={() => {
            onItemsChange(items.filter((entry) => entry.id !== dropShared.id));
            setDropShared(null);
          }}
        >
          <p>
            {dropShared.sharedDetail
              ? `${dropShared.sharedDetail} Removing it here only takes it off this rule.`
              : `${dropShared.sharedName} stays in use by the other rules on that list. Removing it here only takes it off this rule.`}
          </p>
        </RuleGuard>
      ) : null}

    </div>
  );
}
