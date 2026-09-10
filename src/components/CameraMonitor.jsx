import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { resolveOsdPreviewSettings } from "../utils/osdPreviewState";
import CameraServersRail from "./CameraServersRail";
import "../styles/camera-monitor.css";

const ASSET = "/assets/camera-monitor";
const DAY = 24 * 3600;
const LIVE_EDGE = 2;
const VISUAL_LIVE = 0.5;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MOTION = [
  { start: 0.204, width: 0.0087 },
  { start: 0.308, width: 0.022 },
  { start: 0.47, width: 0.0415 },
];

const BOOKMARKS = [
  { start: 0.214, width: 0.0266 },
  { start: 0.274, width: 0.0125 },
  { start: 0.353, width: 0.0266 },
  { start: 0.415, width: 0.0125 },
  { start: 0.478, width: 0.0125 },
];

const DEFAULT_PRESETS = [
  { id: "01", label: "Preset position 01", panX: 0, panY: 0, zoom: 1, focus: 0, shutter: 1, speed: 1, sceneMode: "auto", heaterOn: false },
  { id: "02", label: "Preset position 02", panX: 8, panY: -6, zoom: 1.18, focus: 0, shutter: 1, speed: 1, sceneMode: "auto", heaterOn: false },
  { id: "03", label: "Preset position 03", panX: -8, panY: 6, zoom: 1.28, focus: 0, shutter: 1, speed: 1, sceneMode: "auto", heaterOn: false },
];

const PTZ = [
  { dir: [-1, -1], src: "ptz-up-left.svg", label: "Up left" },
  { dir: [0, -1], src: "ptz-up.svg", label: "Up" },
  { dir: [1, -1], src: "ptz-up-right.svg", label: "Up right" },
  { dir: [-1, 0], src: "ptz-left.svg", label: "Left" },
  { dir: [0, 0], src: "ptz-center.svg", label: "Recenter" },
  { dir: [1, 0], src: "ptz-right.svg", label: "Right" },
  { dir: [-1, 1], src: "ptz-down-left.svg", label: "Down left" },
  { dir: [0, 1], src: "ptz-down.svg", label: "Down" },
  { dir: [1, 1], src: "ptz-down-right.svg", label: "Down right" },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function secondsOfDay(date) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000;
}

