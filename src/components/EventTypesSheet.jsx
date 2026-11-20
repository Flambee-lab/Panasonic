import useSheetContentTransition from "../hooks/useSheetContentTransition";
import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useRef, useState } from "react";
import PeoplePickerSheet, { PEOPLE } from "./PeoplePickerSheet";

export const EVENT_TYPES = [
  {
    id: "people",
    title: "Registered people detection",
    detail: "Lorem ipsum dolor sit amet consectetur. ",
    icon: "people",
  },
  {
    id: "vehicles",
    title: "Registered vehicle detection",
    detail: "Venenatis aenean faucibus eget eu proin.",
    icon: "car",
  },
  {
    id: "sound",
    title: "Sound",
    detail: "Venenatis aenean faucibus eget eu proin.",
    icon: "sound",
  },
  {
    id: "vmd",
    title: "AI - VMD ",
    detail: "Lorem ipsum dolor sit amet consectetur. ",
    icon: "vmd",
  },
  {
    id: "extension",
    title: "Extension app event",
    detail: "Lorem ipsum dolor sit amet consectetur. ",
    icon: "extension",
  },
  {
    id: "scene",
    title: "AI Scene change",
    detail: "Venenatis aenean faucibus eget eu proin.",
    icon: "scene",
  },
  {
    id: "lpr",
    title: "LPR",
    detail: "Venenatis aenean faucibus eget eu proin.",
    icon: "lpr",
  },
  {
    id: "ocr",
    title: "OCR",
    detail: "Lorem ipsum dolor sit amet consectetur. ",
    icon: "server",
  },
  {
    id: "container",
    title: "Container",
    detail: "Lorem ipsum dolor sit amet consectetur. ",
    icon: "server",
  },
  {
    id: "vca",
    title: "VCA",
    detail: "Venenatis aenean faucibus eget eu proin.",
    icon: "server",
  },
];

export const ICONS = {
  people: "/assets/alarm-rules/events/people.svg",
  car: "/assets/alarm-rules/events/car.svg",
  sound: "/assets/alarm-rules/events/sound.svg",
  vmd: "/assets/alarm-rules/events/vmd.svg",
  extension: "/assets/alarm-rules/events/extension.svg",
  scene: "/assets/alarm-rules/events/scene.svg",
  lpr: "/assets/alarm-rules/events/lpr.svg",
  server: "/assets/alarm-rules/events/server.svg",
};

