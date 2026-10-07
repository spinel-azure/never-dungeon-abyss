import {discardV2Experience} from '../js/special-map/battle-rewards-v2.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as session from '../js/special-map/session.js';
import * as v2 from '../js/special-map/session-v2.js';
import {EMPTY_SURVEY,surveyVisit} from '../data/special-map-survey.js';
import {getV2SurveyJingle} from '../js/special-map/survey-v2.js';
import {createGamepadInputState,pollGamepadActions} from '../js/gamepad-input.js';
import {mapOriginalId} from '../data/special-maps.js';
const original={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'†ルル'};
// Place the player immediately beside a target, then use the real step lifecycle.
function enterCell(h,p){
 const s=h.ui.session,dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];
 const d=dirs.findIndex((dir,i)=>!s.cells[p.y][p.x].walls[dir]&&p.x+dx[i]>=0&&p.x+dx[i]<10&&p.y+dy[i]>=0&&p.y+dy[i]<10);
 assert.ok(d>=0);v2.cancelV2CellPrompt(s);
 s.playerX=p.x+dx[d];s.playerY=p.y+dy[d];s.direction=(d+2)%4;
 s.renderState.x=s.playerX+.5;s.renderState.y=s.playerY+.5;s.renderState.angle=s.direction*Math.PI/2-Math.PI/2;
 s.renderState.overlayEvent=null;
 assert.ok(session.actSpecialMap(s,'up',0));
 assert.equal(s.cellPrompt,null,'not locked before arrival');
 h.bound.updateAnimation(170);
}
function harness({entry,map=original,playSe=()=>{},saveSurvey=()=>({ok:true}),hostOptions={}}={}){
 let bound,callback,exits=0,hides=0,openings=0,menus=0,previews=0;const events=new Map(),timers=[];
 class Node{constructor(){this.dataset={};}setAttribute(){}append(...nodes){for(const n of nodes)n.parentElement=this;}getContext(){return {};}remove(){}addEventListener(){}}
 const viewport=new Node(),status=new Node();viewport.append(status);
 const host={viewport,status,...(entry?{runEntryTransition:entry}:{}),openMenu(){menus++;},showTreasure(type){assert.equal(type,'gold');previews++;},playTreasureOpening(type,done){assert.equal(type,'gold');callback=done;openings++;},hideTreasure(){hides++;}};
 Object.assign(host,hostOptions);
 const scope={setTimeout:fn=>timers.push(fn),discardV2Experience,...session,...v2,mapOriginalId,getSpecialMapContext:()=>null,getSpecialMapHost:()=>host,attachSpecialMap:()=>()=>{},describeTestMap:()=>({name:'地図'}),setWallColor(){},setFloorColor(){},drawMinimap(){},getMinimapBounds(){},toggleMinimapOverlay(){},performance:{now:()=>0},useSpecialMapRenderSource:o=>{bound=o;return ()=>{};},document:{getElementById:()=>null,visibilityState:'hidden',addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key),createElement:()=>new Node()},window:{addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)}};
 const source=readFileSync(new URL('../js/special-map/exploration-ui.js',import.meta.url),'utf8');
 vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,'').replace('export function','function')+';this.start=startSpecialMapExploration;',scope);
 const message={},ui=scope.start({registered:[map],mapKey:mapOriginalId(map),message,saveSurvey,playSe,onExit(){exits++;}});
 ui.input('confirm');
 return {ui,host,message,events,get bound(){return bound;},done:()=>callback(),elapsed:async()=>{timers.splice(0).forEach(fn=>fn());await new Promise(r=>setImmediate(r));},stats:()=>({exits,hides,openings,menus,previews})};
}

