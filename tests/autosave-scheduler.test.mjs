import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosaveScheduler} from '../js/autosave-scheduler.js';

function fixture() {
  let time=0, busy=false, sequence=0, value=0;
  const tasks=new Map(), saves=[];
  const scheduler=createAutosaveScheduler({save:()=>saves.push({time,value}),isBusy:()=>busy,
    now:()=>time,setTimer:(fn,delay)=>{const id=++sequence;tasks.set(id,{fn,at:time+delay});return id;},clearTimer:id=>tasks.delete(id)});
  function advance(to) {
    for(;;){const next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>to)break;
      time=next[1].at;tasks.delete(next[0]);next[1].fn();}
    time=to;
  }
  return {scheduler,saves,tasks,advance,setBusy:v=>{busy=v;},setValue:v=>{value=v;}};
}
test('debounces updates and saves the latest state after 250 ms',()=>{
  const f=fixture();f.scheduler.request();f.advance(200);f.setValue(2);f.scheduler.request();
  f.advance(449);assert.equal(f.saves.length,0);f.advance(450);assert.deepEqual(f.saves,[{time:450,value:2}]);
});
test('a delayed save cannot interrupt a later movement animation',()=>{
  const f=fixture();f.scheduler.request();f.advance(100);f.setBusy(true);f.advance(275);
  assert.equal(f.saves.length,0);f.setBusy(false);f.setValue(3);f.scheduler.request();
  f.advance(524);assert.equal(f.saves.length,0);f.advance(525);assert.deepEqual(f.saves,[{time:525,value:3}]);
});
test('continuous input saves at the first settled boundary after five seconds',()=>{
  const f=fixture();f.scheduler.request();f.setBusy(true);
  for(let time=200;time<=5000;time+=200){f.advance(time);f.scheduler.request();}
  assert.equal(f.saves.length,0);f.advance(5100);f.setBusy(false);f.setValue(25);f.scheduler.request();
  assert.deepEqual(f.saves,[{time:5100,value:25}]);assert.equal(f.tasks.size,0);
  f.scheduler.request();f.advance(5350);assert.equal(f.saves.length,2);
});
test('busy timeout retries without needing another input and never forces a mid-animation save',()=>{
  const f=fixture();f.setBusy(true);f.scheduler.request();f.advance(7000);assert.equal(f.saves.length,0);
  f.setBusy(false);f.advance(7050);assert.equal(f.saves.length,1);
});
test('explicit save cancellation discards both the timer and overdue state',()=>{
  const f=fixture();f.scheduler.request();const stale=[...f.tasks.values()][0].fn;f.scheduler.cancel();
  f.advance(6000);stale();assert.equal(f.saves.length,0);
  f.scheduler.request();stale();f.advance(6249);assert.equal(f.saves.length,0);f.advance(6250);assert.equal(f.saves.length,1);
});
