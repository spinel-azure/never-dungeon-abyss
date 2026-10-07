import {validateSpecialTheme,SPECIAL_MAP_THEMES} from './special-map-themes.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const resistanceProfile=freeze({
 instantDeath:'immune',petrify:'immune',maxHpPercentDamage:'immune',
 incapacitation:'very-high',deadlyPoison:'very-high',otherAilments:'high',
 nonImmuneAilmentsMaySucceed:true,implementation:'design-only; probabilities deferred',
});
const stats=(maxHp,str,int,agi,dex,luc,def,magicDefense)=>({maxHp,maxSp:9999,stats:{str,int,agi,dex,luc},def,magicDefense});
const goddess=(id,name,themeId,imageNumber,baseStats,battleRole,actions,phaseDesign)=>({
 id,name,themeId,image:`images/karte_bosses/karte_boss_${imageNumber}.avif`,allowColorVariant:false,
 minMapLevel:80,imageSize:600,tier:'endgame-superboss',baseLevel:100,baseStats,battleRole,resistanceProfile,
 design:{actions,phaseDesign},battleEnabled:false,
});
export const KARTE_SPECIAL_BOSSES=freeze({
 karte_boss_lumina:goddess('karte_boss_lumina','黄金の稲穂の女神・ルミナ','rice','013',stats(55000,115,105,100,110,120,115,105),'攻守万能型',
  ['黄金雷閃','稲妻の双刃','黄金の稲穂','豊穣の光','天穹雷霆','解放の光'],{hpRatioAtMost:.5,agilityMultiplier:1.15,lightningMultiplier:1.2,criticalRate:'increased; value TBD'}),
 karte_boss_noctia:goddess('karte_boss_noctia','宵闇の夜露の女神・ノクティア','dusk','014',stats(48000,80,130,125,115,105,95,125),'高速・高火力魔法型',
  ['ノクティス','夜露の雫','宵闇','月蝕','夜天星葬','夜の帳'],{hpRatioAtMost:.3,intelligenceGrowth:'each turn; increment TBD'}),
 karte_boss_zelena:goddess('karte_boss_zelena','新緑の若葉の女神・ゼレーナ','tender','015',stats(60000,95,120,105,100,115,125,115),'回復・障壁・再生を使う耐久型裏ボス',
  ['シルワンエメラ','若葉の息吹','翠緑障壁','森羅の蔦','萌芽','大樹の審判'],{reviveOnce:true,reviveRatio:.30,message:'若葉が舞い、失われた生命が再び芽吹く――。'}),
 karte_boss_maikaefer_koenig:{id:'karte_boss_maikaefer_koenig',name:'デアグローセ・ケーファーケーニヒ',themeId:'gold',
  image:'images/karte_bosses/karte_boss_016.avif',allowColorVariant:false,minMapLevel:60,imageSize:600,
  baseLevel:100,baseStats:{...stats(32000,110,35,120,115,130,140,35),maxSp:0},
  battleRole:'高防御・高速の物理型特殊強敵',resistanceProfile:{instantDeath:'immune',petrify:'immune',otherAilments:'high'},battleEnabled:true},
});
export const SPECIAL_THEME_BOSS_IDS=freeze({gold:'karte_boss_maikaefer_koenig',rice:'karte_boss_lumina',dusk:'karte_boss_noctia',tender:'karte_boss_zelena'});
export function assertSpecialThemeBoss(themeId,bossId,level){
 validateSpecialTheme(themeId,level);
 if(SPECIAL_THEME_BOSS_IDS[themeId]!==bossId)throw Error('Special theme/boss mismatch');
 if(level<KARTE_SPECIAL_BOSSES[bossId].minMapLevel)throw RangeError('Gold boss requires Map Lv60 or higher');
 return true;
}
export function resolveSpecialThemeBoss(themeId,level,{bossId,strict=false}={}){
 if(!SPECIAL_MAP_THEMES.includes(themeId)){if(strict)throw RangeError('Unknown special theme');return null;}
 try{validateSpecialTheme(themeId,level);}catch(error){if(strict)throw error;return null;}
 const id=SPECIAL_THEME_BOSS_IDS[themeId];
 if(strict&&bossId!==undefined)assertSpecialThemeBoss(themeId,bossId,level);
 // Production mismatch falls back to the theme's correct boss, never another boss.
 const boss=KARTE_SPECIAL_BOSSES[id];
 if(level<boss.minMapLevel){if(strict)throw RangeError('Gold boss requires Map Lv60 or higher');return null;}
 if(!boss.baseStats)return {...boss,level,scaledStats:null};
 const percent=level===100?100:level>=90?95:themeId!=='gold'||level>=80?90:level>=70?80:70;
 const scale=v=>Math.floor((v*percent+50)/100);
 return {...boss,level,scaledStats:{maxHp:scale(boss.baseStats.maxHp),maxSp:boss.baseStats.maxSp,
  stats:Object.fromEntries(Object.entries(boss.baseStats.stats).map(([k,v])=>[k,scale(v)])),
  def:scale(boss.baseStats.def),magicDefense:scale(boss.baseStats.magicDefense)}};
}
