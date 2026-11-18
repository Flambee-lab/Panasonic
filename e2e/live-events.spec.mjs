import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:5174";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) {
    errors.push(`${response.status()} ${response.url()}`);
  }
});

async function geometry() {
  return page.evaluate(() => {
    const viewport = document.querySelector(".le-table-viewport");
    const headers = [...document.querySelectorAll('[role="columnheader"]')];
    const row = document.querySelector(".le-event-row");
    const rect = (node) => ({ x: node.getBoundingClientRect().x, width: node.getBoundingClientRect().width });
    return {
      viewport: viewport.clientWidth,
      content: viewport.scrollWidth,
      document: document.documentElement.scrollWidth,
      screen: innerWidth,
      header: headers.map(rect),
      cells: [...row.children].map(rect),
      comment: rect(row.querySelector("textarea")),
      headerTop: document.querySelector(".le-table-header").getBoundingClientRect().top,
    };
  });
}

function aligned(layout) {
  layout.header.forEach((header, index) => {
    assert.ok(Math.abs(header.x - layout.cells[index].x) < 0.1, `Column ${index} left edge`);
    assert.ok(Math.abs(header.width - layout.cells[index].width) < 0.1, `Column ${index} width`);
  });
  assert.ok(Math.abs(layout.comment.x - layout.header[7].x) < 0.1, "Comment input left edge");
  assert.ok(Math.abs(layout.comment.width - layout.header[7].width) < 0.1, "Comment input width");
}

try {
  for (const width of [1366, 1512, 1920, 1365, 1200, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/live-events`);
    await page.evaluate(() => document.fonts.ready);
    const layout = await geometry();
    aligned(layout);
    assert.equal(layout.document, width, "The page itself must not scroll horizontally");
    if (width >= 1366) assert.equal(layout.content, layout.viewport, "No horizontal table scroll at desktop widths");
    else {
      assert.equal(layout.content, 1110, "Original column minimums remain intact");
      assert.ok(layout.content > layout.viewport, "Only the table overflows");
      await page.locator(".le-table-viewport").evaluate((node) => { node.scrollLeft = 120; });
      const scrolled = await geometry();
      aligned(scrolled);
      assert.ok(scrolled.header[0].x < layout.header[0].x, "Header and rows move horizontally together");
    }
    console.log(`✓ Shared grid and overflow at ${width}px`);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${base}/live-events`);
  const comment = page.getByRole("textbox", { name: "Comment for event-1", exact: true });
  await comment.fill("Vehicle checked");
  await page.getByRole("button", { name: "Sort by date and time" }).click();
  await page.locator(".le-table-viewport").evaluate((node) => { node.scrollTop = node.scrollHeight; });
  assert.equal(await comment.inputValue(), "Vehicle checked", "Comment remains attached to the same event after sorting");
  const sticky = await geometry();
  assert.equal(Math.round(sticky.headerTop), 88, "Header stays visible during vertical scroll");
  await page.getByRole("button", { name: "Actions for event-1", exact: true }).click();
  await page.getByRole("menuitem", { name: "Mark as read" }).click();
  assert.equal(await page.locator('[data-event-id="event-1"] .le-status').innerText(), "Read");
  console.log("✓ Comments survive sorting; sticky header and event actions work");

  await page.getByRole("switch", { name: "Sound", exact: true }).click();
  assert.equal(await page.locator(".le-event-row").count(), 12, "Filters are staged until Apply");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  assert.equal(await page.locator(".le-event-row").count(), 0);
  assert.ok(await page.getByText("No events match these filters.", { exact: false }).isVisible());
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  assert.equal(await page.locator(".le-event-row").count(), 12);
  assert.equal(await comment.inputValue(), "Vehicle checked", "Comment survives clearing filters");
  await page.getByRole("tab", { name: "Past events", exact: true }).click();
  assert.ok((await page.locator(".le-event-row").first().innerText()).includes("7/7/24"));
  await page.getByRole("tab", { name: "Live events", exact: true }).click();
  console.log("✓ Apply/Clear filters, empty state, and event tabs");

  await page.locator(".le-table-viewport").evaluate((node) => { node.scrollTop = 0; });
  await page.getByRole("button", { name: "Preview detection event-12", exact: true }).click();
  assert.ok(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").isVisible(), false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  assert.ok(await page.getByRole("menuitem", { name: "Alarm rules", exact: true }).isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("menu").count(), 0);
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  assert.equal(await page.locator(".le-tip").count(), 0);
  const brokenImages = await page.locator("img").evaluateAll((nodes) => nodes.filter((node) => !node.complete || !node.naturalWidth).map((node) => node.src));
  assert.deepEqual(brokenImages, []);
  assert.deepEqual(errors, []);
  console.log("✓ Preview, menu, dismissible hint, local assets, and browser runtime");
} finally {
  await browser.close();
}
