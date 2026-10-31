import test from 'node:test';import assert from 'node:assert/strict';
import {characterDelay,createSummoningTimeline,summoningFrameAt,drawSummoningLog,SUMMONING_COLORS} from '../js/aurora-summoning.js';
test('both routes share exactly the same character timing up to their branch',()=>{
 const a=createSummoningTimeline('normal'),b=createSummoningTimeline('hacking');assert.deepEqual(a.rows.slice(0,4),b.rows.slice(0,4));assert.equal(a.branchAt,b.branchAt);assert.equal(a.branchAt-a.rows[3].end,500);
 assert.deepEqual(['A',' ','.'].map(characterDelay),[32,12,140]);
 assert.equal(summoningFrameAt(a,31).rows[0].visible,'');assert.equal(summoningFrameAt(a,32).rows[0].visible,'>');assert.equal(summoningFrameAt(a,44).rows[0].visible,'> ');
 assert.throws(()=>createSummoningTimeline('other'),RangeError);
});
test('hacking flashes red, blinks WARNING twice, then restores cursor to normal at success',()=>{
 const t=createSummoningTimeline('hacking');assert.ok(summoningFrameAt(t,t.branchAt).flash>0);assert.equal(summoningFrameAt(t,t.branchAt).cursorColor,'warning');
 assert.deepEqual([0,200,400,600,800].map(ms=>summoningFrameAt(t,t.warningAt+ms).warningVisible),[true,false,true,false,true]);
 assert.equal(summoningFrameAt(t,t.successAt).cursorColor,'normal');assert.equal(t.rows.find(r=>r.text.includes('SECURITY OVERRIDE')).color,'warning');assert.equal(t.rows.at(-1).color,'success');
});
test('time-based typing and cursor are independent of frame sampling',()=>{
 for(const route of ['normal','hacking']){
 const t=createSummoningTimeline(route);for(let sec=0;sec*1000<t.endAt;sec++){const at30=summoningFrameAt(t,sec*30*(1000/30)),at60=summoningFrameAt(t,sec*60*(1000/60));assert.deepEqual(at30,at60);}
 assert.equal(summoningFrameAt(t,0).cursorVisible,true);assert.equal(summoningFrameAt(t,400).cursorVisible,false);assert.equal(summoningFrameAt(t,800).cursorVisible,true);
 assert.equal(summoningFrameAt(t,t.completeAt+999).shade,0);assert.equal(summoningFrameAt(t,t.endAt).ended,true);
 const complete=summoningFrameAt(t,t.completeAt);assert.deepEqual(complete.rows.map(r=>r.visible),t.rows.map(r=>r.text));assert.ok(110+complete.rowIndex*27<492);
 }
});
test('terminal rendering uses route colors and places cursor after current text',()=>{
 const fills=[],text=[];const ctx={fillStyle:'',fillRect(...args){fills.push([this.fillStyle,...args]);},fillText(value,...args){text.push([this.fillStyle,value,...args]);},measureText:value=>({width:value.length*13}),beginPath(){},moveTo(){},lineTo(){},stroke(){},save(){},rect(){},clip(){},restore(){}};
 const t=createSummoningTimeline('hacking'),f=summoningFrameAt(t,t.completeAt);f.cursorVisible=true;drawSummoningLog(ctx,f);
 assert.ok(text.some(([color,value])=>color===SUMMONING_COLORS.success&&value==='> INTERFERENCE SUCCESSFUL'));
 assert.ok(fills.some(([color,x])=>color===SUMMONING_COLORS.normal&&x===54+f.rows.at(-1).visible.length*13+3));
});
