import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {KEY_ITEMS} from '../data/key-items.js';
const source=readFileSync(new URL('../js/menu.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('function handleInventory(action)'),source.indexOf('function toggleSelectedEquipmentLock'));
function setup(keyItem,context,code=handler){
 const menu={view:'inventory',inventoryPurpose:'manage',inventoryMode:'list',inventoryFocus:'list',inventoryCursor:0,inventoryPage:1,inventoryPendingUseId:'',getInventoryContext:()=>context};
 const sandbox={menu,inventoryEntries:()=>[{keyItem}],inventoryPageSize:()=>10,renderInventory(){},updateView(){},canSortInventory:()=>false};
 vm.runInNewContext(code+';this.input=handleInventory;',sandbox);return sandbox;
}
test('regression: old key-item confirm accesses missing equipment instance',()=>{
 const old=handler.replace('  if (entry.keyItem) return;','');const s=setup({id:'stamp_book'},'town',old);
 assert.throws(()=>s.input('confirm'),/slot/);
});
for(const context of ['town','dungeon'])test(`every key item can be confirmed repeatedly and cancelled in ${context}`,()=>{
 for(const keyItem of Object.values(KEY_ITEMS)){
  const s=setup(keyItem,context);s.input('confirm');s.input('confirm');
  assert.equal(s.menu.inventoryMode,'list',keyItem.id);assert.equal(s.menu.inventoryFocus,'list');assert.equal(s.menu.inventoryPendingUseId,'');
  s.input('cancel');assert.equal(s.menu.view,'commands',keyItem.id);
 }
});
