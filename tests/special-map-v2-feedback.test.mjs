import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as session from '../js/special-map/session.js';
import * as v2 from '../js/special-map/session-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
const original={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'†ルル'};
function harness({entry,saveSurvey=()=>({ok:true})}={}){
 let bound,callback,exits=0,hides=0,openings=0,menus=0;const events=new Map();
 class Node{constructor(){this.dataset={};}setAttribute(){}append(...nodes){for(const n of nodes)n.parentElement=this;}getContext(){return {};}remove(){}addEventListener(){}}
 const viewport=new Node(),status=new Node();viewport.append(status);
 const host={viewport,status,...(entry?{runEntryTransition:entry}:{}),openMenu(){menus++;},playTreasureOpening(type,done){assert.equal(type,'gold');callback=done;openings++;},hideTreasure(){hides++;}};
 const scope={...session,...v2,mapOriginalId,getSpecialMapContext:()=>null,getSpecialMapHost:()=>host,attachSpecialMap:()=>()=>{},describeTestMap:()=>({name:'地図'}),setWallColor(){},setFloorColor(){},drawMinimap(){},getMinimapBounds(){},toggleMinimapOverlay(){},performance:{now:()=>0},useSpecialMapRenderSource:o=>{bound=o;return ()=>{};},document:{visibilityState:'hidden',addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key),createElement:()=>new Node()},window:{addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)}};
 const source=readFileSync(new URL('../js/special-map/exploration-ui.js',import.meta.url),'utf8');
 vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,'').replace('export function','function')+';this.start=startSpecialMapExploration;',scope);
 const message={},ui=scope.start({registered:[original],mapKey:mapOriginalId(original),message,saveSurvey,onExit(){exits++;}});
 ui.input('confirm');
 return {ui,host,message,events,get bound(){return bound;},done:()=>callback(),stats:()=>({exits,hides,openings,menus})};
}
function atChest(h){
 const s=h.ui.session;v2.switchV2Floor(s,s.blueprint.links[1].lower);
 s.playerX=s.generatedMap.keyChest.x;s.playerY=s.generatedMap.keyChest.y;
}
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
