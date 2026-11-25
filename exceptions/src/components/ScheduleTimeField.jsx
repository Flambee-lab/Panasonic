import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  normalizeScheduleHour,
  normalizeScheduleMinute,
  reconcileScheduleTimeDraft,
  schedulePartsFromValue,
  schedulePartsValue,
  scheduleTimeDigits,
  stepScheduleParts,
} from "../utils/scheduleTimeParts";
import { scheduleTimeMenuPosition } from "../utils/scheduleTimeMenu";
import "../styles/schedule-time-field.css";

const MENU_OPEN_EVENT = "schedule-time-field:open-menu";
const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function setRef(ref, node) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/** Shared hour/minute wells, including the original weekly dialog's refs. */
export function TimeField({
  label, hour, minute, period, onHour, onMinute, onPeriod,
  minuteRef, hourRef, onParts, invalid = false, describedBy,
  autoFocus = false, showLabel = true,
}) {
  const ownerId = useId();
  const fieldRef = useRef(null);
  const localHour = useRef(null);
  const localMinute = useRef(null);
  const menuRef = useRef(null);
  const [openSegment, setOpenSegment] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const menuId = `${ownerId}-time-options`;
  const options = openSegment === "hour" ? HOURS : MINUTES;
  const currentValue = openSegment === "hour" ? hour : minute;
  const selectedValue = currentValue !== "" && options.find((option) => Number(option) === Number(currentValue));
  const activeOptionId = selectedValue ? `${menuId}-${selectedValue}` : undefined;
  const anchorInput = () => openSegment === "hour" ? localHour.current : localMinute.current;

  const closeMenu = () => setOpenSegment(null);
  const openMenu = (segment, toggle = false) => {
    if (toggle && openSegment === segment) { closeMenu(); return; }
    const anchor = segment === "hour" ? localHour.current : localMinute.current;
    if (!anchor) return;
    window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: ownerId }));
    setMenuPosition(scheduleTimeMenuPosition(anchor.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, segment === "hour" ? 12 : 60));
    setOpenSegment(segment);
  };

  useEffect(() => {
    const openedElsewhere = (event) => { if (event.detail !== ownerId) closeMenu(); };
    window.addEventListener(MENU_OPEN_EVENT, openedElsewhere);
    return () => window.removeEventListener(MENU_OPEN_EVENT, openedElsewhere);
  }, [ownerId]);

  useLayoutEffect(() => {
    if (!openSegment) return;
    const anchor = anchorInput();
    if (!anchor) { closeMenu(); return; }
    const reposition = () => setMenuPosition(scheduleTimeMenuPosition(anchor.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, options.length));
    const outside = (event) => {
      if (!fieldRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) closeMenu();
    };
    const parentScroll = (event) => {
      const target = event.target;
      if (menuRef.current?.contains(target)) return;
      if (target === document || (target instanceof Element && target !== anchor && target.contains(anchor))) closeMenu();
    };
    reposition();
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", parentScroll, true);
    window.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("resize", reposition);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposition) : null;
    observer?.observe(anchor);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", parentScroll, true);
      window.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("resize", reposition);
      observer?.disconnect();
    };
  }, [openSegment]);

  useLayoutEffect(() => {
    if (!openSegment || !selectedValue || !menuRef.current) return;
    const menu = menuRef.current;
    const option = document.getElementById(activeOptionId);
    if (!option) return;
    menu.scrollTop = option.offsetTop - (menu.clientHeight - option.offsetHeight) / 2;
  }, [openSegment, selectedValue, activeOptionId, menuPosition?.maxHeight]);

  useEffect(() => {
    if (!autoFocus) return;
    localHour.current?.focus();
    localHour.current?.select();
  }, [autoFocus]);

  const stepTime = (event, amount) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const next = stepScheduleParts({ hour, minute, period }, event.key === "ArrowUp" ? amount : -amount);
    if (!next) return;
    if (onParts) onParts(next);
    else { onHour(next.hour); onMinute(next.minute); onPeriod(next.period); }
    const input = event.currentTarget;
    requestAnimationFrame(() => { if (document.activeElement === input) input.select(); });
  };

  const keyDown = (event, segment) => {
    if (event.altKey && event.key === "ArrowDown" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      openMenu(segment);
      return;
    }
    if (openSegment && ["Escape", "Enter"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key === "Tab") closeMenu();
    stepTime(event, segment === "hour" ? 60 : 1);
  };
  const combobox = (segment) => {
    const expanded = openSegment === segment;
    return {
      role: "combobox",
      "aria-haspopup": "listbox",
      "aria-autocomplete": "none",
      "aria-expanded": expanded,
      "aria-controls": expanded ? menuId : undefined,
      "aria-activedescendant": expanded ? activeOptionId : undefined,
      "data-time-segment": segment,
    };
  };
  const selectOption = (option) => {
    const anchor = anchorInput();
    if (openSegment === "hour") onHour(option);
    else onMinute(option);
    closeMenu();
    anchor?.focus({ preventScroll: true });
    anchor?.select();
  };

  return <div ref={fieldRef} className="range-dialog__field schedule-time-field" role="group" aria-label={label} aria-describedby={describedBy}>
    {showLabel ? <span>{label}</span> : null}
    <div className="range-dialog__well">
      <div className="range-dialog__clock">
        <input
          {...combobox("hour")}
          ref={(node) => { localHour.current = node; setRef(hourRef, node); }}
          aria-label={`${label} hour`} inputMode="numeric" autoComplete="off" value={hour}
          aria-keyshortcuts="ArrowUp ArrowDown Alt+ArrowDown" aria-invalid={invalid || undefined} aria-describedby={describedBy}
          onKeyDown={(event) => keyDown(event, "hour")}
          onClick={() => openMenu("hour", true)}
          onChange={(event) => onHour(scheduleTimeDigits(event.target.value, 12))}
          onBlur={() => { onHour(normalizeScheduleHour(hour)); closeMenu(); }}
        />
        <span aria-hidden="true">:</span>
        <input
          {...combobox("minute")}
          ref={(node) => { localMinute.current = node; setRef(minuteRef, node); }}
          aria-label={`${label} minute`} inputMode="numeric" autoComplete="off" value={minute}
          aria-keyshortcuts="ArrowUp ArrowDown Alt+ArrowDown" aria-invalid={invalid || undefined} aria-describedby={describedBy}
          onKeyDown={(event) => keyDown(event, "minute")}
          onClick={() => openMenu("minute", true)}
          onChange={(event) => onMinute(scheduleTimeDigits(event.target.value, 59))}
          onBlur={() => { onMinute(normalizeScheduleMinute(minute)); closeMenu(); }}
        />
      </div>
      <div className="range-dialog__period" role="group" aria-label={`${label} period`}>
        {["AM", "PM"].map((value) => <button key={value} type="button" className={period === value ? "is-selected" : undefined} aria-pressed={period === value} onClick={() => onPeriod(value)}>{value}</button>)}
      </div>
    </div>
    {openSegment && menuPosition ? createPortal(
      <div
        ref={menuRef}
        id={menuId}
        className="schedule-time-options"
        role="listbox"
        aria-label={`${label} ${openSegment} options`}
        data-segment={openSegment}
        data-placement={menuPosition.placement}
        style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width, maxHeight: menuPosition.maxHeight }}
        onPointerDown={(event) => { if (event.target.closest('[role="option"]')) { event.preventDefault(); event.stopPropagation(); } }}
        onKeyDown={(event) => {
          if (["Escape", "Enter"].includes(event.key)) { event.preventDefault(); event.stopPropagation(); closeMenu(); anchorInput()?.focus({ preventScroll: true }); }
          else if (event.key === "Tab") closeMenu();
        }}
      >
        {options.map((option) => <button
          key={option}
          id={`${menuId}-${option}`}
          className={`schedule-time-options__option${option === selectedValue ? " is-selected" : ""}`}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={option === selectedValue}
          onClick={(event) => { event.stopPropagation(); selectOption(option); }}
        >{option}</button>)}
      </div>, document.body,
    ) : null}
  </div>;
}