test('survey center banner blocks input and waits for both duration and jingle before boss',async()=>{
 let release,retries=0;const h=harness({hostOptions:{playSurveyCompletion:()=>new Promise(r=>release=r)}}),s=h.ui.session;
 s.pendingBoss=true;s.surveyNotice={total:300,floor:2};s.surveyCompletionPending=true;s.retryBossEncounter=()=>retries++;
 h.bound.updateHud();assert.equal(s.renderState.overlayEvent.overlayMessage,'地図調査完了！');assert.equal(s.renderState.overlayEvent.surveyMilestone,true);
 const pos=[s.playerX,s.playerY,s.direction];for(const a of ['up','left','confirm','cancel','items'])h.ui.input(a);
 assert.deepEqual([s.playerX,s.playerY,s.direction],pos);assert.equal(h.stats().menus,0);
 await h.elapsed();assert.equal(retries,0);assert.equal(s.surveyPresentationPlaying,true);
 release();await new Promise(r=>setImmediate(r));assert.equal(retries,1);assert.equal(s.surveyPresentationPlaying,false);assert.equal(s.renderState.overlayEvent,null);h.ui.close();
 const partial=harness();partial.ui.session.surveyNotice={total:150,floor:1};partial.bound.updateHud();
 assert.equal(partial.ui.session.renderState.overlayEvent.overlayMessage,'調査100マス達成！');assert.equal(partial.ui.session.renderState.overlayEvent.overlaySubtitle,'（総合150／300）');
 await partial.elapsed();assert.equal(partial.ui.session.renderState.overlayEvent,null);partial.ui.close();
});
function atChest(h){
 const s=h.ui.session;v2.switchV2Floor(s,s.blueprint.links[1].lower);
 s.playerX=s.generatedMap.keyChest.x;s.playerY=s.generatedMap.keyChest.y;
}
test('closing V2 runtime aborts accumulated EXP and prevents a late return',()=>{
 const h=harness(),s=h.ui.session;
 s.battleExperience=123;
 h.ui.close();assert.equal(s.battleExperience,0);assert.equal(s.experienceClosed,true);
 assert.equal(h.ui.finish(),false);assert.equal(h.stats().exits,0);
 h.ui.close();assert.equal(h.stats().exits,0);
});
test('V2 stair prompts on arrival; entrance A returns, merely arriving never does',()=>{
 const h=harness(),s=h.ui.session;
 assert.match(h.message.textContent,/探索を終了して帰還しますか/);
 assert.equal(h.stats().exits,0);
 const down=s.generatedMap.stairsDown;s.playerX=down.x;s.playerY=down.y;
 s.motion={isStep:true,started:0,duration:170,x:0,y:0,angle:0,toX:down.x+.5,toY:down.y+.5,toAngle:0};
 h.bound.updateAnimation(170);assert.match(h.message.textContent,/下り階段がある。下層に移動しますか/);
 assert.equal(s.currentFloor,0);
 v2.switchV2Floor(s,s.blueprint.links[0].lower);assert.match(v2.getV2StairPrompt(s),/上層に移動しますか/);
 v2.switchV2Floor(s,s.blueprint.links[0].upper);
 s.playerX=s.generatedMap.stairsUp.x;s.playerY=s.generatedMap.stairsUp.y;
 h.ui.input('confirm');assert.equal(h.stats().exits,1);
});
test('V2 gold chest awards only on animation completion, locks repeat input, grants once',()=>{
 const h=harness();atChest(h);const s=h.ui.session;
 h.ui.input('confirm');assert.equal(h.stats().openings,1);assert.equal(s.bossKeyFound,false);assert.equal(s.transitioning,true);
 const xy=[s.playerX,s.playerY];for(const action of ['confirm','up','cancel','items'])h.ui.input(action);
 assert.deepEqual([s.playerX,s.playerY],xy);assert.equal(h.stats().menus,0);assert.equal(h.stats().openings,1);
 h.done();assert.equal(s.bossKeyFound,true);assert.equal(s.transitioning,false);assert.equal(s.floors[2].chestOpened,true);assert.equal(h.stats().hides,1);
 h.done();h.ui.input('confirm');assert.equal(h.stats().openings,1);assert.equal(h.stats().hides,1);h.ui.close();
});
test('auto walker stops at stairs and leaves the same return prompt without automatic exit',()=>{
 const h=harness(),s=h.ui.session;
 h.ui.input('up');h.bound.updateAnimation(170);
 assert.doesNotMatch(h.message.textContent,/上り階段がある/,'leaving the stairs clears the old prompt');
 assert.ok(session.startSpecialAutoWalker(s));
 for(let now=340;now<5000&&s.autoPath;now+=200)h.bound.updateAnimation(now);
 assert.equal(s.autoPath,null);assert.equal(h.stats().exits,0);
 assert.equal(s.cellPrompt,'stairs');assert.equal(session.actSpecialMap(s,'left',5000),false);
 assert.match(h.message.textContent,/上り階段がある。探索を終了して帰還しますか/);
 h.ui.close();
});
test('V2 chest cancellation/disposal cannot award a late key; failed animation can be retried',async()=>{
 const h=harness();atChest(h);h.ui.input('confirm');h.ui.close();h.done();assert.equal(h.ui.session.bossKeyFound,false);assert.equal(h.ui.session.transitioning,false);
 const retry=harness();atChest(retry);retry.host.playTreasureOpening=async()=>{throw Error('failed');};
 retry.ui.input('confirm');await new Promise(resolve=>setImmediate(resolve));assert.equal(retry.ui.session.bossKeyFound,false);assert.equal(retry.ui.session.transitioning,false);assert.match(retry.message.textContent,/もう一度/);
 assert.equal(v2.confirmV2Cell(retry.ui.session,0).openKeyChest,true);retry.ui.close();
});

