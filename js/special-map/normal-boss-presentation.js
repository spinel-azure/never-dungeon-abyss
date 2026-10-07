import {prepareBossVariantImage} from '../boss-color-variant.js';
const urls=new WeakMap();
export async function prepareNormalBossImage(boss,context,{load=async path=>{
 const image=new Image();image.src=path;await image.decode();return image;
},prepare=prepareBossVariantImage,warn=console.warn}={}){
 try{
  const image=await load(boss.image);
  if(!boss.allowColorVariant)return boss.image;
  const variant=await prepare({bossId:boss.id,image,imagePath:boss.image,level:context.mapLevel,seed:context.mapSeed,rarity:context.rarity,themeId:context.themeId});
  if(!variant||variant===image)return boss.image;
  if(!urls.has(variant))urls.set(variant,variant.toDataURL('image/png'));
  return urls.get(variant);
 }catch(error){warn('Map boss variant fallback',error);return boss.image;}
}
