import { useReviewState, useReviewScope } from "../hooks/useReviewSession";
import { useEffect, useId, useMemo, useState } from "react";
import { CAMERAS } from "../data/alarm-cameras";
import NewAlarmRule from "./NewAlarmRule";
import LiveEventsScreen from "./LiveEventsScreen";
import { PEOPLE } from "./PeoplePickerSheet";
import ExceptionsManagerList from "./ExceptionsManagerList";
import NewExceptionFlow from "./NewExceptionFlow";
import RuleGuard from "./RuleGuard";
import { STARTING_EXCEPTIONS } from "../data/exception-library";
import { DEMO_ALARM_RULES } from "../data/demo-alarm-rules";
import { applyExceptionToRules } from "../utils/exceptionAssignments";

const EVENING = [{ start: 18 * 60, end: 24 * 60 }];
const AFTER_HOURS_RANGES = Object.fromEntries(
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => [day, EVENING]),
);

const STARTING_RULES = [
  {
    id: "after-hours",
    name: "After hours",
    on: true,
    revision: 1,
    eventTypeIds: ["vmd"],
    cameraIds: CAMERAS.filter((camera) => !(camera.unsupported ?? []).includes("vmd") && !camera.offline)
      .slice(0, 72)
      .map((camera) => camera.id),
    schedule: {
      repeat: "weekly",
      zone: "(UTC-05:00) Eastern Time (US & Canada)",
      ranges: AFTER_HOURS_RANGES,
    },
    exceptions: [],
  },
  {
    id: "midday",
    name: "Midday lunch ours",
    on: true,
    revision: 2,
    eventTypeIds: ["people"],
    peopleIds: ["removed-person"],
    cameraIds: ["cam-8"],
    schedule: null,
    exceptions: [],
  },
  {
    id: "audio",
    name: "Audio",
    detail: "Live audio and recorded audio",
    on: false,
    locked: "You can view this rule, not change it.",
  },
  ...DEMO_ALARM_RULES,
];

function blockedCameras(rule) {
  return (rule.cameraIds ?? []).filter((id) => {
    const camera = CAMERAS.find((item) => item.id === id);
    return (camera?.unsupported ?? []).some((gap) => (rule.eventTypeIds ?? []).includes(gap));
  }).length;
}

function ruleSummary(rule) {
  if (rule.locked) return rule.locked;
  if (!rule.on) return "Not applied";
  if (!rule.eventTypeIds && rule.detail) return rule.detail;
  const parts = [];
  if (rule.eventTypeIds) {
    parts.push(`${rule.eventTypeIds.length} event type${rule.eventTypeIds.length === 1 ? "" : "s"}`);
  }
  if (rule.cameraIds) parts.push(`${rule.cameraIds.length} camera${rule.cameraIds.length === 1 ? "" : "s"}`);
  const hours = rule.schedule && Object.values(rule.schedule.ranges ?? {}).some((list) => list?.length);
  if (rule.eventTypeIds) parts.push(hours ? "Weekly" : "Alarms at all times");
  if (rule.exceptions?.length) parts.push(`${rule.exceptions.length} ${rule.exceptions.length === 1 ? "exception" : "exceptions"}`);
  const blocked = blockedCameras(rule);
  if (blocked) parts.push(blocked === 1 ? "1 camera can't run these events" : `${blocked} cameras can't run these events`);
  const missing = (rule.peopleIds ?? []).filter((id) => !PEOPLE.some((person) => person.id === id)).length;
  if (missing) parts.push(missing === 1 ? "1 person removed" : `${missing} people removed`);
  return parts.join(" · ");
}

