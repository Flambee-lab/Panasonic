import assert from "node:assert/strict";
import {
  normalizeScheduleHour,
  normalizeScheduleMinute,
  reconcileScheduleTimeDraft,
  scheduleMinutesToParts,
  schedulePartsFromValue,
  schedulePartsToMinutes,
  schedulePartsValue,
  stepScheduleParts,
} from "../src/utils/scheduleTimeParts.js";

assert.equal(schedulePartsToMinutes("", "00", "AM"), null);
assert.equal(schedulePartsToMinutes("12", "", "AM"), null);
assert.equal(schedulePartsToMinutes("0", "00", "AM"), null);
assert.equal(schedulePartsToMinutes("12", "60", "AM"), null);
assert.equal(schedulePartsToMinutes("12", "00", "AM"), 0);
assert.equal(schedulePartsToMinutes("12", "00", "PM"), 720);
assert.equal(schedulePartsToMinutes("1", "07", "PM"), 787);
assert.deepEqual(scheduleMinutesToParts(1440), { hour: "12", minute: "00", period: "AM" });
assert.deepEqual(schedulePartsFromValue("00:00"), { hour: "12", minute: "00", period: "AM" });
assert.deepEqual(schedulePartsFromValue("12:00"), { hour: "12", minute: "00", period: "PM" });
assert.deepEqual(schedulePartsFromValue(""), { hour: "", minute: "", period: "AM" });
assert.equal(schedulePartsValue({ hour: "09", minute: "07", period: "PM" }), "21:07");
assert.equal(schedulePartsValue({ hour: "9", minute: "", period: "PM" }), "");

assert.deepEqual(stepScheduleParts({ hour: "11", minute: "59", period: "AM" }, 1), { hour: "12", minute: "00", period: "PM" });
assert.deepEqual(stepScheduleParts({ hour: "11", minute: "59", period: "PM" }, 1), { hour: "12", minute: "00", period: "AM" });
assert.deepEqual(stepScheduleParts({ hour: "12", minute: "00", period: "AM" }, -1), { hour: "11", minute: "59", period: "PM" });
assert.deepEqual(stepScheduleParts({ hour: "11", minute: "23", period: "AM" }, 60), { hour: "12", minute: "23", period: "PM" });
assert.equal(stepScheduleParts({ hour: "11", minute: "", period: "AM" }, 60), null);
assert.equal(normalizeScheduleHour(""), "");
assert.equal(normalizeScheduleMinute(""), "");
assert.equal(normalizeScheduleHour("09"), "9");
assert.equal(normalizeScheduleMinute("7"), "07");

const partial = { hour: "9", minute: "", period: "PM" };
assert.equal(reconcileScheduleTimeDraft(partial, "", ""), partial);
const erasedHour = { hour: "", minute: "23", period: "PM" };
assert.equal(reconcileScheduleTimeDraft(erasedHour, "", ""), erasedHour);
const typed = { hour: "09", minute: "7", period: "PM" };
assert.equal(reconcileScheduleTimeDraft(typed, "21:07", "21:07"), typed);
assert.deepEqual(reconcileScheduleTimeDraft(partial, "16:43", ""), { hour: "4", minute: "43", period: "PM" });
assert.deepEqual(reconcileScheduleTimeDraft(typed, "", "21:07"), { hour: "", minute: "", period: "AM" });

for (let minute = 0; minute < 1440; minute += 1) {
  const parts = scheduleMinutesToParts(minute);
  assert.equal(schedulePartsToMinutes(parts.hour, parts.minute, parts.period), minute);
  assert.deepEqual(schedulePartsFromValue(schedulePartsValue(parts)), parts);
}
console.log("✓ Shared schedule time fields: partial drafts, parent echoes, external resets, noon/midnight, rollover arrows and all minute round-trips");