test('V2 entry defers runtime until darkness, locks through reveal, then shows map title and restores input',async()=>{
 let dark,release;
 const h=harness({entry:fn=>{dark=fn;return new Promise(r=>release=r);}});
 assert.equal(h.ui.session,undefined);
 for(const action of ['up','confirm','cancel','items','map'])assert.equal(h.ui.input(action),true);
 assert.equal(h.stats().menus,0);assert.equal(h.ui.finish(),false);
 dark();const s=h.ui.session;assert.equal(s.currentFloor,0);assert.equal(s.transitioning,true);assert.equal(s.renderState.overlayEvent,null);
 const xy=[s.playerX,s.playerY];h.ui.input('up');assert.deepEqual([s.playerX,s.playerY],xy);
 release(true);await h.ui.ready;
 assert.equal(s.transitioning,false);assert.equal(s.renderState.overlayEvent.overlayMessage,'地図');
 h.ui.input('confirm');h.ui.input('up');assert.ok(s.motion);h.ui.close();
});
test('failed or cancelled V2 entry leaves no active runtime or banner',async()=>{
 const failed=harness({entry:async()=>{throw Error('transition failed');}});await failed.ui.ready;assert.equal(failed.stats().exits,1);
 let dark,release;const cancelled=harness({entry:fn=>{dark=fn;return new Promise(r=>release=r);}});
 cancelled.ui.close();dark();release(true);await cancelled.ui.ready;assert.equal(cancelled.ui.session,undefined);
});

test('V2 failed flush blocks stairs and return, pagehide retries, and close removes lifecycle listeners',async()=>{
 let fail=true,writes=0;const h=harness({saveSurvey:()=>{writes++;return {ok:!fail};}}),s=h.ui.session;
 const down=s.generatedMap.stairsDown;s.playerX=down.x;s.playerY=down.y;
 h.ui.input('confirm');await Promise.resolve();assert.equal(s.currentFloor,0);assert.match(s.surveyError,/保存できません/);
 assert.equal(h.ui.finish(),false);assert.equal(h.stats().exits,0);
 fail=false;h.events.get('pagehide')();assert.equal(s.surveyError,'');assert.ok(writes>=3);
 h.ui.input('confirm');await Promise.resolve();assert.equal(s.currentFloor,1);
 h.events.get('visibilitychange')();assert.equal(h.ui.finish(),true);
 assert.equal(h.events.has('pagehide'),false);assert.equal(h.events.has('visibilitychange'),false);
});
test('opening a key chest or boss gate never surveys the cell beyond it',()=>{
 const h=harness();atChest(h);const s=h.ui.session,before=s.totalSurveyed;
 h.ui.input('confirm');h.done();assert.equal(s.totalSurveyed,before);
 const room=s.generatedMap.bossRoom;s.playerX=room.approach.x;s.playerY=room.approach.y;
 s.direction=['N','E','S','W'].findIndex((_,d)=>s.playerX+[0,1,0,-1][d]===room.cells[0].x&&s.playerY+[-1,0,1,0][d]===room.cells[0].y);
 h.ui.input('confirm');session.updateSpecialMotion(s,1000);
 assert.equal(s.bossDoorUnlocked,true);assert.equal(s.totalSurveyed,before);
 assert.equal(s.surveyView[room.cells[0].y][room.cells[0].x],false);h.ui.close();
});

