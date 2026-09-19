import { CARDS } from './cards.js';
import { LEO_ROOM_CLOSED_MESSAGE } from './leo-room.js';
export const LOEWENKOENIGIN_ID = 'loewenkoenigin_b1f';
// Entry still requires all eleven other zodiac cards and the tavern rumor.
export const LEO_EVENT_RELEASED = true;
export const LION_RUMOR_READ_FLAG = 'tavern_rumor_016_base_read';
export const LION_CONFIG = Object.freeze({
  maxHp: 100000,
  level: 125,
  attack: 65,
  // Existing combat stats are capped at 30. Attack/DEF remain separately tunable.
  str: 30, int: 30, agi: 30, dex: 30, luc: 30,
  def: 60,
  phaseTwoRate: .5,
  phaseThreeRate: .25,
  defMultipliers: [1, .75, .5],
  damageMultipliers: [1, 2, 3],
  openingMultipliers: [3, 4, 5],
  selfDamageRate: .01,
  transitionMs: 800,
  wavePower: 50,
  judgmentPower: 1.5,
  twinPower: .6,
  dotRates: {
    poisonDamage: .0025,
    deadlyPoisonDamage: .005,
    deathPoisonDamage: .01,
    bleedingDamage: .005
  },
  // Strike / fangs / wave / roar, in that order.
  weights: [[40, 25, 20, 15], [30, 25, 20, 25], [25, 25, 20, 30]],
  introDelayMs: 5000,
  fadeMs: 1500
});
export const LION_IMAGES = ['images/bosses/boss_27.avif','images/bosses/boss_27b.avif','images/bosses/boss_27c.avif'];
export const LION_DEFEATED_IMAGE = 'images/bosses/boss_27d.avif';
export const LION_BACKGROUND = 'images/background/dungeon_event_24.avif';
export const LION_EMPTY_BACKGROUND = 'images/background/dungeon_event_24b.avif';
export const LION_INTRO = [
 '部屋に入ると至る所に獅子の意匠を施した装飾が飾られ、中央の玉座には獅子の面を被った屈強な女性が鎮座していた。',
 'レーヴェンケーニギン「…何者ぞ。不遜であろう？頭を垂れよ。妾こそ、獅子の女王レーヴェンケーニギンである。」',
 'レーヴェンケーニギン「…ふむ？そうか。ここへ来たと言う事は『資格』があるのだな。そうか…そうか！いいだろう！久し振りに血が滾る…！\nでは、試してやろう。貴様が『リーオー』を持つに相応しい者かどうかを！さあ、来るがいい！」'];
export const LION_VICTORY = 'レーヴェンケーニギン「…見事な戦いだった。ここまで死力を尽くしたのは久方振りぞ。貴様を『リーオー』の所有者として認めよう。さあ、持っていけ…！」';
export const LION_FAREWELL = 'レーヴェンケーニギン「…これで貴様は王道十二宮全てを司る者となった。よいか、その力に溺れるな。決して力に呑まれてはならぬぞ…！では、さらばだ…！」';
export function hasLeoQualification(character) {
 return CARDS.filter(c=>c.rarity==='Z'&&c.id!=='zodiac_leo').every(c=>Number(character?.cards?.ownedCardCounts?.[c.id])>0);
}
export function getLeoDoorAccess(character, released=LEO_EVENT_RELEASED) {
 if(!released||!hasLeoQualification(character)||!character?.eventFlags?.[LION_RUMOR_READ_FLAG])return {blocked:true,sealed:true,message:LEO_ROOM_CLOSED_MESSAGE};
 if(character?.eventFlags?.boss_loewenkoenigin_b1f_defeated)return {blocked:true,sealed:true,message:'獅子の女王は去った。玉座の間は静まり返っている。'};
 return {blocked:false,confirmMessage:'扉に触れると11枚のゾディアックカードが輝き始めた！\n扉に刻まれた獅子座の紋様が、それに呼応するように光を放つ。\n\n扉の奥から、凄まじい咆哮が響く……。\n扉を開けますか？\n＊Aボタン：はい　Bボタン：いいえ'};
}
const C=LION_CONFIG;
export const LION_JUDGMENT={id:'lion_judgment',name:'王断の一撃',actionType:'physicalAttack',hitCount:1,powerPerHit:C.judgmentPower,turnPriority:-100};
export const LION_ACTIONS=[
 {id:'lion_strike',name:'獅子女王の一撃',actionType:'physicalAttack',hitCount:1,powerPerHit:1},
 {id:'lion_fangs',name:'双牙の連撃',actionType:'physicalAttack',hitCount:2,powerPerHit:C.twinPower},
 {id:'lion_wave',name:'王威の波動',actionType:'spell',element:'arcane',spellPower:C.wavePower,powerMultiplier:1,guardable:true},
 {id:'lion_roar',name:'王者の咆哮',actionType:'prepareAction',prepareMessage:'レーヴェンケーニギンが大きく息を吸い込んだ！\n凄まじい咆哮とともに、その腕へ力が集まっていく……！\n次の手番に「王断の一撃」が来る！',reservedAction:LION_JUDGMENT}];
export const LOEWENKOENIGIN=Object.freeze({
 id:LOEWENKOENIGIN_ID,name:'レーヴェンケーニギン',floor:1,level:C.level,maxHp:C.maxHp,
 imageId:LOEWENKOENIGIN_ID,image:LION_IMAGES[0],encounterImageId:'lion_throne',encounterImage:LION_BACKGROUND,
 defeatedEncounterImageId:'lion_empty_throne',defeatedEncounterImage:LION_EMPTY_BACKGROUND,defeatedEncounterImageFit:'cover',defeatedEncounterOverlayOnly:true,
 battleSize:'large',race:'human',stats:{str:C.str,int:C.int,agi:C.agi,dex:C.dex,luc:C.luc},attack:C.attack,def:C.def,
 experienceReward:100000,escapeRate:1,surpriseRate:0,surpriseRateMaximum:0,noDrop:true,isBoss:true,bossKind:'event',battleBgmKey:'finalBoss',
 defeatedFlag:'boss_loewenkoenigin_b1f_defeated',reward:{type:'card',cardId:'zodiac_leo',amount:1},
 elementMultipliers:{fire:1,ice:1,lightning:1,holy:1,dark:1,arcane:1},
 statusResistances:{instantDeath:{immune:true,resistancePoints:100},poison:{resistancePoints:50},deadly_poison:{resistancePoints:50},death_poison:{resistancePoints:50},bleeding:{resistancePoints:50},action_skip:{resistancePoints:90},speed_down:{resistancePoints:70}},
 event:{prompt:LION_INTRO[0],autoStartDelay:C.introDelayMs,remains:'女王の姿はない。獅子の意匠に囲まれた玉座が静かに佇んでいる。\n＊Aボタンで次へ'}});
