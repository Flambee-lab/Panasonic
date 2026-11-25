import { createOsdSettings } from "./osdDefaults";

export const DUPLICATE_IP = "192.168.0.10";
export const CURRENT_FIRMWARE = "HSX 2.1.4.0";
export const TARGET_FIRMWARE = "HSX 2.1.5.0";

const MODELS = ["RSX 7203", "RSX 8100", "IPC-HDW 2431R-ZS", "WV-S1131", "IPC-HFW4431R"];
const FIRMWARE_UPDATE_INDEXES = new Set([0, 2, 4, 5, 6]);

function withFirmware(camera, index) {
  const firmwareUpdateAvailable = FIRMWARE_UPDATE_INDEXES.has(index);
  return {
    ...camera,
    firmware: CURRENT_FIRMWARE,
    firmwareUpdateAvailable,
    latestFirmware: firmwareUpdateAvailable ? TARGET_FIRMWARE : CURRENT_FIRMWARE,
  };
}

export const CONFLICT_CAMERAS = [
  {
    id: "cam-1",
    deviceId: "R101",
    alias: "Main Entrance",
    model: "WV-S1131",
    mac: "00:1A:2B:3C:4D:01",
    ip: DUPLICATE_IP,
    status: "conflict",
    adminRegistered: false,
    osd: createOsdSettings({ alias: "Main Entrance" }),
  },
  {
    id: "cam-2",
    deviceId: "R102",
    alias: "North Parking",
    model: "RSX 7203",
    mac: "00:1A:2B:3C:4D:02",
    ip: DUPLICATE_IP,
    status: "conflict",
    adminRegistered: false,
    osd: createOsdSettings({ alias: "North Parking" }),
  },
  {
    id: "cam-3",
    deviceId: "R103",
    alias: "Server Hallway",
    model: "IPC-HDW 2431R-ZS",
    mac: "00:1A:2B:3C:4D:03",
    ip: DUPLICATE_IP,
    status: "conflict",
    adminRegistered: false,
    osd: createOsdSettings({ alias: "Server Hallway" }),
  },
  {
    id: "cam-4",
    deviceId: "R104",
    alias: "Loading Bay",
    model: "IPC-HFW4431R",
    mac: "00:1A:2B:3C:4D:04",
    ip: DUPLICATE_IP,
    status: "conflict",
    adminRegistered: false,
    osd: createOsdSettings({ alias: "Loading Bay" }),
  },
];

const HEALTHY_LOCATIONS = [
  { deviceId: "R201", alias: "Development Room", ipLast: 45 },
  { deviceId: "R202", alias: "Main Entrance", ipLast: 52 },
  { deviceId: "R203", alias: "Server Room", ipLast: 61 },
  { deviceId: "R204", alias: "Lobby", ipLast: 68 },
  { deviceId: "R205", alias: "North Perimeter", ipLast: 74 },
  { deviceId: "R206", alias: "Loading Dock", ipLast: 81 },
  { deviceId: "R207", alias: "Security Office", ipLast: 88 },
  { deviceId: "R208", alias: "Reception Desk", ipLast: 95 },
  { deviceId: "R209", alias: "Cafeteria", ipLast: 102 },
  { deviceId: "R210", alias: "Control Room", ipLast: 109 },
  { deviceId: "R211", alias: "Warehouse Bay", ipLast: 116 },
  { deviceId: "R212", alias: "Visitor Gate", ipLast: 123 },
];

const HEALTHY_CAMERAS = HEALTHY_LOCATIONS.map((loc, i) => ({
  id: `cam-h-${i + 1}`,
  deviceId: loc.deviceId,
  alias: loc.alias,
  model: MODELS[i % MODELS.length],
  mac: `00:1A:2B:3C:${(5 + i).toString(16).padStart(2, "0").toUpperCase()}`,
  ip: `192.168.0.${loc.ipLast}`,
  status: "online",
  adminRegistered: true,
  osd: createOsdSettings({ alias: loc.alias }),
}));

export const INITIAL_CAMERAS = [...CONFLICT_CAMERAS, ...HEALTHY_CAMERAS].map(withFirmware);

export function getAdminSecurityLabel(camera) {
  return camera.adminRegistered ? "Seguridad admin asignada" : "No registrado";
}

export function hasIpConflict(camera) {
  return camera.status === "conflict";
}

export function parseBaseIp(ipString) {
  const parts = ipString.trim().split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => Number.parseInt(p, 10));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return octets;
}

export function formatIp(octets) {
  return octets.join(".");
}

export function sequentialIps(baseIpString, count) {
  const base = parseBaseIp(baseIpString);
  if (!base) return [];
  const last = base[3];
  return Array.from({ length: count }, (_, i) => {
    const next = [...base];
    next[3] = Math.min(255, last + i);
    return formatIp(next);
  });
}
