import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall,specialDoorState,openSpecialDoorAhead,flushSpecialSurvey} from '../js/special-map/session.js';
import {mapOriginalId,normalizeSpecialMaps,registerSharedMap} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {generateSpecialMap} from '../js/special-map/generator.js';
const map={rulesetVersion:'special-map-v1',seed:12345,discovererName:'†ルル'};
const create=(m=map)=>createSpecialMapSession([m],mapOriginalId(m));
function step(s,a){const ok=actSpecialMap(s,a,0);updateSpecialMotion(s,170);return ok;}
test('registered V1 starts at frozen entrance and direction with one explored cell',()=>{
 const s=create();assert.equal(s.kind,'specialMap');assert.equal(s.fingerprint,'65bbb4f0');assert.deepEqual(s.generatedMap,generateSpecialMap(map.rulesetVersion,map.seed));
 assert.equal(s.playerX,0);assert.equal(s.playerY,2);assert.equal(s.direction,1);assert.equal(s.explored.flat().filter(Boolean).length,1);
 assert.throws(()=>createSpecialMapSession([],mapOriginalId(map)));assert.throws(()=>createSpecialMapSession([{...map,rulesetVersion:'unknown'}],mapOriginalId({...map,rulesetVersion:'unknown'})));
});
test('collision, animation, exploration and BFS exit work without touching normal save',()=>{
 const normal={currentDepth:70,maxDepth:80,explored:[[true]],story:{boss:true},transfer:[1,10],survey:77,torchFuel:38};const before=structuredClone(normal),original=structuredClone(map),s=create();
 // Every blocked edge, including exterior, rejects movement.
 for(let y=0;y<10;y++)for(let x=0;x<10;x++)for(let d=0;d<4;d++)if(specialWall(s,x,y,['N','E','S','W'][d])){
  const t=create();t.playerX=x;t.playerY=y;t.direction=d;assert.equal(step(t,'up'),false);assert.equal(t.playerX,x);assert.equal(t.playerY,y);
 }
 const start=s.playerY*10+s.playerX,end=s.generatedMap.exit.y*10+s.generatedMap.exit.x,queue=[start],previous=new Map([[start,null]]),dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 for(const i of queue)for(let d=0;d<4;d++)if(!s.generatedMap.walls[i][d]){const j=i+dirs[d][0]+10*dirs[d][1];if(!previous.has(j)){previous.set(j,{i,d});queue.push(j);}}
 const route=[];for(let j=end;j!==start;){const p=previous.get(j);route.unshift(p.d);j=p.i;}
 for(let k=0;k<route.length;k++){
  while(s.direction!==route[k])step(s,'right');if(openSpecialDoorAhead(s,0))updateSpecialMotion(s,520);const priorX=s.renderState.x;
  assert.equal(actSpecialMap(s,'up',0),true);assert.equal(s.renderState.x,priorX);assert.equal(actSpecialMap(s,'up',1),false);updateSpecialMotion(s,170);
  assert.equal(s.exitReached,k===route.length-1);
 }
 assert.ok(s.explored.flat().filter(Boolean).length>1);assert.deepEqual(normal,before);assert.deepEqual(map,original);
 const again=create();assert.deepEqual(again.generatedMap,s.generatedMap);assert.equal(again.explored.flat().filter(Boolean).length,1);assert.equal(again.exitReached,false);
});
test('shared origins and different discoverers use only ruleset and seed for terrain',()=>{
 const original={...map,rulesetVersion:'phase2a-1'};const imported=registerSharedMap(normalizeSpecialMaps({discovererName:'ALC'}),decodeMapCode(encodeMapCode(original)).map).map;
 assert.deepEqual(create(original).generatedMap,create(imported).generatedMap);
 assert.deepEqual(create({...original,discovererName:'ALC'}).generatedMap,create(original).generatedMap);
 assert.ok(create(original).cells.flat().every(c=>c.type==='floor'&&!c.npc&&!c.treasure&&!c.bossId));
});
import {drawMinimap} from '../js/minimap.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('real minimap accepts session cells without revealing unknown exits',()=>{
 const s=create();const ctx=new Proxy({},{get:(o,k)=>o[k]??(()=>{})});
 assert.doesNotThrow(()=>drawMinimap(ctx,{W:960,MAP_W:10,MAP_H:10,cells:s.cells,explored:s.explored,state:s.renderState,roundRect(){}}));
 assert.ok(s.cells.flat().every(c=>c.type==='floor'));assert.equal(s.renderState.fullMapRevealActive,undefined);
});
test('renderer binding restores exact normal references and theme after immediate disposal',()=>{
 const source=readFileSync(new URL('../js/renderer.js',import.meta.url),'utf8');
 const normal={state:{currentDepth:70,torchFuel:20},wallColor:'blue',floorColor:'blue',wallTexture:{id:'blue'},minimapOverlayVisible:true,updateAnimation(){},getMinimapOptions(){}};
 const renderer={...normal},scope={renderer,setWallColor:c=>{renderer.wallColor=c;renderer.wallTexture={id:c};},setFloorColor:c=>renderer.floorColor=c};
 vm.runInNewContext(source.slice(source.indexOf('export function useSpecialMapRenderSource')).replace('export function','function')+';this.bind=useSpecialMapRenderSource;',scope);
 const s=create(),dispose=scope.bind({state:s.renderState,updateAnimation:()=>{},getMinimapOptions:()=>({cells:s.cells})},'torture');
 assert.equal(renderer.state,s.renderState);assert.equal(renderer.wallColor,'torture');dispose();dispose();assert.deepEqual(renderer,normal);
});