export default function AlarmRulesAccess() {
  useReviewScope("AlarmRulesAccess");
  const titleId = useId();
  const directSection = new URLSearchParams(window.location.search).get("section");
  const [rulesOpen, setRulesOpen] = useReviewState("AlarmRulesAccess:rulesOpen", directSection === "rules" || directSection === "exceptions");
  const [creating, setCreating] = useReviewState("AlarmRulesAccess:creating", false);
  const [editing, setEditing] = useReviewState("AlarmRulesAccess:editing", null);
  const [rules, setRules] = useReviewState("AlarmRulesAccess:rules", STARTING_RULES);
  const [activeSection, setActiveSection] = useReviewState("AlarmRulesAccess:b2Section", directSection === "exceptions" ? "exceptions" : "rules");
  const [exceptionLibrary, setExceptionLibrary] = useReviewState("AlarmRulesAccess:b2Exceptions", STARTING_EXCEPTIONS);
  const [exceptionEditor, setExceptionEditor] = useReviewState("AlarmRulesAccess:b2ExceptionEditor", null);
  const [removeException, setRemoveException] = useState(null);
  const [notice, setNotice] = useState("");
  const [highlightId, setHighlightId] = useState("");
  const namedSchedules = useMemo(() => rules.filter((rule) =>
    !rule.locked && Object.values(rule.schedule?.ranges ?? {}).some((ranges) => ranges?.length),
  ).map((rule) => ({ id: rule.id, name: rule.name })), [rules]);
  const unavailableSchedules = useMemo(() => rules.filter((rule) =>
    rule.locked || !Object.values(rule.schedule?.ranges ?? {}).some((ranges) => ranges?.length),
  ).map((rule) => ({ id: rule.id, name: rule.name, reason: rule.locked || "It has no weekly hours, so it cannot be used." })), [rules]);

  const openManager = (section) => {
    setActiveSection(section);
    setRulesOpen(true);
  };
  const closeExceptionEditor = () => {
    setExceptionEditor(null);
    setActiveSection("exceptions");
    setRulesOpen(true);
  };
  const saveException = (draft, assignedRuleIds) => {
    const id = exceptionEditor.id ?? crypto.randomUUID();
    const next = { ...draft, id };
    const assignment = applyExceptionToRules(rules, next, assignedRuleIds);
    if (!assignment.ok) return assignment;
    setExceptionLibrary((current) => exceptionEditor.id
      ? current.map((item) => item.id === id ? next : item)
      : [...current, next]);
    setRules(assignment.rules);
    const count = assignment.rules.filter((rule) => (rule.exceptions ?? []).some((item) => item.id === id)).length;
    setNotice(`${draft.name} saved and applied to ${count} ${count === 1 ? "rule" : "rules"}.`);
    closeExceptionEditor();
    return { ok: true };
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(false), 3200);
    return () => clearTimeout(timeout);
  }, [notice]);

  const saveRule = (draft) => {
    const lockedName = rules.find(
      (rule) => rule.locked && rule.name.trim().toLowerCase() === draft.name.trim().toLowerCase() && rule.id !== editing?.id,
    );
    if (lockedName) {
      return {
        ok: false,
        message: `${lockedName.name} is locked, so this rule can't use that name. Rename it, then save again.`,
      };
    }
    if (editing) {
      if (!rules.some((rule) => rule.id === editing.id)) {
        return {
          ok: false,
          message: "This rule was removed from the list while it was open. Close it and start again.",
        };
      }
      setRules((current) =>
        current.map((rule) =>
          rule.id === editing.id
            ? { ...rule, ...draft, on: rule.on, fresh: false, revision: (rule.revision ?? 1) + 1 }
            : { ...rule, fresh: false },
        ),
      );
      setHighlightId(editing.id);
      setNotice(`${draft.name} saved. It stays on the list when you close this dialog.`);
      setEditing(null);
    } else {
      const id = `rule-${Date.now()}`;
      setRules((current) => [
        { id, ...draft, on: true, fresh: true, revision: 1 },
        ...current.map((rule) => ({ ...rule, fresh: false })),
      ]);
      setHighlightId(id);
      setNotice(`${draft.name} is on the list and switched on.`);
      setCreating(false);
    }
    setRulesOpen(true);
    return { ok: true };
  };

  const deleteRule = () => {
    if (!editing) return;
    const id = editing.id;
    setRules((current) => current.filter((rule) => rule.id !== id));
    setNotice("Alarm rule deleted");
    setEditing(null);
    setRulesOpen(true);
  };

  const editor = exceptionEditor ? (
      <NewExceptionFlow
        key={exceptionEditor.id ?? "new"}
        initial={exceptionEditor.id ? exceptionEditor : null}
        rules={rules}
        zone={rules.find((rule) => rule.schedule)?.schedule.zone}
        namedSchedules={namedSchedules}
        unavailableSchedules={unavailableSchedules}
        onClose={closeExceptionEditor}
        onSave={saveException}
      />
  ) : creating || editing ? (
      <NewAlarmRule
        initial={editing}
        rules={rules}
        exceptionCatalog={exceptionLibrary}
        onClose={() => {
          setCreating(false);
          setEditing(null);
          setRulesOpen(true);
        }}
        onCreate={saveRule}
        onDelete={editing ? deleteRule : undefined}
      />
  ) : null;

  return (
    <>
    {editor}
    <div className="access" hidden={Boolean(editor)}>
      <div className="access__live" inert={rulesOpen || Boolean(exceptionEditor) || undefined}>
        <LiveEventsScreen
          onOpenAlarmRules={() => openManager("rules")}
          onOpenExceptions={() => openManager("exceptions")}
        />
      </div>
      {rulesOpen && !editor ? (
        <AlarmRulesDialog
          titleId={titleId}
          activeSection={activeSection}
          exceptionItems={exceptionLibrary}
          onCreateException={() => {
            setExceptionEditor({ id: null });
            setRulesOpen(false);
          }}
          onEditException={(item) => {
            setExceptionEditor(item);
            setRulesOpen(false);
          }}
          onRemoveException={setRemoveException}
          rules={rules}
          highlightId={highlightId}
          onToggle={(id) => {
            const rule = rules.find((item) => item.id === id);
            if (!rule || rule.locked) return;
            const on = !rule.on;
            setRules((current) => current.map((item) => (item.id === id ? { ...item, on } : item)));
            setHighlightId(id);
            setNotice(
              on
                ? `${rule.name} is on.`
                : `${rule.name} is off. Alarms already in Live Events stay. New ones from this rule stop.`,
            );
          }}
          onEdit={(rule) => {
            if (rule.locked) return;
            setEditing(rule);
            setRulesOpen(false);
          }}
          notice={notice}
          onClose={() => {
            if (removeException) {
              setRemoveException(null);
              return;
            }
            setRulesOpen(false);
            setNotice("");
            setHighlightId("");
            setRules((current) => current.map((rule) => ({ ...rule, fresh: false })));
          }}
          onCreate={() => setCreating(true)}
        />
      ) : null}
      {removeException ? (
        <RuleGuard
          title={`Delete ${removeException.name}?`}
          confirmLabel="Delete exception"
          onCancel={() => setRemoveException(null)}
          onConfirm={() => {
            setExceptionLibrary((current) => current.filter((item) => item.id !== removeException.id));
            setRemoveException(null);
          }}
        >
          <p>This removes the exception from the library. Existing alarm rules keep the exceptions already applied to them.</p>
        </RuleGuard>
      ) : null}
    </div>
    </>
  );
}

