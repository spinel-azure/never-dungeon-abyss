import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {getEnemyById} from '../data/enemies.js';
import {createBattleState,createPlayerAction,resolveBattleRound} from '../combat/battle-engine.js';
import {hasValidItemElements} from '../combat/item-elements.js';
import {clearBattleOnlyStatuses} from '../combat/status-lifecycle.js';
const oils={fire:'fire_lizard_oil',ice:'ice_lizard_oil',lightning:'lightning_lizard_oil'};
function setup(){const c=normalizeCharacter({...createInitialCharacter({name:'TEST',job:'warrior'}),level:197});c.hp=c.maxHp=9999;c.sp=c.maxSp=9999;c.cards.deckSlots=[];for(const id of [...Object.values(oils),'healing_potion_medium','scorching_barrier'])c.inventory=grantItem(c.inventory,id,4).inventory;const enemy=structuredClone(getEnemyById('fire_spirit'));enemy.hp=enemy.maxHp=99999;enemy.alive=true;return createBattleState({character:c,enemy});}
function use(b,id){return resolveBattleRound({battle:b,playerCommand:{type:'item',itemId:id},rng:()=>.1});}
for(const [element,id] of Object.entries(oils))test(`${element} oil flows through use, attack, physical skill and rejection`,()=>{
  const result=use(setup(),id);assert.equal(result.accepted,true);const b=result.battle;
  assert.equal(b.player.statuses.find(s=>s.id==='weapon_element_imbue').element,element);
  assert.equal(createPlayerAction(b.player,{type:'attack'}).action.element,element);
  const skill=createPlayerAction(b.player,{type:'skill',skillId:'wide_swing'});assert.equal(skill.ok,true);assert.equal(skill.action.element,element);
  assert.equal(getItemCount(b.player.inventory,id),3);
  const turn=b.turn;const rejected=use(b,id);assert.equal(rejected.accepted,false);assert.equal(rejected.reason,'alreadyActive');assert.equal(b.turn,turn);assert.equal(getItemCount(b.player.inventory,id),3);
  const label={fire:'炎',ice:'氷',lightning:'雷'}[element];assert.ok(b.presentationEvents.some(e=>e.type==='itemUse'&&e.message.includes(`武器に${label}属性が付与された！`)));
  for(const [other,otherId] of Object.entries(oils))if(other!==element){assert.equal(createPlayerAction(b.player,{type:'item',itemId:otherId},b.enemy).ok,true);const updated=use(b,otherId).battle;assert.equal(updated.player.statuses.filter(s=>s.id==='weapon_element_imbue').length,1);assert.equal(createPlayerAction(updated.player,{type:'attack'}).action.element,other);assert.equal(createPlayerAction(updated.player,{type:'item',itemId:otherId},updated.enemy).reason,'alreadyActive');}
  const attack=resolveBattleRound({battle:b,playerCommand:{type:'attack'},rng:()=>.1}).battle;
  const hits=attack.presentationEvents.filter(e=>e.actorSide==='player'&&e.type==='attackHit');assert.ok(hits.length);const damage=hits.reduce((n,e)=>n+(e.damage||0),0);assert.equal(element==='fire'?damage===0:damage>0,true);
  const skillRound=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId:'wide_swing'},rng:()=>.1}).battle;
  const skillHits=skillRound.presentationEvents.filter(e=>e.actorSide==='player'&&e.type==='attackHit');assert.ok(skillHits.length);const skillDamage=skillHits.reduce((n,e)=>n+(e.damage||0),0);assert.equal(element==='fire'?skillDamage===0:skillDamage>0,true);
  const cleaned={...b.player,statuses:clearBattleOnlyStatuses(b.player.statuses)};assert.equal(createPlayerAction(cleaned,{type:'attack'}).action.element,'physical');
});
test('item presentation includes actual healing and barrier reduction',()=>{let b=setup();b.player.hp=1;b=use(b,'healing_potion_medium').battle;assert.match(b.presentationEvents.find(e=>e.type==='itemUse').message,/回復薬（中）を使用した！\nHP60回復！/);b=use(b,'scorching_barrier').battle;assert.match(b.presentationEvents.find(e=>e.type==='itemUse').message,/炎属性のダメージを30％軽減/);});
test('invalid oil and barrier elements are not silently converted to fire',()=>{assert.equal(hasValidItemElements({effects:[{id:'weapon_element_imbue',element:'invalid'}]}),false);assert.equal(hasValidItemElements({effects:[{id:'element_barrier',element:'invalid'}]}),false);});
