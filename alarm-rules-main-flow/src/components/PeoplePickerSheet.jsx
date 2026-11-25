import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  { id: "isabel-romero", name: "Isabel Romero", photo: "/assets/alarm-rules/people/p01.jpg", age: "18–30", gender: "Female", category: "Visitor" },
  { id: "daniel-park", name: "Daniel Park", photo: "/assets/alarm-rules/people/p02.jpg", age: "31–45", gender: "Male", category: "Staff" },
  { id: "emma-wilson", name: "Emma Wilson", photo: "/assets/alarm-rules/people/p03.jpg", age: "46–60", gender: "Female", category: "Watchlist" },
  { id: "rafael-torres", name: "Rafael Torres", photo: "/assets/alarm-rules/people/p04.jpg", age: "60+", gender: "Male", category: "Visitor" },
  { id: "zoe-martin", name: "Zoe Martin", photo: "/assets/alarm-rules/people/p05.jpg", age: "18–30", gender: "Female", category: "Staff" },
  { id: "adrian-novak", name: "Adrian Novak", photo: "/assets/alarm-rules/people/p06.jpg", age: "31–45", gender: "Male", category: "Watchlist" },
  { id: "camila-reyes", name: "Camila Reyes", photo: "/assets/alarm-rules/people/p07.jpg", age: "46–60", gender: "Female", category: "Visitor" },
  { id: "ethan-cole", name: "Ethan Cole", photo: "/assets/alarm-rules/people/p08.jpg", age: "60+", gender: "Male", category: "Staff" },
  { id: "layla-ahmed", name: "Layla Ahmed", photo: "/assets/alarm-rules/people/p09.jpg", age: "18–30", gender: "Female", category: "Watchlist" },
  { id: "victor-santos", name: "Victor Santos", photo: "/assets/alarm-rules/people/p10.jpg", age: "31–45", gender: "Male", category: "Visitor" },
  { id: "alice-dubois", name: "Alice Dubois", photo: "/assets/alarm-rules/people/p11.jpg", age: "46–60", gender: "Female", category: "Staff" },
  { id: "leo-andersen", name: "Leo Andersen", photo: "/assets/alarm-rules/people/p12.jpg", age: "60+", gender: "Male", category: "Watchlist" },
  { id: "sara-kim", name: "Sara Kim", photo: "/assets/alarm-rules/people/p13.jpg", age: "18–30", gender: "Female", category: "Visitor" },
  { id: "gabriel-rossi", name: "Gabriel Rossi", photo: "/assets/alarm-rules/people/p14.jpg", age: "31–45", gender: "Male", category: "Staff" },
  { id: "mila-novak", name: "Mila Novak", photo: "/assets/alarm-rules/people/p15.jpg", age: "46–60", gender: "Female", category: "Watchlist" },
  { id: "oscar-bennett", name: "Oscar Bennett", photo: "/assets/alarm-rules/people/p16.jpg", age: "60+", gender: "Male", category: "Visitor" },
];

const FILTERS = [
  { id: "age", label: "Age Range", options: ["All", "18–30", "31–45", "46–60", "60+"] },
  { id: "gender", label: "Gender", options: ["All", "Female", "Male"] },
  { id: "category", label: "Category", options: ["All", "Watchlist", "Staff", "Visitor"] },
];

function selectedValues(value) {
  return Array.isArray(value) ? value : value && value !== "All" ? [value] : [];
}

