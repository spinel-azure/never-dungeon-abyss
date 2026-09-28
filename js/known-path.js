import {DIRS} from './config.js';
// Fixed N/E/S/W BFS order. Callers supply their own knowledge and passability.
export function findKnownPath(from,goal,canEnter){
 const key=p=>`${p.x},${p.y}`,queue=[from],previous=new Map([[key(from),null]]);
 for(const p of queue){if(key(p)===key(goal))break;for(const d of DIRS){const q={x:p.x+d.dx,y:p.y+d.dy};if(previous.has(key(q))||!canEnter(p,q,d.key))continue;previous.set(key(q),{...p,dir:d.key});queue.push(q);}}
 if(!previous.has(key(goal)))return [];
 const path=[];let at=key(goal);while(at!==key(from)){const p=previous.get(at);path.push(p.dir);at=key(p);}return path.reverse();
}
