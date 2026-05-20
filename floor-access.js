(function initFloorAccessPreview() {
  const preview = document.getElementById("floorPreview");
  const body = document.getElementById("floorPreviewBody");
  const floorCountInput = document.getElementById("floorCount");
  const firstFloorOutInput = document.getElementById("firstFloorOut");
  const floorTrackingInInput = document.getElementById("floorTrackingIn");
  const floorTrackingToggle = document.getElementById("floorTrackingToggle");

  if (
    !preview ||
    !body ||
    !floorCountInput ||
    !firstFloorOutInput ||
    !floorTrackingInInput
  ) {
    return;
  }

  const floorInputs = [floorCountInput, firstFloorOutInput, floorTrackingInInput];

  function sanitizeNumericInputValue(raw) {
    return String(raw ?? "").replace(/\D/g, "");
  }

  function parseNumericFieldValue(input) {
    if (!input || input.disabled) return null;
    const digits = sanitizeNumericInputValue(input.value);
    if (!digits) return null;
    return Number.parseInt(digits, 10);
  }

  function hasFloorAccessInputValue() {
    return floorInputs.some((input) => {
      if (input.disabled) return false;
      return sanitizeNumericInputValue(input.value).length > 0;
    });
  }

  function getPreviewFloorIndices(total) {
    const count = Math.max(0, Math.floor(total));
    if (count <= 0) return [];
    if (count <= 4) {
      return Array.from({ length: count }, (_, index) => index + 1);
    }
    return [1, 2, "ellipsis", count - 1, count];
  }

  function renderFloorPreviewRow(floorIndex, startOut, startIn, showInputs) {
    const row = document.createElement("div");
    row.className = "floor-preview__row";
    row.setAttribute("role", "row");

    const isEllipsis = floorIndex === "ellipsis";
    const floorLabel = isEllipsis ? "..." : String(floorIndex);
    const outputLabel = isEllipsis ? "..." : String(startOut + (floorIndex - 1));
    const inputLabel = isEllipsis ? "..." : String(startIn + (floorIndex - 1));

    row.innerHTML = `
      <p class="floor-preview__cell${isEllipsis ? " floor-preview__cell--ellipsis" : ""}">${floorLabel}</p>
      <span class="floor-preview__arrow" aria-hidden="true">→</span>
      <p class="floor-preview__cell${isEllipsis ? " floor-preview__cell--ellipsis" : ""}">${outputLabel}</p>
      <span class="floor-preview__arrow floor-preview__arrow--inputs" aria-hidden="true">→</span>
      <p class="floor-preview__cell floor-preview__cell--inputs${isEllipsis ? " floor-preview__cell--ellipsis" : ""}">${inputLabel}</p>
    `;

    if (!showInputs) {
      row.querySelector(".floor-preview__arrow--inputs")?.remove();
      row.querySelector(".floor-preview__cell--inputs")?.remove();
    }

    return row;
  }

  function setPreviewVisible(visible) {
    preview.classList.toggle("is-visible", visible);
    preview.style.display = visible ? "flex" : "none";
    preview.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function renderFloorPreview() {
    const showPreview = hasFloorAccessInputValue();
    setPreviewVisible(showPreview);

    if (!showPreview) {
      body.replaceChildren();
      return;
    }

    const parsedFloorCount = parseNumericFieldValue(floorCountInput);
    const floorCount =
      parsedFloorCount != null && parsedFloorCount > 0 ? parsedFloorCount : 1;
    const startOut = parseNumericFieldValue(firstFloorOutInput) ?? 0;
    const startIn = parseNumericFieldValue(floorTrackingInInput) ?? 0;
    const showInputs = Boolean(floorTrackingToggle?.checked);

    preview.classList.toggle("floor-preview--with-inputs", showInputs);
    body.replaceChildren();

    getPreviewFloorIndices(floorCount).forEach((floorIndex) => {
      body.appendChild(renderFloorPreviewRow(floorIndex, startOut, startIn, showInputs));
    });
  }

  function handleFloorAccessInput(input) {
    const sanitized = sanitizeNumericInputValue(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
    renderFloorPreview();
  }

  function bindFloorInput(input) {
    const onUpdate = () => handleFloorAccessInput(input);
    input.addEventListener("input", onUpdate);
    input.addEventListener("change", onUpdate);
    input.addEventListener("keyup", onUpdate);
    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = sanitizeNumericInputValue(event.clipboardData?.getData("text"));
      if (!pasted) return;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, start) + pasted + input.value.slice(end);
      const caret = start + pasted.length;
      input.setSelectionRange(caret, caret);
      onUpdate();
    });
  }

  floorInputs.forEach(bindFloorInput);

  if (floorTrackingToggle) {
    floorTrackingToggle.addEventListener("change", () => {
      floorTrackingInInput.disabled = !floorTrackingToggle.checked;
      floorTrackingInInput.style.opacity = floorTrackingToggle.checked ? "1" : "0.45";
      renderFloorPreview();
    });
    floorTrackingInInput.disabled = !floorTrackingToggle.checked;
    floorTrackingInInput.style.opacity = floorTrackingToggle.checked ? "1" : "0.45";
  }

  renderFloorPreview();
})();
