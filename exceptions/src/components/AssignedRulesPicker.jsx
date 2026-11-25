import { useEffect, useId, useMemo } from "react";
import { useReviewScope, useReviewState } from "../hooks/useReviewSession";
import { EVENT_TYPES } from "./EventTypesSheet";
import "../styles/assigned-rules-picker.css";

function ruleInformation(rule) {
  const parts = [];
  if (Array.isArray(rule.eventTypeIds)) parts.push(rule.eventTypeIds.length + (rule.eventTypeIds.length === 1 ? " event type" : " event types"));
  if (Array.isArray(rule.cameraIds)) parts.push(rule.cameraIds.length + (rule.cameraIds.length === 1 ? " camera" : " cameras"));
  const events = (rule.eventTypeIds ?? []).map((id) => EVENT_TYPES.find((type) => type.id === id)?.title.trim() || id).join(", ");
  const hasSchedule = Object.values(rule.schedule?.ranges ?? {}).some((ranges) => Array.isArray(ranges) && ranges.length);
  const schedule = hasSchedule ? "Weekly" : Array.isArray(rule.eventTypeIds) || rule.schedule !== undefined ? "Alarms at all times" : "";
  const exceptions = Array.isArray(rule.exceptions) ? rule.exceptions.length : 0;
  const metadata = parts.join(" · ") || rule.detail || "";
  return {
    metadata, events, schedule, exceptions,
    search: [rule.name, metadata, events, schedule, rule.detail].filter(Boolean).join(" ").toLowerCase(),
  };
}

function ruleState(rule) {
  return rule.locked ? "locked" : rule.on ? "on" : "off";
}

