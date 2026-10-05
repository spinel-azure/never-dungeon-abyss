import {resolveSpecialThemeBoss} from '../../data/karte-special-bosses.js';
// Dedicated caller-side defense: fixed special bosses never enter the HSL API.
// The asset is selected from the validated boss, not from caller-supplied paths.
export async function prepareSpecialThemeBoss({themeId,level,bossId,strict=false,loadImage=async path=>{
 const image=new Image();image.src=path;await image.decode();return image;
}}){
 const boss=resolveSpecialThemeBoss(themeId,level,{bossId,strict});
 if(!boss)return null;
 try{return {boss,image:await loadImage(boss.image)};}catch{return {boss,image:null};}
}
