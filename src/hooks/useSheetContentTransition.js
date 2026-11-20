import { useEffect, useLayoutEffect, useRef } from "react";

// Keep one sheet surface while navigating between its internal sections.
export default function useSheetContentTransition(view, setView, panelRef, contentSelector) {
  const transitionRef = useRef(null);
  const animationsRef = useRef([]);
  const mountedRef = useRef(true);
  const largestHeightRef = useRef(0);

  // Internal screens may grow the sheet, but never shrink its surface.
  const retainHeight = (panel) => {
    largestHeightRef.current = Math.max(largestHeightRef.current, panel.offsetHeight);
    panel.style.minHeight = `min(${largestHeightRef.current}px, calc(100dvh - 24px))`;
  };

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel) retainHeight(panel);
  });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => retainHeight(panel));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panelRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      animationsRef.current.forEach((animation) => animation.cancel());
    };
  }, []);

  const changeView = async (next) => {
    const panel = panelRef.current;
    if (next === view || transitionRef.current) return;
    if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(next);
      return;
    }
    transitionRef.current = { height: panel.offsetHeight, next };
    panel.inert = true;
    const exit = [...panel.querySelectorAll(contentSelector)].map((child) => child.animate([
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: `scale(${next ? 0.97 : 1.025})` },
    ], { duration: 160, easing: "ease-in", fill: "forwards" }));
    animationsRef.current = exit;
    await Promise.all(exit.map((animation) => animation.finished.catch(() => {})));
    if (mountedRef.current) setView(next);
  };

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const transition = transitionRef.current;
    if (!panel || !transition || transition.next !== view) return;
    animationsRef.current.forEach((animation) => animation.cancel());
    const targetHeight = panel.offsetHeight;
    const options = { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
    const resize = panel.animate([
      { height: `${transition.height}px` },
      { height: `${targetHeight}px` },
    ], options);
    const entrance = [...panel.querySelectorAll(contentSelector)].map((child) => child.animate([
      { opacity: 0, transform: `scale(${view ? 1.035 : 0.97})` },
      { opacity: 1, transform: "scale(1)" },
    ], options));
    animationsRef.current = [resize, ...entrance];
    resize.finished.catch(() => {}).then(() => {
      if (!mountedRef.current) return;
      panel.inert = false;
      panel.querySelector("[data-sheet-autofocus]")?.focus({ preventScroll: true });
      transitionRef.current = null;
      animationsRef.current = [];
    });
  }, [view, panelRef, contentSelector]);

  return changeView;
}
