import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCharacter, normalizeCharacter } from '../data/classes.js';
import { getCardById as getCard } from '../data/cards.js';
import { normalizeCardState, calculateDeckCost } from '../data/deck.js';
import { rollPurpleChestLoot } from '../data/loot.js';
import { getPlayerWeaponElement, getEquippedWeaponElement } from '../combat/weapon-element.js';
import { renderWeaponElementStatus } from '../js/weapon-element-status.js';
import { createBattleState, createPlayerAction, resolveBattleRound } from '../combat/battle-engine.js';
import { getEnemyById } from '../data/enemies.js';
import { getExplorationObstacleRemovalOptions as options, resolveExplorationObstacleRemoval as remove } from '../data/exploration-obstacles.js';

const character = () => createInitialCharacter({name:'QA',job:'mage'});
test('holy and dark armaments reach real normal attacks and physical skill rounds', () => {
  for(const [id,element] of [['sr_holy_armament','holy'],['sr_dark_armament','dark']]) {
    const c=normalizeCharacter({...createInitialCharacter({name:'QA',job:'warrior'}),level:197});
    c.cards.deckSlots=[id];c.hp=c.maxHp=9999;c.sp=c.maxSp=9999;
    const enemy=structuredClone(getEnemyById('fire_spirit'));enemy.hp=enemy.maxHp=99999;
    const battle=createBattleState({character:c,enemy});
    for(const command of [{type:'attack'},{type:'skill',skillId:'wide_swing'}]) {
      const action=createPlayerAction(battle.player,command);
      assert.equal(action.ok,true);assert.equal(action.action.element,element);
      const result=resolveBattleRound({battle,playerCommand:command,rng:()=>.1});
      assert.equal(result.accepted,true);
      assert.ok(result.battle.presentationEvents.some(e=>e.type==='attackHit' && e.actorSide==='player' && e.damage>0));
    }
  }
});
test('new armaments share weapon resolution, intrinsic priority and requested quick-status icons', () => {
  const oldDocument = globalThis.document;
  const icon = {style:{}};
  globalThis.document = { getElementById: id => id === 'quickJob' ? {after(){}} : icon };
  try {
    for (const [id,element,image] of [['sr_holy_armament','holy','04'],['sr_dark_armament','dark','05']]) {
      const c = character(); c.cards.deckSlots = [id];
      assert.equal(getEquippedWeaponElement(c),element);
      assert.equal(getPlayerWeaponElement(c,{element:'physical'}),element);
      renderWeaponElementStatus(c);
      assert.equal(icon.src,`images/ui/effect_${image}.webp`);
      assert.equal(icon.hidden,false);
      for (const intrinsic of ['fire','ice','lightning','holy','dark']) {
        assert.equal(getPlayerWeaponElement(c,{weapon:{element:intrinsic}}),intrinsic);
      }
      c.equipment.rightArmId='glacies_hammer';
      renderWeaponElementStatus(c);
      assert.equal(icon.src,'images/ui/effect_02.webp');
      assert.equal(options(c,'dark_orb').canUseWeapon,false);
    }
  } finally { globalThis.document=oldDocument; }
});

test('crystal smashing clamps SP and cannot be bypassed by Johan or Erika', () => {
  for (const sp of [0,1,9,10,20]) for (const activeIds of [[],['johan'],['erika'],['johan','erika']]) {
    const c=character(); c.sp=sp; c.npcSystem={activeIds};
    assert.equal(options(c,'crystal_cluster').canUseWeapon,true);
    const result=remove(c,'crystal_cluster','weapon');
    assert.equal(result.accepted,true); assert.equal(result.character.sp,Math.max(0,sp-10));
    assert.equal(c.sp,sp);
    for(const method of ['magic','johan','erika','oil']) assert.equal(remove(c,'crystal_cluster',method).accepted,false);
  }
});

test('dark orb requires holy weapon or accompanying Erika, never Johan or generic magic', () => {
  const c=character(); c.sp=30;
  for(const id of ['','sr_dark_armament','sr_flame_armament','sr_ice_armament','sr_lightning_armament']) {
    c.cards.deckSlots=id?[id]:[];
    assert.equal(remove(c,'dark_orb','weapon').accepted,false);
  }
  c.cards.deckSlots=['sr_holy_armament'];
  assert.equal(remove(c,'dark_orb','weapon').character,c);
  c.cards.deckSlots=[];c.npcSystem={activeIds:['johan'],registeredIds:['erika']};
  for(const method of ['weapon','magic','johan','erika']) assert.equal(remove(c,'dark_orb',method).accepted,false);
  c.npcSystem.activeIds.push('erika');
  assert.equal(remove(c,'dark_orb','erika').accepted,true);
  assert.equal(remove(c,'dark_orb','erika').character,c);
});

test('crystal purple table is exclusively 50/50 on B80 through B89', () => {
  for(let depth=80;depth<=89;depth++) {
    for(const [roll,id] of [[0,'sr_holy_armament'],[.499999,'sr_holy_armament'],[.5,'sr_dark_armament'],[.999999,'sr_dark_armament']]) assert.equal(rollPurpleChestLoot(()=>roll,depth).cardId,id);
  }
  for(const depth of [1,10,29,69,70,79,90,99,100]) for(const roll of [0,.49,.5,.99]) assert.ok(!['sr_holy_armament','sr_dark_armament'].includes(rollPurpleChestLoot(()=>roll,depth).cardId));
});

test('new cards retain SR cost, one-copy limits and normalized serialized deck state', () => {
  for(const id of ['sr_holy_armament','sr_dark_armament']) {
    const card=getCard(id);
    assert.equal(card.rarity,'SR');assert.equal(card.cost,4);assert.equal(card.maxOwned,1);assert.equal(card.maxCopies,1);
    assert.equal(card.exclusiveGroup,'weapon_element_imbue');
    assert.equal(card.sellPrice,5000);assert.equal(card.buybackPrice,50000);
    const state=normalizeCardState({ownedCardCounts:{[id]:3},deckSlots:[id,id]},100);
    assert.equal(state.ownedCardCounts[id],1);
    assert.equal(state.deckSlots.filter(x=>x===id).length,1);
    assert.equal(calculateDeckCost(state.deckSlots),4);
    assert.deepEqual(normalizeCardState(JSON.parse(JSON.stringify(state)),100),state);
  }
});