export default function PeoplePickerSheet({
  selectedIds,
  onBack,
  onClose,
  onSave,
  leaving = false,
  embedded = false,
  titleId: titleIdProp,
}) {
  useReviewScope("PeoplePickerSheet");
  const localTitleId = useId();
  const titleId = titleIdProp ?? localTitleId;
  const [query, setQuery] = useReviewState("PeoplePickerSheet:query", "");
  const [draft, setDraft] = useReviewState("PeoplePickerSheet:draft", () => new Set(selectedIds));
  const [openFilter, setOpenFilter] = useReviewState("PeoplePickerSheet:openFilter", null);
  const [filters, setFilters] = useReviewState("PeoplePickerSheet:filters", { age: [], gender: [], category: [] });
  const [panelHeight, setPanelHeight] = useReviewState("PeoplePickerSheet:fixedHeight", null);
  const gridRef = useRef(null);
  const trackRef = useRef(null);
  const scrollId = useId();
  const dragOffset = useRef(0);
  const [scroll, setScroll] = useState({ top: 0, height: 1, client: 1, track: 1 });

  const syncScroll = () => {
    const grid = gridRef.current;
    if (!grid) return;
    setScroll({ top: grid.scrollTop, height: grid.scrollHeight, client: grid.clientHeight, track: trackRef.current?.clientHeight ?? grid.clientHeight });
  };

  useLayoutEffect(() => {
    const panel = gridRef.current?.closest(".event-sheet__panel, .people-sheet__panel");
    if (!panel) return;
    if (panelHeight) panel.style.height = `${panelHeight}px`;
    return () => { panel.style.height = ""; };
  }, []);

  useEffect(() => {
    const panel = gridRef.current?.closest(".event-sheet__panel, .people-sheet__panel");
    if (!panel || panelHeight) return;
    let active = true;
    // The parent first animates from Event Types to the picker's natural height.
    // Capture its final layout height, without including the opening transform.
    Promise.all(panel.getAnimations().map(animation => animation.finished.catch(() => {}))).then(() => {
      if (!active) return;
      const height = panel.offsetHeight;
      panel.style.height = `${height}px`;
      setPanelHeight(height);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const dismiss = (event) => {
      if (!event.target.closest(".people-sheet__filter-wrap")) setOpenFilter(null);
    };
    const closeMenu = (event) => {
      if (event.key === "Escape" && openFilter) {
        event.stopImmediatePropagation();
        setOpenFilter(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", closeMenu, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", closeMenu, true);
    };
  }, [openFilter]);

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
      for (const filter of FILTERS) {
        const values = selectedValues(filters[filter.id]);
        if (values.length && !values.includes(person[filter.id])) return false;
      }
      return true;
    });
  }, [filters, query]);

  useEffect(() => {
    syncScroll();
    const observer = new ResizeObserver(syncScroll);
    if (gridRef.current) observer.observe(gridRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [visible]);

  const toggle = (id) => {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visible.length > 0 && visible.every(person => draft.has(person.id));
  const toggleVisible = () => {
    setDraft(current => {
      const next = new Set(current);
      const clear = visible.length > 0 && visible.every(person => current.has(person.id));
      visible.forEach(person => clear ? next.delete(person.id) : next.add(person.id));
      return next;
    });
  };

  const count = draft.size;
  const addLabel = count === 0 ? (selectedIds.length > 0 ? "Save changes" : "Add people") : count === 1 ? "Add 1 person" : `Add ${count} people`;
  const canScroll = scroll.height > scroll.client + 1;
  const thumbHeight = canScroll ? Math.min(scroll.track, Math.max(36, (scroll.client / scroll.height) * scroll.track)) : 0;
  const thumbTravel = Math.max(scroll.track - thumbHeight, 0);
  const thumbTop = canScroll
    ? (scroll.top / (scroll.height - scroll.client)) * thumbTravel
    : 0;

  const moveScrollThumb = (event) => {
    if (!gridRef.current || !trackRef.current || thumbTravel <= 0) return;
    const top = event.clientY - trackRef.current.getBoundingClientRect().top - dragOffset.current;
    gridRef.current.scrollTop = Math.max(0, Math.min(1, top / thumbTravel)) * (scroll.height - scroll.client);
  };

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

        <div className={`people-sheet__body${scroll.top > 0 ? " is-scrolled" : ""}`}>
          <div className="people-sheet__scroll-content" id={scrollId} ref={gridRef} onScroll={syncScroll}>
          <div className="people-sheet__card">
            <div className="people-sheet__search-header">
            <div className="people-sheet__search">
              <span className="people-sheet__search-icon" aria-hidden="true">
                <img src="/assets/alarm-rules/people/search.svg" alt="" />
              </span>
              <input
                value={query}
                onChange={(event) => {
                  const text = event.target.value;

                  setQuery(text);
                }}
                placeholder="Search by name or surname"
                aria-label="Search by name or surname"
              />
              {(query || FILTERS.some(filter => selectedValues(filters[filter.id]).length)) ? (
                <button type="button" className="people-sheet__clear-filters" onClick={() => {
                  setQuery("");
                  setFilters({ age: [], gender: [], category: [] });
                  setOpenFilter(null);
                }}>Clear filters</button>
              ) : null}
              <div className="people-sheet__filters">
                {FILTERS.map((filter) => {
                  const values = selectedValues(filters[filter.id]);
                  return (
                  <div className="people-sheet__filter-wrap" key={filter.id}>
                    <button
                      type="button"
                      className={`people-sheet__filter${values.length ? " is-active" : ""}`}
                      aria-expanded={openFilter === filter.id}
                      aria-haspopup="listbox"
                      aria-label={values.length ? `${filter.label}: ${values.length} selected` : filter.label}
                      onClick={() => setOpenFilter((current) => (current === filter.id ? null : filter.id))}
                    >
                      <span>{filter.label}</span>
                      {values.length ? <span className="people-sheet__filter-count">{values.length}</span> : null}
                      <img src="/assets/alarm-rules/people/chevron.svg" alt="" />
                    </button>
                    {openFilter === filter.id ? (
                      <div className="people-sheet__menu" role="listbox" aria-label={filter.label} aria-multiselectable="true">
                        {filter.options.map((option) => {
                          const selected = option === "All" ? values.length === 0 : values.includes(option);
                          return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            key={option}
                            className={selected ? "is-active" : ""}
                            onClick={() => setFilters(current => ({
                              ...current,
                              [filter.id]: option === "All" ? [] : selected
                                ? values.filter(value => value !== option)
                                : [...values, option],
                            }))}
                          >
                            <span className={`camera-sheet__check${selected ? " is-on" : ""}`} aria-hidden="true">
                              {selected ? <img src="/assets/alarm-rules/cameras/check.svg" alt="" /> : null}
                            </span>
                            <span>{option}</span>
                          </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            </div>

            </div>

            <div className="people-sheet__list">
            <div className="people-sheet__grid">
              <button
                type="button"
                className={`people-select-all${allVisibleSelected ? " is-selected" : ""}`}
                aria-pressed={allVisibleSelected}
                disabled={visible.length === 0}
                onClick={toggleVisible}
              >
                <span>{allVisibleSelected ? "Remove all" : "Select all"}</span>
                <span className="people-select-all__count">{visible.length}</span>
              </button>
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
            </div>
          </div>
          </div>
          <div
            className="people-sheet__scrollbar"
            ref={trackRef}
            role={canScroll ? "scrollbar" : undefined}
            aria-label={canScroll ? "Scroll people" : undefined}
            aria-controls={canScroll ? scrollId : undefined}
            aria-orientation={canScroll ? "vertical" : undefined}
            aria-valuemin={canScroll ? 0 : undefined}
            aria-valuemax={canScroll ? Math.max(0, scroll.height - scroll.client) : undefined}
            aria-valuenow={canScroll ? Math.round(scroll.top) : undefined}
            tabIndex={canScroll ? 0 : undefined}
            onPointerDown={(event) => {
              if (!canScroll || event.button !== 0) return;
              const thumb = trackRef.current.querySelector("span").getBoundingClientRect();
              dragOffset.current = event.target === trackRef.current ? thumbHeight / 2 : event.clientY - thumb.top;
              event.currentTarget.setPointerCapture(event.pointerId);
              moveScrollThumb(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveScrollThumb(event);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              const node = gridRef.current;
              if (!node) return;
              const positions = { Home: 0, End: node.scrollHeight, ArrowDown: node.scrollTop + 40, ArrowUp: node.scrollTop - 40, PageDown: node.scrollTop + node.clientHeight, PageUp: node.scrollTop - node.clientHeight };
              if (event.key in positions) {
                event.preventDefault();
                node.scrollTop = positions[event.key];
              }
            }}
          >
            {canScroll ? <span style={{ height: thumbHeight, transform: `translateY(${thumbTop}px)` }} /> : null}
          </div>
        </div>

        <div className="people-sheet__actions">
          <button type="button" className="event-sheet__cancel" onClick={onBack}>
            Cancel
          </button>
          <button type="button" className="event-sheet__save" disabled={draft.size === 0 && selectedIds.length === 0} onClick={() => onSave([...draft])}>
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
        className="people-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {content}
      </section>
    </div>
  );
}
