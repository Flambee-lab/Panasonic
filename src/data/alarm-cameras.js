export const CAMERA_GROUPS = [
  { id: "headquarters", name: "Headquarters", kind: "Server", icon: "server" },
  { id: "north", name: "North Campus", kind: "Server", icon: null },
  { id: "entrances", name: "Main Entrances", kind: "Camera group", icon: "group" },
];

const MODELS = [
  "Dahua 4MP Pro",
  "Axis P5635-E",
  "Bosch AUTODOME IP 5000i",
  "Arlo Ultra 2",
  "Reolink Go Plus",
  "Lorex 4K Ultra HD",
  "Amcrest 8MP UltraHD",
  "Zmodo 1080P Indoor Camera",
  "Swann 4K Thermal Camera",
  "Reolink RLC-820A",
  "Lorex 4K IP Dome Camera",
  "Zmodo 4MP Outdoor Camera",
  "Hikvision DS-2CD2385FWD-I",
  "Logitech Circle View",
  "Nest Cam IQ Outdoor",
  "Lorex 4K IP Security Camera",
  "Reolink RLC-511W",
  "Ring Spotlight Cam",
  "Panasonic Homehawk Floor",
  "Eufy Security Indoor Cam 2K",
  "Netatmo Smart Outdoor Camera",
  "TP-Link Kasa Smart Camera",
  "Sony A7R IV",
  "Amcrest 4MP UltraHD",
];

const GROUPS = ["headquarters", "north", "entrances"];
const CATALOG_SIZE = 1200;

// Models that cannot run some event types. One limited model lands on each
// server and on the camera group, so every filter still has available cameras
// and cameras that stay unavailable. The rest of the catalog supports all events.
const LIMITS = {
  "Arlo Ultra 2": ["sound", "people", "vmd"],
  "Ring Spotlight Cam": ["sound", "people", "vehicles", "vmd"],
  "Nest Cam IQ Outdoor": ["people"],
  "Eufy Security Indoor Cam 2K": ["sound"],
  "TP-Link Kasa Smart Camera": ["sound", "vehicles"],
  "Sony A7R IV": ["sound", "people", "vehicles", "vmd"],
  "Swann 4K Thermal Camera": ["people"],
  "Zmodo 1080P Indoor Camera": ["sound", "people"],
  "Logitech Circle View": ["lpr", "ocr"],
};

export const CAMERAS = Array.from({ length: CATALOG_SIZE }, (_, index) => {
  const model = MODELS[index % MODELS.length];
  return {
    id: `cam-${index + 1}`,
    name: `${model} ${String(index + 1).padStart(4, "0")}`,
    model,
    groupId: GROUPS[index % GROUPS.length],
    order: index,
    unsupported: LIMITS[model] ?? [],
    offline: (index + 1) % 80 === 8,
  };
});
