// Explicit UI/environment bridge; never aliases ordinary dungeon state.
let active=null;
let host={};
export function configureSpecialMapHost(options){host=options;}
export function getSpecialMapContext(){return active;}
export function getSpecialMapHost(){return host;}
export function attachSpecialMap(context){
 if(active)throw Error('特殊地図はすでに探索中です。');
 active=context;host.enter?.(context);
 return ()=>{if(active!==context)return;active=null;host.leave?.(context);};
}
export function getSpecialMapBgmKey(themeId){return themeId==='green'?'jungleZone':themeId==='yellow'?'desertZone':'dungeon';}
