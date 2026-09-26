// Frozen V1 primitives: changing these requires a new generator version.
export function hash32V1(text){
 let h=2166136261;
 for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;
 return h;
}
export function deriveSeedV1(ruleset,seed,purpose){
 return hash32V1(JSON.stringify(['nda-special-map-rng-v1',ruleset,seed,purpose]));
}
export function mulberry32V1(seed){
 let a=seed>>>0;
 return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return (t^(t>>>14))>>>0;};
}
export function streamV1(ruleset,seed,purpose){return mulberry32V1(deriveSeedV1(ruleset,seed,purpose));}
export function chooseIndexV1(next,length){return Math.floor(next()/4294967296*length);}
