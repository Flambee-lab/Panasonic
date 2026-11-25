const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function hasException(rule, exception) {
  return exception?.id != null && (rule.exceptions ?? []).some((item) => item.id === exception.id);
}

function hasHours(ranges) {
  return Array.isArray(ranges) && ranges.length > 0;
}

// Validate only the relationship being changed. Existing people/camera warnings
// and other unrelated rule errors must not prevent assigning an exception.
export function exceptionAssignmentIssue(rule, exception, rules = []) {
  if (!rule) return "This alarm rule is no longer available.";
  if (rule.locked) {
    if (hasException(rule, exception)) return "";
    return typeof rule.locked === "string" ? rule.locked : "This alarm rule is locked.";
  }
  if (!exception) return "Complete the exception details before assigning it.";
  if (exception.type === "day") {
    if (!WEEK_DAYS.includes(exception.likeDay)) return "Choose a weekday for this exception to follow.";
    const ranges = rule.schedule?.ranges ?? {};
    if (!hasHours(ranges[exception.likeDay]) && !hasHours(ranges.Everyday)) {
      return `${exception.likeDay} has no hours in this rule. Add hours for that day or choose another exception type.`;
    }
  }
  if (exception.type === "schedule") {
    if (!exception.scheduleId) return "Choose an existing schedule for this exception.";
    if (exception.scheduleId === rule.id) return "Choose another schedule; this exception cannot use this rule’s own schedule.";
    const source = rules.find((item) => item.id === exception.scheduleId);
    if (!source) return "The selected schedule is no longer available.";
    if (source.locked) return "The selected schedule belongs to a locked rule.";
    if (!Object.values(source.schedule?.ranges ?? {}).some(hasHours)) {
      return `${source.name || "The selected schedule"} has no weekly hours to use.`;
    }
  }
  return "";
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sameDefinition(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

export function applyExceptionToRules(rules, exception, assignedIds) {
  if (!Array.isArray(rules)) return { ok: false, message: "Alarm rules are unavailable. Reopen Exceptions and try again." };
  if (!exception || exception.id == null || exception.id === "") {
    return { ok: false, message: "Save a valid exception before assigning it to alarm rules." };
  }
  if (!Array.isArray(assignedIds)) return { ok: false, message: "Select at least one alarm rule." };
  const selected = new Set(assignedIds);
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  for (const id of selected) {
    const rule = byId.get(id);
    if (!rule) return { ok: false, message: `The selected alarm rule “${String(id)}” is no longer available. Select another rule.` };
    const issue = exceptionAssignmentIssue(rule, exception, rules);
    if (issue) return { ok: false, message: `${rule.name || "Alarm rule"}: ${issue}` };
  }
  // A locked association cannot be removed or updated from this flow. It can
  // remain the only association when editing an existing exception.
  const keepsLockedAssociation = rules.some((rule) => rule.locked && hasException(rule, exception));
  const hasEditableSelection = rules.some((rule) => !rule.locked && selected.has(rule.id));
  if (!hasEditableSelection && !keepsLockedAssociation) {
    return { ok: false, message: "Select at least one editable alarm rule to apply this exception." };
  }

  let changed = false;
  const nextRules = rules.map((rule) => {
    if (rule.locked) return rule;
    const current = rule.exceptions ?? [];
    const matching = current.filter((item) => item.id === exception.id);
    if (!selected.has(rule.id)) {
      if (!matching.length) return rule;
      changed = true;
      return { ...rule, exceptions: current.filter((item) => item.id !== exception.id), revision: (rule.revision ?? 1) + 1 };
    }
    if (matching.length === 1 && sameDefinition(matching[0], exception)) return rule;
    const next = [];
    let included = false;
    for (const item of current) {
      if (item.id !== exception.id) next.push(item);
      else if (!included) {
        next.push(structuredClone(exception));
        included = true;
      }
    }
    if (!included) next.push(structuredClone(exception));
    changed = true;
    return { ...rule, exceptions: next, revision: (rule.revision ?? 1) + 1 };
  });
  return { ok: true, rules: changed ? nextRules : rules };
}