export default function EventTypesSheet({ selectedIds, savedPeopleIds = [], onClose, onSave, leaving = false }) {
  useReviewScope("EventTypesSheet");
  const titleId = useId();
  const peopleTitleId = useId();
  const [draft, setDraft] = useReviewState("EventTypesSheet:draft", () => new Set(selectedIds));
  const [peopleOpen, setPeopleOpen] = useReviewState("EventTypesSheet:peopleOpen", false);
  const [peopleIds, setPeopleIds] = useReviewState("EventTypesSheet:peopleIds", savedPeopleIds);
  const [appliedPeopleIds, setAppliedPeopleIds] = useReviewState("EventTypesSheet:appliedPeopleIds", savedPeopleIds);

  const [recentPeople, setRecentPeople] = useState(false);
  const panelRef = useRef(null);
  const transitionView = useSheetContentTransition(peopleOpen, setPeopleOpen, panelRef, ".event-sheet__stack, .people-sheet__card");
  const changeView = (next) => {
    if (next) setRecentPeople(false);
    return transitionView(next);
  };

  useEffect(() => {
    if (peopleOpen || !recentPeople) return;
    const timer = window.setTimeout(() => setRecentPeople(false), 2000);
    return () => window.clearTimeout(timer);
  }, [peopleOpen, recentPeople]);

  const closePeople = () => changeView(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (peopleOpen) closePeople();
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, peopleOpen]);


  const peopleApplied = appliedPeopleIds.length > 0;
  const appliedPeople = appliedPeopleIds
    .map((id) => PEOPLE.find((person) => person.id === id))
    .filter(Boolean);
  const visibleTypes = peopleApplied
    ? EVENT_TYPES.filter((type) => type.id !== "people")
    : EVENT_TYPES;

  const removePerson = (id) => {
    setAppliedPeopleIds((current) => {
      const next = current.filter((personId) => personId !== id);
      if (next.length === 0) {
        setDraft((types) => {
          const updated = new Set(types);
          updated.delete("people");
          return updated;
        });
      }
      setPeopleIds(next);
      return next;
    });
  };

  const sheetClass = ["event-sheet", leaving ? "is-leaving" : ""].filter(Boolean).join(" ");

  return (
    <div className={sheetClass} role="presentation">
      <button type="button" className="event-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <section
        ref={panelRef}
        className="event-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={peopleOpen ? peopleTitleId : titleId}
      >
        {peopleOpen ? (
          <PeoplePickerSheet
            embedded
            titleId={peopleTitleId}
            selectedIds={peopleIds}
            onBack={closePeople}
            onClose={onClose}
            onSave={(ids) => {
              setRecentPeople(ids.length > 0);
              setPeopleIds(ids);
              setAppliedPeopleIds(ids);
              setDraft((current) => {
                const next = new Set(current);
                if (ids.length > 0) next.add("people");
                else next.delete("people");
                return next;
              });
              closePeople();
            }}
          />
        ) : (
          <>
        <header className="event-sheet__header">
          <div className="event-sheet__intro">
            <span className="event-sheet__mark" aria-hidden="true">
              <span className="event-sheet__mark-spin">
                <img src="/assets/alarm-rules/events/mark.svg" alt="" />
              </span>
            </span>
            <div className="event-sheet__heading">
              <h2 id={titleId}>Event Types</h2>
              <p>
                Choose the events that trigger this rule. Hours are set on the schedule, which is always a week.
              </p>
            </div>
          </div>
          <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>

        <div className="event-sheet__body">
          <div className="event-sheet__stack">
          {peopleApplied ? (
            <div className={`people-applied${recentPeople ? " is-recent" : ""}`}>
              <div className="people-applied__lead">
                <span className="event-type__icon event-type__icon--people" aria-hidden="true">
                  <img src={ICONS.people} alt="" />
                </span>
                <span className="event-type__copy">
                  <strong>Registered people detection</strong>
                  <span>Lorem ipsum dolor sit amet consectetur. </span>
                </span>
              </div>
              <div className={`people-applied__chips${appliedPeople.length + (appliedPeople.length >= 3 ? 1 : 0) > 4 ? " is-wrapped" : ""}`}>
                {appliedPeople.length >= 3 ? (
                  <button
                    type="button"
                    className="people-chip people-chip--remove-all"
                    onClick={() => {
                      setAppliedPeopleIds([]);
                      setPeopleIds([]);
                      setRecentPeople(false);
                      setDraft(current => {
                        const next = new Set(current);
                        next.delete("people");
                        return next;
                      });
                    }}
                  >
                    Remove all {appliedPeople.length}
                  </button>
                ) : null}
                {appliedPeople.map((person) => (
                  <div
                    className="people-chip"
                    key={person.id}
                  >
                    <button
                      type="button"
                      className="people-chip__remove"
                      aria-label={`Remove ${person.name}`}
                      onClick={() => removePerson(person.id)}
                    >
                      <img src="/assets/alarm-rules/events/chip-close.svg" alt="" />
                    </button>
                    <span className="people-chip__name">{person.name}</span>
                    <span className="person-card__photo people-chip__photo">
                      <img src={person.photo} alt="" />
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="alarm-rule__section-edit"
                aria-label="Edit Registered people detection"
                title="Edit selected people"
                onClick={() => changeView(true)}
              >
                <img src="/assets/alarm-rules/edit.svg" alt="" />
              </button>
            </div>
          ) : null}
          <div className={`event-sheet__grid${peopleApplied ? " is-settled" : ""}`}>
            {visibleTypes.map((type) => {
              const available = type.id === "people";
              const selected = available && draft.has(type.id);
              return (
                <div
                  className={`event-type${selected ? " is-selected" : ""}${
                    available ? " is-action" : " is-disabled"
                  }`}
                  key={type.id}
                  aria-disabled={!available || undefined}
                >
                  {type.id === "people" ? (
                    <button
                      type="button"
                      className="event-type__surface"
                      aria-label="Open Registered people detection"
                      onClick={() => changeView(true)}
                    />
                  ) : null}
                  <span className={`event-type__icon event-type__icon--${type.icon}`} aria-hidden="true">
                    <img src={ICONS[type.icon]} alt="" />
                  </span>
                  <span className="event-type__copy">
                    <strong>{type.title}</strong>
                    <span>{type.detail}</span>
                  </span>
                  <button
                    type="button"
                    className="event-type__add"
                    disabled={!available}
                    aria-pressed={selected}
                    aria-label={selected ? `Remove ${type.title.trim()}` : `Add ${type.title.trim()}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (type.id === "people") changeView(true);

                    }}
                  >
                    <img
                      src={`/assets/alarm-rules/events/${available ? "add" : "add-disabled"}.svg`}
                      alt=""
                    />
                  </button>
                </div>
              );
            })}
          </div>
          </div>
        </div>

        <div className="event-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="event-sheet__save"
            onClick={() => onSave([...draft].filter((id) => id === "people"), appliedPeopleIds)}
          >
            Save event types
          </button>
        </div>
          </>
        )}
      </section>
    </div>
  );
}