test('runtime controller exits immediately, restores renderer, and never invokes normal gameplay',()=>{
 const source=readFileSync(new URL('../js/special-map/exploration-ui.js',import.meta.url),'utf8');
 let bound,restored=0,exited=0,mapToggles=0;const sounds=[];const listeners=new Map();
 class Node{constructor(){this.children=[];this.dataset={};}setAttribute(){}append(...nodes){this.children.push(...nodes);}getContext(){return {};}remove(){this.removed=true;}}
 const context={drawCompass(){},isMinimapOverlayVisible:()=>mapToggles%2===1,createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall,specialDoorState,openSpecialDoorAhead,flushSpecialSurvey,drawMinimap,getMinimapBounds(){},toggleMinimapOverlay(){mapToggles++;},performance:{now:()=>0},
  useSpecialMapRenderSource:options=>{bound=options;return ()=>restored++;},
  document:{createElement:()=>new Node(),createTextNode:text=>text},window:{addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)}};
 vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,'').replace('export function','function')+';this.start=startSpecialMapExploration;',context);
 const host=new Node(),message={};const options={playSe:id=>sounds.push(id),saveSurvey:()=>({ok:true}),host,registered:[map],mapKey:mapOriginalId(map),message,onExit:()=>exited++};
 const ui=context.start(options);assert.equal(bound.state,ui.session.renderState);assert.equal(bound.eventOverlayCtx,null);assert.equal(bound.getRoamingEnemyRenderState(),null);
 ui.input('map');bound.updateHud();assert.equal(mapToggles,1);assert.equal(host.children[0].dataset.mapExpanded,'true');
 host.children[0].children[2].children[1].onclick();assert.equal(mapToggles,2);
 ui.input('up');assert.deepEqual(sounds,['step']);assert.ok(ui.session.motion);ui.input('cancel');assert.equal(restored,1);assert.equal(exited,1);assert.equal(host.children[0].removed,true);assert.equal(listeners.size,0);
 ui.close();assert.equal(restored,1);
 const next=context.start(options);assert.equal(next.session.playerX,0);assert.equal(next.session.playerY,2);
 const door=next.session.doorLayout.doors[0];next.session.playerX=door.x;next.session.playerY=door.y;next.session.direction=door.dir==='E'?1:2;
 assert.equal(bound.wallOnCell(door.x,door.y,door.dir),true);assert.equal(bound.getDoorKind(door.x,door.y,door.dir),'normal');
 // Native touch/click button and keyboard use the same controller as gamepad.
 const runtime=host.children.at(-1);sounds.length=0;runtime.children[2].children[2].onclick();runtime.children[2].children[2].onclick();assert.deepEqual(sounds,['door']);assert.equal(next.session.renderState.anim.type,'door');bound.updateAnimation(520);
 assert.equal(bound.wallOnCell(door.x,door.y,door.dir),false);assert.equal(bound.openDoorOnCell(door.x,door.y,door.dir),true);
 next.session.openedDoors.clear();listeners.get('keydown')({key:'Enter',preventDefault(){},stopImmediatePropagation(){}});assert.equal(next.session.renderState.anim.type,'door');bound.updateAnimation(520);
 next.session.exitReached=true;bound.updateHud();assert.match(message.textContent,/出口を発見/);next.input('confirm');assert.equal(exited,1);next.input('cancel');assert.equal(exited,2);assert.equal(restored,2);
 let completionMessages=0;const completionMessage={set textContent(value){if(value.includes('地図の調査が完了した'))completionMessages++;}};
 // Only entrance is missing: the entry visit must commit and notify once.
 const almost='fffffe'+'f'.repeat(19),completeUi=context.start({...options,registered:[{...map,surveyedMask:almost}],message:completionMessage});
 bound.updateHud();bound.updateHud();assert.equal(completionMessages,1);assert.equal(completeUi.session.surveyedCount,100);
 assert.equal(bound.getMinimapOptions().explored.flat().filter(Boolean).length,100);assert.equal(completeUi.session.explored.flat().filter(Boolean).length,1);completeUi.close();
 const failed=context.start({...options,saveSurvey:()=>({ok:false})});const priorExit=exited;failed.input('cancel');assert.equal(exited,priorExit);assert.ok(failed.session.surveyError);failed.close();
});

