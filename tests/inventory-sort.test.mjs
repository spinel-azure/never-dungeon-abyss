import test from 'node:test';import assert from 'node:assert/strict';
import {ITEMS} from '../data/items.js';import {sortInventoryEntries} from '../data/inventory-sort.js';
import {grantItem,consumeItem,normalizeInventory} from '../data/inventory.js';
const entries=ids=>ids.map(id=>({item:ITEMS.find(i=>i.id===id)}));
test('category sort places recovery before exploration and treats antidote as a cure',()=>{
 const expected=['healing_potion','wing_gift','antidote','warding_incense','exorcism_talisman','guiding_torch','auto_walker','emergency_escape'];
 const original=entries([...expected].reverse());assert.deepEqual(sortInventoryEntries(original).map(e=>e.item.id),expected);assert.equal(original[0].item.id,'emergency_escape');
});
test('first acquisition order survives consumption, reacquisition and reload; missing history uses item number',()=>{
 let inventory=grantItem(null,'warding_incense').inventory;inventory=grantItem(inventory,'healing_potion').inventory;
 inventory=consumeItem(inventory,'warding_incense').inventory;inventory=grantItem(inventory,'warding_incense').inventory;
 inventory=normalizeInventory(JSON.parse(JSON.stringify(inventory)));
 const list=entries(['antidote','healing_potion','warding_incense','guiding_torch']);
 assert.deepEqual(sortInventoryEntries(list,'obtained',inventory.discoveredItemIds).map(e=>e.item.id),['warding_incense','healing_potion','antidote','guiding_torch']);
 assert.deepEqual(sortInventoryEntries(list,'id').map(e=>e.item.number),[1,2,3,56]);
});
