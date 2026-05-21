(function initTimeMaskInputs() {
  const MAX_TOTAL_SECONDS = 59 * 60 + 59;

  function extractDigits(raw) {
    return String(raw ?? "").replace(/\D/g, "");
  }

  function parseDigitsToTotalSeconds(digits) {
    const d = extractDigits(digits);
    if (!d) return 0;

    const asNumber = Number.parseInt(d, 10);
    if (Number.isNaN(asNumber)) return 0;

    if (d.length <= 2) {
      return Math.min(MAX_TOTAL_SECONDS, asNumber);
    }

    const padded = d.padStart(4, "0").slice(-4);
    const minutes = Number.parseInt(padded.slice(0, 2), 10);
    const seconds = Math.min(59, Number.parseInt(padded.slice(2, 4), 10));
    return Math.min(MAX_TOTAL_SECONDS, minutes * 60 + seconds);
  }

  /** Solo dígitos: segundos → 00 | minutos → M:00 */
  function formatDisplay(totalSeconds) {
    const total = Math.max(0, Math.min(MAX_TOTAL_SECONDS, Math.floor(totalSeconds)));

    if (total <= 0) {
      return "00";
    }

    if (total < 60) {
      return String(total).padStart(2, "0");
    }

    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function isRestValue(totalSeconds) {
    return Math.floor(totalSeconds) <= 0;
  }

  function syncUnitSegment(segment, totalSeconds) {
    if (!segment) return;
    const useMin = totalSeconds >= 60;
    segment.querySelectorAll(".unit-segment__btn").forEach((btn) => {
      const isMin = btn.dataset.unit === "min";
      btn.classList.toggle("is-active", useMin ? isMin : !isMin);
    });
  }

  function syncInputPresentation(input, totalSeconds, segment) {
    const clamped = Math.max(0, Math.min(MAX_TOTAL_SECONDS, Math.floor(totalSeconds)));
    const display = formatDisplay(clamped);

    input.dataset.totalSeconds = String(clamped);
    input.dataset.digitBuffer = clamped > 0 ? String(clamped) : "";
    input.value = display;
    input.classList.toggle("is-rest", isRestValue(clamped));
    input.classList.toggle("is-minutes-format", clamped >= 60);

    const defaultLabel = input.id === "buttonTime" ? "Button time" : "Relay strike";
    input.setAttribute("aria-label", isRestValue(clamped) ? defaultLabel : `${defaultLabel}, ${display}`);

    syncUnitSegment(segment, clamped);
    return clamped;
  }

  function bindTimeField(wrapper) {
    const input = wrapper.querySelector(".time-mask-input");
    const segment = wrapper.querySelector(".unit-segment");
    if (!input || !segment) return;

    syncInputPresentation(input, parseDigitsToTotalSeconds(input.value), segment);

    function applyDigits(rawDigits) {
      const before = input.dataset.totalSeconds ?? "0";
      const total = parseDigitsToTotalSeconds(rawDigits);
      syncInputPresentation(input, total, segment);
      if ((input.dataset.totalSeconds ?? "0") !== before) {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    function appendDigit(digit) {
      const buffer = extractDigits(input.dataset.digitBuffer || "");
      const nextBuffer = (buffer + digit).slice(-4);
      input.dataset.digitBuffer = nextBuffer;
      applyDigits(nextBuffer);
    }

    input.addEventListener("input", () => {
      applyDigits(input.value);
    });

    input.addEventListener("focus", () => {
      requestAnimationFrame(() => input.select());
    });

    input.addEventListener("keydown", (event) => {
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];
      if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          const buffer = extractDigits(input.dataset.digitBuffer || "");
          const nextBuffer = buffer.slice(0, -1);
          input.dataset.digitBuffer = nextBuffer;
          applyDigits(nextBuffer);
        }
        return;
      }
      if (event.key.length === 1 && /\d/.test(event.key)) {
        event.preventDefault();
        appendDigit(event.key);
        return;
      }
      event.preventDefault();
    });

    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = extractDigits(event.clipboardData?.getData("text"));
      if (!pasted) return;
      input.dataset.digitBuffer = pasted.slice(-4);
      applyDigits(pasted);
    });

    input.addEventListener("blur", () => {
      const total = Number.parseInt(input.dataset.totalSeconds || "0", 10) || 0;
      syncInputPresentation(input, total, segment);
    });

    segment.querySelectorAll(".unit-segment__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("is-active")) return;

        segment.querySelectorAll(".unit-segment__btn").forEach((el) => {
          el.classList.toggle("is-active", el === btn);
        });

        const total = Number.parseInt(input.dataset.totalSeconds || "0", 10) || 0;
        syncInputPresentation(input, total, segment);
      });
    });
  }

  document.querySelectorAll("[data-time-field]").forEach(bindTimeField);
})();
