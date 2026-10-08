import {describeTestMap} from './special-maps.js';

// Match the normal region progression, followed by the four special themes.
const themes=['slate','magic','torture','red','blue','green','yellow','water','crystal','black','gold','rice','dusk','tender'];
export function sortRegisteredMaps(maps,mode){
 if(![0,1,2,3].includes(mode))return [...maps];
 const described=maps.map((map,index)=>({map,index,info:describeTestMap(map)}));
 const theme=e=>{const index=themes.indexOf(e.info?.themeId);return index<0?themes.length:index;};
 return described.sort((a,b)=>{
  const order=mode===0?Number(Boolean(b.map.favorite))-Number(Boolean(a.map.favorite))
   :mode===1?(a.info?.level??0)-(b.info?.level??0):mode===2?(b.info?.level??0)-(a.info?.level??0):theme(a)-theme(b);
  return order||a.index-b.index;
 }).map(e=>e.map);
}
