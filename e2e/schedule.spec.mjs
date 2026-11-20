import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://localhost:5175';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const bars = page.locator('.schedule-sheet__bar');
const dialog = page.locator('.range-dialog__panel');
const rowRanges = index => bars.nth(index).locator('.is-range');
async function values(index) {
  return rowRanges(index).evaluateAll(nodes => nodes.map(n => [+n.dataset.start, +n.dataset.end]).sort((a,b) => a[0]-b[0]));
}
async function clickTime(index, minutes) {
  const b = await bars.nth(index).boundingBox();
  await page.mouse.click(b.x + b.width * minutes / 1440, b.y + b.height / 2);
  await dialog.waitFor();
}
async function dragTime(index, start, end, confirm = true) {
  const b = await bars.nth(index).boundingBox();
  await page.mouse.move(b.x + b.width * start / 1440, b.y + b.height/2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * end / 1440, b.y + b.height/2, { steps: 15 });
  await page.mouse.up();
  await dialog.waitFor();
  assert.equal(await dialog.locator('h2').innerText(), 'New time range');
  const focus = await page.evaluate(() => ({label:document.activeElement.getAttribute('aria-label'),start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd}));
  assert.deepEqual(focus,{label:'End time minute',start:0,end:2});
  if (confirm) await dialog.getByRole('button',{name:'Add new time range',exact:true}).click();
}
async function timeFields(startHour, endHour, startPeriod='AM', endPeriod='PM') {
  await dialog.getByRole('textbox', { name: 'Start time hour', exact: true }).fill(String(startHour));
  await dialog.getByRole('textbox', { name: 'Start time minute', exact: true }).fill('00');
  await dialog.getByRole('textbox', { name: 'End time hour', exact: true }).fill(String(endHour));
  await dialog.getByRole('textbox', { name: 'End time minute', exact: true }).fill('00');
  await dialog.locator('.range-dialog__field').nth(0).getByRole('button', {name:startPeriod,exact:true}).click();
  await dialog.locator('.range-dialog__field').nth(1).getByRole('button', {name:endPeriod,exact:true}).click();
}
async function days(names) {
  for(const name of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) {
    const button = dialog.getByRole('button', {name,exact:true});
    if ((await button.getAttribute('aria-pressed') === 'true') !== names.includes(name)) await button.click();
  }
}
async function expectRanges(index, expected) {
  await page.waitForFunction(({index,expected}) => {
    const bar = document.querySelectorAll('.schedule-sheet__bar')[index];
    const actual = [...bar.querySelectorAll('.is-range')].map(n => [+n.dataset.start,+n.dataset.end]).sort((a,b)=>a[0]-b[0]);
    return JSON.stringify(actual) === JSON.stringify(expected);
  }, {index,expected});
}
try {
  await page.goto(`${base}/alarm-rules`);
  await page.getByRole('button', {name:'Settings',exact:true}).click();
  await page.getByRole('menuitem', {name:'Alarm rules',exact:true}).click();
  await page.getByRole('button', {name:'New Alarm Rule',exact:true}).click();
  await page.getByRole('button', {name:/Add schedule/}).click();
  await page.getByRole('heading', {name:'Schedule dates and time',exact:true}).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);
  const panel = await page.locator('.schedule-sheet__panel').boundingBox();
  assert.ok(panel.y >= 48, "Schedule respects its maximum height and hugs shorter content");
  assert.equal(await page.locator(".schedule-sheet__body").evaluate(n => getComputedStyle(n).paddingBottom), "64px");
  assert.equal(await page.locator('.schedule-sheet__header .schedule-sheet__zone').count(),0);
  assert.equal(await page.locator('.schedule-sheet__summary .schedule-sheet__zone').count(),1);
  assert.equal(await page.locator('.schedule-sheet__tool:disabled').count(),14);
  await page.screenshot({ path:'/tmp/panasonic-schedule-empty.png' });

  // A click far away from the + label still opens creation.
  await clickTime(0,1000);
  await timeFields(11,12,'AM','PM');
  const startHour = dialog.getByRole('textbox',{name:'Start time hour',exact:true});
  const startMinute = dialog.getByRole('textbox',{name:'Start time minute',exact:true});
  const startField = dialog.locator('.range-dialog__field').first();
  await startHour.press('ArrowUp');
  assert.equal(await startHour.inputValue(),'12');
  assert.equal(await startField.getByRole('button',{name:'PM',exact:true}).getAttribute('aria-pressed'),'true');
  await startHour.press('ArrowDown');
  assert.equal(await startHour.inputValue(),'11');
  assert.equal(await startField.getByRole('button',{name:'AM',exact:true}).getAttribute('aria-pressed'),'true');
  await startMinute.fill('59');
  await startMinute.press('ArrowUp');
  assert.equal(await startMinute.inputValue(),'00');
  assert.equal(await startHour.inputValue(),'12');
  assert.equal(await startField.getByRole('button',{name:'PM',exact:true}).getAttribute('aria-pressed'),'true');
  await startMinute.press('ArrowDown');
  assert.equal(await startMinute.inputValue(),'59');
  assert.equal(await startHour.inputValue(),'11');
  await timeFields(12,12,'AM','PM');
  await startMinute.press('ArrowDown');
  assert.equal(await startHour.inputValue(),'11');
  assert.equal(await startMinute.inputValue(),'59');
  assert.equal(await startField.getByRole('button',{name:'PM',exact:true}).getAttribute('aria-pressed'),'true');
  const endMinute = dialog.getByRole('textbox',{name:'End time minute',exact:true});
  await endMinute.press('ArrowUp');
  assert.equal(await endMinute.inputValue(),'01');
  await endMinute.press('ArrowDown');
  assert.equal(await endMinute.inputValue(),'00');
  await timeFields(10,12);
  console.log('✓ Typed times and keyboard arrows, including hour/minute carry and AM/PM transitions');
  await days(['Mon','Tue']);
  await dialog.getByRole('button',{name:'Add new time range',exact:true}).click();
  await expectRanges(0,[[600,720]]);
  await expectRanges(1,[[600,720]]);
  await page.waitForFunction(() => document.querySelectorAll('.schedule-sheet__segment.is-recent').length === 2);
  await page.screenshot({path:'/tmp/panasonic-schedule-added-highlight.png'});
  await page.waitForFunction(() => document.querySelectorAll('.schedule-sheet__segment.is-recent').length === 0);
  console.log('✓ New ranges briefly highlight on each selected day and return to their normal state');
  await clickTime(0,850);
  await timeFields(2,4,'PM','PM');
  await days(['Mon','Tue']);
  await dialog.getByRole('button',{name:'Add new time range',exact:true}).click();
  await expectRanges(0,[[600,720],[840,960]]);
  console.log('✓ Click anywhere creates a range; selected days receive it');

  await clickTime(0,650);
  assert.equal(await dialog.locator('h2').innerText(),'Edit time range');
  await days(['Tue']);
  await dialog.getByRole('button',{name:'Remove',exact:true}).click();
  await expectRanges(0,[[600,720],[840,960]]);
  await expectRanges(1,[[840,960]]);
  console.log('✓ Remove affects only matching range on selected days');

  // Drag proposes hours in the dialog; cancel must preserve existing ranges.
  await dragTime(0,540,660,false);
  assert.equal(await dialog.getByRole('textbox',{name:'Start time hour',exact:true}).inputValue(),'9');
  assert.equal(await dialog.getByRole('textbox',{name:'End time hour',exact:true}).inputValue(),'11');
  await expectRanges(0,[[600,720],[840,960]]);
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await expectRanges(0,[[600,720],[840,960]]);
  const rest = await bars.nth(0).locator('.is-gap').first().evaluate(n => ({radius:getComputedStyle(n).borderRadius,plus:!!n.querySelector('img.schedule-sheet__idle-plus')}));
  assert.deepEqual(rest,{radius:'4px',plus:true});
  await page.mouse.move(50,130);
  await page.screenshot({path:'/tmp/panasonic-schedule-rest-variants.png'});
  const gap=await bars.nth(0).locator('.is-gap').nth(1).boundingBox();
  await page.mouse.move(gap.x+gap.width/2,gap.y+gap.height/2);
  await bars.nth(0).locator('.is-gap.is-hot img').waitFor();
  await page.screenshot({path:'/tmp/panasonic-schedule-gap-variants.png'});
  console.log('✓ Drag opens prefilled dialog with selected end field; cancel keeps hours; rounded gaps and rest/hover +');
  // Drag ends on the old range: new interval replaces only overlap on confirmation.
  await dragTime(0,540,660);
  await expectRanges(0,[[540,660],[660,720],[840,960]]);
  assert.equal(await dialog.count(),0);
  assert.equal(await page.getByText('This time is already set',{exact:true}).count(),0);
  // Drag inside a range splits and preserves both sides, in reverse direction too.
  await dragTime(0,630,570);
  await expectRanges(0,[[540,570],[570,630],[630,660],[660,720],[840,960]]);
  console.log('✓ Drag overlap is automatic, preserving both sides and supporting reverse drag');

  await clickTime(1,900);
  await timeFields(3,5,'PM','PM');
  await days(['Tue']);
  await dialog.getByRole('button',{name:'Save',exact:true}).click();
  await expectRanges(1,[[900,1020]]);
  // Validation, midnight boundary, and keyboard creation.
  await bars.nth(2).focus();
  await page.keyboard.press('Enter');
  await timeFields(11,12,'PM','AM');
  await days([]);
  assert.ok(await dialog.getByRole('button',{name:'Add new time range',exact:true}).isDisabled());
  await days(['Wed']);
  await dialog.getByRole('button',{name:'Add new time range',exact:true}).click();
  await expectRanges(2,[[1380,1440]]);
  const last = await rowRanges(2).boundingBox();
  assert.ok(last.width > 1,'Last hour must be visible');
  await clickTime(2,1410);
  assert.equal(await dialog.getByRole('textbox',{name:'End time hour',exact:true}).inputValue(),'12');
  await timeFields(11,10,'PM','PM');
  assert.ok(await dialog.getByRole('button',{name:'Save',exact:true}).isDisabled());
  await dialog.locator('.range-dialog__close').click();
  console.log('✓ Edit, day/time validation, midnight, last hour, keyboard interaction');

  await page.reload();
  await bars.nth(0).waitFor();
  await expectRanges(1,[[900,1020]]);
  await page.getByRole('button',{name:'Repeat Tuesday weekly',exact:true}).click();
  for(const name of ['Monday','Wednesday','Thursday','Friday','Saturday','Sunday']) await page.locator('.schedule-sheet__copy').getByRole('button',{name,exact:true}).click();
  await page.locator('.schedule-sheet__copy').getByRole('button',{name:'Apply',exact:true}).click();
  for(let i=0;i<7;i++) await expectRanges(i,[[900,1020]]);
  await clickTime(0,950);
  await days(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
  await dialog.getByRole('button',{name:'Remove',exact:true}).click();
  for(let i=0;i<7;i++) await expectRanges(i,[]);
  await page.getByRole('button',{name:'Save time ranges',exact:true}).click();
  await page.getByText('Alarms would show at all times',{exact:true}).waitFor();
  console.log('✓ Reload, copy to all days, remove matching range across week, empty-schedule warning');
  await page.keyboard.press('Escape');
  assert.ok(await page.getByRole('heading',{name:'Schedule dates and time',exact:true}).isVisible());
  await dragTime(6,1380,1440);
  await expectRanges(6,[[1380,1440]]);
  await page.locator('.schedule-sheet__zone-btn').click();
  await page.locator('.schedule-sheet__zone-menu').getByRole('button',{name:'(UTC-03:00) Buenos Aires',exact:true}).click();
  await expectRanges(6,[]);
  await expectRanges(0,[[240,300]]);
  await clickTime(0,270);
  console.log('Edit dialog height:', Math.round((await dialog.boundingBox()).height));
  await page.screenshot({path:'/tmp/panasonic-schedule-edit.png'});
  const images = await page.locator('.schedule-sheet img').evaluateAll(nodes => nodes.filter(n => !n.complete || !n.naturalWidth).map(n => n.src));
  assert.deepEqual(images,[]);
  await dialog.locator('.range-dialog__close').click();
  await page.getByRole('button',{name:'Save time ranges',exact:true}).click();
  await page.getByRole('button',{name:'Edit schedules',exact:false}).click();
  await expectRanges(0,[[240,300]]);
  console.log('✓ Zone changes carry across days and Sunday/Monday; save/reopen preserves schedule; local assets load');
  await page.getByRole('button',{name:'Remove all Monday time ranges',exact:true}).click();
  await page.getByText("Remove Monday's hours?",{exact:true}).waitFor();
  await page.getByRole('button',{name:'Keep them',exact:true}).click();
  await expectRanges(0,[[240,300]]);
  await page.getByRole('button',{name:'Remove all Monday time ranges',exact:true}).click();
  await page.getByRole('button',{name:'Remove hours',exact:true}).click();
  await expectRanges(0,[]);
  await page.getByRole('button',{name:'Save time ranges',exact:true}).click();
  await page.getByRole('button',{name:'Save as always on',exact:true}).click();
  await page.getByRole('button',{name:'Edit schedules',exact:false}).click();
  await expectRanges(0,[]);
  console.log('✓ Bulk clear requires confirmation and empty schedule can be saved explicitly');
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
}
