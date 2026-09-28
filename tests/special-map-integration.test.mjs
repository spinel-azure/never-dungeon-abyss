import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,openSpecialDoorAhead,startSpecialAutoWalker,continueSpecialAutoWalker,getSpecialAutoAvailability} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {getSpecialMapBgmKey} from '../js/special-map/context.js';
import {resolveSpecialFieldItem,resolveSpecialFieldSkill,applySpecialFieldEnvironment,SPECIAL_FIELD_EFFECT_TARGETS} from '../js/special-map/field-environment.js';
import {ITEMS} from '../data/items.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
const original={rulesetVersion:'special-map-v1',seed:12345,discovererName:'†ルル'};
const create=options=>createSpecialMapSession([original],mapOriginalId(original),options);
test('theme music uses existing keys',()=>{
 for(const theme of ['slate','magic','torture','red','blue','water','crystal','black'])assert.equal(getSpecialMapBgmKey(theme),'dungeon');
 assert.equal(getSpecialMapBgmKey('green'),'jungleZone');assert.equal(getSpecialMapBgmKey('yellow'),'desertZone');
});
test('torch consumes only completed steps, including revisits; no negative fuel or runtime persistence',()=>{
 const s=create();assert.equal(s.renderState.torchFuel,100);
 assert.ok(actSpecialMap(s,'up',0));assert.equal(s.renderState.torchFuel,100);assert.equal(actSpecialMap(s,'up',1),false);updateSpecialMotion(s,170);assert.equal(s.renderState.torchFuel,99);
 assert.ok(actSpecialMap(s,'down',200));updateSpecialMotion(s,370);assert.equal(s.renderState.torchFuel,98);
 actSpecialMap(s,'left',400);updateSpecialMotion(s,570);assert.equal(s.renderState.torchFuel,98);
 const door=s.doorLayout.doors[0];s.playerX=door.x;s.playerY=door.y;s.direction=door.dir==='E'?1:2;
 assert.equal(actSpecialMap(s,'up',600),false);assert.equal(s.renderState.torchFuel,98);
 assert.ok(openSpecialDoorAhead(s,600));updateSpecialMotion(s,1120);assert.equal(s.renderState.torchFuel,98);
 s.renderState.torchFuel=0;actSpecialMap(s,'up',1200);updateSpecialMotion(s,1370);assert.equal(s.renderState.torchFuel,0);assert.equal(create().renderState.torchFuel,100);
});
test('auto walker follows surveyed paths, opens and recloses doors, stops at entrance without exiting',()=>{
 const sounds=[],messages=[],s=create({playSe:id=>sounds.push(id),say:m=>messages.push(m)});
 assert.equal(startSpecialAutoWalker(s),false);
 // A fully surveyed map knows the route but runtime exploration remains separate.
 s.surveyView=Array.from({length:10},()=>Array(10).fill(true));const e=s.generatedMap.exit;s.playerX=e.x;s.playerY=e.y;
 assert.ok(startSpecialAutoWalker(s));const steps=s.autoPath.length;assert.ok(steps>0);
 let now=0;for(let n=0;n<1000&&s.autoPath;n++){now+=600;updateSpecialMotion(s,now);continueSpecialAutoWalker(s,now);}
 assert.equal(s.autoPath,null);assert.equal(s.playerX,s.generatedMap.entrance.x);assert.equal(s.playerY,s.generatedMap.entrance.y);
 assert.equal(s.renderState.torchFuel,Math.max(0,100-steps));assert.equal(s.openedDoors.size,0);assert.equal(sounds.filter(v=>v==='step').length,steps);assert.ok(sounds.includes('door'));assert.ok(messages.includes('入口へ戻った。'));
 s.playerX=e.x;s.playerY=e.y;s.surveyView=Array.from({length:10},()=>Array(10).fill(false));assert.equal(getSpecialAutoAvailability(s).accepted,false);
});
test('field torch applies only to special runtime; presence items reject without consuming',()=>{
 const s=create(),character={hp:20,maxHp:20,sp:20,maxSp:20,inventory:{counts:{guiding_torch:2,warding_incense:2}}};
 s.renderState.torchFuel=42;const result=resolveSpecialFieldItem({character,itemId:'guiding_torch',session:s});assert.equal(result.accepted,true);assert.ok(applySpecialFieldEnvironment(s,result.environment));assert.equal(s.renderState.torchFuel,100);
 const before=structuredClone(character);assert.equal(resolveSpecialFieldItem({character,itemId:'warding_incense',session:s}).accepted,false);assert.deepEqual(character,before);
});
test('field skills restore special torch and route auto walking, rejecting presence before SP cost',()=>{
 const s=create(),character={hp:20,maxHp:20,sp:100,maxSp:100,skillIds:['staff_light','full_sprint','conceal_presence'],statuses:[]};
 s.renderState.torchFuel=20;
 const light=resolveSpecialFieldSkill({character,skillId:'staff_light',session:s});assert.equal(light.accepted,true);assert.ok(applySpecialFieldEnvironment(s,light.environment));assert.equal(s.renderState.torchFuel,70);assert.equal(light.character.sp,96);
 actSpecialMap(s,'up',0);updateSpecialMotion(s,170);
 const run=resolveSpecialFieldSkill({character,skillId:'full_sprint',session:s});assert.equal(run.accepted,true);assert.ok(applySpecialFieldEnvironment(s,run.environment));assert.ok(s.autoPath.length);assert.equal(run.character.sp,70);
 const before=structuredClone(character);assert.equal(resolveSpecialFieldSkill({character,skillId:'conceal_presence',session:s}).accepted,false);assert.deepEqual(character,before);
});
test('ordinary renderer darkness gates fully surveyed minimap without destroying knowledge',()=>{
 const source=readFileSync(new URL('../js/renderer.js',import.meta.url),'utf8');
 const section=source.slice(source.indexOf('function hasEffectiveTorch'),source.indexOf('function drawMinimapStatic'));
 const scope={};vm.runInNewContext(section+';this.visible=hasEffectiveMinimap;',scope);
 const s=create();s.surveyView=Array.from({length:10},()=>Array(10).fill(true));s.surveyComplete=true;
 assert.equal(scope.visible(s.renderState),true);s.renderState.torchFuel=0;assert.equal(scope.visible(s.renderState),false);assert.equal(s.surveyView.flat().filter(Boolean).length,100);
 s.renderState.torchFuel=100;assert.equal(scope.visible(s.renderState),true);
});
test('every current dungeon field item has an explicit effect destination',()=>{
 for(const item of ITEMS.filter(i=>i.usableIn.includes('dungeon')))for(const e of item.effects)assert.ok(SPECIAL_FIELD_EFFECT_TARGETS[e.id],`${item.id}: ${e.id}`);
 const s=create(),character={hp:10,maxHp:100,sp:5,maxSp:100,inventory:{counts:Object.fromEntries(ITEMS.map(i=>[i.id,2]))},statuses:[{statusId:'poison'},{statusId:'bleeding'}],incenseZone:'ordinary-zone'};
 for(const itemId of ['warding_incense','exorcism_talisman','treasure_compass']){
  const before=structuredClone(character),result=resolveSpecialFieldItem({character,itemId,session:s});
  assert.equal(result.accepted,false);assert.equal(result.reason,'noEffect');assert.deepEqual(character,before);
 }
 for(const itemId of ['healing_potion','healing_potion_medium','healing_potion_large','strong_healing_potion_small','strong_healing_potion_medium','antidote','antidote_medium','strong_antidote','styptic','allheilmittel','zaubertrank','wing_gift']){
  const before=structuredClone(character),result=resolveSpecialFieldItem({character,itemId,session:s});
  assert.equal(result.accepted,true,itemId);assert.deepEqual(result.environment,{},itemId);assert.equal(result.character.inventory.counts[itemId]||0,Math.min(2,ITEMS.find(i=>i.id===itemId).maxOwned)-1,itemId);assert.deepEqual(character,before);assert.equal(result.character.incenseZone,'ordinary-zone');
 }
 const escape=resolveSpecialFieldItem({character,itemId:'emergency_escape',session:s});assert.equal(escape.accepted,true);assert.deepEqual(escape.environment,{emergencyEscape:true});
});
test('main field dispatcher saves adventurer changes without accessing ordinary environment',async()=>{
 const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('  async function useSpecialFieldEffect('),source.indexOf('  configureSpecialMapHost({'));
 const s=create();let saves=0,returns=0;const c=createInitialCharacter({name:'QA',job:'warrior'});c.hp=1;c.inventory.counts={healing_potion:2,exorcism_talisman:2,emergency_escape:2};
 const scope={character:c,getSpecialMapContext:()=>({session:s,finish:()=>returns++}),resolveSpecialFieldItem,resolveSpecialFieldSkill,applySpecialFieldEnvironment,flushSpecialSurvey:()=>true,
  state:new Proxy({},{get(){assert.fail('ordinary dungeon accessed');},set(){assert.fail('ordinary dungeon changed');}}),say(){},playSe(){},updateCharacterUi(){},updateHud(){},saveGame:()=>{saves++;return true;},closeCampMenu(){}};
 vm.runInNewContext(body+';this.use=useSpecialFieldEffect;',scope);
 assert.equal((await scope.use('item','healing_potion')).accepted,true);assert.ok(scope.character.hp>1);assert.equal(saves,1);
 assert.equal((await scope.use('item','exorcism_talisman')).accepted,false);assert.equal(scope.character.inventory.counts.exorcism_talisman,2);assert.equal(saves,1);
 scope.flushSpecialSurvey=()=>false;assert.equal((await scope.use('item','emergency_escape')).accepted,false);assert.equal(returns,0);assert.equal(scope.character.inventory.counts.emergency_escape,2);
 scope.flushSpecialSurvey=()=>true;assert.equal((await scope.use('item','emergency_escape')).accepted,true);assert.equal(returns,1);
});
test('Wing Gift expires on special return; failed saving preserves the adventurer',()=>{
 const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('    beforeReturn:()=>{')+'    beforeReturn:()=>{'.length,source.indexOf('    leave:()=>{')).replace(/},\s*$/,'');
 const c=createInitialCharacter({name:'QA',job:'warrior'});c.sp=0;c.inventory.counts.wing_gift=1;
 const result=resolveSpecialFieldItem({character:c,itemId:'wing_gift',session:create()});assert.equal(result.character.wingGiftUses,1);
 const scope={character:result.character,normalizeCharacter,saveGame:()=>false,say(){},updateCharacterUi(){}};
 vm.runInNewContext('this.finish=()=>{'+body+'};',scope);const before=scope.character;
 assert.equal(scope.finish(),false);assert.equal(scope.character,before);
 scope.saveGame=()=>true;assert.equal(scope.finish(),true);assert.equal(scope.character.wingGiftUses,0);assert.equal(scope.character.maxHp,c.maxHp);
});
