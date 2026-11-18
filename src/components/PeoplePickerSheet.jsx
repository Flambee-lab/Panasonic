import { useEffect, useId, useMemo, useRef, useState } from "react";

export const PEOPLE = [
  { id: "nina", name: "Nina Alvarez", photo: "/assets/alarm-rules/people/p01.jpg", age: "18–30", gender: "Female", category: "Watchlist" },
  { id: "omar", name: "Omar Haddad", photo: "/assets/alarm-rules/people/p02.jpg", age: "31–45", gender: "Male", category: "Staff" },
  { id: "priya", name: "Priya Shah", photo: "/assets/alarm-rules/people/p03.jpg", age: "18–30", gender: "Female", category: "Visitor" },
  { id: "jonah", name: "Jonah Keller", photo: "/assets/alarm-rules/people/p04.jpg", age: "46–60", gender: "Male", category: "Watchlist" },
  { id: "amina", name: "Amina Diallo", photo: "/assets/alarm-rules/people/p05.jpg", age: "31–45", gender: "Female", category: "Staff" },
  { id: "luca", name: "Luca Moretti", photo: "/assets/alarm-rules/people/p06.jpg", age: "18–30", gender: "Male", category: "Visitor" },
  { id: "hana", name: "Hana Suzuki", photo: "/assets/alarm-rules/people/p07.jpg", age: "46–60", gender: "Female", category: "Watchlist" },
  { id: "mateo", name: "Mateo Ruiz", photo: "/assets/alarm-rules/people/p08.jpg", age: "31–45", gender: "Male", category: "Watchlist" },
  { id: "elena", name: "Elena Petrova", photo: "/assets/alarm-rules/people/p09.jpg", age: "60+", gender: "Female", category: "Visitor" },
  { id: "caleb", name: "Caleb Brooks", photo: "/assets/alarm-rules/people/p10.jpg", age: "18–30", gender: "Male", category: "Staff" },
  { id: "sofia", name: "Sofia Nguyen", photo: "/assets/alarm-rules/people/p11.jpg", age: "31–45", gender: "Female", category: "Watchlist" },
  { id: "ibrahim", name: "Ibrahim Hassan", photo: "/assets/alarm-rules/people/p12.jpg", age: "46–60", gender: "Male", category: "Visitor" },
  { id: "freya", name: "Freya Lind", photo: "/assets/alarm-rules/people/p13.jpg", age: "18–30", gender: "Female", category: "Staff" },
  { id: "andre", name: "Andre Costa", photo: "/assets/alarm-rules/people/p14.jpg", age: "31–45", gender: "Male", category: "Visitor" },
  { id: "maya", name: "Maya Okonkwo", photo: "/assets/alarm-rules/people/p15.jpg", age: "46–60", gender: "Female", category: "Staff" },
  { id: "theo", name: "Theo Marchand", photo: "/assets/alarm-rules/people/p16.jpg", age: "60+", gender: "Male", category: "Watchlist" },
  { id: "leah", name: "Leah Berg", photo: "/assets/alarm-rules/people/p17.jpg", age: "18–30", gender: "Female", category: "Visitor" },
  { id: "hugo", name: "Hugo Silva", photo: "/assets/alarm-rules/people/p18.jpg", age: "31–45", gender: "Male", category: "Staff" },
  { id: "noor", name: "Noor Rahman", photo: "/assets/alarm-rules/people/p19.jpg", age: "31–45", gender: "Female", category: "Watchlist" },
  { id: "felix", name: "Felix Grant", photo: "/assets/alarm-rules/people/p20.jpg", age: "46–60", gender: "Male", category: "Visitor" },
  { id: "iris", name: "Iris Chen", photo: "/assets/alarm-rules/people/p21.jpg", age: "60+", gender: "Female", category: "Staff" },
  { id: "samuel", name: "Samuel Adeyemi", photo: "/assets/alarm-rules/people/p22.jpg", age: "18–30", gender: "Male", category: "Watchlist" },
  { id: "clara", name: "Clara Voss", photo: "/assets/alarm-rules/people/p23.jpg", age: "46–60", gender: "Female", category: "Visitor" },
  { id: "diego", name: "Diego Ferrer", photo: "/assets/alarm-rules/people/p24.jpg", age: "60+", gender: "Male", category: "Staff" },
];

const FILTERS = [
  { id: "age", label: "Age Range", options: ["All", "18–30", "31–45", "46–60", "60+"] },
  { id: "gender", label: "Gender", options: ["All", "Female", "Male"] },
  { id: "category", label: "Category", options: ["All", "Watchlist", "Staff", "Visitor"] },
];

