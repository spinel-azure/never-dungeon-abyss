// Format 3 wire values are permanent. Do not reorder or reuse retired values.
export const MAP_CODE_SPECIAL_THEMES=Object.freeze(['gold','rice','dusk','tender']);
// Ownership/codec policy. Ecology's gold Lv1 preview remains unchanged.
export function validMapThemeOverride(map){
 if(map?.themeOverride==null)return true;
 return MAP_CODE_SPECIAL_THEMES.includes(map.themeOverride)
  &&Number.isInteger(map.level)&&map.level>=(map.themeOverride==='gold'?60:80)&&map.level<=100;
}
