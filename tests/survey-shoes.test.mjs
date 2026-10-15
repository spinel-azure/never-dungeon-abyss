import test from 'node:test';
import assert from 'node:assert/strict';
import {getEquipmentItem} from '../data/equipment.js';
import {grantEquipmentInstance} from '../data/equipment-inventory.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getEquipmentHighlightClass} from '../js/loot-identification.js';
import {getFireFloorStepDamage} from '../data/fire-floor.js';
import {getColdFloorStepDamage} from '../data/cold-floor.js';
import {applyCrystalFloorSpStep} from '../data/crystal-floor.js';
import {applyV2ThemeStep} from '../js/special-map/theme-environment-v2.js';
const id='alveter_schuhe';
test('survey shoes are unique orange DEF5 feet, available to 250p exchange',()=>{
 const item=getEquipmentItem(id,'footId');assert.equal(item.name,'アルヴェターシューエ');assert.deepEqual(item.statBonuses,{def:5});assert.equal(item.description,'各種床ダメージ無効');
 assert.equal(item.surveyExchangeCost,250);assert.equal(item.surveyExchangeOnce,true);assert.equal(item.acquisitionSource,'surveyExchange');
 const c=createInitialCharacter({name:'試験',job:'thief'}),r=grantEquipmentInstance(c,id,'footId');assert.equal(r.accepted,true);
 assert.equal(getEquipmentHighlightClass(r.instance,item),'is-special-unique');
 assert.equal(grantEquipmentInstance(r.character,id,'footId').reason,'alreadyOwned');
 const loaded=normalizeCharacter(JSON.parse(JSON.stringify(r.character)));assert.ok(loaded.equipmentInventory.instances.some(i=>i.equipmentId===id));
});
for(const modern of [false,true])test(`survey shoes protect abyss and V2 floors only while equipped (${modern})`,()=>{
 const c={hp:50,sp:20,crystalFloorStepCount:2,equipment:{footId:modern?'leather_boots':id},...(modern?{equippedInstanceIds:{footId:'shoe'},equipmentInventory:{instances:[{instanceId:'shoe',equipmentId:id,slot:'footId'}]}}:{})};
 assert.equal(getFireFloorStepDamage(c,30),0);assert.equal(getColdFloorStepDamage(c,40),0);assert.equal(applyCrystalFloorSpStep(c,80).drained,0);
 for(const themeId of ['red','blue','crystal']){const s={kind:'specialMapV2',generatedMap:{themeId},crystalFloorStepCount:2};const r=applyV2ThemeStep(c,s);assert.equal(r.hpDamage,0);assert.equal(r.spDamage,0);assert.equal(r.character.hp,50);assert.equal(r.character.sp,20);}
 const unequipped={...c,equipment:{footId:'leather_boots'},equippedInstanceIds:{}};assert.equal(getFireFloorStepDamage(unequipped,30),1);assert.equal(getColdFloorStepDamage(unequipped,40),1);assert.equal(applyCrystalFloorSpStep(unequipped,80).drained,1);
});
