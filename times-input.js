(function initTimeMaskInputs() {
  const LIMITS = {
    sec: { max: [59, 99] },
    min: { max: [59, 59] },
  };

  function getActiveUnit(segment) {
    const active = segment?.querySelector(".unit-segment__btn.is-active");
    return active?.dataset.unit === "min" ? "min" : "sec";
  }

  function extractDigits(raw) {
    return String(raw ?? "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  }

  function formatDigits(digits) {
    const d = extractDigits(digits);
    return `${d.slice(0, 2)}.${d.slice(2, 4)}`;
  }

  function isRestValue(digits) {
    return extractDigits(digits) === "0000";
  }

  function clampDigits(digits, unit) {
    const max = LIMITS[unit].max;
    let a = Number.parseInt(digits.slice(0, 2), 10);
    let b = Number.parseInt(digits.slice(2, 4), 10);
    if (a > max[0]) a = max[0];
    if (b > max[1]) b = max[1];
    return String(a).padStart(2, "0") + String(b).padStart(2, "0");
  }

  function secDigitsToMinDigits(secDigits) {
    const sec = Number.parseInt(secDigits.slice(0, 2), 10);
    const frac = Number.parseInt(secDigits.slice(2, 4), 10);
    const totalSec = Math.min(59.99, sec + frac / 100);
    const mm = Math.min(59, Math.floor(totalSec / 60));
    const ss = Math.min(59, Math.floor(totalSec % 60));
    return String(mm).padStart(2, "0") + String(ss).padStart(2, "0");
  }

  function minDigitsToSecDigits(minDigits) {
    const mm = Number.parseInt(minDigits.slice(0, 2), 10);
    const ss = Number.parseInt(minDigits.slice(2, 4), 10);
    const totalSec = Math.min(59.99, mm * 60 + ss);
    const whole = Math.min(59, Math.floor(totalSec));
    const frac = Math.min(99, Math.round((totalSec - whole) * 100));
    return String(whole).padStart(2, "0") + String(frac).padStart(2, "0");
  }

  function syncInputPresentation(input, digits, unit) {
    const clamped = clampDigits(digits, unit);
    input.dataset.digits = clamped;
    input.value = formatDigits(clamped);
    input.classList.toggle("is-rest", isRestValue(clamped));
    return clamped;
  }

  function bindTimeField(wrapper) {
    const input = wrapper.querySelector(".time-mask-input");
    const segment = wrapper.querySelector(".unit-segment");
    if (!input || !segment) return;

    let unit = getActiveUnit(segment);
    syncInputPresentation(input, extractDigits(input.value), unit);

    function applyDigits(rawDigits) {
      syncInputPresentation(input, rawDigits, unit);
    }

    function handleTypedValue(raw) {
      const digits = extractDigits(raw);
      applyDigits(digits);
    }

    input.addEventListener("input", () => {
      handleTypedValue(input.value);
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
        return;
      }
      if (event.key === "." || event.key === ",") {
        event.preventDefault();
        return;
      }
      if (event.key.length === 1 && /\d/.test(event.key)) {
        event.preventDefault();
        const current = extractDigits(input.dataset.digits || input.value);
        const next = (current + event.key).slice(-4);
        applyDigits(next);
        return;
      }
      event.preventDefault();
    });

    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = extractDigits(event.clipboardData?.getData("text"));
      if (!pasted) return;
      applyDigits(pasted);
    });

    input.addEventListener("blur", () => {
      applyDigits(input.dataset.digits || input.value);
    });

    segment.querySelectorAll(".unit-segment__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("is-active")) return;

        segment.querySelectorAll(".unit-segment__btn").forEach((el) => {
          el.classList.toggle("is-active", el === btn);
        });

        const prevUnit = unit;
        const nextUnit = btn.dataset.unit === "min" ? "min" : "sec";
        const currentDigits = extractDigits(input.dataset.digits || input.value);

        let converted = currentDigits;
        if (prevUnit === "sec" && nextUnit === "min") {
          converted = secDigitsToMinDigits(currentDigits);
        } else if (prevUnit === "min" && nextUnit === "sec") {
          converted = minDigitsToSecDigits(currentDigits);
        }

        unit = nextUnit;
        applyDigits(converted);
      });
    });
  }

  document.querySelectorAll("[data-time-field]").forEach(bindTimeField);
})();
