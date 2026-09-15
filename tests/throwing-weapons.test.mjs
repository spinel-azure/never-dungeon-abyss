import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getItem,getShopItemIdsForCharacter,getShopItemIdsForDepth} from '../data/items.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {createBossCombatant} from '../data/bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
function use(id,job,roll,deck=[],oil=null,multiplier=1.5){
 const c=createInitialCharacter({name:'QA',job});c.baseStats.dex=30;c.cards.deckSlots=deck;
 c.inventory=grantItem(c.inventory,id,2).inventory;
 const e=createBossCombatant('tiefstrom_b76f');e.def=999;e.elementMultipliers.physical=0;
 e.elementMultipliers.lightning=multiplier;
 e.actions=[{weight:1,action:{id:'wait',name:'待機',actionType:'wait'}}];
 const b=createBattleState({character:c,enemy:e});
 if(oil){b.player.inventory=grantItem(b.player.inventory,oil,1).inventory;const r=resolveBattleRound({battle:b,playerCommand:{type:'item',itemId:oil},rng:()=>roll});Object.assign(b,r.battle);}
 const r=resolveBattleRound({battle:b,playerCommand:{type:'item',itemId:id},rng:()=>roll});assert.equal(r.accepted,true);return r.battle;
}
test('throwing weapons keep fixed damage, individual accuracy, and one-item consumption for every job',()=>{
 for(const job of ['warrior','thief','priest','mage']){
  const b=use('wurfmesser',job,.1);assert.equal(b.enemy.hp,3820);assert.equal(getItemCount(b.player.inventory,'wurfmesser'),1);
  assert.equal(b.presentationEvents.filter(e=>e.type==='damage').length,3);
  assert.equal(use('wurfspeer',job,.1).enemy.hp,3500);
 }
});

test('throwing inherits lightning card or oil and applies weakness per hit without changing accuracy',()=>{
 for(const id of ['wurfmesser','wurfspeer']){
  const amount=id==='wurfmesser'?270:750;
  for(const [deck,oil] of [[['sr_lightning_armament'],null],[[],'lightning_lizard_oil']]){
   const b=use(id,'thief',.1,deck,oil);
   assert.equal(b.enemy.hp,4000-amount);
   assert.ok(b.presentationEvents.filter(e=>e.type==='damage').every(e=>e.element==='lightning'));
  }
 }
});

test('elemental throws respect resistance and immunity and still consume only one item',()=>{
 for(const multiplier of [0,.5,1]){
  const b=use('wurfspeer','thief',.1,['sr_lightning_armament'],null,multiplier);
  assert.equal(b.enemy.hp,4000-500*multiplier);
  assert.equal(getItemCount(b.player.inventory,'wurfspeer'),1);
 }
 assert.equal(use('wurfspeer','warrior',.9,['sr_lightning_armament']).enemy.hp,4000);
});
test('normal and thief DEX30 accuracy boundaries for both new items',()=>{
 for(const [id,rate,damage] of [['wurfmesser',.4,180],['wurfspeer',.6,500]]){
  assert.equal(use(id,'warrior',rate-.00001).enemy.hp,4000-damage);
  assert.equal(use(id,'warrior',rate).enemy.hp,4000);
  assert.equal(use(id,'thief',rate+.3-.00001).enemy.hp,4000-damage);
  assert.equal(use(id,'thief',rate+.3+.00001).enemy.hp,4000);
 }
});
test('knives unlock on B70 arrival, spear remains unavailable, saved quantities and caps survive',()=>{
 assert.equal(getItem('wurfmesser').buyPrice,1500);assert.equal(getItem('wurfmesser').maxOwned,99);
 assert.equal(getShopItemIdsForDepth(69).includes('wurfmesser'),false);assert.equal(getShopItemIdsForDepth(70).includes('wurfmesser'),true);
 assert.equal(getShopItemIdsForCharacter({highestDungeonDepthReached:70}).includes('wurfmesser'),true);
 assert.equal(getShopItemIdsForCharacter({highestDungeonDepthReached:99}).includes('wurfspeer'),false);
 const c=createInitialCharacter({name:'QA',job:'warrior'});c.inventory=grantItem(c.inventory,'wurfmesser',120).inventory;
 assert.equal(getItemCount(normalizeCharacter(JSON.parse(JSON.stringify(c))).inventory,'wurfmesser'),99);
});
