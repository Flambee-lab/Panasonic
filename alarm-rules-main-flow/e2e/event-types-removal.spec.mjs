import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const sheet = page.locator('.event-sheet__panel');
const summary = page.locator('#alarm-section-events');
async function save() {
  assert.ok(await sheet.getByRole('button', { name: 'Save event types', exact: true }).isEnabled());
  await sheet.getByRole('button', { name: 'Save event types', exact: true }).click();
  await sheet.waitFor({ state: 'detached' });
}
async function addPeople() {
  await page.getByRole('button', { name: /Add event types/ }).click();
  await sheet.getByRole('button', { name: /^(Add|Edit) Registered people detection$/, exact: true }).click();
  await sheet.getByRole('button', { name: 'Mateo Ruiz', exact: true }).click();
  await sheet.getByRole('button', { name: 'Sofia Nguyen', exact: true }).click();
  await sheet.getByRole('button', { name: 'Add 2 people', exact: true }).click();
  const added = sheet.locator('.people-applied.is-recent');
  await added.waitFor();
  await page.waitForFunction(() => !document.querySelector('.event-sheet__panel').inert);
  await page.waitForTimeout(80);
  assert.notEqual(await added.evaluate(n => getComputedStyle(n).boxShadow), 'none');
  await added.waitFor({ state: 'detached' });
  assert.equal(await sheet.locator('.people-applied').count(), 1);
  await save();
}
try {
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5175'}/alarm-rules`);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Alarm rules', exact: true }).click();
  await page.getByRole('button', { name: 'New Alarm Rule', exact: true }).click();
  await addPeople();
  await summary.getByRole('button', { name: 'Edit event types', exact: true }).click();
  await sheet.getByRole('button', { name: 'Remove Mateo Ruiz', exact: true }).click();
  await save();
  assert.equal(await summary.locator('.alarm-rule__applied-chips').innerText(), 'Sofia Nguyen');
  await summary.getByRole('button', { name: 'Edit event types', exact: true }).click();
  await sheet.getByRole('button', { name: 'Remove Sofia Nguyen', exact: true }).click();
  await save();
  assert.ok(await summary.getByRole('button', { name: /Add event types/ }).isVisible());
  await page.reload();
  assert.ok(await summary.getByRole('button', { name: /Add event types/ }).isVisible());
  console.log('✓ Removing one or all people saves and persists the empty Summary state');
  await addPeople();
  await summary.getByRole('button', { name: 'Edit event types', exact: true }).click();
  await sheet.getByRole('button', { name: /^(Add|Edit) Registered people detection$/, exact: true }).click();
  await sheet.getByRole('button', { name: 'Mateo Ruiz', exact: true }).click();
  await sheet.getByRole('button', { name: 'Sofia Nguyen', exact: true }).click();
  await sheet.getByRole('button', { name: 'Save changes', exact: true }).click();
  await save();
  assert.ok(await summary.getByRole('button', { name: /Add event types/ }).isVisible());
  assert.deepEqual(errors, []);
  console.log('✓ Clearing the people picker also saves an empty selection');
} finally {
  await browser.close();
}
