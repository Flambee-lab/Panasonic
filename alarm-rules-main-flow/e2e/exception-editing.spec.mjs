import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1728,height:966}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));

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
try {
 await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5175'}/alarm-rules`);
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('menuitem',{name:'Alarm rules',exact:true}).click();await page.getByRole('button',{name:'New Alarm Rule',exact:true}).click();
 await page.getByRole('button',{name:/Add exceptions/}).click();await page.getByRole('button',{name:'New exception',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Exception name');
 await page.getByRole('textbox',{name:'Exception name',exact:true}).fill('Night event');await page.getByRole('button',{name:'November 27, 2026',exact:true}).click();await page.getByRole('button',{name:'Repeat every year',exact:true}).click();
 const start=timeField('Start time'),end=timeField('End time');await fillTime(start,'19:00');await fillTime(end,'06:00');assert.ok(await page.getByText('Ends the next day',{exact:true}).isVisible());
 await fillTime(end,'19:00');assert.ok(await page.getByRole('button',{name:'Save Exception',exact:true}).isDisabled());assert.equal(await page.getByRole('alert').count(),0);await page.getByRole('textbox',{name:'Exception name',exact:true}).focus();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('alert').count(),1);await fillTime(end,'06:00');
 await page.screenshot({path:'/tmp/panasonic-exception-edit-hours.png'});await page.getByRole('button',{name:'Save Exception',exact:true}).click();await page.getByRole('heading',{name:'Exceptions (1)',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.exception-sheet__panel').inert);
 assert.ok(await page.locator('.exception-list__hours').getByText('7:00 PM–6:00 AM (next day)',{exact:true}).isVisible());await page.getByRole('button',{name:'Edit Night event',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.exception-sheet__panel').inert);assert.equal(await timeValue(start),'19:00');assert.equal(await timeValue(end),'06:00');await page.getByRole('button',{name:'Cancel',exact:true}).last().click();await page.getByRole('heading',{name:'Exceptions (1)',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.exception-sheet__panel').inert);await page.getByRole('button',{name:'Save & continue',exact:true}).click();await page.locator('.exception-sheet__panel').waitFor({state:'detached'});
 const row=page.locator('.summary-exceptions__row');assert.ok((await row.innerText()).includes('Does not repeat'));assert.ok((await row.innerText()).includes('(next day)'));const widths=await row.locator(':scope > span').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));assert.ok(Math.max(...widths)/Math.min(...widths)<1.05);await page.screenshot({path:'/tmp/panasonic-exception-summary-confirmed.png'});
 await page.getByRole('button',{name:/Add event types/}).click();await page.getByRole('button',{name: /^(Add|Edit) Registered people detection$/,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.event-sheet__panel').inert);for(const name of ['Nina Alvarez','Omar Haddad','Priya Shah'])await page.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'Add 3 people',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.event-sheet__panel').inert);
 const remove=page.getByRole('button',{name:'Remove all 3',exact:true});assert.ok(await remove.isVisible());assert.equal(await page.locator('.people-applied__chips > :first-child').innerText(),'Remove all 3');assert.equal(await remove.locator('img').count(),0);await page.getByRole('button',{name:'Remove Priya Shah',exact:true}).click();assert.equal(await page.locator('.people-chip--remove-all').count(),0);await page.getByRole('button',{name: /^(Add|Edit) Registered people detection$/,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.event-sheet__panel').inert);await page.getByRole('button',{name:'Priya Shah',exact:true}).click();await page.getByRole('button',{name:'Add 3 people',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.event-sheet__panel').inert);await remove.click();assert.equal(await page.locator('.people-applied').count(),0);await page.getByRole('button',{name:'Save event types',exact:true}).click();await page.locator('.event-sheet__panel').waitFor({state:'detached'});assert.ok(await page.getByRole('button',{name:/Add event types/}).isVisible());assert.deepEqual(errors,[]);
 console.log('✓ Editable hours, overnight, validation, reopen and Summary; Remove all starts at 3, first chip without icon, removal saves');
} finally {await browser.close();}
