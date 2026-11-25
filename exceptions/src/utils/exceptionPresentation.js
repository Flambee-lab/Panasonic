const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;
const TYPE_LABELS = { hours: 'Different hours', day: 'Like another day', schedule: 'Use another schedule', temporary: 'Temporary change' };

function parts(key) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day, value: Date.UTC(year, month, day) };
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function short(date) {
  return `${WEEKDAYS[new Date(date.value).getUTCDay()]}, ${MONTHS[date.month]} ${date.day}`;
}
function full(date) { return `${short(date)}, ${date.year}`; }
function groups(dates) {
  const result = [];
  for (const date of dates) {
    const group = result.at(-1);
    if (group && date.value - group.at(-1).value === DAY) group.push(date);
    else result.push([date]);
  }
  return result;
}
function dateSpan(group) {
  const first = group[0], last = group.at(-1);
  if (group.length === 1) return full(first);
  if (first.year === last.year) return `${short(first)} – ${short(last)}, ${first.year}`;
  return `${full(first)} – ${full(last)}`;
}
function datesLabel(dates) {
  return groups(dates).map(dateSpan).join(' · ') || 'No dates selected';
}
export function exceptionTimeZone(zone = '') {
  if (zone.includes('Central')) return 'America/Chicago';
  if (zone.includes('Eastern')) return 'America/New_York';
  if (zone.includes('Buenos Aires')) return 'America/Argentina/Buenos_Aires';
  return 'America/Los_Angeles';
}
function calendarToday(now, timeZone) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone, year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric', hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return { value: Date.UTC(+fields.year, +fields.month - 1, +fields.day), minute: +fields.hour * 60 + +fields.minute };
}
export function clock(minutes) {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function rangeLabel(range) {
  const overnight = range.end >= 1440 || range.end < range.start;
  return `${clock(range.start)}–${clock(range.end)}${overnight ? ' (next day)' : ''}`;
}
export function exceptionPresentation(item, { now = new Date(), timeZone = 'America/Los_Angeles' } = {}) {
  const dates = [...new Set(item.dates ?? [])].map(parts).sort((a,b)=>a.value-b.value);
  let date = datesLabel(dates);
  let status = '';
  const current = calendarToday(now, item.zone ? exceptionTimeZone(item.zone) : timeZone);
  const today = current.value;
  // Feb 29 recurrence is deliberately left without a policy for non-leap years.
  if (dates.length && !item.sharedId && item.type !== 'temporary' && !(item.repeatYearly && dates.some(d=>d.month===1 && d.day===29))) {
    const todayYear = new Date(today).getUTCFullYear();
    const cycles = item.repeatYearly
      ? [-1,0,1,2].map(offset => dates.map(d => parts(`${d.year + todayYear - dates[0].year + offset}-${d.month}-${d.day}`)))
      : [dates];
    const overnight = item.type === 'hours' && (item.ranges ?? []).some(r=>(r.end>=1440 || r.end<r.start) && current.minute < r.end % 1440);
    const isActive = d => d.value === today || (overnight && d.value + DAY === today);
    const activeCycle = cycles.find(cycle => cycle.some(isActive));
    const futureCycle = cycles.find(cycle => cycle.some(d => d.value > today));
    const active = Boolean(activeCycle);
    const next = futureCycle?.find(d => d.value > today);
    if (item.repeatYearly) {
      const occurrence = activeCycle ?? futureCycle;
      if (occurrence) date = `${!active && occurrence[0].year > todayYear ? 'Next: ' : ''}${datesLabel(occurrence)}`;
    }
    status = active ? 'Active now' : next ? 'Upcoming' : 'Ended';
  }
  if (item.sharedId) date = 'Shared exception list';
  if (item.type === 'temporary') date = 'Weekly schedule';
  const recurrence = item.sharedId
    ? (item.repeatYearly ? 'Repeats every year' : 'Does not repeat')
    : `${item.repeatYearly ? 'Repeats every year' : 'Does not repeat'}${status ? ` · ${status}` : ''}`;
  const behavior = item.type === 'day' ? [`Uses ${item.likeDay}’s time ranges`]
    : item.type === 'schedule' ? [`Uses “${item.scheduleName}”`]
    : item.type === 'temporary' ? [item.endsLabel ? `Ends ${item.endsLabel}` : 'Temporary hours', 'Active now']
    : (item.ranges ?? []).map(rangeLabel);
  return { name: item.sharedName || item.name || 'Exception', type: TYPE_LABELS[item.type] || TYPE_LABELS.hours, date, recurrence, behavior, status };
}
