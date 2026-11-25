const DAY_MINUTES = 1440;
const emptyParts = () => ({ hour: "", minute: "", period: "AM" });

export function scheduleMinutesToParts(total) {
  if (!Number.isInteger(total) || total < 0) return emptyParts();
  const value = total % DAY_MINUTES;
  const hour24 = Math.floor(value / 60);
  return {
    hour: String(hour24 % 12 || 12),
    minute: String(value % 60).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

/** Empty or unfinished segments stay invalid; they never become 12:00. */
export function schedulePartsToMinutes(hour, minute, period) {
  if (!/^\d{1,2}$/.test(String(hour)) || !/^\d{1,2}$/.test(String(minute))) return null;
  const hours = Number(hour);
  const minutes = Number(minute);
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59 || !["AM", "PM"].includes(period)) return null;
  return (hours % 12 + (period === "PM" ? 12 : 0)) * 60 + minutes;
}

export function schedulePartsFromValue(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return emptyParts();
  const [hours, minutes] = value.split(":").map(Number);
  return scheduleMinutesToParts(hours * 60 + minutes);
}

export function schedulePartsValue(parts) {
  const total = schedulePartsToMinutes(parts.hour, parts.minute, parts.period);
  return total === null ? "" : `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function scheduleTimeDigits(value, max) {
  const next = String(value).replace(/\D/g, "").slice(0, 2);
  if (!next) return "";
  return Number(next) > max ? String(max) : next;
}

export function normalizeScheduleHour(value) {
  return value === "" ? "" : String(Number(value));
}

export function normalizeScheduleMinute(value) {
  return value === "" ? "" : value.padStart(2, "0");
}

export function stepScheduleParts(parts, amount) {
  const total = schedulePartsToMinutes(parts.hour, parts.minute, parts.period);
  if (total === null || !Number.isInteger(amount)) return null;
  return scheduleMinutesToParts(((total + amount) % DAY_MINUTES + DAY_MINUTES) % DAY_MINUTES);
}

/** An echoed empty value represents the current partial draft, not a reset. */
export function reconcileScheduleTimeDraft(parts, incoming, lastEmitted) {
  if (incoming === lastEmitted || incoming === schedulePartsValue(parts)) return parts;
  return schedulePartsFromValue(incoming);
}
