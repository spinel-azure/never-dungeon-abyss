import {hasCardEffect} from '../../data/cards.js';
import {matchesV2Battle} from './encounter-v2.js';
import {calculateBattleExperienceReward,settleIndependentReturnExperience} from '../character-services.js';
import {calculateFixedGoldPerDefeat,rollEnemyDrop} from '../../data/loot.js';
import {addLootGold,addLootItem,addLootEquipment,addLootCard,settleLootBag} from '../../data/inventory.js';

// EXP belongs to this three-floor expedition until a successful return.
// Loot belongs to the expedition, independent of the abyss loot bag.
export function grantV2BattleRewards(character,battle,session,random=Math.random){
 const context=battle.explorationContext;
 if(session?.kind!=='specialMapV2'||session.experienceClosed||!matchesV2Battle(session,context)||session.rewardedBattles.has(context.battleId))return {character,exp:0,drop:null,message:''};
 const enemies=battle.enemies||[battle.enemy];
 const exp=calculateBattleExperienceReward(character,enemies.reduce((n,e)=>n+Math.max(0,Number(e?.experienceReward)||0),0));
 const fixed=calculateFixedGoldPerDefeat(enemies);
 const drop=fixed>0?{kind:'gold',amount:fixed}:rollEnemyDrop(battle.enemy,random);
 let bag=session.lootBag;
 if(drop.kind==='gold')bag=addLootGold(bag,drop.amount).lootBag;
 if(drop.kind==='item')bag=addLootItem(bag,drop.itemId,drop.amount||1).lootBag;
 if(drop.kind==='equipment')bag=addLootEquipment(bag,drop).lootBag;
 if(drop.kind==='card')bag=addLootCard(bag,drop.cardId,drop.amount||1).lootBag;
 session.lootBag=bag;
 session.battleExperience+=exp;
 session.rewardedBattles.add(context.battleId);
 return {character,exp,drop,
  message:`戦闘に勝利した。${exp}EXPを帰還時の精算に積み立てた。${drop.kind==='gold'?` ${drop.amount}Gをロット袋に入れた。`:bag?' 戦利品をロット袋に入れた。':drop.kind==='redChest'?' 赤宝箱イベントはV2-F1では未対応です。':''}`};
}

// Commit includes saving the character. Keep the session intact on failure so
// returning can be retried, and close it only after the durable commit succeeds.
export function settleV2ReturnExperience(character,session,commit,{reason='return'}={}){
 if(session?.kind!=='specialMapV2'||session.experienceClosed)return false;
 const preserve=reason==='defeat'&&hasCardEffect(character.cards?.deckSlots,'preserve_experience_on_defeat');
 const result=reason==='return'||preserve
  ?settleIndependentReturnExperience(character,session.battleExperience,reason==='return'?session.level:0)
  :{changes:{},settlement:null};
 if(reason==='return'||reason==='defeat'){
  if(result.settlement)result.settlement={...result.settlement,source:'special-map-v2'};
  const loot=settleLootBag({...character,...result.changes,lootBag:session.lootBag});
  result.changes={...loot.character,lootBag:character.lootBag,carriedExperience:character.carriedExperience,pendingExperienceSettlement:character.pendingExperienceSettlement};
  result.loot={bag:session.lootBag,settled:loot};
 }
 if(commit(result)===false)return false;
 discardV2Experience(session);
 return true;
}

export function discardV2Experience(session){
 if(session?.kind!=='specialMapV2')return;
 session.battleExperience=0;session.lootBag=null;
 session.experienceClosed=true;
}