test('stairs lock atomically on completed entry; B stays, unlocks; A transfers without destination relock',async()=>{
 const h=harness(),s=h.ui.session;enterCell(h,s.generatedMap.stairsDown);
 assert.equal(s.cellPrompt,'stairs');assert.equal(s.motion,null);
 const pos=[s.playerX,s.playerY,s.direction],count=s.totalSurveyed;
 for(const a of ['up','down','left','right','cancelMenu','items','menu','map'])h.ui.input(a);
 assert.deepEqual([s.playerX,s.playerY,s.direction],pos);assert.equal(h.stats().menus,0);
 assert.equal(session.startSpecialAutoWalker(s),false);assert.equal(s.totalSurveyed,count);
 let blocked=0;h.events.get('pointerdown')({target:{closest:()=>true},preventDefault(){blocked++;},stopImmediatePropagation(){blocked++;}});assert.equal(blocked,2);
 h.ui.input('cancel');assert.equal(s.cellPrompt,null);assert.deepEqual([s.playerX,s.playerY,s.direction],pos);
 h.ui.input('right');assert.ok(s.motion);h.bound.updateAnimation(1000);
 h.ui.input('confirm');await Promise.resolve();assert.equal(s.currentFloor,1);assert.equal(s.cellPrompt,null);
 const dest=s.generatedMap.stairsUp;assert.deepEqual([s.playerX,s.playerY],[dest.x,dest.y]);
 // Held keyboard decisions are swallowed before the shared input handler.
 for(const key of [{key:'Enter'},{code:'KeyX'},{code:'KeyZ'}]){
  let stopped=0;h.events.get('keydown')({...key,repeat:true,preventDefault(){stopped++;},stopImmediatePropagation(){stopped++;}});assert.equal(stopped,2);
 }
 h.ui.input('confirm');assert.equal(s.currentFloor,1,'first arrival action dismisses banner');
 h.ui.input('up');assert.ok(s.motion,'ordinary exploration resumes');h.ui.close();
});

