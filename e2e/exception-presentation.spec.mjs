import assert from 'node:assert/strict';
import { exceptionPresentation as present, rangeLabel } from '../src/utils/exceptionPresentation.js';
const options = { now: new Date('2026-11-19T20:00:00Z'), timeZone:'America/Los_Angeles' };
const base = {name:'Early closing',type:'hours',dates:['2026-10-27'],ranges:[{start:600,end:720}],repeatYearly:false};
for(const type of ['hours','day','schedule']) for(const repeatYearly of [false,true]) for(const range of [false,true]) {
 const row=present({...base,type,repeatYearly,dates:range?['2026-10-23','2026-10-24','2026-10-25','2026-10-26','2026-10-27']:base.dates,likeDay:'Sunday',scheduleName:'Event coverage'},options);
 assert.equal(row.date,range ? 'Mon, Nov 23 – Fri, Nov 27, 2026' : 'Fri, Nov 27, 2026');
 assert.equal(row.recurrence,`${repeatYearly?'Repeats every year':'Does not repeat'} · Upcoming`);
 assert.equal(row.behavior[0],type==='hours'?'10:00 AM–12:00 PM':type==='day'?'Uses Sunday’s time ranges':'Uses “Event coverage”');
}
assert.equal(present({...base,dates:['2026-10-19']},options).status,'Active now');
assert.equal(present({...base,dates:['2026-10-10']},options).status,'Ended');
assert.equal(present({...base,dates:['2026-10-10'],repeatYearly:true},options).date,'Next: Wed, Nov 10, 2027');
const annualBreak={...base,repeatYearly:true,dates:Array.from({length:14},(_,i)=>{const date=new Date(Date.UTC(2026,11,21+i));return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`})};
assert.equal(present(annualBreak,options).date,'Mon, Dec 21, 2026 – Sun, Jan 3, 2027');
assert.equal(present(annualBreak,{...options,now:new Date('2027-01-02T20:00:00Z')}).status,'Active now');
assert.equal(rangeLabel({start:1140,end:1800}),'7:00 PM–6:00 AM (next day)');
const overnight={...base,dates:['2026-10-18'],ranges:[{start:1140,end:1800}]};
assert.equal(present(overnight,{...options,now:new Date('2026-11-19T12:00:00Z')}).status,'Active now');
assert.equal(present(overnight,{...options,now:new Date('2026-11-19T16:00:00Z')}).status,'Ended');
assert.equal(present({...base,dates:['2026-10-19']},{...options,now:new Date('2026-11-20T02:00:00Z')}).status,'Active now');
assert.equal(present({...base,dates:['2026-10-19']},{...options,timeZone:'America/Argentina/Buenos_Aires',now:new Date('2026-11-20T04:00:00Z')}).status,'Ended');
assert.equal(present({...base,repeatYearly:true,dates:['2028-1-29']},options).status,'');
console.log('✓ 12 base summaries; active/upcoming/ended, next yearly occurrence, cross-year range, zone boundaries and overnight; no leap-day policy added');

assert.equal(present({...base,dates:['2026-10-11','2026-10-17'],repeatYearly:true},options).date, 'Next: Thu, Nov 11, 2027 · Wed, Nov 17, 2027');
assert.equal(present({...base,dates:['2026-10-11','2026-10-17']},options).date, 'Wed, Nov 11, 2026 · Tue, Nov 17, 2026');
console.log('✓ Weekdays on both range endpoints and separate dates; yearly weekdays follow the displayed occurrence year');
