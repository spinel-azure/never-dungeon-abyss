import { getWeapon } from './weapons.js';
// Internal definitions; set mechanics are deliberately absent from item descriptions.
const slots = ['leftArmId', 'headId', 'bodyId', 'footId'];
// Resale only; no shop purchase offer.
const sellPricesByTier = Object.freeze({
  1:Object.freeze({0:7000,1:8500,2:11000,3:20000}),
  2:Object.freeze({0:8000,1:9500,2:12000,3:25000}),
  3:Object.freeze({0:9000,1:11500,2:13000,3:30000})
});
const rows = [
  ['obsidian','黒曜','warrior',1,[12,13,16,11],['大盾','兜','重鎧','脚甲'],[[3,3,4,5],[5,6,8,10],[5,6,8,10],[5,6,8,10]]],
  ['nightcrow','夜鴉','thief',1,[10,11,15,10],['バックラー','フード','軽鎧','ブーツ'],[[5,6,8,10],[5,6,8,10],[4,5,6,8],[5,6,8,10]]],
  ['dawn','黎明','priest',1,[11,11,16,10],['聖盾','ミトラ','祭服','聖靴'],[[4,5,6,8],[5,6,8,10],[5,6,8,10],[5,6,8,10]]],
  ['eveningstar','宵星','mage',1,[0,14,19,13],['魔導書','帽子','ローブ','靴'],[[2,3,4,5],[5,6,8,10],[5,6,8,10],[5,6,8,10]]],
  ['dragonbone','竜骸','warrior',2,[15,15,19,13],['大盾','兜','重鎧','脚甲'],[[5,5,6,7],[10,11,13,15],[10,10,11,12],[10,11,13,15]]],
  ['phantomshade','幽影','thief',2,[13,13,18,12],['バックラー','フード','軽鎧','ブーツ'],[[10,11,13,15],[10,11,13,15],[8,9,10,12],[10,11,13,15]]],
  ['sacredradiance','聖煌','priest',2,[14,13,19,12],['聖盾','ミトラ','祭服','聖靴'],[[8,9,10,12],[10,11,13,15],[10,11,13,15],[10,11,13,15]]],
  ['firmament','天穹','mage',2,[0,17,23,16],['魔導書','帽子','ローブ','靴'],[[5,6,7,8],[10,11,13,15],[10,11,13,15],[10,11,13,15]]],
  ['divinemight','神威','warrior',3,[17,18,22,15],['大盾','兜','重鎧','脚甲'],[[7,8,9,10],[15,16,18,20],[12,13,14,15],[15,16,18,20]]],
  ['shadowless','無影','thief',3,[15,16,21,14],['バックラー','フード','軽鎧','ブーツ'],[[15,16,18,20],[15,16,18,20],[12,13,14,15],[15,16,18,20]]],
  ['heavenprayer','天祈','priest',3,[16,16,22,14],['聖盾','ミトラ','祭服','聖靴'],[[12,13,14,15],[15,16,18,20],[15,16,18,20],[15,16,18,20]]],
  ['polarstar','極星','mage',3,[0,20,27,19],['魔導書','帽子','ローブ','靴'],[[8,8,9,10],[15,16,18,20],[15,16,18,20],[15,16,18,20]]]
];
const effects = {
  warrior: ['magicDamageReduction','actionSkipResistance','magicDamageReduction','bleedingResistance'],
  thief: ['bleedingResistance','actionSkipResistance','magicDamageReduction','surpriseResistance'],
  priest: ['magicDamageReduction','actionSkipResistance','healingMiracleBonus','poisonResistance'],
  mage: ['attackSpellDamageBonus','actionSkipResistance','magicDamageReduction','bleedingResistance']
};
const extra = { warrior:[3,'lightning'], thief:[2,'dark'], priest:[0,'holy'], mage:[3,'earth'] };
export const REINCARNATION_ARMOR_SETS = Object.freeze(Object.fromEntries(rows.map(([id,,job,tier]) =>
  [id,Object.freeze({id,job,tier,slots:Object.freeze(job === 'mage' ? slots.slice(1) : [...slots])})])));
export const REINCARNATION_ARMOR = Object.freeze(Object.fromEntries(rows.flatMap(
  ([seriesId,prefix,job,tier,defs,names,rates]) => slots.map((slot,i) => {
    const sellPriceByEnhancement = sellPricesByTier[tier];
    const id = `reinc_${seriesId}_${slot.replace('Id','')}`;
    const levels = Object.freeze(Object.fromEntries([0,1,2,3].map(n => {
      const stats = {def:job === 'mage' && i === 0 ? 0 : defs[i]+n,[effects[job][i]]:rates[i][n]/100};
      if(tier === 3 && extra[job][0] === i) stats[`${extra[job][1]}DamageReduction`] = [5,6,8,10][n]/100;
      return [n,Object.freeze(stats)];
    })));
    return [id,Object.freeze({id,name:`${prefix}の${names[i]}`,slot,seriesId,
      allowedJobs:Object.freeze([job]),minimumReincarnations:tier,
      sellPrice:sellPriceByEnhancement[0],sellPriceByEnhancement,
      statBonuses:levels[0],statBonusesByEnhancement:levels})];
  })
)));

export function getReincarnationArmorSet(character) {
  const instances = character?.equipmentInventory?.instances || [];
  const equipped = character?.equippedInstanceIds || {};
  for(const set of Object.values(REINCARNATION_ARMOR_SETS)) {
    if(character?.job !== set.job || !(Number(character.reincarnationCount) >= set.tier)) continue;
    const weapon = instances.find(item => item.instanceId === equipped.rightArmId && item.slot === 'rightArmId');
    if(set.job !== 'mage' && getWeapon(weapon?.equipmentId || character.equipment?.rightArmId || character.equipment?.weaponId)?.twoHanded) continue;
    if(set.slots.every(slot => {
      const instance = instances.find(item => item.instanceId === equipped[slot] && item.slot === slot);
      return REINCARNATION_ARMOR[instance?.equipmentId]?.seriesId === set.id;
    })) return set;
  }
  return null;
}
