import assert from "node:assert/strict";
import {
  exceptionDaySegments,
  exceptionFreeGaps,
  exceptionRangeDraft,
  nextExceptionDayRange,
  parseExceptionTime,
  validateExceptionDayRanges,
  validateExceptionRangeDrafts,
} from "../src/utils/exceptionDayTimeline.js";

assert.equal(parseExceptionTime("09:07"), 547);
assert.equal(parseExceptionTime("09:"), null);
assert.equal(parseExceptionTime("24:00"), null);
assert.equal(validateExceptionDayRanges([]).valid, false);
assert.equal(validateExceptionDayRanges([{ start: 0, end: 0 }]).valid, false);
assert.equal(validateExceptionDayRanges([{ start: 0, end: 1440 }]).valid, true);
assert.equal(validateExceptionDayRanges([{ start: -1, end: 60 }]).valid, false);
assert.equal(validateExceptionDayRanges([{ start: 60, end: 1501 }]).valid, false);
assert.equal(validateExceptionDayRanges([{ start: 600.5, end: 660 }]).valid, false);

const fullDay = validateExceptionRangeDrafts([{ id: "full", start: "00:00", end: "00:00" }]);
assert.equal(fullDay.valid, true);
assert.deepEqual(fullDay.ranges, [{ start: 0, end: 1440 }]);
assert.equal(validateExceptionRangeDrafts([{ id: "same", start: "10:00", end: "10:00" }]).valid, false);
assert.equal(validateExceptionRangeDrafts([{ id: "draft", start: "", end: "11:00" }]).valid, false);
assert.equal(validateExceptionRangeDrafts([{ id: "draft", start: "09:07", end: "11:13" }]).ranges[0].start, 547);
assert.equal(validateExceptionRangeDrafts([{ id: "draft", start: "09:07", end: "11:13" }]).ranges[0].end, 673);

const overnight = { start: 1140, end: 1800 };
assert.equal(validateExceptionDayRanges([overnight]).valid, true);
assert.deepEqual(exceptionDaySegments(overnight), [{ start: 1140, end: 1440 }, { start: 0, end: 360 }]);
assert.deepEqual(validateExceptionRangeDrafts([exceptionRangeDraft(overnight, "night")]).ranges, [overnight]);
assert.equal(validateExceptionDayRanges([overnight, { start: 300, end: 400 }]).valid, false);
assert.equal(validateExceptionDayRanges([overnight, { start: 360, end: 1140 }]).valid, true);
assert.deepEqual(validateExceptionRangeDrafts([exceptionRangeDraft({ start: 600, end: 2040 }, "24h")]).ranges, [{ start: 600, end: 2040 }]);

const overlaps = validateExceptionDayRanges([{ start: 60, end: 180 }, { start: 90, end: 120 }, { start: 100, end: 150 }]);
assert.equal(overlaps.valid, false);
assert.ok(overlaps.errors.every(Boolean));
assert.equal(validateExceptionDayRanges([{ start: 60, end: 120 }, { start: 120, end: 180 }]).valid, true);
assert.deepEqual(exceptionFreeGaps([overnight]), [{ start: 360, end: 1140 }]);
assert.deepEqual(nextExceptionDayRange([], 600), { start: 600, end: 660 });
assert.deepEqual(nextExceptionDayRange([{ start: 0, end: 1433 }], 0), { start: 1433, end: 1440 });
assert.equal(nextExceptionDayRange([{ start: 0, end: 1440 }]), null);

console.log("✓ Exception timeline: exact minutes, incomplete drafts, full day, overnight preservation, circular overlap, adjacent ranges and free gaps");
