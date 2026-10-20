import test from 'node:test';
import assert from 'node:assert/strict';
import {REINCARNATION_ARMOR} from '../data/reincarnation-armor.js';
import {createInitialCharacter} from '../data/classes.js';
import {grantEquipmentInstance,getEquipmentInstanceDefinition} from '../data/equipment-inventory.js';
import {sellEquipmentInstance} from '../data/commerce.js';
import {getShopEquipmentStock} from '../data/shop-stock.js';
import {getEquipmentHighlightClass} from '../js/loot-identification.js';

test('48 reincarnation armor resale prices, actual sale, +3 highlight and no shop offers',()=>{
  const items=Object.values(REINCARNATION_ARMOR);
  assert.equal(items.length,48);
  for(const item of items) {
    assert.equal(item.buyPrice,undefined);
    for(const enhancement of [0,1,2,3]) {
      const c=createInitialCharacter({name:'検証',job:item.allowedJobs[0]});
      const grant=grantEquipmentInstance(c,item.id,item.slot,{enhancement});
      assert.ok(grant.accepted);
      const def=getEquipmentInstanceDefinition(grant.instance);
      const expected={
        1:[7000,8500,11000,20000],
        2:[8000,9500,12000,25000],
        3:[9000,11500,13000,30000]
      }[item.minimumReincarnations][enhancement];
      assert.equal(def.sellPrice,expected);
      assert.equal(getEquipmentHighlightClass(grant.instance,def),enhancement===3?'is-super-rare':'');
      const sold=sellEquipmentInstance(grant.character,grant.instance.instanceId);
      assert.ok(sold.accepted,sold.reason);
      assert.equal(sold.value,expected);
      assert.equal(sold.character.gold-grant.character.gold,expected);
      assert.ok(!sold.character.equipmentInventory.instances.some(x=>x.instanceId===grant.instance.instanceId));
    }
  }
  for(const job of ['warrior','thief','priest','mage']) {
    const stock=getShopEquipmentStock({...createInitialCharacter({name:'検証',job}),highestDungeonDepthReached:100});
    assert.ok(!stock.some(x=>REINCARNATION_ARMOR[x.equipmentId]));
  }
});
