import { useEffect, useRef, useState } from "react";

const ASSETS = "/assets/live-events/";
const FILTERS = [
  ["cameras", "Cameras"],
  ["people", "Registered people detection"],
  ["vehicle", "Registered vehicle detection"],
  ["sound", "Sound"],
  ["vmd", "AI - VMD"],
  ["extension", "Extension app event"],
  ["scene", "AI Scene change"],
  ["lpr", "LPR"],
  ["ocr", "OCR"],
  ["container", "Container"],
  ["vca", "VCA"],
];
const DEFAULT_FILTERS = { cameras: true };
const EVENTS = Array.from({ length: 12 }, (_, index) => ({
  id: `event-${index + 1}`,
  timestamp: Date.UTC(2024, 6, 8, 18, 0) - index * 60000,
  date: "7/8/24",
  time: "6:00 PM",
  camera: "192.168.0.67 - Panasonic",
  model: "Model: S2136L ...",
  event: "Event",
  type: "vehicle",
}));
const PAST_EVENTS = EVENTS.map((event) => ({
  ...event,
  id: `past-${event.id}`,
  timestamp: event.timestamp - 86400000,
  date: "7/7/24",
}));

function Asset({ name, className = "", ...props }) {
  return <img className={className} src={`${ASSETS}${name}.svg`} alt="" draggable="false" {...props} />;
}

function useDismiss(ref, onDismiss) {
  useEffect(() => {
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) onDismiss();
    };
    const onKey = (event) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onDismiss]);
}

function WorkspaceTabs() {
  return (
    <nav className="le-workspace" aria-label="Workspace">
      <a className="le-workspace__home" href="/" aria-label="Camera monitor"><Asset name="imgIcon" /></a>
      <div className="le-workspace__tab">New workspace<Asset name="imgIcon1" /></div>
      <div className="le-workspace__tab is-active">I pro Active guard E...<Asset name="imgIcon2" className="le-expand-icon" /><Asset name="imgIcon3" /></div>
      <span className="le-workspace__add" aria-hidden="true"><Asset name="imgIcon4" /></span>
    </nav>
  );
}

function FiltersSidebar({ tab, onTab, draft, onDraft, onApply, onClear }) {
  const [peopleMode, setPeopleMode] = useState("Category");
  const [expanded, setExpanded] = useState(null);
  return (
    <aside className="le-sidebar" aria-label="Event filters">
      <div className="le-server">
        <a className="le-server__back" href="/" aria-label="Back to monitor"><Asset name="imgMaterialSymbolsArrowBackRounded" /></a>
        <div className="le-server__name"><Asset name="imgMdiServerOutline" /><strong>192.168.0.224</strong><Asset name="imgMynauiChevronDownSolid" className="le-down" /></div>
      </div>
      <div className="le-sidebar__body">
        <div className="le-sidebar__scroll">
          <div className="le-segmented" role="tablist" aria-label="Event history">
            {["Live events", "Past events"].map((label) => <button key={label} type="button" role="tab" aria-selected={tab === label} className={tab === label ? "is-active" : ""} onClick={() => onTab(label)}>{label}</button>)}
          </div>
          <div className="le-filter-heading"><span>Filters</span><button type="button" onClick={() => setExpanded(expanded === "watchlist" ? null : "watchlist")} aria-expanded={expanded === "watchlist"}>Setup watchlist</button></div>
          {expanded === "watchlist" ? <div className="le-filter-options">No watchlists added.</div> : null}
          <div className="le-filters">
            {FILTERS.map(([id, label]) => (
              <div className={`le-filter-group ${id === "people" ? "le-filter-group--people" : ""}`} key={id}>
                <div className="le-filter">
                  <button className={`le-switch ${draft[id] ? "is-on" : ""}`} type="button" role="switch" aria-checked={Boolean(draft[id])} aria-label={label} onClick={() => onDraft({ ...draft, [id]: !draft[id] })}><span /></button>
                  <button className="le-filter__label" type="button" onClick={() => setExpanded(expanded === id ? null : id)} aria-expanded={expanded === id} title={label}>{label}</button>
                  <button className="le-filter__expand" type="button" aria-label={`Configure ${label}`} aria-expanded={expanded === id} onClick={() => setExpanded(expanded === id ? null : id)}><Asset name={id === "people" ? "imgMynauiChevronDownSolid2" : "imgMynauiChevronDownSolid1"} /></button>
                </div>
                {id === "people" ? <div className="le-people-mode"><div className="le-segmented" aria-label="People filter mode">{["Watchlist", "Category"].map((mode) => <button type="button" key={mode} className={peopleMode === mode ? "is-active" : ""} aria-pressed={peopleMode === mode} onClick={() => setPeopleMode(mode)}>{mode}</button>)}</div></div> : null}
                {expanded === id ? <div className="le-filter-options"><label><input type="checkbox" checked={Boolean(draft[id])} onChange={(e) => onDraft({ ...draft, [id]: e.target.checked })} />{id === "cameras" ? "All cameras" : `Include ${label.toLowerCase()}`}</label></div> : null}
              </div>
            ))}
          </div>
        </div>
        <footer className="le-filter-actions"><button type="button" onClick={onClear}>Clear</button><button type="button" className="is-primary" onClick={onApply}>Apply</button></footer>
      </div>
    </aside>
  );
}

