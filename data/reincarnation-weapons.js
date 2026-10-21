// Map chest acquisition and tiered sale prices approved 2026-10-21.
const freeze=Object.freeze;
const commonRows=[
 ['obsidian','黒曜の長剣','warrior',1,[48,52,56,60]],['dragonbone','竜骸の長剣','warrior',2,[58,62,66,70]],['divinemight','神威の長剣','warrior',3,[68,72,76,80]],
 ['nightcrow','夜鴉の短剣','thief',1,[28,31,34,37]],['phantomshade','幽影の短剣','thief',2,[35,38,41,44]],['shadowless','無影の短剣','thief',3,[42,45,48,51]],
 ['dawn','黎明のメイス','priest',1,[38,42,46,50]],['sacredradiance','聖煌のメイス','priest',2,[48,52,56,60]],['heavenprayer','天祈のメイス','priest',3,[58,62,66,70]],
 ['eveningstar','宵星の大杖','mage',1,[8,10,12,14]],['firmament','天穹の大杖','mage',2,[12,14,16,18]],['polarstar','極星の大杖','mage',3,[16,18,20,22]]
];
const types={warrior:['longsword','片手剣'],thief:['dagger','短剣'],priest:['blunt','片手メイス'],mage:['staff','両手杖']};
const offensive=[[10,12,14,16],[14,16,18,20],[18,20,22,25]];
export const REINCARNATION_WEAPONS=freeze(Object.fromEntries(commonRows.map(([series,name,job,tier,attack])=>{
 const id=`reinc_${series}_weapon`,stat={warrior:'str',thief:'dex',priest:'int',mage:'int'}[job];
 const bonuses=freeze([0,1,2,3].map(n=>freeze({
  [stat]:(job==='mage'?[1,1,2,3]:[0,1,1,2])[n],
  [job==='warrior'||job==='thief'?'baseMaxHpRate':'baseMaxSpRate']:(tier+1+n)/100,
  ...(job==='thief'?{criticalBonus:[[2,3,4,5],[3,4,5,6],[4,5,6,8]][tier-1][n]/100}:{}),
  ...(job==='priest'?{healingMiracleBonus:[[5,6,8,10],[8,10,12,15],[12,15,18,20]][tier-1][n]/100}:{}),
  ...(job==='mage'?{attackSpellDamageBonus:offensive[tier-1][n]/100}:{})
 })));
 return [id,freeze({id,name,type:types[job][0],weaponTypeLabel:types[job][1],element:'physical',allowedJobs:freeze([job]),minimumReincarnations:tier,
  ...(job==='mage'?{twoHanded:true}:{}),attack:attack[0],attackByEnhancement:freeze(attack),statBonuses:bonuses[0],statBonusesByEnhancement:bonuses,
  ...(job==='warrior'?{defensePenetration:offensive[tier-1][0]/100,penetrationByEnhancement:freeze(offensive[tier-1].map(n=>n/100))}:{}),
  sellPriceByEnhancement:freeze([[7000,8500,11000,20000],[8000,9500,12000,25000],[9000,11500,13000,30000]][tier-1]),
  showDescriptionInStatus:false,compactStatusBonuses:true})];
})));
const unique=(id,name,job,attack,bonuses,effects,description)=>freeze({id,name,type:types[job][0],weaponTypeLabel:types[job][1],element:'physical',attack,
 allowedJobs:freeze([job]),minimumReincarnations:3,unique:true,lotBagHighlight:'orange',sellPrice:0,
 statBonuses:freeze(bonuses),...effects,description,showDescriptionInStatus:false,compactStatusBonuses:true});
export const FINAL_CAT_WEAPONS=freeze({
 katzregalia:unique('katzregalia','カッツレガリア','warrior',100,{str:3,baseMaxHpRate:.10},
  {defensePenetration:.5,normalAttackRepeatHpRate:.5,physicalSkillDamageBonus:.15,endureDirectHit:true},
  'HP50％以下で通常攻撃が威力1倍の二連続／物理攻撃スキル＋15％／1戦闘に1回、HP2以上からの直接攻撃の致死1ヒットをHP1で耐える'),
 katzreaper:unique('katzreaper','カッツリーパー','thief',65,{dex:3,agi:2,baseMaxHpRate:.10},
  {type:'royal_cat_dagger',defensePenetration:.75,criticalBonus:.20,physicalCriticalMultiplier:1.2},
  '通常攻撃0.5倍×5回／物理会心ヒットは通常の会心計算後さらに1.2倍'),
 katzenbenedia:unique('katzenbenedia','カッツェンベネディア','priest',90,{int:3,luc:2,baseMaxSpRate:.12,healingMiracleMultiplier:1.5,attackMiracleDamageBonus:.30},
  {defensePenetration:.25,normalAttackRecovery:freeze({maxHpRate:.12,maxSpRate:.02})},
  '通常攻撃が命中すると最大HP12％・最大SP2％回復（各コマンド1回、切り上げ）'),
 katzennova:unique('katzennova','カッツェンノヴァ','mage',30,{int:3,baseMaxSpRate:.15,attackSpellDamageBonus:.50,spCostMultiplier:.70,spellResistanceRelief:.20},
  {twoHanded:true,attackSpellRecastChance:.40},
  '対象の攻撃呪文を40％で追加SPなしで再詠唱／敵の属性耐性倍率を＋0.20（上限1、完全無効・吸収・弱点は変更なし）')
});
