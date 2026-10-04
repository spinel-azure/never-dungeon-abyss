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
  assert.equal('exitReached' in s,false);
 }
 assert.ok(s.explored.flat().filter(Boolean).length>1);assert.deepEqual(normal,before);assert.deepEqual(map,original);
 const again=create();assert.deepEqual(again.generatedMap,s.generatedMap);assert.equal(again.explored.flat().filter(Boolean).length,1);assert.equal('exitReached' in again,false);
});
test('shared origins and different discoverers use only ruleset and seed for terrain',()=>{
 const original={...map,rulesetVersion:'phase2a-1'};const imported=registerSharedMap(normalizeSpecialMaps({discovererName:'ALC'}),decodeMapCode(encodeMapCode(original)).map).map;
 assert.deepEqual(create(original).generatedMap,create(imported).generatedMap);
 assert.deepEqual(create({...original,discovererName:'ALC'}).generatedMap,create(original).generatedMap);
 assert.ok(create(original).cells.flat().every(c=>['floor','stairsUp'].includes(c.type)&&!c.npc&&!c.treasure&&!c.bossId));
});
import {drawMinimap} from '../js/minimap.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isV2Session,createSpecialMapV2Session,confirmV2Cell,switchV2Floor,getV2StairPrompt,completeV2KeyChest,cancelV2KeyChest} from '../js/special-map/session-v2.js';
test('real minimap accepts session cells without revealing unknown exits',()=>{
 const s=create();const ctx=new Proxy({},{get:(o,k)=>o[k]??(()=>{})});
 assert.doesNotThrow(()=>drawMinimap(ctx,{W:960,MAP_W:10,MAP_H:10,cells:s.cells,explored:s.explored,state:s.renderState,roundRect(){}}));
 assert.equal(s.cells.flat().filter(c=>c.type==='stairsUp').length,1);assert.equal(s.cells[s.generatedMap.exit.y][s.generatedMap.exit.x].type,'floor');assert.equal(s.renderState.fullMapRevealActive,undefined);
});
test('renderer binding restores exact normal references and theme after immediate disposal',()=>{
 const source=readFileSync(new URL('../js/renderer.js',import.meta.url),'utf8');
 const normal={state:{currentDepth:70,torchFuel:20},wallColor:'blue',floorColor:'blue',wallTexture:{id:'blue'},minimapOverlayVisible:true,updateAnimation(){},getMinimapOptions(){}};
 const renderer={...normal},scope={renderer,setWallColor:c=>{renderer.wallColor=c;renderer.wallTexture={id:c};},setFloorColor:c=>renderer.floorColor=c};
 vm.runInNewContext(source.slice(source.indexOf('export function useSpecialMapRenderSource')).replace('export function','function')+';this.bind=useSpecialMapRenderSource;',scope);
 const s=create(),dispose=scope.bind({state:s.renderState,updateAnimation:()=>{},getMinimapOptions:()=>({cells:s.cells})},'torture');
 assert.equal(renderer.state,s.renderState);assert.equal(renderer.wallColor,'torture');dispose();dispose();assert.deepEqual(renderer,normal);
});

test('runtime controller uses ordinary menu, pauses movement, and flushes before return',()=>{
 const source=readFileSync(new URL('../js/special-map/exploration-ui.js',import.meta.url),'utf8');
 let bound,restored=0,exited=0,mapToggles=0,menu=false;const sounds=[],listeners=new Map();
 class Node{constructor(){this.children=[];this.dataset={};}setAttribute(){}append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}getContext(){return {};}remove(){this.removed=true;}addEventListener(){}}
 const viewport=new Node(),status=new Node();viewport.append(status);
 const host={viewport,status,isPaused:()=>menu,openMenu:()=>{menu=true;},handleInput:a=>{if(!menu)return false;if(a==='cancel')menu=false;return true;}};
 const context={mapOriginalId,isV2Session,createSpecialMapV2Session,confirmV2Cell,switchV2Floor,getV2StairPrompt,completeV2KeyChest,cancelV2KeyChest,setWallColor(){},setFloorColor(){},getSpecialMapContext:()=>null,getSpecialMapHost:()=>host,attachSpecialMap:()=>()=>{},describeTestMap:()=>({name:'地図'}),continueSpecialAutoWalker(){},createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall,specialDoorState,openSpecialDoorAhead,flushSpecialSurvey,drawMinimap,getMinimapBounds(){},toggleMinimapOverlay(){mapToggles++;},performance:{now:()=>0},
  useSpecialMapRenderSource:options=>{bound=options;return ()=>restored++;},document:{addEventListener(){},removeEventListener(){},createElement:()=>new Node()},window:{addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)}};
 vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,'').replace('export function','function')+';this.start=startSpecialMapExploration;',context);
 const options={playSe:id=>sounds.push(id),saveSurvey:()=>({ok:true}),registered:[map],mapKey:mapOriginalId(map),message:{},onExit:()=>exited++};
 const ui=context.start(options);assert.equal(bound.state,ui.session.renderState);assert.equal(bound.getRoamingEnemyRenderState(),null);
 assert.equal(viewport.children.at(-1).children.length,2,'only canvas and shared HUD, no dedicated buttons');
 assert.equal(ui.session.renderState.overlayEvent.specialMapTitle,true);ui.input('confirm');
 ui.input('map');assert.equal(mapToggles,1);
 ui.session.autoPath=['E'];ui.input('up');assert.equal(ui.session.autoPath,null);assert.deepEqual(sounds,['step']);ui.input('cancel');assert.equal(menu,true);assert.equal(exited,0);
 bound.updateAnimation(170);assert.ok(ui.session.motion,'menu pauses exploration');ui.input('cancel');bound.updateAnimation(170);assert.equal(ui.session.motion,null);
 assert.ok(ui.finish());assert.equal(exited,1);assert.equal(restored,1);assert.equal(listeners.size,0);ui.close();assert.equal(restored,1);
 let notices=0;const almost='fffffe'+'f'.repeat(19);
 const complete=context.start({...options,registered:[{...map,surveyedMask:almost}],message:{set textContent(text){if(text.includes('地図の調査が完了した'))notices++;}}});
 bound.updateHud();bound.updateHud();assert.equal(notices,1);assert.equal(complete.session.surveyedCount,100);assert.equal(bound.getMinimapOptions().explored.flat().filter(Boolean).length,100);assert.equal(complete.session.explored.flat().filter(Boolean).length,1);complete.close();
 const failed=context.start({...options,saveSurvey:()=>({ok:false})});assert.equal(failed.finish(),false);assert.equal(exited,1);assert.ok(failed.session.surveyError);failed.close();
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
