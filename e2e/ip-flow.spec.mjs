import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:5173";

/** Tiempo hasta fase éxito: n×stagger + write + padding */
function processingMs(cameraCount) {
  return cameraCount * 1100 + 950 + 800 + 500;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function gotoDashboard(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.click("#skipToDashboardBtn");
  await page.waitForSelector("#mainScreen:not(.hidden)", { timeout: 5000 });
}

function changeIpBtn(page) {
  return page.locator('button.pill-action:has-text("Change IP")');
}

function conflictRows(page) {
  return page.locator("tbody tr.device-row--conflict");
}

function onlineRows(page) {
  return page.locator('tbody tr:not(.device-row--conflict):has(.tech-status-badge--ok)');
}

async function runDrawerToFinish(page, { baseIp = "192.168.0.30", cameraCount } = {}) {
  const count =
    cameraCount ?? (await page.locator(".ip-drawer-list-item").count());
  await page.locator("#base-ip").fill(baseIp);
  await page.click('button:has-text("Aplicar cambios")');
  await page.waitForSelector(".proc-meter", { timeout: 2000 });
  await page.waitForSelector(".ip-drawer-success__title", {
    timeout: processingMs(count),
  });
  await page.click('button:has-text("Finalizar y volver al Dashboard")');
  await page.waitForSelector(".ip-drawer-panel.is-closed", { timeout: 3000 });
}

async function testUiOperativeRows(page) {
  const onlineCount = await onlineRows(page).count();
  assert(onlineCount >= 1, "Debe haber filas operativas");

  const onlineClassCount = await page.locator("tbody tr.device-row--online").count();
  assert(onlineClassCount === 0, "Filas operativas no deben usar device-row--online");

  const styles = await page.evaluate(() => {
    const conflict = document.querySelector("tbody tr.device-row--conflict");
    const operative = document.querySelector(
      "tbody tr:not(.device-row--conflict) .tech-status-badge--ok"
    )?.closest("tr");
    if (!conflict || !operative) return null;
    const cs = (el) => getComputedStyle(el);
    const badge = operative.querySelector(".tech-status-badge--ok");
    return {
      conflictBg: cs(conflict).backgroundColor,
      operativeBg: cs(operative).backgroundColor,
      badgeBg: badge ? cs(badge).backgroundColor : "",
      badgeBoxShadow: badge ? cs(badge).boxShadow : "",
    };
  });

  assert(styles, "No se pudieron leer estilos de filas");
  assert(
    styles.conflictBg !== styles.operativeBg,
    "Solo filas en conflicto deben tener fondo distinto"
  );
  assert(
    styles.badgeBg === "rgba(0, 0, 0, 0)" || styles.badgeBg === "transparent",
    "Badge operativo no debe tener pastilla de aviso verde"
  );
  assert(
    !styles.badgeBoxShadow.includes("96, 200, 153"),
    "Badge operativo no debe tener glow verde"
  );

  console.log("  ✓ UI: operativas con fondo normal, solo conflicto resaltado");
}

async function testMixedSelection(page) {
  const btn = changeIpBtn(page);
  assert(await btn.isDisabled(), "Change IP deshabilitado sin selección");

  const online = onlineRows(page).first();
  await online.locator("input.check").click();
  assert(await btn.isDisabled(), "Change IP deshabilitado si solo hay operativas seleccionadas");
  await online.locator("input.check").click();

  await conflictRows(page).first().locator("input.check").click();
  await online.locator("input.check").click();
  assert(
    !(await btn.isDisabled()),
    "Change IP habilitado con mezcla operativa + conflicto"
  );

  await conflictRows(page).first().locator("input.check").click();
  await online.locator("input.check").click();
  assert(await btn.isDisabled(), "Change IP deshabilitado tras deseleccionar todo");

  console.log("  ✓ Selección mixta: solo operativas bloquea; con conflicto habilita");
}

async function testBannerCta(page) {
  assert(
    (await page.locator(".dash-alert-banner").count()) === 1,
    "Banner de alerta visible con conflictos"
  );

  await page.click("button.ip-banner-cta");
  await page.waitForSelector(".ip-drawer-panel.is-open", { timeout: 3000 });

  const items = await page.locator(".ip-drawer-list-item").count();
  assert(items === 4, `CTA del banner debe abrir 4 cámaras en conflicto (obtuvo ${items})`);

  await page.click('button:has-text("Cancelar")');
  await page.waitForSelector(".ip-drawer-panel.is-closed", { timeout: 3000 });

  const dupCount = await page.locator('tbody :text("IP Duplicada")').count();
  assert(dupCount === 4, "Cancelar no debe modificar conflictos en tabla");

  console.log("  ✓ CTA banner: abre las 4 en conflicto; cancelar no cambia datos");
}

async function testCloseDrawerWithoutApply(page) {
  await conflictRows(page).first().locator("input.check").click();
  await changeIpBtn(page).click();
  await page.waitForSelector(".ip-drawer-panel.is-open");

  const before = await page.locator(".data-table tbody").innerText();
  assert(before.includes("192.168.0.10"), "IPs duplicadas visibles antes de cancelar");

  await page.click('button:has-text("Cancelar")');
  await page.waitForSelector(".ip-drawer-panel.is-closed");

  const after = await page.locator(".data-table tbody").innerText();
  assert(after === before, "Cancelar en plan no debe alterar la tabla");

  console.log("  ✓ Cerrar drawer en plan sin aplicar: sin cambios en tabla");
}

async function testPartialResolution(page) {
  const conflicts = conflictRows(page);
  await conflicts.nth(0).locator("input.check").click();
  await conflicts.nth(1).locator("input.check").click();

  await changeIpBtn(page).click();
  await page.waitForSelector(".ip-drawer-panel.is-open");

  const items = await page.locator(".ip-drawer-list-item").count();
  assert(items === 2, `Drawer parcial debe listar 2 cámaras (obtuvo ${items})`);

  await runDrawerToFinish(page, { baseIp: "192.168.0.40", cameraCount: 2 });

  assert(
    (await page.locator(".dash-alert-banner").count()) === 1,
    "Banner debe seguir visible si quedan conflictos"
  );

  const dupCount = await page.locator('tbody :text("IP Duplicada")').count();
  assert(dupCount === 2, `Deben quedar 2 en conflicto (obtuvo ${dupCount})`);

  const tableText = await page.locator(".data-table tbody").innerText();
  assert(tableText.includes("192.168.0.40"), "Primera IP resuelta en tabla");
  assert(tableText.includes("192.168.0.41"), "Segunda IP secuencial en tabla");
  assert(tableText.includes("192.168.0.52"), "Operativas intactas");

  const btn = changeIpBtn(page);
  assert(await btn.isDisabled(), "Change IP deshabilitado sin selección tras finalizar");

  await conflictRows(page).first().locator("input.check").click();
  assert(!(await btn.isDisabled()), "Change IP habilitado al seleccionar conflicto restante");

  console.log("  ✓ Resolución parcial: banner, 2 conflictos, Change IP al re-seleccionar");
}

async function testFullResolution(page) {
  await page.locator("thead .check").click();
  await changeIpBtn(page).click();
  await page.waitForSelector(".ip-drawer-panel.is-open");

  const listText = await page.locator(".ip-drawer-list").innerText();
  assert(listText.includes("192.168.0.30") === false, "Lista reactiva al editar IP base");

  await page.locator("#base-ip").fill("192.168.0.30");
  const listAfter = await page.locator(".ip-drawer-list").innerText();
  assert(listAfter.includes("192.168.0.30"), "IPs propuestas reactivas al base IP");

  await runDrawerToFinish(page, { baseIp: "192.168.0.30", cameraCount: 2 });

  assert(
    (await page.locator(".dash-alert-banner").count()) === 0,
    "Sin banner cuando no quedan conflictos"
  );
  if (await page.locator(".content-shell [role='status']").count()) {
    throw new Error("No debe haber banner superior verde tras finalizar");
  }

  const tableText = await page.locator(".data-table tbody").innerText();
  assert(!tableText.includes("IP Duplicada"), "No debe quedar IP Duplicada");
  assert(tableText.includes("192.168.0.52"), "Operativas permanecen");
  assert(await changeIpBtn(page).isDisabled(), "Change IP deshabilitado sin conflictos");

  console.log("  ✓ Resolución total: sin banner, tabla limpia, Change IP off");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const scenarios = [
    { name: "UI filas operativas", fn: testUiOperativeRows },
    { name: "Selección mixta", fn: testMixedSelection },
    { name: "CTA banner", fn: testBannerCta },
    { name: "Cancelar drawer", fn: testCloseDrawerWithoutApply },
    { name: "Resolución parcial", fn: testPartialResolution },
    { name: "Resolución total (restantes)", fn: testFullResolution },
  ];

  try {
    console.log("Ejecutando revisión de flujo IP…\n");

    for (const { name, fn } of scenarios) {
      await gotoDashboard(page);
      console.log(`▸ ${name}`);
      await fn(page);
    }

    console.log("\nOK: todos los pasos del flujo verificados");
  } finally {
    await browser.close();
    if (errors.length) {
      console.error("Errores de consola:", errors);
      process.exit(1);
    }
  }
}

run().catch((e) => {
  console.error("FALLO:", e.message);
  process.exit(1);
});
