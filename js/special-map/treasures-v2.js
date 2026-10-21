import {streamV1,chooseIndexV1} from './random-v1.js';
import {REINCARNATION_ARMOR,REINCARNATION_ARMOR_SETS} from '../../data/reincarnation-armor.js';
import {REINCARNATION_WEAPONS} from '../../data/reincarnation-weapons.js';
import {characterOwnsEquipment} from '../../data/equipment-inventory.js';
import {EQUIPMENT} from '../../data/equipment.js';
import {addLootItem,addLootEquipment} from '../../data/inventory.js';

const themes=['green','yellow','crystal','black'];
const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y;
// Separate streams preserve the existing geometry, ecology and key chest.
export function createV2TreasureLayout(seed,level,floor){
 if(level<91||level>100||!themes.includes(floor.themeId))return [];
 const next=streamV1('special-map-v2',seed,`floor-${floor.floor}-ordinary-chests-v1`);
 const count=1+chooseIndexV1(next,3);
 const excluded=[floor.stairsUp,floor.stairsDown,floor.keyChest,floor.bossRoom?.approach,...(floor.bossRoom?.cells||[])];
 const candidates=Array.from({length:100},(_,i)=>({x:i%10,y:Math.floor(i/10)}))
  .filter(p=>!excluded.some(q=>same(p,q)));
 return [...Array(count).fill('red'),'black'].map((color,i)=>{
  const [p]=candidates.splice(chooseIndexV1(next,candidates.length),1);
  return {id:`floor-${floor.floor}:${color}-${i}`,color,...p};
 });
}
export function v2TreasureAt(s){return s.floors[s.currentFloor].treasures?.find(p=>same(p,{x:s.playerX,y:s.playerY}));}
export function rollV2ArmorChest({level,theme,tier},random){
 if(level<91||level>100||!themes.includes(theme))throw Error('Unsupported armor chest');
 const rare=theme==='green'||theme==='yellow',high=level===100;
 const medium=high ? (rare ? 0.20 : 0.25) : (rare ? 0.35 : 0.40),large=high ? 0.15 : 0.10;
 const roll=random();
 if(roll<medium+large)return {kind:'item',itemId:roll<medium?'strong_healing_potion_medium':'strong_healing_potion_large',amount:1};
 const jobs=theme==='green'||theme==='crystal'?['priest','mage']:['warrior','thief'];
 const stage=Math.max(0,Math.min(3,Math.floor(Number(tier)||0)));
 const base={warrior:'amethyst_',thief:'phantom_crystal_',priest:'white_crystal_',mage:'astral_crystal_'};
 const candidates=stage?Object.values(REINCARNATION_ARMOR).filter(x=>x.minimumReincarnations===stage&&jobs.includes(REINCARNATION_ARMOR_SETS[x.seriesId].job))
  :Object.values(EQUIPMENT).filter(x=>jobs.some(j=>x.id.startsWith(base[j])));
 if(candidates.length!==8)throw Error('Armor chest requires eight pieces');
 const item=candidates[Math.floor(random()*8)],r=random();
 const enhancement=high?(r<.4?0:r<.7?1:r<.9?2:3):(r<.6?0:r<.85?1:r<.95?2:3);
 return {kind:'equipment',equipmentId:item.id,slot:item.slot,enhancement};
}
export const OLD_MAP_WEAPONS=Object.freeze({warrior:'katzbalger',thief:'katzendolch',priest:'katzenkolben',mage:'katzenstab'});
export const FINAL_MAP_WEAPONS=Object.freeze({warrior:'katzregalia',thief:'katzreaper',priest:'katzenbenedia',mage:'katzennova'});
export function rollV2WeaponChest({level,theme,tier},random){
 if(level<91||level>100||!themes.includes(theme))throw Error('Unsupported weapon chest');
 const rare=theme==='green'||theme==='yellow',high=level===100;
 const medium=high?(rare?.20:.25):(rare?.35:.40),large=high?.15:.10;
 const r=random();if(r<medium+large)return {kind:'item',itemId:r<medium?'strong_healing_potion_medium':'strong_healing_potion_large',amount:1};
 const jobs=theme==='green'||theme==='crystal'?['priest','mage']:['warrior','thief'],job=jobs[Math.floor(random()*2)];
 const stage=Math.max(0,Math.min(3,Math.floor(Number(tier)||0)));
 const equipmentId=stage?Object.values(REINCARNATION_WEAPONS).find(w=>w.minimumReincarnations===stage&&w.allowedJobs.includes(job)).id
  :{warrior:'crystal_warhammer',thief:'resonant_katar',priest:'amethyst_flail',mage:'resonance_staff'}[job];
 const e=random(),enhancement=high?(e<.4?0:e<.7?1:e<.9?2:3):(e<.6?0:e<.85?1:e<.95?2:3);
 return {kind:'equipment',equipmentId,slot:'rightArmId',enhancement};
}
function owns(s,c,id){return characterOwnsEquipment(c,id)||(s.lootBag?.equipmentInstances||[]).some(x=>x.equipmentId===id);}
export function rollV2BlackChest(s,chest,tier,character,random,goldRandom){
 const fallback=rollV2WeaponChest({level:s.level,theme:s.generatedMap.themeId,tier},random),id=(tier===0?OLD_MAP_WEAPONS:FINAL_MAP_WEAPONS)[character?.job];
 const reserved=Object.entries(s.treasureStates).some(([key,state])=>key!==chest.id&&state.reward?.equipmentId===id);
 if((tier===0||tier===3)&&s.level===100&&id&&!owns(s,character,id)&&!reserved&&goldRandom()<.01)
  return {opened:false,color:'gold',reward:{kind:'equipment',equipmentId:id,slot:'rightArmId',enhancement:0},fallback};
 return {opened:false,color:'black',reward:fallback};
}
// Fixed within this expedition even when loading a save made before opening.
export function prepareV2Treasure(s,tier,save,character=null){
 const chest=v2TreasureAt(s);
 if(!chest||!['red','black'].includes(chest.color))return false;
 const state=s.treasureStates[chest.id];
 if(state?.opened)return false;
 if(!state){
  const next=streamV1('special-map-v2',s.seed,`loot-v1:${s.expeditionId}:${chest.id}`);
  const gold=streamV1('special-map-v2',s.seed,`final-cat-v1:${s.expeditionId}:${chest.id}`);
  s.treasureStates[chest.id]=chest.color==='red'?{opened:false,reward:rollV2ArmorChest({level:s.level,theme:s.generatedMap.themeId,tier},()=>next()/4294967296)}:rollV2BlackChest(s,chest,tier,character,()=>next()/4294967296,()=>gold()/4294967296);
 }
 try{if(save()!==true)return false;}catch{return false;}
 return true;
}
export function completeV2Treasure(s,id,save,character=null){
 const state=s.treasureStates[id];
 if(!state||state.opened)return false;
 if(state.color==='gold'&&owns(s,character,state.reward.equipmentId)){state.reward=state.fallback;state.color='black';}
 const before=s.lootBag;
 const result=state.reward.kind==='equipment'?addLootEquipment(before,state.reward):addLootItem(before,state.reward.itemId,1);
 if(result.gained!==1)return false;
 s.lootBag=result.lootBag;state.opened=true;
 try{if(save()===true)return true;}catch{}
 s.lootBag=before;state.opened=false;return false;
}
