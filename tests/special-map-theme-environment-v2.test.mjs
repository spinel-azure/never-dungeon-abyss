import test from 'node:test';
import assert from 'node:assert/strict';
import {applyV2ThemeStep,isV2TorchRestricted,syncV2ThemeEnvironment,getV2ThemeBattleOptions} from '../js/special-map/theme-environment-v2.js';
import {resolveSpecialFieldItem,resolveSpecialFieldSkill} from '../js/special-map/field-environment.js';
import {getV2StairImage} from '../js/special-map/stair-presentation-v2.js';
import {createSpecialMapV2Session,switchV2Floor} from '../js/special-map/session-v2.js';
import {actSpecialMap,updateSpecialMotion} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {createInitialCharacter} from '../data/classes.js';
import {grantItem} from '../data/inventory.js';
const s=themeId=>({kind:'specialMapV2',generatedMap:{themeId,entrance:{x:0,y:0}},playerX:0,playerY:0,renderState:{torchFuel:0},torchFuel:100});
const player=()=>({...createInitialCharacter({name:'QA',job:'mage'}),hp:10,sp:10,maxHp:100,maxSp:100,crystalFloorStepCount:2});
test('red/blue steps use nonlethal one HP and both legacy/instance boot immunities',()=>{
 for(const [theme,boots] of [['red','fireproof_boots'],['blue','coldproof_boots']]){
  const c=player(),before=structuredClone(c);assert.equal(applyV2ThemeStep(c,s(theme)).character.hp,9);assert.deepEqual(c,before);
  assert.equal(applyV2ThemeStep({...c,hp:1},s(theme)).hpDamage,0);
  assert.equal(applyV2ThemeStep({...c,equipment:{footId:boots}},s(theme)).hpDamage,0);
  assert.equal(applyV2ThemeStep({...c,equippedInstanceIds:{footId:'boots-1'},equipmentInventory:{instances:[{instanceId:'boots-1',equipmentId:boots}]}},s(theme)).hpDamage,0);
  assert.equal(applyV2ThemeStep({...c,equipment:{footId:theme==='red'?'coldproof_boots':'fireproof_boots'}},s(theme)).hpDamage,1);
 }
});
test('crystal drains one SP every three actual steps and keeps ordinary counter independent',()=>{
 const session=s('crystal');let c=player();
 for(let i=1;i<=6;i++){const r=applyV2ThemeStep(c,session);assert.equal(r.spDamage,i%3===0?1:0);assert.equal(r.character.crystalFloorStepCount,2);c=r.character;}
 assert.equal(c.sp,8);c.sp=0;for(let i=0;i<3;i++)c=applyV2ThemeStep(c,session).character;assert.equal(c.sp,0);
 const other=s('green');other.crystalFloorStepCount=2;assert.equal(applyV2ThemeStep(c,other).spDamage,0);assert.equal(other.crystalFloorStepCount,0);
 for(const theme of ['slate','magic','torture','green','yellow','water','gold','rice','dusk','tender']){const p=player();assert.deepEqual(applyV2ThemeStep(p,s(theme)).character,p);}
});
test('black torch lock, Lichtbringer exception, permanent light, and blocked item/skill consumption',()=>{
 let c=player();c.inventory=grantItem(c.inventory,'guiding_torch',2).inventory;c.skillIds=['staff_light'];
 const session=s('black'),before=structuredClone(c);
 assert.equal(syncV2ThemeEnvironment(session,c),'black');assert.equal(session.torchFuel,0);assert.equal(isV2TorchRestricted(session,c),true);
 assert.equal(resolveSpecialFieldItem({character:c,itemId:'guiding_torch',session}).accepted,false);
 assert.equal(resolveSpecialFieldSkill({character:c,skillId:'staff_light',session}).accepted,false);assert.deepEqual(c,before);
 syncV2ThemeEnvironment(session,c,{effectForced:true});assert.equal(session.torchFuel,0);assert.equal(session.renderState.torchEffectForced,true);
 assert.deepEqual(getV2ThemeBattleOptions(session,c),{concealed:false,ambush:false});
 syncV2ThemeEnvironment(session,c);assert.deepEqual(getV2ThemeBattleOptions(session,c),{concealed:true,ambush:true});
 assert.deepEqual(getV2ThemeBattleOptions(session,{...c,cards:{deckSlots:['zodiac_aries']}}),{concealed:true,ambush:false});
 assert.equal(getV2ThemeBattleOptions(session,c,{boss:true}).ambush,false);
 c.keyItems={owned:{lichtbringer:true}};assert.equal(syncV2ThemeEnvironment(session,c),'light');assert.equal(isV2TorchRestricted(session,c),false);
 assert.equal(resolveSpecialFieldItem({character:c,itemId:'guiding_torch',session}).accepted,true);
 assert.equal(resolveSpecialFieldSkill({character:c,skillId:'staff_light',session}).accepted,true);
 const v1={...session,kind:'specialMap'};assert.equal(isV2TorchRestricted(v1,before),false);assert.deepEqual(applyV2ThemeStep(before,v1).character,before);
});
test('environment hook runs once at completed movement, never at turn, blocked move, entry or floor transfer',()=>{
 const map={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'WHITE',discovererName:'QA'};
 let steps=0;const session=createSpecialMapV2Session([map],mapOriginalId(map),{onEnvironmentStep:()=>steps++});
 try{
  assert.equal(steps,0);actSpecialMap(session,'left',0);updateSpecialMotion(session,1000);assert.equal(steps,0);
  session.direction=['N','E','S','W'].findIndex(dir=>!session.cells[session.playerY][session.playerX].walls[dir]);
  assert.ok(actSpecialMap(session,'up',2000));updateSpecialMotion(session,2001);assert.equal(steps,0);updateSpecialMotion(session,3000);assert.equal(steps,1);updateSpecialMotion(session,4000);assert.equal(steps,1);
  session.cellPrompt=null;session.direction=['N','E','S','W'].findIndex(dir=>session.cells[session.playerY][session.playerX].walls[dir]);assert.equal(actSpecialMap(session,'up',5000),false);assert.equal(steps,1);
  switchV2Floor(session,session.blueprint.links[0].lower);assert.equal(steps,1);
 }finally{session.disposeSurvey();}
});
test('stairs select exit/up/down by actual cell and floor; ordinary cells and legacy have no image',()=>{
 const session={...s('red'),currentFloor:0,playerX:1,playerY:2,generatedMap:{stairsUp:{x:1,y:2},stairsDown:{x:3,y:4}}};
 assert.match(getV2StairImage(session).src,/\/exit.avif$/);session.currentFloor=1;assert.match(getV2StairImage(session).src,/\/up_stairs.avif$/);
 session.playerX=3;session.playerY=4;assert.match(getV2StairImage(session).src,/\/down_stairs.avif$/);
 session.playerX=5;assert.equal(getV2StairImage(session),null);session.kind='specialMap';assert.equal(getV2StairImage(session),null);
});
