import {getFloorZone} from './floor-zone-names.js';
export const TRELIREN_READ_FLAG='tavern_rumor_017_base_read';
export const TRELIREN_MET_FLAG='treliren_met';
export const INCENSE_ID='warding_incense';
export const TRELIREN_DEFINITION=Object.freeze({
 id:'treliren',enemyId:'treliren',imageId:'treliren_walk',
 image:'images/npc/NPC_27.avif',alternateImage:'images/npc/NPC_27b.avif',
 minDepth:10,maxDepth:88,patrolOnly:true,friendly:true,renderScale:2,maxHeightRatio:.85
});
export function normalizeTrelirenRun(value={}){
 const floors={};
 for(const [key,depth] of Object.entries(value?.floors||{})){
  const zone=getFloorZone(depth);
  if(zone&&String(zone.minimumDepth)===key&&depth>=10&&depth<90&&depth%10!==9)floors[key]=depth;
 }
 return {floors,encountered:Boolean(value?.encountered),rewardGiven:Boolean(value?.rewardGiven),
 phase:Number.isInteger(value?.phase)&&value.phase>=0&&value.phase<=4?value.phase:-1,
 firstEncounter:Boolean(value?.firstEncounter)};
}
export function prepareTrelirenFloor(character,depth,rng=Math.random){
 if(!character)return [];
 character.trelirenRun=normalizeTrelirenRun(character.trelirenRun);
 const run=character.trelirenRun,zone=getFloorZone(depth);
 if(!character.eventFlags?.[TRELIREN_READ_FLAG]||run.encountered||!zone||depth<10||depth>=90)return [];
 const key=String(zone.minimumDepth);
 if(!run.floors[key]){
  const candidates=Array.from({length:zone.maximumDepth-zone.minimumDepth+1},(_,i)=>zone.minimumDepth+i).filter(d=>d%10!==9);
  run.floors[key]=candidates[Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*candidates.length)];
 }
 return run.floors[key]===depth?[{...TRELIREN_DEFINITION,floors:[depth]}]:[];
}
export function syncIncenseZone(character,depth,inTown=false){
 if(!character)return false;
 const zone=getFloorZone(depth)?.name;
 if(inTown||!zone||character.incenseZone!==zone)delete character.incenseZone;
 return Boolean(character.incenseZone);
}
export const TRELIREN_DIALOGUES=Object.freeze({
 first:[
 '迷宮探検家トレリーレン「ふぅ…。ふぅ…！あっ、はじめまして！あたし、トレリーレンっていいます！奈落の迷宮を探索しながら地図を作っているの！あなたは冒険者？」',
 '「あたし地図を作るのが大好きで、こうやって迷宮を歩きながら作っているんだけど、ひとりだといろいろ大変だからそのうちあなたにも手伝ってもらうかも？その時はお願いしても…いいかな？」',
 '「えっ？魔物は怖くないのかって？大丈夫。『魔除けのお香』を焚いているから魔物が近寄ってこないの。よかったらひとつ分けてあげる。」',
 '「魔除けのお香」を手に入れた！',
 '「それじゃあ、あたしはもう行くね！またどこかで会えるといいな！」'],
 repeat:[
 '迷宮探検家トレリーレン「ふぅ…。ふぅ…！あっ、また会ったね！こんにちは！」',
 '「地図づくりは楽しいけど、ひとりだといろいろ大変だから、そのうちあなたにも手伝ってもらうかも？その時はお願いするね！」',
 '「あっ…！『魔除けのお香』は足りてる？よかったら分けてあげるね！はい、どうぞ！」',
 '「魔除けのお香」を手に入れた！',
 '「それじゃあ、あたしはもう行くね！また会おうね！」']
});
