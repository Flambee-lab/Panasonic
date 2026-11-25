import assert from "node:assert/strict";
import { sortCameraEntries } from "../src/utils/cameraNameSort.js";

const entries = ["Camera 10", "camera 2", "Camera 1", "CAMERA 2"].map((name, index) => ({ camera: { id: `cam-${index}`, name }, gaps: [] }));
const original = [...entries];
assert.deepEqual(sortCameraEntries(entries).map((entry) => entry.camera.name), ["Camera 1", "camera 2", "CAMERA 2", "Camera 10"]);
assert.deepEqual(sortCameraEntries(entries, "desc").map((entry) => entry.camera.name), ["Camera 10", "camera 2", "CAMERA 2", "Camera 1"]);
assert.deepEqual(entries, original, "Sorting must not mutate the filtered source array");
assert.equal(sortCameraEntries(entries)[0], entries[2], "Keep camera entry identity and selection data");
const accented = [{ name: "Álpha 2" }, { name: "alpha 10" }, { name: "ALPHA 2" }];
assert.deepEqual(sortCameraEntries(accented).map((entry) => entry.name), ["Álpha 2", "ALPHA 2", "alpha 10"]);
const available = [{ camera: { name: "Zulu" } }, { camera: { name: "Bravo" } }];
const unavailable = [{ camera: { name: "Beta" } }, { camera: { name: "Alpha" } }];
assert.deepEqual([...sortCameraEntries(available), ...sortCameraEntries(unavailable)].map((entry) => entry.camera.name), ["Bravo", "Zulu", "Alpha", "Beta"]);
assert.deepEqual(sortCameraEntries([]), []);
console.log("✓ Camera sorting: numeric names, case/accent-insensitive order, stable ties, immutable entries and independent availability groups");
