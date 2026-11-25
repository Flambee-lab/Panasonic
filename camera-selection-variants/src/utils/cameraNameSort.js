const cameraNames = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Return a stable copy; callers keep available/unavailable groups separate. */
export function sortCameraEntries(entries, direction = "asc") {
  const factor = direction === "desc" ? -1 : 1;
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => {
    const first = String(a.entry.camera?.name ?? a.entry.name ?? "");
    const second = String(b.entry.camera?.name ?? b.entry.name ?? "");
    return cameraNames.compare(first, second) * factor || a.index - b.index;
  }).map(({ entry }) => entry);
}
