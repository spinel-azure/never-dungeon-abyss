import {ITEMS} from './items.js';
import {WEAPONS} from './weapons.js';
import {EQUIPMENT} from './equipment.js';
import {CARDS} from './cards.js';
import {ITEM_COMPENDIUM_ENTRIES} from './item-compendium.js';

// Metadata only. Combat stats, prices and card effects remain in their source definitions.
export function createChestCatalog() {
  const make=(kind,x,extra={})=>{
    const acquisition=ITEM_COMPENDIUM_ENTRIES[x.id]?.acquisition || x.source || '';
    const notices=[];
    if(x.unique)notices.push('固有装備・重複所持制限あり');
    if(x.cursed)notices.push('呪い装備');
    if(['Z','G'].includes(x.rarity))notices.push('特殊レアリティ：採用方針未確定');
    if(x.acquisition)notices.push('入手条件定義：'+JSON.stringify(x.acquisition));
    if(/event|quest|special|keyItem|イベント|依頼|非売|ボス/.test(acquisition))notices.push('特殊入手：'+acquisition);
    if(x.shopUnlockDepth)notices.push('商店解禁：B'+x.shopUnlockDepth+'F');
    return {kind,id:x.id,name:x.nameJa||x.name,category:x.category||x.weaponTypeLabel||x.type||x.slot||'未分類',rarity:x.rarity||'定義なし',acquisition,unique:!!x.unique,notices,...extra};
  };
  return {catalogVersion:1,candidates:[
    ...ITEMS.map(x=>make('item',x)),
    ...Object.values(WEAPONS).map(x=>make('equipment',x,{slot:'rightArmId',allowedEnhancements:x.unique||x.cursed?[0]:[0,1,2,3]})),
    ...Object.values(EQUIPMENT).map(x=>make('equipment',x,{slot:x.slot,allowedEnhancements:x.unique||x.cursed?[0]:[0,1,2,3]})),
    ...CARDS.map(x=>make('card',x))
  ]};
}