function AlarmRulesDialog({ titleId, rules, notice, highlightId, onToggle, onEdit, onClose, onCreate,
  activeSection, exceptionItems, onCreateException, onEditException, onRemoveException }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="access-dialog">
      <button type="button" className="access-dialog__backdrop" aria-label="Close" onClick={onClose} />
      {notice ? (
        <div className="access-toast" role="status">
          {notice}
        </div>
      ) : null}
      <section className="access-dialog__panel b2-manager" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="access-dialog__header">
          <img src="/assets/alarm-rules/access/mark.svg" alt="" />
          <h2 id={titleId}>{activeSection === "rules" ? "Alarm rules" : "Exceptions"}</h2>
          <button type="button" className="access-dialog__close" aria-label="Close" onClick={onClose}>
            <img src="/assets/alarm-rules/events/close.svg" alt="" />
          </button>
        </header>
        <div
          className="access-dialog__body"
          hidden={activeSection !== "rules"}
        >
          <p>
            Choose which events and cameras trigger alarms in Live Events. Then set when those alarms appear using
            schedules and exceptions.
          </p>
          <button type="button" className="access-dialog__new" onClick={onCreate}>
            New Alarm Rule
          </button>
          <div className="access-dialog__list">
            {rules.map((rule) => (
              <div
                className={[
                  "access-dialog__row",
                  rule.on ? "is-on" : "",
                  rule.fresh || rule.id === highlightId ? "is-fresh" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={rule.id}
              >
                <button
                  type="button"
                  className={rule.on ? "access-dialog__switch is-on" : "access-dialog__switch"}
                  role="switch"
                  aria-checked={rule.on}
                  aria-label={rule.name}
                  disabled={Boolean(rule.locked)}
                  onClick={() => onToggle(rule.id)}
                >
                  <span>
                    <img
                      src={rule.on ? "/assets/alarm-rules/access/switch-on.svg" : "/assets/alarm-rules/access/switch-off.svg"}
                      alt=""
                    />
                  </span>
                </button>
                <p>
                  <span className="access-dialog__name">
                    <strong>{rule.name}</strong>
                    {rule.fresh ? <span className="access-dialog__badge">New</span> : null}
                  </span>
                  {ruleSummary(rule) ? <span className="access-dialog__detail">{ruleSummary(rule)}</span> : null}
                </p>
                <button
                  type="button"
                  className="access-dialog__edit"
                  aria-label={`Edit ${rule.name}`}
                  disabled={Boolean(rule.locked)}
                  onClick={() => onEdit(rule)}
                >
                  <img src="/assets/alarm-rules/pencil.svg" alt="" />
                </button>
              </div>
            ))}
            </div>
        </div>
        <div
          className="access-dialog__body"
          hidden={activeSection !== "exceptions"}
        >
          <ExceptionsManagerList
            items={exceptionItems}
            rules={rules}
            onCreate={onCreateException}
            onEdit={onEditException}
            onRemove={onRemoveException}
          />
        </div>
        <footer className="access-dialog__footer">
          <button type="button" className="access-dialog__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="access-dialog__apply" onClick={onClose}>
            {activeSection === "rules" ? "Apply Rules" : "Done"}
          </button>
        </footer>
      </section>
    </div>
  );
}
