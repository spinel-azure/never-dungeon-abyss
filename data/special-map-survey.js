// Owner knowledge only. Cell i=y*10+x is bit (i%4) of hex digit floor(i/4).
export const EMPTY_SURVEY='0'.repeat(25);
export function normalizeSurveyMask(value){return typeof value==='string'&&/^[0-9a-f]{25}$/i.test(value)?value.toLowerCase():EMPTY_SURVEY;}
export function surveyHas(mask,index){return !!(parseInt(mask[Math.floor(index/4)],16)&(1<<(index%4)));}
export function surveyCount(mask){mask=normalizeSurveyMask(mask);let count=0;for(let i=0;i<100;i++)if(surveyHas(mask,i))count++;return count;}
export function surveyGrid(mask){mask=normalizeSurveyMask(mask);return Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>surveyHas(mask,y*10+x)));}
export function mergeSurvey(a,b){a=normalizeSurveyMask(a);b=normalizeSurveyMask(b);return [...a].map((v,i)=>(parseInt(v,16)|parseInt(b[i],16)).toString(16)).join('');}
export function surveyVisit(mask,x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=10||y>=10)throw RangeError('Invalid survey cell');
 const chars=[...normalizeSurveyMask(mask)],i=y*10+x,n=Math.floor(i/4);chars[n]=(parseInt(chars[n],16)|(1<<(i%4))).toString(16);return chars.join('');
}