test('gamepad decision uses release edges rather than repeating on stair arrival',()=>{
 const state=createGamepadInputState(),pad={mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
 pad.buttons[0]={pressed:true,value:1};assert.ok(pollGamepadActions(pad,state,0).includes('confirm'));
 for(const time of [300,1000,3000])assert.ok(!pollGamepadActions(pad,state,time).includes('confirm'));
 pad.buttons[0]={pressed:false,value:0};pollGamepadActions(pad,state,3100);
 pad.buttons[0]={pressed:true,value:1};assert.ok(pollGamepadActions(pad,state,3200).includes('confirm'));
});

test('chest entry locks, cancellation stays, A awards after Three.js callback; opened revisit stays unlocked',()=>{
 const h=harness();atChest(h);const s=h.ui.session,p=s.generatedMap.keyChest;
 enterCell(h,p);h.bound.updateHud();assert.equal(h.stats().previews,1);assert.equal(s.cellPrompt,'chest');assert.match(h.message.textContent,/金色の宝箱/);
 const pos=[s.playerX,s.playerY];for(const a of ['up','down','left','right','menu','items'])h.ui.input(a);
 assert.deepEqual([s.playerX,s.playerY],pos);assert.equal(s.motion,null);assert.equal(h.stats().menus,0);
 h.ui.input('cancel');assert.equal(s.cellPrompt,null);assert.deepEqual([s.playerX,s.playerY],pos);assert.equal(h.stats().openings,0);
 h.ui.input('confirm');assert.equal(h.stats().openings,1);assert.equal(s.bossKeyFound,false);
 h.done();assert.equal(s.bossKeyFound,true);enterCell(h,p);assert.equal(s.cellPrompt,null);assert.equal(h.stats().openings,1);h.ui.close();
});

test('survey jingles use floor completion and suppress replay',()=>{
 for(const [before,after,bf,af,se] of [[99,100,49,50,null],[199,200,70,71,null],[150,151,99,100,'battleVictory'],[299,300,99,100,'importantItem'],[300,300,100,100,null]])assert.equal(getV2SurveyJingle(before,after,bf,af),se);
 for(const before of [99,199,299]){
  const probe=harness(),p=probe.ui.session.generatedMap.stairsDown,entry=probe.ui.session.generatedMap.stairsUp;probe.ui.close();
  const masks=[EMPTY_SURVEY,EMPTY_SURVEY,EMPTY_SURVEY];masks[0]=surveyVisit(masks[0],entry.x,entry.y);let count=1;
  for(let f=0;f<3;f++)for(let i=0;i<100&&count<before;i++){
   if(f===0&&((i===p.y*10+p.x)||(i===entry.y*10+entry.x)))continue;
   masks[f]=surveyVisit(masks[f],i%10,Math.floor(i/10));count++;
  }
  const sounds=[],h=harness({map:{...original,surveyedMasks:masks},playSe:k=>sounds.push(k)}),s=h.ui.session;
  assert.equal(s.totalSurveyed,before);assert.deepEqual(sounds,[]);
  enterCell(h,p);assert.equal(s.totalSurveyed,before+1);assert.equal(s.cellPrompt,'stairs');h.bound.updateHud();h.bound.updateHud();
  const jingles=sounds.filter(k=>['battleVictory','importantItem'].includes(k));assert.deepEqual(jingles,[before===299?'importantItem':'battleVictory']);
  if(before===299){assert.match(h.message.textContent,/地図の調査が完了した/);assert.match(h.message.textContent,/下り階段/);}
  const saved=JSON.parse(JSON.stringify(s.surveyedMasks));h.ui.close();
  const reloadSounds=[],reload=harness({map:{...original,surveyedMasks:saved},playSe:k=>reloadSounds.push(k)});reload.bound.updateHud();enterCell(reload,p);reload.bound.updateHud();
  assert.deepEqual(reloadSounds.filter(k=>['battleVictory','importantItem'].includes(k)),[]);reload.ui.close();
 }
});

for(const target of ['keyChest','bossCell'])test(`last ${target} records completion before event and plays importantItem once`,()=>{
 const probe=harness();atChest(probe);const p=target==='keyChest'?probe.ui.session.generatedMap.keyChest:probe.ui.session.generatedMap.bossRoom.bossCell;probe.ui.close();
 let mask=EMPTY_SURVEY;for(let i=0;i<100;i++)if(i!==p.y*10+p.x)mask=surveyVisit(mask,i%10,Math.floor(i/10));
 const sounds=[],h=harness({map:{...original,surveyedMasks:['f'.repeat(25),'f'.repeat(25),mask]},playSe:k=>sounds.push(k)});
 atChest(h);enterCell(h,p);h.bound.updateHud();h.bound.updateHud();assert.equal(h.ui.session.totalSurveyed,300);
 assert.deepEqual(sounds.filter(k=>['battleVictory','importantItem'].includes(k)),['importantItem']);assert.match(h.message.textContent,/地図の調査が完了した/);
 assert.equal(h.ui.session.cellPrompt,target==='keyChest'?'chest':null);h.ui.close();
});

test('failed completion save retains event lock and plays completion cue once after successful retry',()=>{
 const probe=harness(),p=probe.ui.session.generatedMap.stairsDown;probe.ui.close();
 let mask=EMPTY_SURVEY;for(let i=0;i<100;i++)if(i!==p.y*10+p.x)mask=surveyVisit(mask,i%10,Math.floor(i/10));
 let ok=false;const sounds=[],h=harness({map:{...original,surveyedMasks:[mask,'f'.repeat(25),'f'.repeat(25)]},saveSurvey:()=>({ok}),playSe:k=>sounds.push(k)});
 enterCell(h,p);h.bound.updateHud();assert.equal(h.ui.session.totalSurveyed,300);assert.equal(h.ui.session.cellPrompt,'stairs');
 assert.deepEqual(sounds.filter(k=>['battleVictory','importantItem'].includes(k)),[]);
 ok=true;h.ui.input('confirm');h.bound.updateHud();h.bound.updateHud();
 assert.equal(h.ui.session.cellPrompt,'stairs');assert.deepEqual(sounds.filter(k=>['battleVictory','importantItem'].includes(k)),['importantItem']);h.ui.close();
});