function EventRow({ event, comment, onComment, reviewed, onReview, onPreview }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef(null);
  useDismiss(menu, () => setMenuOpen(false));
  return (
    <div className="le-grid le-event-row" role="row" data-event-id={event.id}>
      <div role="cell"><time dateTime={new Date(event.timestamp).toISOString()}>{event.date}<br />{event.time}</time></div>
      <div role="cell"><span className="le-camera-name">{event.camera}</span><span className="le-camera-model">{event.model}</span></div>
      <div role="cell">{event.event}</div>
      <div role="cell"><button className="le-detection" type="button" onClick={onPreview} aria-label={`Preview detection ${event.id}`}><img src={`${ASSETS}imgFrame.png`} alt="Vehicle detected by the camera" /></button></div>
      <div role="cell">-</div>
      <div role="cell">Object type vehicle<br />Detection area: 1<br />Detection score: 100%</div>
      <div role="cell"><span className={`le-status ${reviewed ? "is-reviewed" : ""}`}>{reviewed ? "Read" : "New"}</span></div>
      <div role="cell"><textarea aria-label={`Comment for ${event.id}`} placeholder="Text here" value={comment} onChange={(e) => onComment(e.target.value)} /></div>
      <div role="cell" className="le-row-actions" ref={menu}>
        <button type="button" className="le-more" aria-label={`Actions for ${event.id}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span className="le-more__icon"><Asset name="imgGroup1321314908" /></span></button>
        {menuOpen ? <div className="le-menu le-menu--row" role="menu"><button type="button" role="menuitem" onClick={() => { onReview(); setMenuOpen(false); }}>{reviewed ? "Mark as new" : "Mark as read"}</button><button type="button" role="menuitem" onClick={() => { onPreview(); setMenuOpen(false); }}>View detection</button></div> : null}
      </div>
    </div>
  );
}

export default function LiveEventsScreen({ onOpenAlarmRules }) {
  const [tab, setTab] = useState("Live events");
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);
  const [comments, setComments] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [ascending, setAscending] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const settings = useRef(null);
  const previewDialog = useRef(null);
  useDismiss(settings, () => setSettingsOpen(false));
  useEffect(() => {
    if (preview) previewDialog.current?.showModal();
  }, [preview]);
  const activeTypes = Object.keys(applied).filter((id) => id !== "cameras" && applied[id]);
  const rows = (tab === "Past events" ? PAST_EVENTS : EVENTS).filter((event) => !activeTypes.length || activeTypes.includes(event.type));
  if (ascending) rows.reverse();
  const openRules = () => {
    setSettingsOpen(false);
    if (onOpenAlarmRules) onOpenAlarmRules();
    else window.location.assign("/alarm-rules");
  };

  return (
    <main className="live-events">
      <WorkspaceTabs />
      <div className="le-body">
        <FiltersSidebar tab={tab} onTab={setTab} draft={draft} onDraft={setDraft} onApply={() => setApplied({ ...draft })} onClear={() => { setDraft({}); setApplied({}); }} />
        <section className="le-main" aria-label={tab}>
          <header className="le-toolbar">
            <span className="le-clock">Current Date &amp; Time: 11/5/2026 - 11:07:16 AM</span>
            <div className="le-toolbar__actions">
              {tipVisible ? <div className="le-tip"><button type="button" onClick={() => setTipVisible(false)}>Got it</button><span aria-hidden="true">|</span><button type="button" onClick={openRules}>Set a rule for when events trigger alarms in Live Events →</button></div> : null}
              <div className="le-settings" ref={settings}>
                <button type="button" className="le-settings__button" aria-label="Settings" aria-haspopup="menu" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Asset name="imgIcon5" /></button>
                {settingsOpen ? <div className="le-menu" role="menu"><button type="button" role="menuitem" disabled>Option 1</button><button type="button" role="menuitem" disabled>Option 2</button><button type="button" role="menuitem" onClick={openRules}>Alarm rules</button></div> : null}
              </div>
            </div>
          </header>
          <div className="le-table-viewport" tabIndex={0} role="region" aria-label={`${tab} table, scroll to see more events and columns`}>
            <div className="le-table" role="table" aria-label={tab} aria-colcount={9} aria-rowcount={rows.length + 1}>
              <div className="le-grid le-table-header" role="row">
                <div role="columnheader" aria-sort={ascending ? "ascending" : "descending"}><button type="button" className="le-sort" onClick={() => setAscending(!ascending)} aria-label="Sort by date and time"><span>Date<br />Time</span><Asset name="imgGridiconsDropdown" className={ascending ? "is-ascending" : ""} /></button></div>
                {["Camera", "Event", "Detected", "Registered", "Details", "Status", "Comments"].map((label) => <div key={label} role="columnheader">{label}</div>)}
                <div role="columnheader"><span className="le-sr-only">Actions</span></div>
              </div>
              {rows.map((event) => <EventRow key={event.id} event={event} comment={comments[event.id] ?? ""} onComment={(text) => setComments((current) => ({ ...current, [event.id]: text }))} reviewed={Boolean(reviewed[event.id])} onReview={() => setReviewed((current) => ({ ...current, [event.id]: !current[event.id] }))} onPreview={() => setPreview(event)} />)}
              {!rows.length ? <div className="le-empty" role="row"><div role="cell" aria-colspan={9}>No events match these filters. Clear the filters to see all events.</div></div> : null}
            </div>
          </div>
        </section>
      </div>
      <dialog className="le-preview" ref={previewDialog} onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) previewDialog.current.close(); }} aria-labelledby="le-preview-title">
        <header><h2 id="le-preview-title">Detected vehicle</h2><button type="button" aria-label="Close preview" onClick={() => previewDialog.current.close()}><Asset name="imgIcon3" /></button></header>
        <img src={`${ASSETS}imgFrame.png`} alt="Camera capture of the detected vehicle" />
        <p>{preview?.camera} · {preview?.date} {preview?.time}</p>
      </dialog>
    </main>
  );
}
