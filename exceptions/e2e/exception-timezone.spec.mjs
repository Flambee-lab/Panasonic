import assert from "node:assert/strict";
import { exceptionPresentation } from "../src/utils/exceptionPresentation.js";

const exception = { name: "Special opening", dates: ["2026-10-25"], repeatYearly: false, type: "hours", ranges: [{ start: 540, end: 1020 }] };
const now = new Date("2026-11-25T05:00:00Z");
const options = { now, timeZone: "America/Los_Angeles" };
assert.equal(exceptionPresentation(exception, options).status, "Upcoming");
assert.equal(exceptionPresentation({ ...exception, zone: "(UTC-03:00) Buenos Aires" }, options).status, "Active now");
assert.equal(exceptionPresentation({ ...exception, zone: "(UTC-08:00) Pacific Time (US & Canada)" }, { now, timeZone: "America/Argentina/Buenos_Aires" }).status, "Upcoming");
assert.equal(exceptionPresentation(exception, { now, timeZone: "America/Argentina/Buenos_Aires" }).status, "Active now");
console.log("✓ Exception calendar status follows its saved time zone; legacy exceptions retain their rule's zone.");