test('backward travel and left turns preserve facing and mark only visited cells',()=>{
 const s=create();step(s,'up');assert.equal(s.playerX,1);assert.equal(s.playerY,2);
 step(s,'down');assert.equal(s.playerX,0);assert.equal(s.playerY,2);assert.equal(s.direction,1);
 step(s,'left');assert.equal(s.direction,0);assert.equal(s.explored.flat().filter(Boolean).length,2);
});

test('keyboard and touch controls cannot fall through to normal movement or generation',()=>{
 const source=readFileSync(new URL('../js/input.js',import.meta.url),'utf8'),bindings=new Map();let keydown;const received=[];
 const scope={window:{addEventListener:(type,fn)=>{keydown=fn;}},Element:class{},bindControl:(el,fn)=>bindings.set(el,fn),configureCommandMouseButtons(){},configureTouchGuards(){}};
 vm.runInNewContext(source.slice(0,source.indexOf('function configureCommandMouseButtons')).replace('export function','function')+';this.configure=configureInput;',scope);
 const forbidden=()=>assert.fail('normal dungeon handler called');
 scope.configure({forwardBtn:'up',backBtn:'down',leftBtn:'left',rightBtn:'right',autoReturnBtn:'return',randomGenerateBtn:'generate',buttonA:'A',buttonB:'B',manualMove:forbidden,manualTurn:forbidden,startAutoReturn:forbidden,generateRandomDungeon:forbidden,handleExplorationInput:a=>{received.push(a);return true;}});
 for(const fn of bindings.values())fn();
 for(const [key,code] of [['ArrowUp',''],['ArrowDown',''],['ArrowLeft',''],['ArrowRight',''],['Enter',''],['x','KeyX'],['z','KeyZ']])keydown({key,code,preventDefault(){}});
 assert.deepEqual(received,['up','down','left','right','cancel','blocked','confirm','cancel','up','down','left','right','confirm','confirm','cancel']);
});
