const MINUTES_PER_DAY = 24 * 60;

/** Read a complete native time input without converting an unfinished draft. */
export function parseTimeInput(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Overnight range ends use minutes beyond midnight; native inputs use 00–23. */
export function toTimeInput(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0) return '';
  const clock = minutes % MINUTES_PER_DAY;
  return `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
}

function timeError(value, field) {
  return value === '' || value == null
    ? `Enter ${field === 'end' ? 'an' : 'a'} ${field} time.`
    : `Enter a valid ${field} time.`;
}

function clockSegments({ start, end }) {
  return end <= MINUTES_PER_DAY
    ? [[start, end]]
    : [[start, MINUTES_PER_DAY], [0, end - MINUTES_PER_DAY]];
}

function overlaps(first, second) {
  return clockSegments(first).some(([start, end]) =>
    clockSegments(second).some(([otherStart, otherEnd]) =>
      start < otherEnd && otherStart < end,
    ),
  );
}

/**
 * Validate string drafts without changing them. Errors retain the input row
 * indexes. Only save the normalized ranges when valid is true; incomplete or
 * equal-time rows are omitted from ranges, rather than silently serialized.
 */
export function validateExceptionTimeRanges(rows = []) {
  const drafts = Array.isArray(rows) ? rows : [];
  const errors = drafts.map(() => ({}));
  const complete = [];

  drafts.forEach((row, index) => {
    const start = parseTimeInput(row?.start);
    let end = parseTimeInput(row?.end);
    if (start === null) errors[index].start = timeError(row?.start, 'start');
    if (end === null) errors[index].end = timeError(row?.end, 'end');
    if (start === null || end === null) return;
    if (end === start) {
      errors[index].range = 'Start and end times must be different.';
      return;
    }
    if (end < start) end += MINUTES_PER_DAY;
    complete.push({ index, range: { start, end } });
  });

  for (let first = 0; first < complete.length; first += 1) {
    for (let second = first + 1; second < complete.length; second += 1) {
      if (!overlaps(complete[first].range, complete[second].range)) continue;
      const message = 'This time range overlaps another time range.';
      errors[complete[first].index].range = message;
      errors[complete[second].index].range = message;
    }
  }

  return {
    ranges: complete.map(({ range }) => range),
    errors,
    valid: drafts.length > 0 && errors.every((error) => Object.keys(error).length === 0),
  };
}

/**
 * Suggest up to an hour starting after the last row, moving to the next free
 * minute when necessary. Return null while a draft is invalid or a day is full.
 */
export function defaultNextExceptionRange(rows = []) {
  if (!Array.isArray(rows)) return null;
  if (!rows.length) return { start: '10:00', end: '11:00' };
  const checked = validateExceptionTimeRanges(rows);
  if (!checked.valid) return null;

  const occupied = new Array(MINUTES_PER_DAY).fill(false);
  for (const range of checked.ranges) {
    for (let minute = range.start; minute < range.end; minute += 1) {
      occupied[minute % MINUTES_PER_DAY] = true;
    }
  }
  const preferred = checked.ranges.at(-1).end % MINUTES_PER_DAY;
  for (let offset = 0; offset < MINUTES_PER_DAY; offset += 1) {
    const start = (preferred + offset) % MINUTES_PER_DAY;
    if (occupied[start]) continue;
    let duration = 1;
    while (duration < 60 && !occupied[(start + duration) % MINUTES_PER_DAY]) duration += 1;
    return { start: toTimeInput(start), end: toTimeInput(start + duration) };
  }
  return null;
}
