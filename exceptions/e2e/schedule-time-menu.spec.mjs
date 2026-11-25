import assert from "node:assert/strict";
import { scheduleTimeMenuPosition } from "../src/utils/scheduleTimeMenu.js";

const viewport = { width: 1366, height: 768 };
const below = scheduleTimeMenuPosition({ left: 200, top: 200, bottom: 254, width: 72 }, viewport, 12);
assert.deepEqual(below, { left: 200, top: 260, width: 72, maxHeight: 178, placement: "below" });

const above = scheduleTimeMenuPosition({ left: 200, top: 650, bottom: 704, width: 72 }, viewport, 60);
assert.equal(above.placement, "above");
assert.equal(above.top, 650 - 6 - 178);
assert.equal(above.maxHeight, 178);
assert.ok(above.top >= 8);

const rightEdge = scheduleTimeMenuPosition({ left: 1340, top: 200, bottom: 254, width: 80 }, viewport, 12);
assert.equal(rightEdge.left + rightEdge.width, 1366 - 8);
const leftEdge = scheduleTimeMenuPosition({ left: -20, top: 200, bottom: 254, width: 40 }, viewport, 12);
assert.equal(leftEdge.left, 8);
assert.equal(leftEdge.width, 56);

const limited = scheduleTimeMenuPosition({ left: 20, top: 35, bottom: 65, width: 60 }, { width: 320, height: 100 }, 60);
assert.ok(limited.top >= 8);
assert.ok(limited.top + limited.maxHeight <= 92);
assert.equal(limited.maxHeight, 21);

const narrow = scheduleTimeMenuPosition({ left: 60, top: 200, bottom: 254, width: 120 }, { width: 68, height: 768 }, 12);
assert.equal(narrow.width, 52);
assert.equal(narrow.left, 8);
assert.equal(scheduleTimeMenuPosition({ left: 0, top: 100, bottom: 154, width: 72 }, viewport, 2).maxHeight, 66);

console.log("✓ Schedule time choices: below/above placement, viewport clamping, anchor width, narrow viewports and limited height");
