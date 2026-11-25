import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1728, height: 966 } });
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));

function timeField(label, index = 1) {
  return page.getByRole('group', { name: `Time range ${index}`, exact: true })
    .getByRole('group', { name: label, exact: true });
}

async function fillTime(field, value) {
  const [hours, minutes] = value.split(':').map(Number);
  await field.getByLabel(/^(Start|End) time hour$/, { exact: true }).fill(String(hours % 12 || 12));
  await field.getByLabel(/^(Start|End) time minute$/, { exact: true }).fill(String(minutes).padStart(2, '0'));
  await field.getByRole('button', { name: hours >= 12 ? 'PM' : 'AM', exact: true }).click();
}

async function timeValue(field) {
  const hour = await field.getByLabel(/^(Start|End) time hour$/, { exact: true }).inputValue();
  const minute = await field.getByLabel(/^(Start|End) time minute$/, { exact: true }).inputValue();
  if (hour === '' || minute === '') return '';
  const period = await field.getByRole('button', { pressed: true }).innerText();
  return `${String(Number(hour) % 12 + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

async function clearSegment(input) {
  await input.selectText();
  await input.press('Backspace');
}

async function waitForSheet() {
  await page.waitForFunction(() => {
    const panel = document.querySelector('.exception-sheet__panel');
    return panel && !panel.inert;
  });
}

try {
  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:5175') + '/alarm-rules');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Alarm rules', exact: true }).click();
  await page.getByRole('button', { name: 'New Alarm Rule', exact: true }).click();
  await page.getByRole('button', { name: /Add exceptions/ }).click();
  await page.getByRole('button', { name: 'New exception', exact: true }).click();
  await waitForSheet();

  const name = page.getByRole('textbox', { name: 'Exception name', exact: true });
  const start = timeField('Start time');
  const end = timeField('End time');
  const startHour = start.getByLabel('Start time hour', { exact: true });
  const startMinute = start.getByLabel('Start time minute', { exact: true });
  const save = page.getByRole('button', { name: 'Save Exception', exact: true });
  const errors = page.locator('.exception-new__range-error');
  const hoursTitle = page.getByRole('heading', { name: 'Different hours', exact: true });

  assert.equal(await page.getByRole('radiogroup', { name: 'Exception type', exact: true }).count(), 0);
  assert.equal(await page.getByRole('radio', { name: /Like another day|Another schedule/ }).count(), 0);
  assert.ok(await page.getByRole('heading', { name: '3. Exception type', exact: true }).isVisible());
  const typography = (locator) => locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
  });
  assert.deepEqual(await typography(hoursTitle), { size: '14px', weight: '500', lineHeight: '21px' });
  assert.deepEqual(await typography(hoursTitle), await typography(page.locator('.exception-new__month p')));
  assert.ok((await hoursTitle.boundingBox()).y < (await page.getByText(/^Adjust hours to display alarms during/).boundingBox()).y);

  await name.fill('Overnight hours');
  await page.getByRole('button', { name: 'November 20, 2026', exact: true }).click();
  await fillTime(start, '10:37');

  // Clearing hours must retain minutes across the parent's empty-value echo.
  await clearSegment(startHour);
  assert.equal(await startHour.inputValue(), '');
  assert.equal(await startMinute.inputValue(), '37');
  assert.equal(await timeValue(start), '');
  assert.equal(await errors.count(), 0);
  assert.notEqual(await startHour.getAttribute('aria-invalid'), 'true');
  assert.ok(await save.isDisabled());
  await startHour.press('1');
  await startHour.press('1');
  assert.equal(await timeValue(start), '11:37');

  await clearSegment(startMinute);
  assert.equal(await startMinute.inputValue(), '');
  assert.equal(await startHour.inputValue(), '11');
  assert.equal(await timeValue(start), '');
  await startMinute.press('4');
  await startMinute.press('2');
  assert.equal(await timeValue(start), '11:42');
  await startMinute.press('ArrowUp');
  assert.equal(await timeValue(start), '11:43');
  await startMinute.press('ArrowDown');
  assert.equal(await timeValue(start), '11:42');

  // Incomplete rows stay quiet while editing and show actionable errors on blur.
  await clearSegment(startHour);
  assert.equal(await errors.count(), 0);
  await name.focus();
  await page.getByText('Enter a start time.', { exact: true }).waitFor();
  assert.equal(await startHour.getAttribute('aria-invalid'), 'true');
  assert.equal(await startMinute.getAttribute('aria-invalid'), 'true');
  assert.ok(await save.isDisabled());
  // Restoring the last valid hour must also synchronize the parent's draft.
  await startHour.fill('11');
  await name.focus();
  assert.equal(await timeValue(start), '11:42');
  assert.equal(await errors.count(), 0);
  assert.ok(await save.isEnabled());
  await fillTime(start, '10:00');
  await fillTime(end, '12:00');
  await name.focus();
  assert.equal(await errors.count(), 0);
  assert.ok(await save.isEnabled());

  await fillTime(end, '10:00');
  assert.equal(await errors.count(), 0);
  assert.ok(await save.isDisabled());
  await startHour.focus();
  assert.equal(await errors.count(), 0, 'Moving between fields in a row is still editing');
  await name.focus();
  await page.getByText('Start and end times must be different.', { exact: true }).waitFor();
  await fillTime(end, '12:00');
  await name.focus();
  assert.equal(await errors.count(), 0);

  await page.getByRole('button', { name: 'Add time range', exact: true }).click();
  const secondStart = timeField('Start time', 2);
  const secondEnd = timeField('End time', 2);
  assert.equal(await timeValue(secondStart), '12:00');
  assert.equal(await timeValue(secondEnd), '13:00');
  assert.ok(await save.isEnabled(), 'Adjacent ranges are valid');
  await fillTime(secondStart, '11:00');
  await name.focus();
  assert.ok(await save.isDisabled());
  assert.ok(await page.getByText('This time range overlaps another time range.', { exact: true }).count() > 0);
  await fillTime(secondStart, '12:00');
  await name.focus();
  assert.equal(await errors.count(), 0);

  // Index keys would reuse the removed row instead of keeping this input.
  const retainedInput = await secondStart.getByLabel('Start time hour', { exact: true }).elementHandle();
  await page.getByRole('button', { name: 'Remove time range', exact: true }).first().click();
  assert.equal(await retainedInput.evaluate((node) => node.isConnected && node.value === '12'), true);
  assert.equal(await timeValue(start), '12:00');
  assert.equal(await timeValue(end), '13:00');
  await page.getByRole('button', { name: 'Remove time range', exact: true }).click();
  assert.ok(await page.getByText('Add a time range for these dates.', { exact: true }).isVisible());
  assert.equal(await errors.count(), 0);
  assert.ok(await save.isDisabled());

  await page.getByRole('button', { name: 'Add time range', exact: true }).click();
  await fillTime(start, '22:00');
  await fillTime(end, '02:00');
  await name.focus();
  assert.ok(await page.getByText('Ends the next day', { exact: true }).isVisible());
  assert.ok(await save.isEnabled());
  await save.click();
  await page.getByRole('heading', { name: 'Exceptions (1)', exact: true }).waitFor();
  await waitForSheet();
  assert.ok(await page.locator('.exception-list__hours').getByText('10:00 PM–2:00 AM (next day)', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Edit Overnight hours', exact: true }).click();
  await waitForSheet();
  assert.equal(await timeValue(start), '22:00');
  assert.equal(await timeValue(end), '02:00');
  assert.ok(await page.getByText('Ends the next day', { exact: true }).isVisible());
  assert.ok(await save.isEnabled());
  assert.deepEqual(runtimeErrors, []);
  console.log('✓ Hours-only UI, calendar typography, partial edits, blur validation, stable rows, overlap and overnight roundtrip');
} finally {
  await browser.close();
}
