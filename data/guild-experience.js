import { MAX_EXPERIENCE, MAX_LEVEL, getNextLevelExperience } from './growth.js';

const amounts = [20,30,50,60,100,200,400,600,800,1200,2000,3000,2500,3500,5000,10000,4000,5000,8000,6000,10000,0,15000,12000,0,12000,22000,30000,10000,45000,18000,40000,30000,60000,100000];
const initialIds = ['guild_001_abyss_rat','guild_002_cave_slime','guild_003_b1f_survey','guild_004_abyss_rabbit'];
export const GUILD_EXPERIENCE_REWARDS = Object.freeze(Object.fromEntries(amounts.flatMap((amount,index)=>amount ? [[initialIds[index] || `guild_${String(index+1).padStart(3,'0')}`,amount]] : [])));
export const getGuildExperienceReward = id => GUILD_EXPERIENCE_REWARDS[id] || 0;
export const normalizeGuildExperienceRewardIds = ids => Array.isArray(ids)
  ? [...new Set(ids.filter(id=>Object.hasOwn(GUILD_EXPERIENCE_REWARDS,id)))] : [];
const integer = value => Math.max(0,Math.floor(Number(value)||0));

// Both normal reports and legacy compensation commit this result with one save.
export function grantGuildQuestExperience(character, questIds = character?.quests?.completedQuestIds || []) {
  const paid = normalizeGuildExperienceRewardIds(character?.quests?.experienceRewardQuestIds);
  const reported = new Set(character?.quests?.completedQuestIds || []);
  const ids = [...new Set(questIds)].filter(id=>reported.has(id) && getGuildExperienceReward(id)>0 && !paid.includes(id));
  const nominal = ids.reduce((sum,id)=>sum+getGuildExperienceReward(id),0);
  const pool = integer(character?.guildExperiencePool);
  const gained = Math.min(nominal,Math.max(0,MAX_EXPERIENCE-integer(character?.experience)-pool));
  return {
    ids, nominal, gained,
    character: ids.length ? {...character,guildExperiencePool:pool+gained,
      quests:{...character.quests,experienceRewardQuestIds:[...paid,...ids]}} : character
  };
}

export function formatGuildExperienceReceipt(receipt, {compensation=false}={}) {
  const amount = value=>value.toLocaleString('ja-JP');
  const prefix = compensation ? `ギルド依頼に経験値報酬が追加されました。報告済みの依頼${receipt.ids.length}件分として、` : '依頼報酬として、';
  const cap = receipt.gained !== receipt.nominal ? `（規定報酬${amount(receipt.nominal)}EXP。経験値上限により制限）` : '';
  const c=receipt.character;
  const ready=c.level<MAX_LEVEL && integer(c.experience)+integer(c.guildExperiencePool)>=getNextLevelExperience(c.level);
  return `${prefix}${amount(receipt.gained)}EXPを宿泊時の精算分として確保しました。${cap}\n${ready ? '＊ 宿屋に泊まる事でレベルアップ可能です ＊' : '経験値精算とレベルアップは宿泊時に行われます。'}`;
}