export default function PeoplePickerSheet({
  selectedIds,
  onBack,
  onClose,
  onSave,
  leaving = false,
  embedded = false,
  titleId: titleIdProp,
  panelRef: panelRefProp,
  onLock,
}) {
  const localTitleId = useId();
  const titleId = titleIdProp ?? localTitleId;
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(() => new Set(selectedIds));
  const [openFilter, setOpenFilter] = useState(null);
  const [filters, setFilters] = useState({ age: "All", gender: "All", category: "All" });
  const gridRef = useRef(null);
  const [scroll, setScroll] = useState({ top: 0, height: 1, client: 1 });

  const syncScroll = () => {
    const grid = gridRef.current;
    if (!grid) return;
    setScroll({ top: grid.scrollTop, height: grid.scrollHeight, client: grid.clientHeight });
  };

  useEffect(() => {
    if (embedded) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [embedded, onBack]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return PEOPLE.filter((person) => {
      if (term && !person.name.toLowerCase().includes(term)) return false;
      if (filters.age !== "All" && person.age !== filters.age) return false;
      if (filters.gender !== "All" && person.gender !== filters.gender) return false;
      if (filters.category !== "All" && person.category !== filters.category) return false;
      return true;
    });
  }, [filters, query]);

  useEffect(() => {
    syncScroll();
  }, [visible]);

  const toggle = (id) => {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = draft.size;
  const addLabel = count === 0 ? "Add people" : count === 1 ? "Add 1 person" : `Add ${count} people`;
  const localPanelRef = useRef(null);
  const panelRef = panelRefProp ?? localPanelRef;
  const sheetLockRef = useRef(0);
  const [sheetLock, setSheetLock] = useState(0);
  const holdSheet = (nextFiltering) => {
    const lock = (height) => {
      sheetLockRef.current = height;
      setSheetLock(height);
      onLock?.(height);
    };
    if (nextFiltering) {
      if (!sheetLockRef.current && panelRef.current) {
        lock(Math.round(panelRef.current.getBoundingClientRect().height));
      }
      return;
    }
    if (sheetLockRef.current) lock(0);
  };
  const canScroll = scroll.height > scroll.client + 1;
  const thumbHeight = canScroll ? Math.max(36, (scroll.client / scroll.height) * scroll.client) : 0;
  const thumbTravel = Math.max(scroll.client - thumbHeight, 0);
  const thumbTop = canScroll
    ? (scroll.top / (scroll.height - scroll.client)) * thumbTravel
    : 0;

  const content = (
    <>
        <header className="people-sheet__header">
          <button type="button" className="people-sheet__icon-btn is-back" aria-label="Back" onClick={onBack}>
            <img src="/assets/alarm-rules/people/back.svg" alt="" />
          </button>
          <h2 id={titleId}>Registered people detection</h2>
          <button type="button" className="people-sheet__icon-btn" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>

        <div className="people-sheet__body">
          <div className="people-sheet__card">
            <div className="people-sheet__search">
              <span className="people-sheet__search-icon" aria-hidden="true">
                <img src="/assets/alarm-rules/people/search.svg" alt="" />
              </span>
              <input
                value={query}
                onChange={(event) => {
                  const text = event.target.value;
                  holdSheet(Boolean(text.trim()) || Object.values(filters).some((value) => value !== "All"));
                  setQuery(text);
                }}
                placeholder="Search by name or surname"
                aria-label="Search by name or surname"
              />
              <div className="people-sheet__filters">
                {FILTERS.map((filter) => (
                  <div className="people-sheet__filter-wrap" key={filter.id}>
                    <button
                      type="button"
                      className={`people-sheet__filter${filters[filter.id] !== "All" ? " is-active" : ""}`}
                      aria-expanded={openFilter === filter.id}
                      onClick={() => setOpenFilter((current) => (current === filter.id ? null : filter.id))}
                    >
                      <span>{filters[filter.id] === "All" ? filter.label : filters[filter.id]}</span>
                      <img src="/assets/alarm-rules/people/chevron.svg" alt="" />
                    </button>
                    {openFilter === filter.id ? (
                      <div className="people-sheet__menu" role="listbox" aria-label={filter.label}>
                        {filter.options.map((option) => (
                          <button
                            type="button"
                            key={option}
                            className={filters[filter.id] === option ? "is-active" : ""}
                            onClick={() => {
                              const next = { ...filters, [filter.id]: option };
                              holdSheet(Boolean(query.trim()) || Object.values(next).some((value) => value !== "All"));
                              setFilters(next);
                              setOpenFilter(null);
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="people-sheet__list">
            <div className="people-sheet__grid" ref={gridRef} onScroll={syncScroll}>
              {visible.length === 0 ? (
                <p className="people-sheet__empty">No people match these filters.</p>
              ) : null}
              {visible.map((person) => {
                const selected = draft.has(person.id);
                return (
                  <button
                    type="button"
                    className={`person-card${selected ? " is-selected" : ""}`}
                    key={person.id}
                    aria-pressed={selected}
                    onClick={() => toggle(person.id)}
                  >
                    <span className="person-card__photo">
                      <img src={person.photo} alt="" />
                    </span>
                    <span className="person-card__name">{person.name}</span>
                    <img
                      className="person-card__check"
                      src={
                        selected
                          ? "/assets/alarm-rules/people/check-on.svg"
                          : "/assets/alarm-rules/people/check-off.svg"
                      }
                      alt=""
                    />
                  </button>
                );
              })}
            </div>
            {canScroll ? (
              <div className="people-sheet__scrollbar" aria-hidden="true">
                <span style={{ height: thumbHeight, transform: `translateY(${thumbTop}px)` }} />
              </div>
            ) : null}
            </div>
          </div>
        </div>

        <div className="people-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onBack}>
            Cancel
          </button>
          <button type="button" className="event-sheet__save" disabled={draft.size === 0} onClick={() => onSave([...draft])}>
            <span className="stable-label is-centered">
              <span className="is-current">{addLabel}</span>
              <span aria-hidden="true">Add {PEOPLE.length} people</span>
            </span>
          </button>
        </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className={leaving ? "people-sheet is-leaving" : "people-sheet"} role="presentation">
      <button type="button" className="people-sheet__backdrop" aria-label="Back" onClick={onBack} />
      <section
        ref={panelRef}
        className="people-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={sheetLock ? { height: sheetLock } : undefined}
      >
        {content}
      </section>
    </div>
  );
}