function RuleStatus({ rule, note, noteId }) {
  const state = ruleState(rule);
  return <span className={"arp-status is-" + state} title={note || undefined} tabIndex={note ? 0 : undefined} aria-describedby={note ? noteId : undefined}>
    {state === "locked" ? <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" rx="1.5" /><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" /></svg> : null}
    {state === "off" ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4v8M10.5 4v8" /></svg> : null}
    {state === "locked" ? "Locked" : state === "on" ? "On" : "Off"}
  </span>;
}

function RuleCardContent({ rule, info, note, noteId }) {
  const descriptionId = useId();
  const description = note || (typeof rule.locked === "string" ? rule.locked : "");
  const resolvedNoteId = noteId ?? descriptionId;
  return <div className="arp-card-content">
    <div className="arp-card-head">
      <h3 className="arp-card-title" title={rule.name}>{rule.name}</h3>
      <RuleStatus rule={rule} note={description} noteId={resolvedNoteId} />
    </div>
    {info.metadata ? <p className="arp-card-meta" title={info.events || info.metadata}>{info.metadata}</p> : null}
    {info.schedule || info.exceptions ? <div className="arp-card-schedule">
      {info.schedule ? <><img src="/assets/camera-monitor/clock.svg" alt="" /><span>{info.schedule}</span></> : null}
      {info.exceptions ? <span className="arp-card-exceptions">{info.schedule ? "· " : ""}{info.exceptions} {info.exceptions === 1 ? "exception" : "exceptions"}</span> : null}
    </div> : null}
    {description ? <span id={resolvedNoteId} className="arp-card-note">{description}</span> : null}
  </div>;
}

export function AssignedRuleSummary({ rules }) {
  return <div className="arp-summary-grid">{rules.map((rule) =>
    <div className={"arp-summary-card is-" + ruleState(rule)} key={rule.id}>
      <RuleCardContent rule={rule} info={ruleInformation(rule)} />
    </div>,
  )}</div>;
}

const RULE_GROUPS = [
  { id: "on", label: "On" },
  { id: "off", label: "Off" },
  { id: "unavailable", label: "Unavailable" },
];

function assignmentGroup(rule, issue) {
  if (rule.locked || rule.offline || issue) return "unavailable";
  return rule.on ? "on" : "off";
}

function UnavailableRule({ rule, info, issue, selected, existingLocked, noteId, onRemove }) {
  const status = rule.locked ? "Locked" : rule.offline ? "Offline" : issue ? "Unavailable" : "Off";
  const reason = existingLocked ? "Locked rule. Existing assignment is kept."
    : issue || (typeof rule.locked === "string" ? rule.locked : rule.locked ? "This rule is locked."
      : rule.offline ? "This rule is offline."
      : selected ? "This rule is off. Its existing assignment is kept unless you remove it."
      : "This rule is off. Turn it on before assigning this exception.");
  const details = [info.metadata, info.schedule, info.exceptions ? `${info.exceptions} ${info.exceptions === 1 ? "exception" : "exceptions"}` : ""].filter(Boolean).join(" · ");
  return <div className="arp-plain-row" role="group" aria-label={rule.name} aria-describedby={noteId} title={reason}>
    <div className="arp-plain-content">
      <div className="arp-plain-head">
        <h3 title={rule.name}>{rule.name}</h3>
        <span className="arp-plain-status" tabIndex={0} aria-describedby={noteId} title={reason}>{status}</span>
        {selected ? <span className="arp-applied">Applied</span> : null}
      </div>
      {details ? <p title={details}>{details}</p> : null}
    </div>
    {selected && !rule.locked ? <button type="button" className="arp-remove" aria-label={`Remove ${rule.name} from assigned rules`} title="Remove assignment" onClick={onRemove}><img src="/assets/alarm-rules/events/close.svg" alt="" /></button> : null}
    <span id={noteId} className="arp-card-note">{reason}</span>
  </div>;
}

export default function AssignedRulesPicker({
  rules, selectedIds, issues, isExistingLocked, onChange, onClose, onSave, canSave, titleId: suppliedTitleId,
}) {
  useReviewScope("AssignedRulesPicker");
  const localTitleId = useId();
  const titleId = suppliedTitleId ?? localTitleId;
  const [query, setQuery] = useReviewState("AssignedRulesPicker:query", "");
  const [filter, setFilter] = useReviewState("AssignedRulesPicker:filter", "all");
  const [openGroups, setOpenGroups] = useReviewState("AssignedRulesPicker:groups", { on: true, off: false, unavailable: false });
  const activeFilter = filter === "locked" ? "unavailable" : filter;
  const info = useMemo(() => new Map(rules.map((rule) => [rule.id, ruleInformation(rule)])), [rules]);
  const selectedCount = rules.filter((rule) => selectedIds.includes(rule.id)).length;
  const visible = rules.filter((rule) => {
    const matchesState = activeFilter === "all"
      || activeFilter === assignmentGroup(rule, issues.get(rule.id))
      || (activeFilter === "selected" && selectedIds.includes(rule.id));
    return matchesState && info.get(rule.id).search.includes(query.trim().toLowerCase());
  });
  const groups = RULE_GROUPS.map((group) => ({ ...group, rules: visible.filter((rule) => assignmentGroup(rule, issues.get(rule.id)) === group.id) })).filter((group) => group.rules.length > 0);
  const matchingGroups = groups.map((group) => group.id).join(",");
  useEffect(() => {
    if (!query.trim() && activeFilter === "all") return;
    setOpenGroups((current) => {
      const matching = matchingGroups ? matchingGroups.split(",") : [];
      if (matching.every((id) => current[id])) return current;
      return { ...current, ...Object.fromEntries(matching.map((id) => [id, true])) };
    });
  }, [query, activeFilter, matchingGroups]);

  return <div className="exception-sheet assigned-rules-picker" role="presentation">
    <button type="button" className="exception-sheet__backdrop" aria-label="Close" onClick={onClose} />
    <section className="exception-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="exception-new__header">
        <button type="button" className="event-sheet__close" aria-label="Back" onClick={onClose}><img src="/assets/alarm-rules/exceptions/back.svg" alt="" /></button>
        <h2 id={titleId}>Assigned rules</h2>
        <button type="button" className="event-sheet__close" aria-label="Close" onClick={onClose}><img src="/assets/alarm-rules/events/close.svg" alt="" /></button>
      </header>
      <div className="arp-body">
        <div className="arp-scroll-content">
        <div className="arp-search-header">
        <div className="arp-toolbar">
          <div className="camera-sheet__search"><label><img src="/assets/alarm-rules/cameras/search.svg" alt="" /><img src="/assets/alarm-rules/cameras/divider.svg" alt="" /><input aria-label="Search alarm rules" placeholder="Search by rule name, event type or schedule" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus /></label></div>
          <div className="arp-filter"><select aria-label="Filter alarm rules" value={activeFilter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All rules</option>
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="unavailable">Unavailable</option>
            <option value="selected">Selected</option>
          </select><img src="/assets/alarm-rules/cameras/chevron.svg" alt="" /></div>
        </div>
        <div className="arp-count" role="status"><span>{visible.length} of {rules.length} rules</span><strong>{selectedCount} selected</strong></div>
        </div>
        <div className="arp-results">
          {visible.length ? groups.map((group) => {
            const expanded = Boolean(openGroups[group.id]);
            const headingId = `${titleId}-${group.id}-heading`;
            const regionId = `${titleId}-${group.id}-rules`;
            return <section className="arp-group" key={group.id}>
              <button type="button" className={`camera-sheet__fold arp-fold${expanded ? " is-open" : ""}`} id={headingId} aria-expanded={expanded} aria-controls={regionId} onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}>
                <img src="/assets/alarm-rules/cameras/chevron.svg" alt="" />{group.label} ({group.rules.length})
              </button>
              <div id={regionId} role="region" aria-labelledby={headingId} hidden={!expanded}>
                <div className={group.id === "on" ? "arp-grid" : "arp-plain-grid"}>{group.rules.map((rule) => {
                  const selected = selectedIds.includes(rule.id);
                  if (group.id !== "on") return <UnavailableRule key={rule.id} rule={rule} info={info.get(rule.id)} issue={issues.get(rule.id)} selected={selected} existingLocked={isExistingLocked(rule)} noteId={`${titleId}-${rule.id}-note`} onRemove={() => onChange((current) => current.filter((id) => id !== rule.id))} />;
                  return <label className={"arp-card is-on" + (selected ? " is-selected" : "")} key={rule.id} data-rule-status="on">
                    <input type="checkbox" checked={selected} aria-label={"Select " + rule.name} onChange={() => onChange((current) => current.includes(rule.id) ? current.filter((id) => id !== rule.id) : [...current, rule.id])} />
                    <span className={"camera-sheet__check arp-check" + (selected ? " is-on" : "")} aria-hidden="true">{selected ? <img src="/assets/alarm-rules/cameras/check.svg" alt="" /> : null}</span>
                    <RuleCardContent rule={rule} info={info.get(rule.id)} />
                  </label>;
                })}</div>
              </div>
            </section>;
          }) : <div className="arp-empty"><p>{rules.length ? "No rules match your search or filter." : "No alarm rules have been created yet."}</p>{rules.length && (query || activeFilter !== "all") ? <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button> : null}</div>}
        </div>
        </div>
      </div>
      <div className="event-sheet__actions">
        <button type="button" className="event-sheet__cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="event-sheet__save" disabled={!canSave} onClick={onSave}>Save &amp; continue</button>
      </div>
    </section>
  </div>;
}
