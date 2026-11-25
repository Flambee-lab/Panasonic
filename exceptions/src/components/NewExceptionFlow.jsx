import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useReviewScope, useReviewScroll, useReviewState } from "../hooks/useReviewSession";
import { exceptionPresentation, exceptionTimeZone } from "../utils/exceptionPresentation";
import { exceptionAssignmentIssue } from "../utils/exceptionAssignments";
import { validateExceptionDayRanges } from "../utils/exceptionDayTimeline";
import NewExceptionSheet from "./NewExceptionSheet";
import ExceptionDatesHoursSheet from "./ExceptionDatesHoursSheet";
import AssignedRulesPicker, { AssignedRuleSummary } from "./AssignedRulesPicker";
import RuleGuard from "./RuleGuard";
import "../styles/new-exception-flow.css";

const SECTIONS = [
  { id: "name", label: "Name" },
  { id: "datesHours", label: "Dates and hours", action: "Add dates and hours", hint: "Choose the dates and the alarm hours that apply to them." },
  { id: "rules", label: "Assigned rules", action: "Assign rules", hint: "Select the alarm rules that use this exception." },
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function initialDraft(initial) {
  return {
    name: "",
    dates: [],
    repeatYearly: true,
    type: "hours",
    ranges: [],
    likeDay: "Monday",
    scheduleId: "",
    scheduleName: "",
    ...initial,
  };
}

function assignedIds(initial, rules) {
  return initial?.id ? rules.filter((rule) => (rule.exceptions ?? []).some((item) => item.id === initial.id)).map((rule) => rule.id) : [];
}

function draftKey(draft, ids, configured) {
  const behavior = draft.type === "day" ? draft.likeDay
    : draft.type === "schedule" ? draft.scheduleId
    : draft.type === "temporary" ? draft.endsId
    : draft.ranges;
  return JSON.stringify({
    name: draft.name.trim(),
    dates: [...draft.dates].sort(),
    repeatYearly: draft.repeatYearly,
    type: draft.type,
    zone: draft.zone ?? "",
    behavior,
    configured,
    ids: [...ids].sort(),
  });
}

export default function NewExceptionFlow({
  initial = null,
  rules = [],
  zone,
  namedSchedules = [],
  unavailableSchedules = [],
  onClose,
  onSave,
}) {
  useReviewScope("NewExceptionFlow");
  const titleId = useId();
  const pickerTitleId = useId();
  const bodyRef = useRef(null);
  const nameRef = useRef(null);
  const [draft, setDraft] = useReviewState("NewExceptionFlow:draft", () => initialDraft(initial));
  const [selectedRuleIds, setSelectedRuleIds] = useReviewState("NewExceptionFlow:rules", () => assignedIds(initial, rules));
  const [behaviorConfigured, setBehaviorConfigured] = useReviewState("NewExceptionFlow:behaviorConfigured", Boolean(initial));
  const [editor, setEditor] = useReviewState("NewExceptionFlow:editor:dates-hours", null);
  const [pickerIds, setPickerIds] = useReviewState("NewExceptionFlow:pickerIds", () => assignedIds(initial, rules));
  const [sectionId, setSectionId] = useReviewState("NewExceptionFlow:section:dates-hours", "name");
  const [attemptedSave, setAttemptedSave] = useReviewState("NewExceptionFlow:attemptedSave", false);
  const [guard, setGuard] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialAssignedIds] = useState(() => new Set(assignedIds(initial, rules)));
  const [baseKey] = useState(() => draftKey(initialDraft(initial), assignedIds(initial, rules), Boolean(initial)));
  const dirty = draftKey(draft, selectedRuleIds, behaviorConfigured) !== baseKey;
  const selectedRules = rules.filter((rule) => selectedRuleIds.includes(rule.id));
  const presentation = exceptionPresentation(draft, { timeZone: exceptionTimeZone(draft.zone ?? zone) });
  const ruleIssues = useMemo(() => new Map(rules.map((rule) => [rule.id, exceptionAssignmentIssue(rule, draft, rules)])), [draft, rules]);
  const keptLocked = (rule) => Boolean(rule.locked && initialAssignedIds.has(rule.id));
  const assignmentIssues = selectedRules.filter((rule) => !keptLocked(rule) && ruleIssues.get(rule.id));
  const errors = {};
  if (!draft.name.trim()) errors.name = "Enter a name for this exception.";
  if (!draft.dates.length) errors.dates = "Choose at least one date.";
  if (!behaviorConfigured) errors.behavior = "Set the hours for this exception.";
  else if (draft.type === "hours" && !validateExceptionDayRanges(draft.ranges).valid) {
    errors.behavior = "Add complete time ranges that do not overlap.";
  } else if (draft.type === "day" && !DAYS.includes(draft.likeDay)) {
    errors.behavior = "Choose the day whose hours this exception follows.";
  }
  if (errors.dates || errors.behavior) errors.datesHours = [errors.dates, errors.behavior].filter(Boolean).join(" ");
  if (!selectedRules.length) errors.rules = "Choose at least one alarm rule.";
  else if (assignmentIssues.length) errors.rules = assignmentIssues.map((rule) => `${rule.name}: ${ruleIssues.get(rule.id)}`).join(" ");
  const visibleErrors = attemptedSave ? errors : {};
  const pickerCanSave = pickerIds.some((id) => {
    const rule = rules.find((item) => item.id === id);
    return rule && (keptLocked(rule) || !ruleIssues.get(id));
  }) && !pickerIds.some((id) => {
    const rule = rules.find((item) => item.id === id);
    return rule && !keptLocked(rule) && ruleIssues.get(id);
  });

  useReviewScroll("NewExceptionFlow", bodyRef);

  const askLeave = () => {
    if (dirty) setGuard({ kind: "leave" });
    else onClose();
  };
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (guard) setGuard(null);
      else if (editor === "rules") setEditor(null);
      else if (!editor) askLeave();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dirty, editor, guard, onClose]);

  const goTo = (id) => {
    setSectionId(id);
    document.getElementById(`${titleId}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (id === "name") nameRef.current?.focus({ preventScroll: true });
  };
  const openEditor = (id) => {
    setSectionId(id);
    if (id === "rules") {
      setPickerIds(selectedRuleIds);
    }
    setEditor(id);
  };
  const closeEditor = () => setEditor(null);
  const saveSection = (value) => {
    if (editor === "datesHours") {
      setDraft((current) => ({ ...current, dates: value.dates, repeatYearly: value.repeatYearly, zone: value.zone ?? current.zone, type: value.type, ranges: value.ranges, likeDay: value.likeDay, scheduleId: value.scheduleId, scheduleName: value.scheduleName, endsId: value.endsId, endsLabel: value.endsLabel }));
      setBehaviorConfigured(true);
    } else if (editor === "dates") {
      setDraft((current) => ({ ...current, dates: value.dates, repeatYearly: value.repeatYearly }));
    } else {
      setDraft((current) => ({
        ...current,
        type: value.type,
        ranges: value.ranges,
        likeDay: value.likeDay,
        scheduleId: value.scheduleId,
        scheduleName: value.scheduleName,
        endsId: value.endsId,
        endsLabel: value.endsLabel,
      }));
      setBehaviorConfigured(true);
    }
    closeEditor();
  };
  const requestSave = async () => {
    setAttemptedSave(true);
    const firstError = SECTIONS.find((section) => errors[section.id]);
    if (firstError) {
      goTo(firstError.id);
      return;
    }
    setSaving(true);
    try {
      const result = await onSave({ ...draft, name: draft.name.trim() }, selectedRuleIds);
      if (result?.ok === false) setGuard({ kind: "error", message: result.message || result.error || "Review the exception and try again." });
    } catch {
      setGuard({ kind: "error", message: "The exception could not be saved. Your changes are still here." });
    } finally {
      setSaving(false);
    }
  };
  const fieldError = (id) => visibleErrors[id] ? <p className="alarm-rule__field-error" id={`${titleId}-${id}-error`} role="alert">{visibleErrors[id]}</p> : null;
  const summarySection = (section, applied, content) => (
    <section
      className={`alarm-rule__section${applied ? "" : " is-empty"}${sectionId === section.id ? " is-current" : ""}${visibleErrors[section.id] ? " has-error" : ""}`}
      id={`${titleId}-${section.id}`}
      key={section.id}
      aria-describedby={visibleErrors[section.id] ? `${titleId}-${section.id}-error` : undefined}
    >
      {applied ? <header className="alarm-rule__section-head">
        <span>{section.label}{section.id === "rules" ? ` (${selectedRules.length})` : ""}</span>
        <button type="button" className="alarm-rule__section-edit" aria-label={`Edit ${section.label.toLowerCase()}`} onClick={() => openEditor(section.id)}>
          <img src="/assets/alarm-rules/edit.svg" alt="" />
        </button>
      </header> : null}
      <div className={`alarm-rule__section-body exception-flow__section-body${applied ? "" : " is-empty"}`}>
        {applied ? content : <div className="alarm-rule__add-shell">
          <button type="button" className="alarm-rule__add" aria-invalid={Boolean(visibleErrors[section.id])} onClick={() => openEditor(section.id)}>
            <span className="alarm-rule__add-icon" aria-hidden="true" />
            <span className="alarm-rule__add-label">{section.action}</span>
            <span className="alarm-rule__pipe" aria-hidden="true">|</span>
            <span className="alarm-rule__hint">{section.hint}</span>
          </button>
        </div>}
        {fieldError(section.id)}
      </div>
    </section>
  );

  return (
    <main className={`alarm-rule exception-flow is-actions${editor ? " is-behind" : ""}${scrolled ? " is-scrolled" : ""}`}>
      <div className="alarm-rule__plane" inert={editor || guard ? true : undefined}>
        <button type="button" className="alarm-rule__close" aria-label="Close" onClick={askLeave}><img src="/assets/alarm-rules/close.svg" alt="" /></button>
        <div className="alarm-rule__chrome" aria-hidden={!scrolled}><span>{initial ? "Edit exception" : "New exception"}</span></div>
        <div className="alarm-rule__body" ref={bodyRef} onScroll={() => setScrolled((bodyRef.current?.scrollTop ?? 0) > 48)}>
          <section className="alarm-rule__card">
            <header className="alarm-rule__header">
              <span className="alarm-rule__mark" aria-hidden="true"><span className="alarm-rule__mark-spin"><img src="/assets/alarm-rules/rule-mark.svg" alt="" /></span></span>
              <div className="alarm-rule__heading">
                <h1>{initial ? "Edit exception" : "New exception"}</h1>
                <p>Set dates and hours, then choose the alarm rules that use this exception.</p>
              </div>
            </header>
            <div className="alarm-rule__review">
              <nav className="alarm-rule__nav" aria-label="Exception sections">
                {SECTIONS.map((section) => <button type="button" key={section.id} className={sectionId === section.id ? "is-active" : undefined} aria-current={sectionId === section.id ? "location" : undefined} onClick={() => goTo(section.id)}>{section.label}</button>)}
              </nav>
              <div className="alarm-rule__review-main">
                <div className="alarm-rule__field-content" id={`${titleId}-name`}>
                  <input ref={nameRef} className={`alarm-rule__name is-review${sectionId === "name" ? " is-current" : ""}`} aria-label="Exception name" placeholder="e.g. Early closing" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} aria-invalid={Boolean(visibleErrors.name)} aria-describedby={visibleErrors.name ? `${titleId}-name-error` : undefined} autoFocus />
                  {fieldError("name")}
                </div>
                {summarySection(SECTIONS[1], draft.dates.length > 0 || behaviorConfigured, <div className="exception-flow__dates-hours-summary">
                  <div className="exception-flow__summary"><span className="exception-flow__summary-label">Dates</span><strong>{presentation.date}</strong><span>{draft.repeatYearly ? "Repeats every year" : "Does not repeat"}</span></div>
                  <div className="exception-flow__summary"><span className="exception-flow__summary-label">Hours</span>{behaviorConfigured ? <><strong>{draft.type === "hours" ? "Same hours on all selected dates" : presentation.type}</strong>{presentation.behavior.map((line, index) => <span key={index}>{line}</span>)}{draft.type === "hours" && (draft.zone ?? zone) ? <span>{draft.zone ?? zone}</span> : null}</> : <strong>No hours set</strong>}</div>
                </div>)}
                {summarySection(SECTIONS[2], selectedRules.length > 0, <AssignedRuleSummary rules={selectedRules} />)}
              </div>
            </div>
          </section>
        </div>
        <footer className="alarm-rule__footer">
          <button type="button" className="alarm-rule__back" onClick={askLeave}>Cancel</button>
          <button type="button" className="alarm-rule__create" disabled={saving} onClick={requestSave}>{initial ? "Save exception" : "Create exception"}</button>
        </footer>
      </div>

      {editor === "dates" || editor === "behavior" ? <NewExceptionSheet key={editor} initial={draft} section={editor} saveLabel={editor === "dates" ? "Save dates" : "Save hours"} zone={zone} namedSchedules={namedSchedules} unavailableSchedules={unavailableSchedules} onBack={closeEditor} onClose={closeEditor} onSave={saveSection} /> : null}
      {editor === "datesHours" ? draft.type === "hours" ? <ExceptionDatesHoursSheet initial={draft} zone={zone} onBack={closeEditor} onClose={closeEditor} onSave={saveSection} /> : <NewExceptionSheet initial={draft} section="datesHours" saveLabel="Save dates and hours" zone={zone} namedSchedules={namedSchedules} unavailableSchedules={unavailableSchedules} onBack={closeEditor} onClose={closeEditor} onSave={saveSection} /> : null}

      {editor === "rules" ? <AssignedRulesPicker
        titleId={pickerTitleId}
        rules={rules}
        selectedIds={pickerIds}
        issues={ruleIssues}
        isExistingLocked={keptLocked}
        onChange={setPickerIds}
        onClose={closeEditor}
        canSave={pickerCanSave}
        onSave={() => { setSelectedRuleIds(pickerIds); closeEditor(); }}
      /> : null}

      {guard?.kind === "leave" ? <RuleGuard title="Discard this exception?" confirmLabel="Discard" cancelLabel="Keep editing" onCancel={() => setGuard(null)} onConfirm={onClose}><p>The name, dates, hours, and assigned rules in this draft will be lost.</p></RuleGuard> : null}
      {guard?.kind === "error" ? <RuleGuard title="This exception wasn't saved" confirmLabel="" cancelLabel="Keep editing" onCancel={() => setGuard(null)}><p>{guard.message}</p></RuleGuard> : null}
    </main>
  );
}
