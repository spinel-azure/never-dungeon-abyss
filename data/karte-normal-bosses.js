import {NORMAL_MAP_THEMES} from './special-map-themes.js';
import {streamV1,chooseIndexV1} from '../js/special-map/random-v1.js';
import {applyAdditionalMapBossTraits} from './karte-additional-bosses.js';

// Names, eligibility and color permissions transcribed from images/karte_bosses/README.txt.
// Combat roles/curves are F3-A Candidate 1, not established character lore.
export const NORMAL_BOSS_CANDIDATE='v2-boss-combat-candidate-1';
const rows=[
 ['001','ヒューテリン・ヴァッサーマン',null],['002','ニュンフェ・デス・トーデス',null],
 ['003','ディーグローセ・アイスケーニギン','blue'],['004','ガイステル・ケーニヒ',null],
 ['005','ウーアヴェルク・メートヒェン',null],['006','アイゼルネ・ユングフラウ','torture'],
 ['007','グリミヒ・フライシュフレッサー','green'],['008','アマイゼンレーヴェ','yellow'],
 ['009','ディーヴァ・ジレーネ','water'],['010','メヒティガー・ウィッカーマン','red'],
 ['011','フレムデ・ヴァイスハイト',null],['012','ディグローセ・レーヴェンケーニギン',null],
 ['017','アッシェンプッテル',null],
 ['018','ドクトル・ムンター','torture'],['019','エリーテ・ツェンタウリン',null],
 ['020','ヴェシュテン・カイゼリン','yellow'],['021','ルビィン・アラクネ','green'],
 ['022','ブルーメンクローネ','green'],['023','グローサー・ヴァール','water'],
 ['024','ティーフゼー・ブラウト','water']
];
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export const NORMAL_KARTE_BOSSES=freeze(Object.fromEntries(rows.map(([number,name,theme],i)=>{
 const id=`karte_boss_${number}`;
 return [id,{id,name,image:`images/karte_bosses/karte_boss_${number}.avif`,themes:theme?[theme]:[...NORMAL_MAP_THEMES],
  allowColorVariant:true,battleEnabled:true,candidate:NORMAL_BOSS_CANDIDATE,
  // Three pacing profiles, independent of selection randomness.
  profile:['balanced','durable','offensive'][i%3]}];
})));
export function normalBossPool(themeId){
 if(!NORMAL_MAP_THEMES.includes(themeId))throw RangeError('Normal boss theme required');
 const pool=Object.values(NORMAL_KARTE_BOSSES).filter(b=>b.themes.includes(themeId));
 if(!pool.length)throw Error(`No normal boss pool: ${themeId}`);
 return pool;
}
export function selectNormalMapBoss({seed,level,rarity,themeId}={}){
 if(!Number.isInteger(seed)||seed<0||seed>65535||!Number.isInteger(level)||level<1||level>100||!['WHITE','SILVER','GOLD'].includes(rarity))throw RangeError('Invalid map boss content');
 const pool=normalBossPool(themeId),next=streamV1('special-map-v2',seed,JSON.stringify(['v2-map-boss-selection',1,level,rarity,themeId]));
 return pool[chooseIndexV1(next,pool.length)];
}
// Lv, HP, weapon attack, STR, INT, AGI, DEX, LUC, DEF, EXP, G.
export const NORMAL_BOSS_ANCHORS=freeze([
 [1,45,4,4,4,5,5,4,4,50,20], [5,65,4,5,5,6,6,5,5,120,40],
 [10,160,10,10,10,12,12,8,10,300,80], [25,600,17,17,18,18,18,12,17,900,180],
 [50,2000,27,27,28,24,24,17,25,2300,400], [75,7000,40,40,42,30,30,22,33,4500,650],
 [89,15800,46,46,46,33,33,25,37,6180,846],
 [90,50000,46,46,46,34,34,25,38,6300,860], [100,100000,50,50,50,36,36,27,40,7500,1000]
]);
export function createNormalMapBoss(input){
 const boss=selectNormalMapBoss(input),level=input.level;
 const hi=NORMAL_BOSS_ANCHORS.findIndex(row=>row[0]>=level),a=NORMAL_BOSS_ANCHORS[Math.max(0,hi-1)],b=NORMAL_BOSS_ANCHORS[hi];
 const t=a===b?0:(level-a[0])/(b[0]-a[0]),v=a.map((n,i)=>Math.round(n+(b[i]-n)*t));
 const hpScale=boss.profile==='durable'?1.15:boss.profile==='offensive'?.9:1;
 const power=boss.profile==='offensive'?1.1:1;
 const strike={id:'map_boss_strike',name:'強撃',actionType:'physicalAttack',hitCount:1,powerPerHit:1.25,effects:[]};
 return applyAdditionalMapBossTraits({...boss,name:`${boss.name} Lv.${level}`,level,race:'unknown',battleSize:'large',isBoss:true,
  maxHp:level>=90?Math.max(50000,Math.min(100000,Math.round(v[1]*hpScale))):Math.round(v[1]*hpScale),attack:Math.round(v[2]*power),stats:{str:v[3],int:v[4],agi:v[5],dex:v[6],luc:v[7]},def:v[8],
  actions:[{weight:65,action:{id:'map_boss_attack',name:'攻撃',actionType:'physicalAttack',hitCount:1,powerPerHit:1,effects:[]}},
   {weight:25,action:strike},{weight:10,action:{id:'map_boss_wait',name:'様子を見る',actionType:'wait'}}],
  elementMultipliers:{fire:1,ice:1,lightning:1,light:1,dark:1},
  statusResistances:{instantDeath:{immune:true,resistancePoints:100},petrify:{immune:true,resistancePoints:100},
   poison:{resistancePoints:60},deadly_poison:{resistancePoints:80},action_skip:{resistancePoints:70},speed_down:{resistancePoints:30}},
  escapeRate:0,surpriseRate:0,surpriseRateMaximum:0,noDrop:true,fixedGoldPerDefeat:true,dropGold:v[10],experienceReward:v[9]});
}

