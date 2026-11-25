import {
  OSD_FONT_SIZE_MAP,
  OSD_POSITION_CLASS,
  OSD_TRANSPARENCY_MAP,
  ROTATION_DEGREES,
  osdSettingsFromCamera,
} from "../data/osdDefaults";

export function formatOsdClock(displayMode) {
  const now = new Date();
  if (displayMode === "Off" || !displayMode) return "";
  if (displayMode === "12h") {
    return now.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  return now.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function osdLedClass(ledSetting) {
  if (ledSetting === "Off - Stealth Mode") return "is-off";
  if (ledSetting === "Blinking Red - Warning") return "is-blink-red";
  return "is-on";
}

export function draftToOsdPreviewSettings(draft, cameraId) {
  if (!draft) return {};
  const titleText = draft.cameraTitlesEnabled
    ? (draft.cameraTitles?.[cameraId] ?? "").trim()
    : "";
  return {
    imageCaptureMode: draft.imageCaptureMode,
    imageRotation: draft.imageRotation,
    statusIndicatorLed: draft.statusIndicatorLed,
    dayNightMode: draft.dayNightMode,
    superDynamic: draft.superDynamic,
    cameraTitleOn: titleText ? "On" : "",
    cameraTitleText: titleText,
    dateTimeDisplay: draft.dateTimeDisplay,
    dateTimePosition: draft.dateTimePosition,
    osdFontSize: draft.osdFontSize,
    backgroundTransparency: draft.backgroundTransparency,
  };
}

export function resolveOsdPreviewSettings(camera) {
  if (!camera) return {};
  return osdSettingsFromCamera(camera);
}

export function buildOsdPreviewState(settings, fallbackAlias = "") {
  const osd = settings ?? {};
  const titleText =
    osd.cameraTitleOn === "On" ? (osd.cameraTitleText?.trim() || fallbackAlias || "") : "";

  return {
    showStream: Boolean(osd.imageCaptureMode),
    showReticle: Boolean(osd.imageRotation),
    showLed: Boolean(osd.statusIndicatorLed),
    showTitle: osd.cameraTitleOn === "On" && Boolean(titleText),
    titleText,
    showClock: osd.dateTimeDisplay === "24h" || osd.dateTimeDisplay === "12h",
    dateTimeDisplay: osd.dateTimeDisplay,
    positionClass: OSD_POSITION_CLASS[osd.dateTimePosition] ?? OSD_POSITION_CLASS["Upper Left"],
    fontSize: osd.osdFontSize ? (OSD_FONT_SIZE_MAP[osd.osdFontSize] ?? "14px") : "14px",
    overlayBg: osd.backgroundTransparency
      ? (OSD_TRANSPARENCY_MAP[osd.backgroundTransparency] ?? "rgba(0,0,0,0.4)")
      : "rgba(0,0,0,0.4)",
    rotation: osd.imageRotation ? (ROTATION_DEGREES[osd.imageRotation] ?? 0) : 0,
    isBw: osd.dayNightMode === "BW",
    isWdr: osd.superDynamic === "On",
    ledClass: osdLedClass(osd.statusIndicatorLed),
  };
}
