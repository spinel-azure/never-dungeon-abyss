import {streamV1,chooseIndexV1} from './random-v1.js';
// Local constants intentionally do not track mutable normal-dungeon settings.
export const V1_SIZE=10;
export const V1_EXTRA_PASSAGES=14;
export const V1_THEMES=Object.freeze(['slate','magic','torture','red','blue','green','yellow','water','crystal','black']);
export const V1_DIRECTIONS=Object.freeze(['N','E','S','W']);
const DX=[0,1,0,-1],DY=[-1,0,1,0];
export function distancesV1(walls,start){
 const distances=Array(100).fill(-1),queue=[start];distances[start]=0;
 for(let head=0;head<queue.length;head++){
  const i=queue[head];
  for(let d=0;d<4;d++)if(!walls[i][d]){
   const x=i%10+DX[d],y=Math.floor(i/10)+DY[d];
   if(x<0||x>=10||y<0||y>=10)throw Error('V1 boundary breach');
   const j=y*10+x;
   if(distances[j]<0){distances[j]=distances[i]+1;queue.push(j);}
  }
 }
 return distances;
}
export function generateV1(ruleset,seed){
 const rng=streamV1(ruleset,seed,'topology');
 const walls=Array.from({length:100},()=>[true,true,true,true]);
 const visited=Array(100).fill(false),stack=[0];visited[0]=true;
 const open=(i,d,j)=>{walls[i][d]=false;walls[j][(d+2)%4]=false;};
 while(stack.length){
  const i=stack[stack.length-1],candidates=[];
  for(let d=0;d<4;d++){
   const x=i%10+DX[d],y=Math.floor(i/10)+DY[d],j=y*10+x;
   if(x>=0&&x<10&&y>=0&&y<10&&!visited[j])candidates.push([d,j]);
  }
  if(!candidates.length){stack.pop();continue;}
  const [d,j]=candidates[chooseIndexV1(rng,candidates.length)];open(i,d,j);visited[j]=true;stack.push(j);
 }
 // Each internal wall once, row-major E then S. Exactly 14 distinct openings.
 const closed=[];
 for(let i=0;i<100;i++)for(const d of [1,2]){
  const x=i%10+DX[d],y=Math.floor(i/10)+DY[d];
  if(x<10&&y<10&&walls[i][d])closed.push([i,d,y*10+x]);
 }
 for(let k=0;k<V1_EXTRA_PASSAGES;k++){
  const choice=chooseIndexV1(rng,closed.length),[i,d,j]=closed.splice(choice,1)[0];open(i,d,j);
 }
 // Uniform perimeter cell selection (36 cells), then corner side selection.
 const perimeter=[];
 for(let i=0;i<100;i++)if(i%10===0||i%10===9||i<10||i>=90)perimeter.push(i);
 const entryRng=streamV1(ruleset,seed,'entrance'),entry=perimeter[chooseIndexV1(entryRng,perimeter.length)];
 const x=entry%10,y=Math.floor(entry/10),sides=[];
 if(y===0)sides.push(0);if(x===9)sides.push(1);if(y===9)sides.push(2);if(x===0)sides.push(3);
 const side=sides[chooseIndexV1(entryRng,sides.length)];
 const distances=distancesV1(walls,entry);
 if(distances.some(d=>d<0))throw Error('V1 disconnected maze');
 const farthest=Math.max(...distances),exits=[];
 distances.forEach((d,i)=>{if(d===farthest)exits.push(i);});
 const end=exits.length===1?exits[0]:exits[chooseIndexV1(streamV1(ruleset,seed,'exit'),exits.length)];
 return {ruleset,seed,width:10,height:10,walls,entrance:{x,y,side:V1_DIRECTIONS[side]},exit:{x:end%10,y:Math.floor(end/10)},startDirection:V1_DIRECTIONS[(side+2)%4],themeId:V1_THEMES[chooseIndexV1(streamV1(ruleset,seed,'theme'),V1_THEMES.length)]};
}
