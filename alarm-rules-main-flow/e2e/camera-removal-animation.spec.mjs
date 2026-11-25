import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1728,height:966}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5175'}/alarm-rules`);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('menuitem',{name:'Alarm rules',exact:true}).click();await page.getByRole('button',{name:'New Alarm Rule',exact:true}).click();await page.getByRole('button',{name:/Add cameras/}).click();await page.waitForTimeout(450);
 const panel=page.locator('.exception-sheet__panel');const height=(await panel.boundingBox()).height;
 const rows=()=>page.locator('.camera-sheet__row:not([aria-disabled="true"])');for(let i=0;i<8;i++)await rows().nth(i).click();await page.getByRole('button',{name:'See selected 8',exact:true}).click();
 const id=await rows().first().getAttribute('data-camera-id');const first=page.locator(`[data-camera-id="${id}"]`);const secondId=await rows().nth(1).getAttribute('data-camera-id');const second=page.locator(`[data-camera-id="${secondId}"]`);const before=await second.boundingBox();
 await first.click();assert.equal(await first.getAttribute('aria-pressed'),'false');assert.equal(await first.getAttribute('aria-disabled'),'true');assert.equal(await first.getByRole('status').textContent(),'Camera removed');assert.equal(await page.getByRole('button',{name:'See selected 7',exact:true}).count(),1);assert.equal(await page.locator('.camera-sheet__row').count(),8);
 assert.equal((await second.boundingBox()).x,before.x);assert.equal((await second.boundingBox()).y,before.y);await page.screenshot({path:'/tmp/panasonic-camera-removal-feedback.png'});
 await page.waitForFunction(id=>!document.querySelector(`[data-camera-id="${id}"]`),id);
 assert.equal(await page.locator('.camera-sheet__row').count(),7);
 assert.ok(await page.locator('.camera-sheet__row').evaluateAll(ns=>ns.some(n=>n.getAnimations().some(a=>a.effect.getTiming().duration===240))));
 await page.waitForTimeout(260);assert.equal((await panel.boundingBox()).height,height);
 const two=(await rows().all()).slice(0,2);await two[0].click();await two[1].click();assert.equal(await page.locator('.camera-sheet__row.is-removing').count(),2);await page.waitForFunction(()=>!document.querySelector('.camera-sheet__row.is-removing'));assert.equal(await page.locator('.camera-sheet__row').count(),5);
 await page.locator('.camera-sheet__all').click();assert.equal(await page.getByRole('button',{name:'See selected 0',exact:true}).getAttribute('aria-pressed'),'false');
 await rows().first().click();await page.getByRole('button',{name:'See selected 1',exact:true}).click();await rows().first().click();assert.equal(await page.locator('.camera-sheet__row.is-removing').count(),1);await page.waitForFunction(()=>document.querySelector('.camera-sheet__chip')?.getAttribute('aria-pressed')==='false');assert.ok(await rows().count()>1000);assert.equal((await panel.boundingBox()).height,height);
 await page.emulateMedia({reducedMotion:'reduce'});await rows().first().click();await page.getByRole('button',{name:'See selected 1',exact:true}).click();await rows().first().click();assert.equal(await page.locator('.camera-sheet__row.is-removing').count(),0);assert.equal(await page.getByRole('button',{name:'See selected 0',exact:true}).getAttribute('aria-pressed'),'false');
 await page.emulateMedia({reducedMotion:'no-preference'});for(let i=0;i<2;i++)await rows().nth(i).click();await page.getByRole('button',{name:'See selected 2',exact:true}).click();await rows().first().click();await page.getByRole('button',{name:'See selected 1',exact:true}).click();assert.equal(await page.locator('.camera-sheet__row.is-removing').count(),0);
 await page.locator('.camera-sheet__actions').getByRole('button',{name:'Cancel',exact:true}).click();await panel.waitFor({state:'detached'});assert.deepEqual(errors,[]);
 console.log('✓ Removed feedback precedes fade/reflow, count updates immediately, multiple removals and last-camera reset work, fixed height, reduced motion, and switching/closing clean up pending animations');
}finally{await browser.close();}
