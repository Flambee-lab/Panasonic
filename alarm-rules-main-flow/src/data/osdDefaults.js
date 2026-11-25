export const DEFAULT_OSD_SETTINGS = {
  systemLanguage: "English",
  lineFrequency: "50 Hz",
  statusIndicatorLed: "On - Steady Green",
  ntpSync: "On - Sync with i-PRO",
  sdOverwrite: true,
  imageCaptureMode: "H.265",
  imageRotation: "0°",
  dayNightMode: "Color",
  superDynamic: "Off",
  cameraTitleOn: "On",
  cameraTitleText: "",
  cameraTitles: {},
  dateTimeDisplay: "24h",
  dateTimePosition: "Upper Left",
  osdFontSize: "Normal 14pt",
  backgroundTransparency: "Semi-Transparent 40%",
};

/** Image section defaults — segmented controls always keep one option selected */
export const BATCH_IMAGE_DEFAULTS = {
  imageCaptureMode: "Auto",
  imageRotation: "0°",
  dayNightMode: "Auto",
};

/** Empty draft — user enables each setting one by one */
export const BLANK_OSD_SETTINGS = {
  systemLanguage: "",
  lineFrequency: "",
  statusIndicatorLed: "",
  ntpSync: "",
  sdOverwrite: false,
  imageCaptureMode: "",
  imageRotation: "",
  dayNightMode: "",
  superDynamic: "",
  cameraTitleOn: "",
  cameraTitles: {},
  cameraTitlesEnabled: false,
  dateTimeDisplay: "",
  dateTimePosition: "",
  osdFontSize: "",
  backgroundTransparency: "",
};

export function isOsdDraftReadyToApply(draft) {
  if (!draft) return false;

  return Object.entries(draft).some(([key, value]) => {
    if (key === "sdOverwrite") return value === true;
    if (key === "cameraTitles") {
      if (!draft.cameraTitlesEnabled) return false;
      return Object.values(value).some((title) => String(title).trim() !== "");
    }
    if (key === "cameraTitlesEnabled") return false;
    if (typeof value === "boolean") return false;
    return value !== "";
  });
}

export function createOsdSettings(camera) {
  return {
    ...DEFAULT_OSD_SETTINGS,
    cameraTitleText: camera?.alias ?? "Camera",
  };
}

export function osdSettingsFromCamera(camera) {
  return camera?.osd ? { ...DEFAULT_OSD_SETTINGS, ...camera.osd } : createOsdSettings(camera);
}

export function getCameraTitleText(draft, camera) {
  if (!camera) return "";
  const custom = draft.cameraTitles?.[camera.id];
  if (custom?.trim()) return custom.trim();
  return camera.alias ?? "Camera";
}

export function createBlankOsdDraft(cameraIds) {
  return {
    ...BLANK_OSD_SETTINGS,
    cameraTitles: Object.fromEntries(cameraIds.map((id) => [id, ""])),
  };
}

export function createBatchOsdDraft(cameraIds) {
  return {
    ...createBlankOsdDraft(cameraIds),
    ...BATCH_IMAGE_DEFAULTS,
  };
}

export function createSequentialOsdDraft(cameraIds, camera) {
  const draft = createBatchOsdDraft(cameraIds);
  if (!camera) return draft;
  const title = `${camera.deviceId} - ${camera.alias}`;
  return {
    ...draft,
    cameraTitlesEnabled: true,
    cameraTitles: {
      ...draft.cameraTitles,
      [camera.id]: title,
    },
  };
}

/** Merge draft onto existing camera OSD — only non-empty draft fields overwrite. */
export function buildCameraOsdSnapshot(draft, cameraId, fallbackAlias = "", existingOsd = null) {
  const base = {
    ...DEFAULT_OSD_SETTINGS,
    ...(existingOsd || {}),
    cameraTitleText: existingOsd?.cameraTitleText || fallbackAlias || DEFAULT_OSD_SETTINGS.cameraTitleText,
  };
  const { cameraTitles = {}, cameraTitlesEnabled, ...shared } = draft;

  Object.entries(shared).forEach(([key, value]) => {
    if (key === "sdOverwrite") {
      if (value === true) base.sdOverwrite = true;
      return;
    }
    if (value !== "" && value != null) {
      base[key] = value;
    }
  });

  if (cameraTitlesEnabled) {
    const titleText = (cameraTitles[cameraId] ?? "").trim();
    if (titleText) {
      base.cameraTitleOn = "On";
      base.cameraTitleText = titleText;
    }
  }

  return base;
}

/** Derive dashboard alias from an applied OSD title (`R101 - Lobby` → `Lobby`). */
export function aliasFromAppliedTitle(titleText, deviceId, fallbackAlias = "") {
  const text = String(titleText ?? "").trim();
  if (!text) return fallbackAlias;
  if (deviceId) {
    const prefix = `${deviceId} - `;
    if (text.startsWith(prefix)) {
      const rest = text.slice(prefix.length).trim();
      return rest || fallbackAlias;
    }
  }
  return text;
}

export const OSD_FONT_SIZE_MAP = {
  "Small 10pt": "10px",
  "Normal 14pt": "14px",
  "Large 18pt": "18px",
};

export const OSD_TRANSPARENCY_MAP = {
  "Opaque Black 70%": "rgba(0, 0, 0, 0.7)",
  "Semi-Transparent 40%": "rgba(0, 0, 0, 0.4)",
  "Full Transparent 0%": "rgba(0, 0, 0, 0)",
};

export const OSD_POSITION_CLASS = {
  "Upper Left": "osd-corner--ul",
  "Upper Right": "osd-corner--ur",
  "Lower Left": "osd-corner--ll",
  "Lower Right": "osd-corner--lr",
};

export const ROTATION_DEGREES = {
  "0°": 0,
  "90°": 90,
  "180°": 180,
  "270°": 270,
};
