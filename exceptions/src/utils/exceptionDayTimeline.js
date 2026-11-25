export const EXCEPTION_DAY_MINUTES = 1440;

export function parseExceptionTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function exceptionTimeInput(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0) return "";
  const value = minutes % EXCEPTION_DAY_MINUTES;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function exceptionClock(minutes) {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function exceptionDaySegments(range) {
  return (range.end > EXCEPTION_DAY_MINUTES
    ? [{ start: range.start, end: EXCEPTION_DAY_MINUTES }, { start: 0, end: range.end - EXCEPTION_DAY_MINUTES }]
    : [{ start: range.start, end: range.end }]).filter((piece) => piece.end > piece.start);
}

export function exceptionRangesOverlap(first, second) {
  return exceptionDaySegments(first).some((a) => exceptionDaySegments(second).some((b) => a.start < b.end && b.start < a.end));
}

/** Numeric save-boundary validation. 0–1440 is a full day; 0–0 is invalid. */
export function validateExceptionDayRanges(ranges = []) {
  if (!Array.isArray(ranges)) return { valid: false, errors: [] };
  const errors = ranges.map((range) => {
    if (!Number.isInteger(range?.start) || !Number.isInteger(range?.end)
      || range.start < 0 || range.start >= EXCEPTION_DAY_MINUTES
      || range.end <= range.start || range.end > range.start + EXCEPTION_DAY_MINUTES) {
      return "Enter a complete time range of up to 24 hours.";
    }
    return "";
  });
  const invalid = errors.map(Boolean);
  for (let a = 0; a < ranges.length; a += 1) {
    for (let b = a + 1; b < ranges.length; b += 1) {
      if (invalid[a] || invalid[b] || !exceptionRangesOverlap(ranges[a], ranges[b])) continue;
      errors[a] = errors[b] = "This time range overlaps another time range.";
    }
  }
  return { valid: ranges.length > 0 && errors.every((error) => !error), errors };
}

export function exceptionRangeDraft(range, id) {
  const valid = validateExceptionDayRanges([range]).valid;
  return {
    id,
    start: exceptionTimeInput(range?.start),
    end: exceptionTimeInput(range?.end),
    fullDay: valid && range.end - range.start === EXCEPTION_DAY_MINUTES,
    importedInvalid: !valid,
  };
}

/** Preserve native input drafts; normalize only complete values. */
export function validateExceptionRangeDrafts(rows = []) {
  const errors = rows.map(() => ({}));
  const items = [];
  rows.forEach((row, index) => {
    const start = parseExceptionTime(row.start);
    let end = parseExceptionTime(row.end);
    if (start === null) errors[index].start = "Enter a complete start time.";
    if (end === null) errors[index].end = "Enter a complete end time.";
    if (start === null || end === null) return;
    if (row.importedInvalid) {
      errors[index].range = "Review this time range before saving.";
      return;
    }
    if (end === 0) end = EXCEPTION_DAY_MINUTES;
    else if (end < start || (end === start && row.fullDay)) end += EXCEPTION_DAY_MINUTES;
    if (end <= start) {
      errors[index].range = "Start and end times must be different.";
      return;
    }
    items.push({ id: row.id, index, start, end });
  });
  const checked = validateExceptionDayRanges(items);
  checked.errors.forEach((error, index) => { if (error) errors[items[index].index].range = error; });
  return {
    valid: rows.length > 0 && errors.every((error) => !Object.keys(error).length),
    errors,
    items,
    ranges: items.map(({ start, end }) => ({ start, end })),
  };
}

export function exceptionFreeGaps(ranges = []) {
  const sorted = ranges.flatMap(exceptionDaySegments).sort((a, b) => a.start - b.start);
  const gaps = [];
  let minute = 0;
  for (const range of sorted) {
    if (range.start > minute) gaps.push({ start: minute, end: range.start });
    minute = Math.max(minute, range.end);
  }
  if (minute < EXCEPTION_DAY_MINUTES) gaps.push({ start: minute, end: EXCEPTION_DAY_MINUTES });
  return gaps;
}

export function nextExceptionDayRange(ranges = [], preferred = 600) {
  const gaps = exceptionFreeGaps(ranges);
  const gap = gaps.find((item) => preferred >= item.start && preferred < item.end)
    ?? gaps.find((item) => item.start >= preferred) ?? gaps[0];
  if (!gap) return null;
  const start = preferred >= gap.start && preferred < gap.end ? preferred : gap.start;
  return { start, end: Math.min(gap.end, start + 60) };
}
