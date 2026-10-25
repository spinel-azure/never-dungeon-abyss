import {generateRegisteredSpecialMap} from './generator.js';
import {generateV2EcologyCandidate2} from './ecology-v2-candidate-2.js';
import {getV2CombatEnemy} from '../../data/special-map-enemies.js';
import {surveyCountsV2} from '../../data/special-map-survey-v2.js';
import {selectNormalMapBoss} from '../../data/karte-normal-bosses.js';
import {resolveSpecialThemeBoss} from '../../data/karte-special-bosses.js';
import {NORMAL_MAP_THEMES} from '../../data/special-map-themes.js';
import {SPECIAL_THEME_FIXED_NAMES} from '../../data/special-map-names-v2.js';
import {getV2BossItemRewards} from './battle-rewards-v2.js';
import {getItem} from '../../data/items.js';

const names={slate:'石造エリア',magic:'魔法エリア',torture:'拷問エリア',red:'灼熱エリア',blue:'極寒エリア',green:'密林エリア',yellow:'砂漠エリア',water:'激流エリア',crystal:'結晶エリア',black:'漆黒エリア',...SPECIAL_THEME_FIXED_NAMES};
const effects={red:'移動時に床によるHPダメージ。対応する床保護装備で無効化可能。',blue:'移動時に床によるHPダメージ。対応する床保護装備で無効化可能。',crystal:'3歩ごとにSPを1消費。対応する床保護装備で無効化可能。',black:'通常の松明は使用不可。暗闇では敵が見えず、不意打ちに注意。特定の装備・貴重品で対処可能。'};

// Read-only view of the same generator and ecology used by exploration.
// Locked information is omitted, not merely hidden by CSS.
export function getMapManagementInfo(map){
 if(map?.rulesetVersion!=='special-map-v2')return null;
 const blueprint=generateRegisteredSpecialMap(map),themeId=blueprint.floors[0].themeId;
 const input={ruleset:map.rulesetVersion,seed:map.seed,level:map.level,rarity:map.rarity,themeId};
 const ecology=generateV2EcologyCandidate2(input),counts=surveyCountsV2(map.surveyedMasks);
 let bossName=null;
 if(map.cleared){
  const boss=NORMAL_MAP_THEMES.includes(themeId)?selectNormalMapBoss(input):resolveSpecialThemeBoss(themeId,map.level);
  if(boss&&(NORMAL_MAP_THEMES.includes(themeId)||map.level===100))bossName=boss.name;
 }
 const bossDrops=bossName?[...(NORMAL_MAP_THEMES.includes(themeId)?['未鑑定地図（討伐報酬・テントで受領）']:[]),...getV2BossItemRewards(themeId,map.level).map(r=>`${getItem(r.itemId).name} ${Math.round(r.rate*100)}％`)]:null;
 return {area:names[themeId]||themeId,environment:effects[themeId]||'特殊な床ダメージ・松明制限なし。',bossName,bossDrops,
  floors:counts.map((count,i)=>({floor:i+1,count,species:count===100?ecology.floors[i].species.map(row=>({name:getV2CombatEnemy(row.id,map.level)?.name||row.id,weight:row.weight})).sort((a,b)=>b.weight-a.weight):null}))};
}

export function renderMapManagementInfo(info){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const root=make('div');root.className='explorer-map-info';root.tabIndex=0;root.setAttribute('aria-label','地図の調査情報');
 root.append(make('p',`エリア：${info.area}`),make('p',`環境：${info.environment}`),make('p',`ボス：${info.bossName||'未公開（討伐後に表示）'}`),make('p','敵分布：通常遭遇時の敵の出現割合（遭遇発生率ではありません）'));
 if(info.bossDrops)root.append(make('p',`ボスのドロップ・報酬：${info.bossDrops.length?info.bossDrops.join('／'):'アイテムなし'}`));
 const tabs=make('div');tabs.className='explorer-floor-tabs';tabs.setAttribute('aria-label','表示する階層');
 const floors=make('div');floors.className='explorer-map-floors';
 for(const f of info.floors){
  const card=make('section');card.dataset.floor=String(f.floor);card.classList.toggle('is-active',f.floor===1);card.append(make('h3',`B${f.floor}F　調査 ${f.count}／100`));
  const tab=make('button',`B${f.floor}F`);tab.type='button';tab.setAttribute('aria-pressed',String(f.floor===1));
  tab.onclick=()=>{for(const c of floors.children)c.classList.toggle('is-active',c.dataset.floor===String(f.floor));for(const b of tabs.children)b.setAttribute('aria-pressed',String(b===tab));};tabs.append(tab);
  if(!f.species)card.append(make('p','この階を100マス踏破すると敵分布を公開します。'));
  else{const list=make('dl');for(const enemy of f.species)list.append(make('dt',enemy.name),make('dd',`${(enemy.weight/100).toFixed(2)}％`));card.append(list);}
  floors.append(card);
 }
 root.append(tabs,floors);return root;
}
