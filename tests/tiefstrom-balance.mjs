// Diagnostic simulation, not an assertion that these sample builds are optimal.
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {createBossCombatant} from '../data/bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {grantItem,getItemCount} from '../data/inventory.js';
let seed=916;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(const job of ['warrior','thief','priest','mage']){
 let c=normalizeCharacter({...createInitialCharacter({name:'QA',job}),level:90});
 c.baseStats={str:30,int:30,agi:30,dex:30,luc:30};c.def=30;c.hp=c.maxHp;c.sp=c.maxSp;
 c.skillIds.push('holy_light','lightning_bolt');
 if(['mage','priest'].includes(job))c.cards.deckSlots=['sr_follow_up_plus','sr_sp_saver_plus'];
 if(process.env.FISH_LIGHTNING)c.cards.deckSlots=[...c.cards.deckSlots.filter(Boolean),'sr_lightning_armament'];
 for(const id of c.cards.deckSlots)c.cards.ownedCardCounts[id]=1;
 c=normalizeCharacter(c);c.def=30;c.hp=c.maxHp;c.sp=c.maxSp;
 if(process.env.FISH_NPC)c.npcSystem={activeIds:['erika','johan'],records:{erika:{growthStage:7,charge:0},johan:{growthStage:7,charge:0}}};
 for(const id of ['wurfmesser','styptic','strong_healing_potion_medium'])c.inventory=grantItem(c.inventory,id,99).inventory;
 c.inventory=grantItem(c.inventory,'zaubertrank',5).inventory;
 if(process.env.FISH_SPEARS)c.inventory=grantItem(c.inventory,'wurfspeer',Number(process.env.FISH_SPEARS)).inventory;
 const es=['tiefstrom_b76f','tiefstrom_b76f_b'].map(createBossCombatant);
 if(process.env.FISH_HP)es.forEach(e=>e.hp=e.maxHp=Number(process.env.FISH_HP));
 let b=createBattleState({character:c,enemy:es[0],enemies:es});const used={};let reason='turn limit';
 for(let i=0;i<400&&!b.outcome;i++){
  let cmd;
  if(b.player.hp<b.player.maxHp*.55&&getItemCount(b.player.inventory,'strong_healing_potion_medium'))cmd={type:'item',itemId:'strong_healing_potion_medium'};
  else if(b.player.statuses.some(s=>s.id==='bleeding')&&getItemCount(b.player.inventory,'styptic'))cmd={type:'item',itemId:'styptic'};
  else if(b.enemies.some(e=>e.alive&&e.reservedEnemyAction))cmd={type:'guard'};
  else if(getItemCount(b.player.inventory,'wurfspeer'))cmd={type:'item',itemId:'wurfspeer'};
  else if(['mage','priest'].includes(job)&&b.player.sp<12&&getItemCount(b.player.inventory,'zaubertrank'))cmd={type:'item',itemId:'zaubertrank'};
  else if(['mage','priest'].includes(job))cmd={type:'skill',skillId:job==='mage'?'lightning_bolt':'holy_light'};
  else if(getItemCount(b.player.inventory,'wurfmesser'))cmd={type:'item',itemId:'wurfmesser'};
  else {reason='throwing inventory exhausted';break;}
  cmd.targetIndex=b.enemies.findIndex(e=>e.hp>0);
  const r=resolveBattleRound({battle:b,playerCommand:cmd,rng});
  if(!r.accepted){reason=r.reason;break;}b=r.battle;const key=cmd.itemId||cmd.skillId||cmd.type;used[key]=(used[key]||0)+1;
 }
 console.log(JSON.stringify({job,level:90,npc:Boolean(process.env.FISH_NPC),cards:c.cards.deckSlots,pisces:false,def:30,stats:30,maxHp:c.maxHp,maxSp:c.maxSp,outcome:b.outcome||reason,turns:b.turn,enemyHp:b.enemies.map(e=>e.hp),used}));
}
