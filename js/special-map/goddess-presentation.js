import {playBattleSkillPresentation} from '../battle-skill-presentation.js';
export const GODDESS_TV_OFF=Object.freeze({version:3,id:'goddess-defeated',name:'女神消灯',width:960,height:540,duration:1500,
  parts:[{id:'goddess_tv_off',type:'tvOff',anchor:'screen',enabled:true,start:0,duration:1500,x:480,y:270,easing:'easeOutCubic',collapse:500}],audioTracks:[]});
export function syncGoddessBackdrop(root,enemy){
 const enabled=['karte_boss_lumina','karte_boss_noctia','karte_boss_zelena'].includes(enemy?.id)&&Boolean(enemy?.goddessTheme);
 root.classList.toggle('is-goddess-battle',enabled);
 let circle=root.querySelector('.goddess-battle-circle');
 if(enabled&&!circle){circle=root.ownerDocument.createElement('img');circle.className='goddess-battle-circle';circle.src='images/battle_effects/magic_circle.avif';circle.alt='';circle.setAttribute('aria-hidden','true');root.prepend(circle);}
 if(circle)circle.hidden=!enabled;
}
export async function playGoddessDefeat(root,image){
 // The same tvOff primitive/collapse timing used by "呼べ、女神の名を".
 await playBattleSkillPresentation({root,definition:GODDESS_TV_OFF});
 image.style.visibility='hidden';
 const host=image.closest('.battle-enemy-stage, .battle-enemy-member');
 if(host){delete host.dataset.vanishPending;delete host.dataset.vanishPlaying;}
}
