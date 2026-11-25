/** Fixed portal geometry. Coordinates share getBoundingClientRect's viewport. */
export function scheduleTimeMenuPosition(anchor, viewport, count, { gap = 6, gutter = 8, minWidth = 56, rowHeight = 28, visibleRows = 6 } = {}) {
  const viewportWidth = Math.max(0, viewport.width);
  const viewportHeight = Math.max(0, viewport.height);
  const horizontalGutter = Math.min(gutter, viewportWidth / 2);
  const verticalGutter = Math.min(gutter, viewportHeight / 2);
  const width = Math.min(Math.max(anchor.width, minWidth), Math.max(0, viewportWidth - horizontalGutter * 2));
  const desiredHeight = Math.min(Math.max(count, 0), visibleRows) * rowHeight + 10;
  const below = Math.max(0, viewportHeight - verticalGutter - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - gap - verticalGutter);
  const placement = below < desiredHeight && above > below ? "above" : "below";
  const maxHeight = Math.min(desiredHeight, placement === "above" ? above : below);
  const idealTop = placement === "above" ? anchor.top - gap - maxHeight : anchor.bottom + gap;
  return {
    left: Math.max(horizontalGutter, Math.min(anchor.left, viewportWidth - horizontalGutter - width)),
    top: Math.max(verticalGutter, Math.min(idealTop, viewportHeight - verticalGutter - maxHeight)),
    width,
    maxHeight,
    placement,
  };
}
