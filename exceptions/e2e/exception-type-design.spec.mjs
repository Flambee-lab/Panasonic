import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1728,height:966}});
try {
 await page.goto('http://127.0.0.1:5175/alarm-rules');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('menuitem',{name:'Alarm rules',exact:true}).click();
 await page.getByRole('button',{name:'New Alarm Rule',exact:true}).click();
 await page.evaluate(()=>sessionStorage.setItem('panasonic-review:v1:/alarm-rules:NewAlarmRule:savedSchedule',JSON.stringify({repeat:'weekly',ranges:{Monday:[{start:600,end:720}]}})));
 await page.reload();
 await page.getByRole('button',{name:/Add exceptions/}).click();
 await page.getByRole('button',{name:'New exception',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.exception-sheet__panel').inert);
 await page.getByRole('radio',{name:'Like another day',exact:true}).click();
 const days=page.getByRole('radiogroup',{name:'Day to follow'});
 assert.equal(await days.getByRole('radio').count(),7);
 assert.equal(await days.getByRole('radio',{name:'Mon',exact:true}).getAttribute('aria-checked'),'true');
 await days.getByRole('radio',{name:'Tue',exact:true}).click();
 assert.equal(await days.getByRole('radio',{checked:true}).count(),1);
 assert.equal(await days.getByRole('radio',{name:'Tue',exact:true}).getAttribute('aria-checked'),'true');
 assert.equal(await days.getByRole('radio',{name:'Mon',exact:true}).getAttribute('aria-checked'),'false');
 await page.getByRole('textbox',{name:'Exception name',exact:true}).fill('Follow Tuesday');
 await page.getByRole('button',{name:'November 20, 2026',exact:true}).click();
 assert.ok(await page.getByRole('button',{name:'Save Exception',exact:true}).isEnabled());
 await page.locator('.exception-new__card.is-type').screenshot({path:'/tmp/panasonic-like-day-design.png'});
 await page.getByRole('radio',{name:'Another schedule',exact:true}).click();
 const schedules=page.getByRole('radiogroup',{name:'Schedule to use'});
 await schedules.getByRole('radio',{name:'After hours',exact:true}).click();
 assert.equal(await schedules.getByRole('radio',{name:'After hours',exact:true}).getAttribute('aria-checked'),'true');
 await schedules.getByRole('radio',{name:'Day of grace',exact:true}).click();
 assert.equal(await schedules.getByRole('radio',{checked:true}).count(),1);
 assert.equal(await schedules.getByRole('radio',{name:'Day of grace',exact:true}).getAttribute('aria-checked'),'true');
 const note=page.getByText('The selected dates will follow the selected schedule instead of this rule’s weekly plan.',{exact:true});
 assert.ok((await note.boundingBox()).y < (await schedules.boundingBox()).y);
 assert.equal(await page.getByText(/Midday lunch ours: It has no weekly hours/).count(),0);
 await page.locator('.exception-new__card.is-type').screenshot({path:'/tmp/panasonic-another-schedule-design.png'});
 for(const img of await page.locator('.exception-new__schedule-options .exception-new__schedules img').all()) {
  const size=await img.evaluate(n=>({loaded:n.complete&&n.naturalWidth>0,width:n.width,height:n.height}));
  assert.deepEqual(size,{loaded:true,width:16,height:16});
 }
 console.log('✓ Figma day cards, single selection including days without hours, schedule selection and original 16px assets');
} finally {await browser.close();}
