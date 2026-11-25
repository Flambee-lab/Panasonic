import { useEffect, useLayoutEffect, useState } from "react";

// Local design review only: reload restores the current tab, not a new visit.
const enabled = import.meta.env.DEV;
const restoring = enabled && performance.getEntriesByType("navigation")[0]?.type === "reload";
const prefix = `panasonic-review:b3:${location.pathname}:${location.search}:`;

function encode(value) {
  return JSON.stringify(value, function (key, item) {
    if (this[key] instanceof Date) return { __flowType: "Date", value: this[key].toISOString() };
    if (item instanceof Set) return { __flowType: "Set", value: [...item] };
    return item;
  });
}

function decode(value) {
  return JSON.parse(value, (_key, item) => {
    if (item?.__flowType === "Date") return new Date(item.value);
    if (item?.__flowType === "Set") return new Set(item.value);
    return item;
  });
}

export function useReviewState(key, initial) {
  const [value, setValue] = useState(() => {
    if (restoring) {
      try {
        const stored = sessionStorage.getItem(prefix + key);
        if (stored !== null) return decode(stored);
      } catch { /* Unavailable or invalid session storage must not block the flow. */ }
    }
    return typeof initial === "function" ? initial() : initial;
  });
  useEffect(() => {
    if (!enabled) return;
    try { sessionStorage.setItem(prefix + key, encode(value)); } catch { /* Storage is optional. */ }
  }, [key, value]);
  return [value, setValue];
}

// Cancel/Save closes a scope normally, so its old draft must not reappear.
export function useReviewScope(scope) {
  useEffect(() => () => {
    if (!enabled) return;
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(`${prefix}${scope}:`)) sessionStorage.removeItem(key);
      }
    } catch { /* Storage is optional. */ }
  }, [scope]);
}

export function useReviewScroll(scope, ref) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;
    const key = `${prefix}${scope}:scroll`;
    if (restoring) {
      try {
        const point = JSON.parse(sessionStorage.getItem(key));
        if (point) node.scrollTo(point.left, point.top);
      } catch { /* A missing scroll position starts at the top. */ }
    }
    const save = () => {
      try { sessionStorage.setItem(key, JSON.stringify({ left: node.scrollLeft, top: node.scrollTop })); } catch { /* Storage is optional. */ }
    };
    node.addEventListener("scroll", save, { passive: true });
    return () => node.removeEventListener("scroll", save);
  }, [scope, ref]);
}