function formatClock(totalSeconds) {
  const wrapped = ((Math.floor(totalSeconds) % DAY) + DAY) % DAY;
  const hh = String(Math.floor(wrapped / 3600)).padStart(2, "0");
  const mm = String(Math.floor((wrapped % 3600) / 60)).padStart(2, "0");
  const ss = String(wrapped % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDay(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function overlaps(progress, spans) {
  return spans.some((span) => progress >= span.start && progress <= span.start + span.width);
}

function clipSpans(spans, max) {
  return spans.flatMap((span) => {
    if (span.start >= max) return [];
    const width = Math.min(span.width, max - span.start);
    return width > 0.0004 ? [{ ...span, width }] : [];
  });
}

function Icon({ name, width, height, className = "" }) {
  return (
    <img
      src={`${ASSET}/${name}`}
      alt=""
      width={width}
      height={height}
      className={className}
      draggable={false}
    />
  );
}

function Slider({ value, onChange, label }) {
  return (
    <input
      className="camera-monitor__slider"
      type="range"
      min="0"
      max="100"
      value={value}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ "--fill": `${value}%` }}
    />
  );
}

function LiveBadge({ compact = false }) {
  return (
    <span className="camera-monitor__live">
      <Icon name="live-badge.svg" width={12} height={12} />
      {compact ? " Live" : " Live"}
    </span>
  );
}

export default function CameraMonitor({ camera, onClose, onSelectCamera }) {
  const { showToast, cameras } = useApp();
  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const draggingRef = useRef(false);
  const holdRef = useRef(null);

  const [now, setNow] = useState(() => new Date());
  const [dayOffset, setDayOffset] = useState(0);
  const [playhead, setPlayhead] = useState(() => secondsOfDay(new Date()));
  const [isLive, setIsLive] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetId, setPresetId] = useState("01");
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [detectObjects, setDetectObjects] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [volume, setVolume] = useState(38);
  const [balance, setBalance] = useState(50);
  const [buffer, setBuffer] = useState(28);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState(0);
  const [shutter, setShutter] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [forcedRecord, setForcedRecord] = useState(false);
  const [heaterOn, setHeaterOn] = useState(false);
  const [privacyOn, setPrivacyOn] = useState(false);
  const [sceneMode, setSceneMode] = useState("auto");
  const [autoIrisOn, setAutoIrisOn] = useState(false);
  const [irisPulse, setIrisPulse] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);

  const liveSeconds = secondsOfDay(now);
  const playheadRef = useRef(playhead);
  const liveRef = useRef(liveSeconds);
  playheadRef.current = playhead;
  liveRef.current = liveSeconds;

  const viewingDate = useMemo(() => {
    const date = new Date(2026, 5, 29);
    date.setDate(29 + dayOffset);
    return date;
  }, [dayOffset]);

  const progress = playhead / DAY;
  const liveProgress = dayOffset === 0 ? VISUAL_LIVE : 1;
  const inMotion = overlaps(progress, MOTION);
  const hour = playhead / 3600;
  const timelineNight = hour < 6 || hour > 19.5 ? 0.55 : hour < 7 || hour > 18 ? 0.28 : 0;
  const nightMix = sceneMode === "night" ? 0.62 : sceneMode === "day" ? 0 : timelineNight;
  const isRecording = !isLive || dayOffset !== 0;
  const osd = camera ? resolveOsdPreviewSettings(camera) : {};
  const title =
    osd.cameraTitleOn === "On" && osd.cameraTitleText?.trim()
      ? osd.cameraTitleText.trim()
      : camera?.alias ?? "Camera";
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];

  const objects = useMemo(() => {
    if (!detectObjects || privacyOn) return [];
    const t = (playhead % 18) / 18;
    const drift = Math.sin(t * Math.PI * 2);
    return [
      { left: 57 + drift * 2, top: 50 + drift, w: 8, h: 32, label: "Person" },
      { left: 63 - drift * 1.5, top: 48, w: 8, h: 34, label: "Person" },
      { left: 7 + Math.max(0, drift) * 3, top: 38, w: 22, h: 32, label: "Bicycle" },
    ];
  }, [detectObjects, playhead, privacyOn]);

  const seekTo = useCallback(
    (nextSeconds, { live = false } = {}) => {
      const max = dayOffset === 0 ? liveSeconds : DAY - 0.01;
      const clamped = clamp(nextSeconds, 0, max);
      setPlayhead(clamped);
      const atLive = dayOffset === 0 && liveSeconds - clamped <= LIVE_EDGE;
      setIsLive(live || atLive);
      if (live || atLive) setPlaying(true);
    },
    [dayOffset, liveSeconds]
  );

  const seekFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      if (dayOffset === 0 && ratio >= VISUAL_LIVE) {
        seekTo(liveRef.current, { live: true });
        return;
      }
      seekTo(ratio * DAY);
      setPlaying(false);
    },
    [dayOffset, seekTo]
  );

  useEffect(() => {
    if (!camera) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [camera, onClose]);

  useEffect(() => {
    if (!camera) return undefined;
    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, [camera]);

  useEffect(() => {
    if (isLive && dayOffset === 0) setPlayhead(liveSeconds);
  }, [isLive, dayOffset, liveSeconds]);

  useEffect(() => {
    if (!camera || !playing || (isLive && dayOffset === 0)) return undefined;
    const started = performance.now();
    const origin = playheadRef.current;
    let frame = 0;
    const tick = (stamp) => {
      const next = origin + (stamp - started) / 1000;
      if (dayOffset === 0 && next >= liveRef.current) {
        setIsLive(true);
        setPlayhead(liveRef.current);
        return;
      }
      if (next >= DAY) {
        setPlaying(false);
        setPlayhead(DAY - 0.01);
        return;
      }
      setPlayhead(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [camera, playing, isLive, dayOffset]);

  useEffect(() => {
    const onMove = (event) => {
      if (!draggingRef.current) return;
      seekFromClientX(event.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [seekFromClientX]);

  const stopHold = useCallback(() => {
    if (holdRef.current) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  const panBy = useCallback(
    (dx, dy) => {
      const step = 1.6 * speed;
      setPan((prev) => ({
        x: clamp(prev.x + dx * step, -28, 28),
        y: clamp(prev.y + dy * step, -22, 22),
      }));
    },
    [speed]
  );

  const startHold = useCallback(
    (dx, dy) => {
      stopHold();
      panBy(dx, dy);
      holdRef.current = window.setInterval(() => panBy(dx, dy), 70);
    },
    [panBy, stopHold]
  );

  const applyPreset = (id) => {
    const next = presets.find((item) => item.id === id) ?? presets[0];
    setPresetId(next.id);
    setPan({ x: next.panX, y: next.panY });
    setZoom(next.zoom);
    setFocus(next.focus ?? 0);
    setShutter(next.shutter ?? 1);
    setSpeed(next.speed ?? 1);
    setSceneMode(next.sceneMode ?? "auto");
    setHeaterOn(Boolean(next.heaterOn));
    setAutoIrisOn(false);
    setPresetOpen(false);
    setSaveConfirm(false);
  };

  const snapshotView = () => ({
    panX: pan.x,
    panY: pan.y,
    zoom,
    focus,
    shutter,
    speed,
    sceneMode,
    heaterOn,
  });

  const confirmSaveView = () => {
    setPresets((prev) =>
      prev.map((item) => (item.id === presetId ? { ...item, ...snapshotView() } : item))
    );
    setSaveConfirm(false);
    setPresetOpen(false);
    showToast("View saved", preset.label, "info");
  };

  const jumpEvent = (direction) => {
    const points = MOTION.map((span) => span.start * DAY).sort((a, b) => a - b);
    if (direction < 0) {
      const prev = [...points].reverse().find((point) => point < playhead - 1);
      if (prev != null) seekTo(prev);
      return;
    }
    const next = points.find((point) => point > playhead + 1);
    if (next != null) seekTo(next);
  };

  const captureImage = () => {
    if (privacyOn) {
      showToast("Privacy mode", "Disable privacy mode to capture", "info");
      return;
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    showToast("Image captured", `${title} · ${formatClock(playhead)}`, "info");
  };

  const runAutoIris = () => {
    setAutoIrisOn((value) => {
      const next = !value;
      if (next) {
        setShutter(1);
        setIrisPulse(true);
        window.setTimeout(() => setIrisPulse(false), 700);
      }
      return next;
    });
  };

  const goLive = useCallback(() => {
    setDayOffset(0);
    seekTo(liveSeconds, { live: true });
    setHistoryOpen(false);
  }, [liveSeconds, seekTo]);

  const openHistory = () => {
    setHistoryOpen(true);
  };

  const jumpHistory = (seconds) => {
    setDayOffset(0);
    seekTo(seconds);
    setPlaying(true);
    setHistoryOpen(false);
  };

  const openDoor = () => {
    setDoorOpen(true);
    showToast("Door unlocked", `${title} access granted`, "info");
    window.setTimeout(() => setDoorOpen(false), 2800);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const enabled = audioOn && volume > 0;
    const applyMute = () => {
      video.defaultMuted = !enabled;
      video.muted = !enabled;
      if (enabled) {
        video.removeAttribute("muted");
        video.volume = clamp(volume / 100, 0, 1);
      } else {
        video.setAttribute("muted", "");
        video.volume = 0;
      }
    };
    applyMute();
    video.addEventListener("play", applyMute);
    video.addEventListener("playing", applyMute);
    video.addEventListener("loadeddata", applyMute);
    return () => {
      video.removeEventListener("play", applyMute);
      video.removeEventListener("playing", applyMute);
      video.removeEventListener("loadeddata", applyMute);
    };
  }, [audioOn, camera, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !camera) return undefined;
    if (privacyOn) {
      video.pause();
      return undefined;
    }
    const shouldPlay = playing || (isLive && dayOffset === 0);
    if (shouldPlay) {
      const attempt = video.play();
      if (attempt?.catch) attempt.catch(() => {});
    } else {
      video.pause();
    }
    return undefined;
  }, [camera, dayOffset, isLive, playing, privacyOn]);

  if (!camera) return null;

  const imageFilter = [
    `blur(${focus}px)`,
    `brightness(${shutter * (1 - nightMix * 0.55) * (irisPulse ? 1.18 : 1)})`,
    `contrast(${1 + nightMix * 0.18})`,
    `saturate(${(audioOn ? 0.72 + volume / 180 : 0.45) * (1 - nightMix * 0.25) * (heaterOn ? 1.35 : 1)})`,
    `hue-rotate(${(balance - 50) * 0.55 + (heaterOn ? -14 : 0)}deg)`,
    heaterOn ? "sepia(0.28)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const transform = `translate(${-pan.x}%, ${-pan.y}%) scale(${zoom})`;
  const zoomedIn = zoom > 1.02;
  const focusFarOn = focus > 0.25;
  const shutterDark = shutter < 0.97;
  const shutterBright = shutter > 1.03;
  const speedSlow = speed < 0.95;
  const speedFast = speed > 1.05;
  const soundActive = audioOn && volume > 0 && !privacyOn && (playing || (isLive && dayOffset === 0));

  const motionSpans = clipSpans(MOTION, liveProgress);
  const bookmarkSpans = clipSpans(BOOKMARKS, liveProgress);
  const playheadLeft =
    dayOffset === 0 && (isLive || progress >= VISUAL_LIVE)
      ? `${VISUAL_LIVE * 100}%`
      : `${Math.min(progress, liveProgress) * 100}%`;

  const historyItems = MOTION.map((span, index) => ({
    id: `motion-${index}`,
    label: index === MOTION.length - 1 ? "Latest motion" : `Motion event ${index + 1}`,
    seconds: span.start * DAY,
  }));

  return createPortal(
    <div
      className="camera-monitor"
      role={onClose ? "dialog" : "application"}
      aria-modal={onClose ? true : undefined}
      aria-labelledby="camera-monitor-title"
    >
      {!sideOpen ? (
        <CameraServersRail cameras={cameras} activeId={camera.id} onSelectCamera={onSelectCamera} />
      ) : null}
      <div className="camera-monitor__workspace">
        <header className="camera-monitor__tabs">
          <div className="camera-monitor__tab is-active">
            <span id="camera-monitor-title">{title}</span>
            {onClose ? (
              <button type="button" className="camera-monitor__icon-hit" onClick={onClose} aria-label="Close camera">
                <Icon name="tab-close.svg" width={16} height={16} />
              </button>
            ) : null}
          </div>
          <button type="button" className="camera-monitor__tab-add" aria-label="Add camera tab">
            <Icon name="tab-plus.svg" width={16} height={16} />
          </button>
          <div className="camera-monitor__tabs-fill" />
        </header>

        <div className="camera-monitor__stage">
          <div className="camera-monitor__viewport">
            <div className="camera-monitor__feed-wrap" style={{ transform }}>
              <div className="camera-monitor__feed" style={{ filter: imageFilter }}>
                <video
                  ref={videoRef}
                  src={`${ASSET}/feed.mp4?v=calm`}
                  poster={`${ASSET}/feed.jpg`}
                  muted={!audioOn || volume <= 0}
                  loop
                  playsInline
                  preload="auto"
                />
              </div>
            </div>
            <div className="camera-monitor__vignette" />
            {nightMix > 0 ? <div className="camera-monitor__night" style={{ opacity: nightMix }} /> : null}
            {inMotion ? <div className="camera-monitor__scan" aria-hidden="true" /> : null}
            {objects.map((box) => (
              <span
                key={box.label + box.left}
                className="camera-monitor__bbox"
                style={{
                  left: `${box.left}%`,
                  top: `${box.top}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                }}
              >
                {box.label}
              </span>
            ))}
            {(micOn && !privacyOn) || soundActive ? (
              <div className="camera-monitor__stage-flags">
                {soundActive ? (
                  <span className="camera-monitor__sound" role="status" aria-label="Audio playing">
                    <span className="camera-monitor__vu" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                ) : null}
                {micOn && !privacyOn ? <span className="camera-monitor__talk">MIC</span> : null}
              </div>
            ) : null}
            {heaterOn ? <div className="camera-monitor__heater" aria-hidden="true" /> : null}
            {doorOpen ? (
              <div className="camera-monitor__door" role="status">
                <strong>Door unlocked</strong>
                <span>Access granted · {title}</span>
              </div>
            ) : null}
            {privacyOn ? (
              <div className="camera-monitor__privacy">
                <Icon name="eye-off.svg" width={20} height={20} />
                Privacy mode
              </div>
            ) : null}
            {isRecording ? (
              <div className="camera-monitor__playback-banner">
                <span>Recording playback</span>
                <button type="button" onClick={goLive}>
                  Switch to Live
                </button>
              </div>
            ) : null}
            {!sideOpen ? (
              <button
                type="button"
                className="camera-monitor__side-reopen"
                onClick={() => setSideOpen(true)}
                aria-label="Open camera panel"
              >
                <Icon name="panel-open.svg" width={20} height={20} />
              </button>
            ) : null}
            <div className={`camera-monitor__preset${sideOpen ? " is-flush" : ""}`}>
              <button
                type="button"
                className="camera-monitor__preset-btn"
                onClick={() => {
                  setPresetOpen((open) => !open);
                  setSaveConfirm(false);
                }}
              >
                <span>{preset.label}</span>
                <Icon name="preset-caret.svg" width={8} height={8} className="camera-monitor__caret" />
              </button>
              {presetOpen ? (
                <div className="camera-monitor__preset-menu" role="listbox">
                  {saveConfirm ? (
                    <div className="camera-monitor__preset-confirm">
                      <p>Save this view with the current parameters?</p>
                      <div>
                        <button type="button" onClick={() => setSaveConfirm(false)}>
                          Cancel
                        </button>
                        <button type="button" className="is-save" onClick={confirmSaveView}>
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {presets.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={item.id === presetId ? "is-active" : ""}
                          onClick={() => applyPreset(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                      <button type="button" className="camera-monitor__preset-save" onClick={() => setSaveConfirm(true)}>
                        Save view
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            {flash ? <div className="camera-monitor__flash" /> : null}
          </div>
        </div>

        <div className="camera-monitor__transport">
          <div className="camera-monitor__transport-row">
            <div className="camera-monitor__date">
              <button type="button" aria-label="Previous day" onClick={() => setDayOffset((value) => value - 1)}>
                <Icon name="arrow-back.svg" width={20} height={20} className="camera-monitor__flip-y" />
              </button>
              <span>
                {formatDay(viewingDate)}
                <Icon name="calendar.svg" width={16} height={16} />
              </span>
              <button type="button" aria-label="Next day" onClick={() => setDayOffset((value) => Math.min(0, value + 1))}>
                <Icon name="arrow-forward.svg" width={20} height={20} className="camera-monitor__rot-90" />
              </button>
            </div>
            <button
              type="button"
              className="camera-monitor__export"
              onClick={() => showToast("Export queued", `Clip from ${title}`, "info")}
            >
              Export
              <Icon name="export.svg" width={16} height={16} />
            </button>
            <p className="camera-monitor__clock">{formatClock(playhead)}</p>
            <div className="camera-monitor__playback">
              <button type="button" aria-label="Previous event" onClick={() => jumpEvent(-1)}>
                <Icon name="prev-event.svg" width={17} height={17} className="camera-monitor__rot-180" />
              </button>
              <button type="button" aria-label="Rewind" onClick={() => seekTo(playhead - 10)}>
                <Icon name="rewind.svg" width={17} height={17} />
              </button>
              <button
                type="button"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => {
                  if (isLive) {
                    setIsLive(false);
                    setPlaying(false);
                    return;
                  }
                  setPlaying((value) => !value);
                }}
              >
                {playing ? (
                  <Icon name="pause.svg" width={17} height={17} />
                ) : (
                  <span className="camera-monitor__play" />
                )}
              </button>
              <button
                type="button"
                aria-label="Fast forward"
                className={isLive ? "is-disabled" : ""}
                onClick={() => seekTo(playhead + 10)}
              >
                <Icon name="ffwd.svg" width={17} height={17} className="camera-monitor__rot-180" />
              </button>
              <button
                type="button"
                aria-label="Next event"
                className={isLive ? "is-disabled" : ""}
                onClick={() => jumpEvent(1)}
              >
                <Icon name="next-event.svg" width={17} height={17} />
              </button>
            </div>
            <button
              type="button"
              className={`camera-monitor__live-btn${isLive && !isRecording ? " is-on" : ""}`}
              onClick={goLive}
            >
              <Icon name="live-badge.svg" width={12} height={12} />
              Live
            </button>
          </div>

          <div
            ref={trackRef}
            className="camera-monitor__timeline"
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromClientX(event.clientX);
            }}
          >
            <div className="camera-monitor__hours">
              {Array.from({ length: 24 }, (_, index) => {
                const hourLabel = String(index + 1).padStart(2, "0");
                const future = (index + 1) / 24 > VISUAL_LIVE && dayOffset === 0;
                return (
                  <span key={hourLabel} className={future ? "is-future" : ""}>
                    <i />
                    {hourLabel}
                  </span>
                );
              })}
            </div>
            <div className="camera-monitor__tracks">
              <div className="camera-monitor__track">
                {motionSpans.map((span) => (
                  <b key={span.start} className="is-motion" style={{ left: `${span.start * 100}%`, width: `${span.width * 100}%` }} />
                ))}
              </div>
              <div className="camera-monitor__track">
                {bookmarkSpans.map((span) => (
                  <b key={span.start} className="is-mark" style={{ left: `${span.start * 100}%`, width: `${span.width * 100}%` }} />
                ))}
              </div>
              <div className="camera-monitor__track">
                <b className="is-rec" style={{ width: `${liveProgress * 100}%` }} />
              </div>
            </div>
            <div className="camera-monitor__playhead" style={{ left: playheadLeft }}>
              <Icon name="playhead-cap.svg" width={8} height={12} />
              <Icon name="playhead-line.svg" width={1} height={65} />
            </div>
          </div>
        </div>
      </div>

      {sideOpen ? (
        <aside className="camera-monitor__side">
          <div className="camera-monitor__side-head">
            <button type="button" aria-label="Collapse panel" onClick={() => setSideOpen(false)}>
              <Icon name="collapse.svg" width={20} height={20} className="camera-monitor__flip-x" />
            </button>
            <h3>{title}</h3>
            {isRecording ? <span className="camera-monitor__live is-off">REC</span> : <LiveBadge compact />}
          </div>

          {isRecording ? (
            <div className="camera-monitor__rec-switch">
              <p>You are in recording playback. Live controls are hidden.</p>
              <button type="button" onClick={goLive}>
                Switch to Live
              </button>
            </div>
          ) : null}

          <div className="camera-monitor__side-scroll">
            {isRecording ? null : (
            <section className="camera-monitor__card">
              <h4>Image</h4>
              <div className="camera-monitor__ptz" role="group" aria-label="PTZ">
                {PTZ.map((button) => {
                    const isCenter = button.dir[0] === 0 && button.dir[1] === 0;
                    const active =
                      !isCenter &&
                      (button.dir[0] === 0 || Math.sign(pan.x) === button.dir[0]) &&
                      (button.dir[1] === 0 || Math.sign(pan.y) === button.dir[1]) &&
                      (button.dir[0] === 0 ? Math.abs(pan.x) < 0.4 : Math.abs(pan.x) > 0.8) &&
                      (button.dir[1] === 0 ? Math.abs(pan.y) < 0.4 : Math.abs(pan.y) > 0.8);
                    return (
                  <button
                    key={button.label}
                    type="button"
                    className={active ? "is-active" : ""}
                    aria-label={button.label}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      if (isCenter) {
                        setPan({ x: 0, y: 0 });
                        return;
                      }
                      startHold(button.dir[0], button.dir[1]);
                    }}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                  >
                    <Icon name={button.src} width={28} height={28} />
                  </button>
                    );
                  })}
              </div>
              <div className="camera-monitor__row">
                <span>Zoom</span>
                <div>
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => setZoom((value) => clamp(value - 0.12, 1, 3.2))}
                  >
                    <Icon name="zoom-out.svg" width={20} height={20} />
                  </button>
                  <button
                    type="button"
                    className={zoomedIn ? "is-active" : ""}
                    aria-label="Zoom in"
                    onClick={() => setZoom((value) => clamp(value + 0.12, 1, 3.2))}
                  >
                    <Icon name="zoom-in.svg" width={20} height={20} />
                  </button>
                </div>
              </div>
              <div className="camera-monitor__row">
                <span>Focus</span>
                <div>
                  <button
                    type="button"
                    aria-label="Focus near"
                    onClick={() => {
                      setFocus((value) => clamp(value - 1.2, 0, 7));
                    }}
                  >
                    <Icon name="focus-near.svg" width={20} height={20} />
                  </button>
                  <button
                    type="button"
                    className={focusFarOn ? "is-active" : ""}
                    aria-label="Focus far"
                    onClick={() => {
                      setFocus((value) => clamp(value + 1.2, 0, 7));
                    }}
                  >
                    <Icon name="focus-far.svg" width={20} height={20} />
                  </button>
                </div>
              </div>
              <div className="camera-monitor__row">
                <span>Shutter</span>
                <div>
                  <button
                    type="button"
                    className={shutterDark ? "is-active" : ""}
                    aria-label="Darker shutter"
                    onClick={() => {
                      setAutoIrisOn(false);
                      setShutter((value) => clamp(value - 0.12, 0.35, 1.85));
                    }}
                  >
                    <Icon name="shutter-minus.svg" width={20} height={20} />
                  </button>
                  <button
                    type="button"
                    className={shutterBright ? "is-active" : ""}
                    aria-label="Brighter shutter"
                    onClick={() => {
                      setAutoIrisOn(false);
                      setShutter((value) => clamp(value + 0.12, 0.35, 1.85));
                    }}
                  >
                    <Icon name="shutter-plus.svg" width={20} height={20} />
                  </button>
                </div>
              </div>
              <div className="camera-monitor__row">
                <span>Speed</span>
                <div className="camera-monitor__stepper">
                  <button
                    type="button"
                    className={speedSlow ? "is-active" : ""}
                    aria-label="Slower"
                    onClick={() => setSpeed((value) => clamp(Number((value - 0.2).toFixed(1)), 0.2, 3))}
                  >
                    <Icon name="minus.svg" width={12} height={12} />
                  </button>
                  <b>{speed.toFixed(1)}</b>
                  <button
                    type="button"
                    className={speedFast ? "is-active" : ""}
                    aria-label="Faster"
                    onClick={() => setSpeed((value) => clamp(Number((value + 0.2).toFixed(1)), 0.2, 3))}
                  >
                    <Icon name="plus.svg" width={12} height={12} />
                  </button>
                </div>
              </div>
            </section>
            )}

            <section className="camera-monitor__card">
              <div className="camera-monitor__card-head">
                <h4>Audio</h4>
                <div className="camera-monitor__seg">
                  <button
                    type="button"
                    className={`${audioOn ? "is-on" : "is-muted"}${soundActive ? " is-sounding" : ""}`}
                    aria-label={audioOn ? "Mute audio" : "Unmute audio"}
                    aria-pressed={audioOn}
                    onClick={() => setAudioOn((value) => !value)}
                  >
                    <Icon name={audioOn ? "audio.svg" : "audio-off.svg"} width={16} height={16} />
                  </button>
                  <button type="button" className={micOn ? "is-on" : ""} aria-label="Toggle microphone" onClick={() => setMicOn((value) => !value)}>
                    <span className="camera-monitor__mic">
                      <Icon name="mic.svg" width={14} height={14} />
                    </span>
                  </button>
                </div>
              </div>
              <div className="camera-monitor__row">
                <span>Volume</span>
                <Slider value={volume} onChange={setVolume} label="Volume" />
              </div>
              <div className="camera-monitor__row">
                <span>Balance</span>
                <Slider value={balance} onChange={setBalance} label="Balance" />
              </div>
              <div className="camera-monitor__row">
                <span>Buffer</span>
                <Slider value={buffer} onChange={setBuffer} label="Buffer" />
              </div>
            </section>

            <section className="camera-monitor__card">
              <h4>Actions & Auxiliary</h4>
              {isRecording ? null : (
              <div className="camera-monitor__row">
                <span>Recent history</span>
                <button
                  type="button"
                  className={historyOpen ? "is-active" : ""}
                  aria-label="Open recent history"
                  onClick={openHistory}
                >
                  <Icon name="clock.svg" width={20} height={20} />
                </button>
              </div>
              )}
              <div className="camera-monitor__row">
                <span>Capture image</span>
                <button type="button" aria-label="Capture image" onClick={captureImage}>
                  <Icon name="capture.svg" width={20} height={20} />
                </button>
              </div>
              <div className="camera-monitor__row">
                <span>Detect objects and people</span>
                <button
                  type="button"
                  className={detectObjects ? "is-active" : ""}
                  aria-pressed={detectObjects}
                  aria-label="Detect objects and people"
                  onClick={() => setDetectObjects((value) => !value)}
                >
                  <Icon name="crosshair.svg" width={20} height={20} />
                </button>
              </div>
              {isRecording ? null : (
              <>
              <div className="camera-monitor__row">
                <span>Forced record</span>
                <button
                  type="button"
                  className={`is-soft${forcedRecord ? " is-active" : ""}`}
                  aria-pressed={forcedRecord}
                  aria-label="Forced record"
                  onClick={() => setForcedRecord((value) => !value)}
                >
                  <Icon name="record.svg" width={20} height={20} />
                </button>
              </div>
              <div className="camera-monitor__row">
                <span>Auto iris</span>
                <button type="button" className={`is-soft${autoIrisOn || irisPulse ? " is-active" : ""}`} aria-pressed={autoIrisOn} aria-label="Auto iris" onClick={runAutoIris}>
                  <Icon name="aperture.svg" width={20} height={20} />
                </button>
              </div>
              <div className="camera-monitor__row">
                <span>Heater</span>
                <button
                  type="button"
                  className={`is-soft${heaterOn ? " is-active" : ""}`}
                  aria-pressed={heaterOn}
                  aria-label="Heater"
                  onClick={() => setHeaterOn((value) => !value)}
                >
                  <Icon name="flame.svg" width={20} height={20} />
                </button>
              </div>
              <div className="camera-monitor__row">
                <span>Privacy mode</span>
                <button
                  type="button"
                  className={`is-soft${privacyOn ? " is-active" : ""}`}
                  aria-pressed={privacyOn}
                  aria-label="Privacy mode"
                  onClick={() => setPrivacyOn((value) => !value)}
                >
                  <Icon name="eye-off.svg" width={20} height={20} />
                </button>
              </div>
              <div className="camera-monitor__row">
                <span>Mode</span>
                <div>
                  <button
                    type="button"
                    className={`is-soft${sceneMode === "night" ? " is-active" : ""}`}
                    aria-pressed={sceneMode === "night"}
                    aria-label="Night mode"
                    onClick={() => setSceneMode((value) => (value === "night" ? "auto" : "night"))}
                  >
                    <Icon name="moon.svg" width={18} height={18} className="camera-monitor__moon" />
                  </button>
                  <button
                    type="button"
                    className={`is-soft${sceneMode === "day" ? " is-active" : ""}`}
                    aria-pressed={sceneMode === "day"}
                    aria-label="Day mode"
                    onClick={() => setSceneMode((value) => (value === "day" ? "auto" : "day"))}
                  >
                    <Icon name="sun.svg" width={20} height={20} />
                  </button>
                </div>
              </div>
              <div className="camera-monitor__row camera-monitor__row--cta">
                <button type="button" className="camera-monitor__door-btn" onClick={openDoor}>
                  Open door
                </button>
              </div>
              </>
              )}
            </section>

            <section className="camera-monitor__details">
              <div>
                <strong>Details</strong>
                <button type="button" onClick={() => showToast(camera.deviceId, `${camera.ip} · ${camera.model}`, "info")}>
                  More info
                </button>
              </div>
              <p>
                {camera.ip} - Panasonic - Model
                <br />
                {camera.model}
              </p>
            </section>
          </div>
        </aside>
      ) : null}
      {historyOpen ? (
        <div
          className="camera-monitor__history-overlay"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="camera-monitor__history"
            role="dialog"
            aria-label="Recent history"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="camera-monitor__history-head">
              <strong>Recent history</strong>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close history">
                <Icon name="tab-close.svg" width={16} height={16} />
              </button>
            </div>
            <ul>
              {historyItems.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => jumpHistory(item.seconds)}>
                    <span>{item.label}</span>
                    <time>{formatClock(item.seconds)}</time>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
