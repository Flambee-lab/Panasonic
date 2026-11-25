import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL || 'http://localhost:5175';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const nav=page.getByRole('navigation',{name:'Rule sections',exact:true});
async function active(id,label) {
 await page.waitForFunction(id=>document.querySelector('.alarm-rule__nav [aria-current="location"]')?.textContent.trim()===({name:'Name',events:'Event types',schedules:'Schedules',exceptions:'Exceptions',cameras:'Affected cameras'})[id],id);
 if(id!=='name') {
  const section=page.locator(`#alarm-section-${id}`);
  assert.ok((await section.getAttribute('class')).includes('is-current'));
  assert.equal(await section.evaluate(n=>getComputedStyle(n).outlineColor),'rgba(255, 255, 255, 0.4)');
 }
 assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('aria-current'),'location');
}
async function positioned(id,label) {
 await active(id,label);
 await page.waitForTimeout(400);
 if(id!=='name') {
  const box=await page.locator(`#alarm-section-${id}`).boundingBox();
  const viewport = await page.locator(".alarm-rule__body").boundingBox();
  assert.ok(box.y >= 57, `${id} is below the header: ${box.y}`);
  const bottomInset = await page.locator(".alarm-rule__body").evaluate(n => parseFloat(getComputedStyle(n).paddingBottom));
  assert.ok(box.y + box.height <= viewport.y + viewport.height - bottomInset + 1 || box.height > viewport.height - 58 - bottomInset, `${id} is visible above the actions: ${JSON.stringify({box,viewport})}`);
  assert.ok((await nav.boundingBox()).y >= 59);
 }
}
try {
 await page.goto(`${base}/alarm-rules`);
 const draft=await browser.newPage({viewport:{width:1366,height:900}});
 await draft.goto(`${base}/alarm-rules`);
 await draft.getByRole('button',{name:'Settings',exact:true}).click();
 await draft.getByRole('menuitem',{name:'Alarm rules',exact:true}).click();
 await draft.getByRole('button',{name:'New Alarm Rule',exact:true}).click();
 await draft.getByRole('navigation',{name:'Rule sections',exact:true}).waitFor();
 assert.equal(await draft.locator('.alarm-rule__section').count(),4);
 assert.equal(await draft.locator('.alarm-rule__section-head').count(),0);
 assert.equal(await draft.locator('.alarm-rule__section-edit').count(),0);
 assert.equal(await draft.locator('.alarm-rule__add').count(),4);
 assert.equal(await draft.locator('.alarm-rule__row').count(),0);
 const cameraBefore = await draft.locator('#alarm-section-cameras').boundingBox();
 const scrollBefore = await draft.locator('.alarm-rule__body').evaluate(n => n.scrollTop);
 await draft.getByRole('navigation', {name:'Rule sections',exact:true}).getByRole('button',{name:'Affected cameras',exact:true}).click();
 assert.equal(await draft.locator('.alarm-rule__body').evaluate(n => n.scrollTop), scrollBefore);
 assert.equal((await draft.locator('#alarm-section-cameras').boundingBox()).y, cameraBefore.y);
 assert.ok((await draft.locator('#alarm-section-cameras').getAttribute('class')).includes('is-current'));
 assert.equal(await draft.locator('.alarm-rule__review-main').evaluate(n => getComputedStyle(n).paddingBottom), '0px');
 await draft.screenshot({path:'/tmp/panasonic-summary-from-start.png'});
 await draft.getByRole('button',{name:/Add event types/}).click();
 await draft.getByRole('button',{name: /^(Add|Edit) Registered people detection$/,exact:true}).click();
 await draft.getByRole('button',{name:'Mateo Ruiz',exact:true}).click();
 await draft.getByRole('button',{name:/Add [0-9]+ (person|people)/,exact:true}).click();
 await draft.getByRole('button',{name:'Save event types',exact:true}).click();
 await draft.locator('.event-sheet__panel').waitFor({state:'detached'});
 assert.equal(await draft.locator('.alarm-rule__section').count(),4);
 assert.equal(await draft.locator('.alarm-rule__section-head').count(),1);
 assert.equal(await draft.locator('#alarm-section-events .alarm-rule__section-edit').count(),1);
 assert.equal(await draft.locator('#alarm-section-cameras .alarm-rule__section-edit').count(),0);
 assert.equal(await draft.locator('.alarm-rule__row').count(),0);
 assert.ok(await draft.getByRole('navigation',{name:'Rule sections',exact:true}).isVisible());
 assert.ok(await draft.getByRole('button',{name:/Add cameras/}).isVisible());
 await draft.close();
 console.log('✓ New Summary is shown immediately and remains after a partial selection without cameras');
 // Supply a short final section and real exception rows for every modal's return path.
 await page.evaluate(()=>{
  const key='panasonic-review:v1:/alarm-rules:AlarmRulesAccess:rules';
  const rules=JSON.parse(sessionStorage.getItem(key));
  rules[0].cameraIds=['cam-1'];
  rules[0].eventTypeIds=['people'];
  rules[0].peopleIds=['mateo'];
  rules[0].exceptions=Array.from({length:4},(_,i)=>({id:`scroll-${i}`,name:`Scroll test ${i+1}`,type:'hours',dates:[`2026-10-${20+i}`],ranges:[{start:600,end:720}],repeatYearly:false}));
  sessionStorage.setItem(key,JSON.stringify(rules));
 });
 await page.reload();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('menuitem',{name:'Alarm rules',exact:true}).click();
 await page.getByRole('button',{name:'Edit After hours',exact:true}).click();
 await nav.waitFor();
 assert.equal(await page.locator('.summary-exceptions__row').count(),4);
 assert.equal(await page.locator('.alarm-rule__review-main .exception-list__toolbar').count(),0);
 assert.equal(await page.locator('.alarm-rule__review-main .exception-list__head').count(),0);
 for(const [id,label] of [['name','Name'],['events','Event types'],['schedules','Schedules'],['exceptions','Exceptions'],['cameras','Affected cameras']]) {
  await nav.getByRole('button',{name:label,exact:true}).click();
  await positioned(id,label);
 }
 console.log('✓ Anchors reveal sections only when needed, with matching stroke and no extra bottom space');
 for(const [id,label] of [['schedules','Schedules'],['exceptions','Exceptions'],['events','Event types']]) {
  await page.locator('.alarm-rule__body').evaluate((body,id)=>{
    const section=document.getElementById(`alarm-section-${id}`);
    body.scrollTop+=section.getBoundingClientRect().top-body.getBoundingClientRect().top-59;
  },id);
  const actualTop = await page.locator(`#alarm-section-${id}`).evaluate(n => n.getBoundingClientRect().top);
  if (Math.abs(actualTop - 59) < 1) await active(id,label);
 }
 await page.screenshot({path:'/tmp/panasonic-summary-active-section.png'});
 console.log('✓ Manual scroll keeps the anchor and section stroke in sync');
 await page.getByRole('button',{name:'Edit event types',exact:true}).click();
 await page.getByRole('button',{name: /^(Add|Edit) Registered people detection$/,exact:true}).click();
 await page.getByRole('button',{name:'Nina Alvarez',exact:true}).click();
 await page.getByRole('button',{name:/Add [0-9]+ (person|people)/,exact:true}).click();
 await page.getByRole('button',{name:'Save event types',exact:true}).click();
 await page.locator('.event-sheet__panel').waitFor({state:'detached'});
 await positioned('events','Event types');
 await page.getByRole('button',{name:'Edit schedules',exact:true}).click();
 await page.getByRole('button',{name:'Save time ranges',exact:true}).click();
 await page.locator('.schedule-sheet__panel').waitFor({state:'detached'});
 await positioned('schedules','Schedules');
 await page.getByRole('button',{name:'Edit exceptions',exact:true}).click();
 await page.getByRole('button',{name:'Save & continue',exact:true}).click();
 await page.locator('.exception-sheet__panel').waitFor({state:'detached'});
 await positioned('exceptions','Exceptions');
 await page.getByRole('button',{name:'Edit cameras',exact:true}).click();
 await page.locator('.camera-sheet__actions').getByRole('button',{name:'Apply',exact:true}).click();
 await page.locator('.exception-sheet__panel').waitFor({state:'detached'});
 await positioned('cameras','Affected cameras');
 console.log('✓ All four modal saves return to the changed section after closing');
 await page.getByRole('button',{name:'Edit schedules',exact:true}).click();
 const before=await page.locator('.alarm-rule__body').evaluate(n=>n.scrollTop);
 await page.locator('.schedule-sheet__actions').getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('.schedule-sheet__panel').waitFor({state:'detached'});
 assert.equal(await page.locator('.alarm-rule__body').evaluate(n=>n.scrollTop),before);
 await page.setViewportSize({width:1512,height:900});
 await nav.getByRole('button',{name:'Affected cameras',exact:true}).click();
 await positioned('cameras','Affected cameras');
 await page.reload();
 await active('cameras','Affected cameras');
 assert.deepEqual(errors,[]);
 console.log('✓ Cancel preserves position; resize and reload keep navigation usable');
} finally {await browser.close();}