/** String adapter for exception editors. Partial segments survive parent echoes. */
export default function ScheduleTimeInput({ label, value = "", onValue, invalid = false, describedBy, autoFocus = false, showLabel = true, inputRef }) {
  const [parts, setParts] = useState(() => schedulePartsFromValue(value));
  const partsRef = useRef(parts);
  const lastEmitted = useRef(undefined);
  useEffect(() => {
    const next = reconcileScheduleTimeDraft(partsRef.current, value, lastEmitted.current);
    if (next !== partsRef.current) {
      partsRef.current = next;
      lastEmitted.current = undefined;
      setParts(next);
    }
  }, [value]);

  const commit = (next) => {
    partsRef.current = next;
    setParts(next);
    const result = schedulePartsValue(next);
    lastEmitted.current = result;
    onValue(result);
  };
  const update = (field, next) => {
    if (partsRef.current[field] !== next) commit({ ...partsRef.current, [field]: next });
  };

  return <TimeField
    label={label} {...parts} invalid={invalid} describedBy={describedBy}
    autoFocus={autoFocus} showLabel={showLabel} hourRef={inputRef}
    onHour={(next) => update("hour", next)}
    onMinute={(next) => update("minute", next)}
    onPeriod={(next) => update("period", next)}
    onParts={commit}
  />;
}
