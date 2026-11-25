import { CAMERAS } from "./alarm-cameras.js";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND = ["Saturday", "Sunday"];
const EVERY_DAY = [...WEEKDAYS, ...WEEKEND];
const EASTERN = "(UTC-05:00) Eastern Time (US & Canada)";
const CENTRAL = "(UTC-06:00) Central Time (US & Canada)";
const PACIFIC = "(UTC-08:00) Pacific Time (US & Canada)";

function weekly(days, ranges, zone = EASTERN) {
  return {
    repeat: "weekly",
    zone,
    ranges: Object.fromEntries(days.map((day) => [day, ranges.map((range) => ({ ...range }))])),
  };
}

function rule(id, name, eventTypeIds, cameraCount, { groupId, offset = 0, ...details } = {}) {
  const eligible = CAMERAS.filter((camera) =>
    !camera.offline &&
    (!groupId || camera.groupId === groupId) &&
    !eventTypeIds.some((eventId) => (camera.unsupported ?? []).includes(eventId)),
  );
  return {
    id: `demo-${id}`,
    name,
    on: true,
    revision: 1,
    eventTypeIds: [...eventTypeIds],
    cameraIds: eligible.slice(offset, offset + cameraCount).map((camera) => camera.id),
    schedule: null,
    exceptions: [],
    ...details,
  };
}

// Additional local review examples keep the picker populated with real rule data.
export const DEMO_ALARM_RULES = [
  rule("main-entrances", "Main entrances", ["vmd"], 32, {
    groupId: "entrances",
    schedule: weekly(WEEKDAYS, [{ start: 7 * 60, end: 19 * 60 }]),
  }),
  rule("loading-bay", "Loading bay vehicles", ["vehicles", "vmd"], 18, {
    groupId: "headquarters", offset: 40,
    schedule: weekly(WEEKDAYS, [{ start: 6 * 60, end: 22 * 60 }], CENTRAL),
  }),
  rule("reception-watchlist", "Reception watchlist", ["people"], 12, {
    groupId: "headquarters", offset: 90,
    peopleIds: ["nina", "jonah", "hana"],
    schedule: weekly(WEEKDAYS, [{ start: 8 * 60, end: 18 * 60 }]),
  }),
  rule("parking-lpr", "Parking license plates", ["lpr", "vehicles"], 24, {
    groupId: "north", offset: 30,
  }),
  rule("warehouse-sound", "Warehouse sound alerts", ["sound", "vmd"], 28, {
    on: false, groupId: "headquarters", offset: 140,
    schedule: weekly(EVERY_DAY, [{ start: 0, end: 6 * 60 }, { start: 18 * 60, end: 24 * 60 }], CENTRAL),
  }),
  rule("north-campus-night", "North Campus night patrol", ["scene", "vmd"], 36, {
    groupId: "north", offset: 80,
    schedule: weekly(WEEKDAYS, [{ start: 0, end: 7 * 60 }, { start: 20 * 60, end: 24 * 60 }], PACIFIC),
  }),
  rule("weekend-perimeter", "Weekend perimeter", ["vmd", "scene"], 40, {
    groupId: "entrances", offset: 100,
    schedule: weekly(WEEKEND, [{ start: 0, end: 24 * 60 }]),
  }),
  rule("service-entrance", "Service entrance", ["vmd"], 8, {
    on: false, groupId: "entrances", offset: 180,
  }),
  rule("container-yard", "Container yard checks", ["container", "ocr"], 16, {
    on: false, groupId: "north", offset: 190,
    schedule: weekly(WEEKDAYS, [{ start: 5 * 60, end: 23 * 60 }], PACIFIC),
  }),
  rule("visitor-arrivals", "Visitor arrivals", ["people"], 6, {
    on: false, groupId: "headquarters", offset: 220,
    peopleIds: ["priya", "luca"],
    schedule: weekly(WEEKDAYS, [{ start: 8 * 60, end: 18 * 60 }]),
  }),
  rule("critical-recording", "Critical area recording", ["vmd", "extension"], 10, {
    groupId: "headquarters", offset: 250,
    locked: "This rule is managed by your administrator and cannot be changed.",
  }),
  rule("fire-exits", "Fire exit monitoring", ["scene", "extension"], 14, {
    groupId: "entrances", offset: 260,
    schedule: weekly(EVERY_DAY, [{ start: 0, end: 24 * 60 }]),
    locked: "This rule is managed by your administrator and cannot be changed.",
  }),
];
