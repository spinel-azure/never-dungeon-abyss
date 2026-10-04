import {streamV1,chooseIndexV1} from '../js/special-map/random-v1.js';
import {SPECIAL_DUNGEON_V2,V2_THEMES,V2_RARITIES} from '../js/special-map/generator-v2.js';

// Naming revision 1. Future ecology/boss naming belongs in an explicitly versioned
// policy; adding those systems must not silently rename existing originals.
export const V2_NAME_PREFIXES=Object.freeze([
 ['古びた','霞む','静寂の','寂れた','朽ちかけた','淡き','忘れられた'],
 ['淀んだ','歪んだ','陰鬱な','かすれた','彷徨う','翳りし','不穏なる'],
 ['禍々しき','血染めの','狂える','蝕まれた','荒れ果てた','異形の','忌まわしき'],
 ['猛き','深淵の','烈なる','破滅の','猛威の','奈落の','凶兆の'],
 ['終焉の','災厄の','冥府の','忘却の','滅びの','虚無の','深奥の']
].map(Object.freeze));
export const V2_NAME_LOCATIONS=Object.freeze(Object.fromEntries(Object.entries({
 slate:['石廊','岩窟','石牢','灰廊','岩宮','石窟'],
 magic:['魔導廟','秘儀殿','魔術廊','星辰堂','秘術宮','魔導塔'],
 torture:['刑廊','拷問廟','苦界','刑獄','責苦殿','血獄'],
 red:['炎窟','灼炉','火葬坑','熔岩廊','火焔宮','灼熱洞'],
 blue:['氷窟','霜廟','凍宮','氷牢','霜洞','凍結殿'],
 green:['樹海','翠廊','苔宮','深森','緑窟','翠宮'],
 yellow:['砂墓','砂廊','黄塵窟','砂宮','流砂洞','乾きの墓所'],
 water:['水廊','水没宮','蒼淵','沈殿廟','深水洞','沈みの宮'],
 crystal:['晶窟','晶廊','玻璃宮','結晶殿','晶宮','水晶洞'],
 black:['黒廟','影廊','暗獄','冥窟','黒宮','常闇洞']
}).map(([key,words])=>[key,Object.freeze(words)])));

export function describeV2MapName(map){
 if(map?.rulesetVersion!==SPECIAL_DUNGEON_V2||!Number.isInteger(map.seed)||map.seed<0||map.seed>65535
  ||!Number.isInteger(map.level)||map.level<1||map.level>100||!V2_RARITIES.includes(map.rarity))throw RangeError('Invalid V2 map name input');
 const next=purpose=>streamV1(SPECIAL_DUNGEON_V2,map.seed,purpose);
 // Read Candidate 3's map-wide theme without constructing 300 cells on every UI render.
 const themeId=V2_THEMES[chooseIndexV1(next('floor-1-theme'),V2_THEMES.length)];
 const band=Math.floor((map.level-1)/20),prefixes=V2_NAME_PREFIXES[band],locations=V2_NAME_LOCATIONS[themeId];
 const prefix=prefixes[chooseIndexV1(next('map-name-prefix'),prefixes.length)];
 const location=locations[chooseIndexV1(next('map-name-location'),locations.length)];
 return {name:`${prefix}${location}の地図 Lv.${map.level}`,prefix,location,themeId,band};
}
