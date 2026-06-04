export const DUPLICATE_IP = "192.168.0.10";

const MODELS = ["RSX 7203", "RSX 8100", "IPC-HDW 2431R-ZS", "WV-S1131", "IPC-HFW4431R"];
const FIRMWARES = ["v1.2.3", "v2.0.1", "v3.1.0", "v1.4.2", "v2.12.0"];

export const CONFLICT_CAMERAS = [
  {
    id: "cam-1",
    deviceId: "R101",
    alias: "Entrada Principal",
    model: "WV-S1131",
    mac: "00:1A:2B:3C:4D:01",
    firmware: "v2.0.1",
    ip: DUPLICATE_IP,
    status: "conflict",
  },
  {
    id: "cam-2",
    deviceId: "R102",
    alias: "Parking Norte",
    model: "RSX 7203",
    mac: "00:1A:2B:3C:4D:02",
    firmware: "v1.4.2",
    ip: DUPLICATE_IP,
    status: "conflict",
  },
  {
    id: "cam-3",
    deviceId: "R103",
    alias: "Pasillo Servidor",
    model: "IPC-HDW 2431R-ZS",
    mac: "00:1A:2B:3C:4D:03",
    firmware: "v3.1.0",
    ip: DUPLICATE_IP,
    status: "conflict",
  },
  {
    id: "cam-4",
    deviceId: "R104",
    alias: "Muelle Carga",
    model: "IPC-HFW4431R",
    mac: "00:1A:2B:3C:4D:04",
    firmware: "v2.12.0",
    ip: DUPLICATE_IP,
    status: "conflict",
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
  firmware: FIRMWARES[i % FIRMWARES.length],
  ip: `192.168.0.${loc.ipLast}`,
  status: "online",
}));

/** Conflicto primero, luego dispositivos operativos en red */
export const INITIAL_CAMERAS = [...CONFLICT_CAMERAS, ...HEALTHY_CAMERAS];

export function getTechnicalStatusLabel(status) {
  return status === "conflict" ? "IP Duplicada" : "Asignada/Operativa";
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
