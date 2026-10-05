import {calculateBattleExperienceReward,settleReturnExperience} from '../character-services.js';
import {calculateFixedGoldPerDefeat,rollEnemyDrop} from '../../data/loot.js';
import {addLootGold,addLootItem,addLootEquipment,addLootCard,settleLootBag} from '../../data/inventory.js';

// V2 has no ordinary-depth exploration settlement. Settle only this battle's
// earnings; never consume the abyss's carried EXP or pre-existing loot bag.
export function grantV2BattleRewards(character,battle,random=Math.random){
 const enemies=battle.enemies||[battle.enemy];
 const exp=calculateBattleExperienceReward(character,enemies.reduce((n,e)=>n+Math.max(0,Number(e?.experienceReward)||0),0));
 const fixed=calculateFixedGoldPerDefeat(enemies);
 const drop=fixed>0?{kind:'gold',amount:fixed}:rollEnemyDrop(battle.enemy,random);
 let bag;
 if(drop.kind==='gold')bag=addLootGold(null,drop.amount).lootBag;
 if(drop.kind==='item')bag=addLootItem(null,drop.itemId,drop.amount||1).lootBag;
 if(drop.kind==='equipment')bag=addLootEquipment(null,drop).lootBag;
 if(drop.kind==='card')bag=addLootCard(null,drop.cardId,drop.amount||1).lootBag;
 const settled=settleLootBag({...character,lootBag:bag}).character;
 const experience=settleReturnExperience({...character,carriedExperience:exp,pendingExperienceSettlement:null},0,{legacy:true}).changes.experience;
 return {character:{...settled,experience,carriedExperience:character.carriedExperience,pendingExperienceSettlement:character.pendingExperienceSettlement,lootBag:character.lootBag},exp,drop,
  message:`戦闘に勝利した。${exp}EXPを獲得した。${drop.kind==='gold'?` ${drop.amount}Gを獲得した。`:bag?' 戦利品を受け取った。':drop.kind==='redChest'?' 赤宝箱イベントはV2-F1では未対応です。':''}`};
}
