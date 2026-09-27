import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {generateSpecialMap,specialMapFingerprint} from '../js/special-map/generator.js';
import {generateSpecialMapDoors,canonicalDoorPositions} from '../js/special-map/doors.js';
import {generateSpecialMapEcology,canonicalEcology} from '../js/special-map/ecology.js';
import {checkDoors} from '../tests/special-map-doors-helper.mjs';
const hash=createHash('sha256'),ecologyHash=createHash('sha256'),topologyHash=createHash('sha256');
const report={status:'Candidate 1 — provisional; not frozen',seeds:65536,failures:0,counts:{0:0,'1-5':0,6:0,7:0,8:0,9:0,10:0},shortfall:0,totalDoors:0,spatial:{minimumEndpointManhattan:{},maxDoorsPerAnchorRow:{},maxDoorsPerAnchorColumn:{},entranceNearestEdgeDistance:{},exitNearestEdgeDistance:{}},examples:[]};
const inc=(o,k)=>o[k]=(o[k]||0)+1;
function distances(map,start){const d=Array(100).fill(-1),q=[start];d[start]=0;for(const i of q)for(let k=0;k<4;k++)if(!map.walls[i][k]){const j=i+[-10,1,10,-1][k];if(d[j]<0){d[j]=d[i]+1;q.push(j);}}return d;}
for(let seed=0;seed<65536;seed++){
 const map=generateSpecialMap('special-map-v1',seed),layout=generateSpecialMapDoors(map.ruleset,seed,map);
 checkDoors(layout,map);assert.deepEqual(generateSpecialMapDoors(map.ruleset,seed,{...map,discovererName:'ALC'}),layout);assert.deepEqual(generateSpecialMapDoors(map.ruleset,seed,map),layout);
 topologyHash.update(JSON.stringify(map)+'\n');ecologyHash.update(canonicalEcology(generateSpecialMapEcology(map.ruleset,seed,map))+'\n');hash.update(canonicalDoorPositions(layout)+'\n');
 const n=layout.doors.length;inc(report.counts,n===0?0:n<6?'1-5':n);report.totalDoors+=n;if(n<layout.targetCount)report.shortfall++;
 const ends=layout.doors.map(d=>[[d.x,d.y],[d.x+(d.dir==='E'?1:0),d.y+(d.dir==='S'?1:0)]]);
 let minimum=Infinity;for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(const p of ends[a])for(const q of ends[b])minimum=Math.min(minimum,Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]));
 inc(report.spatial.minimumEndpointManhattan,minimum);const rows=Array(10).fill(0),cols=Array(10).fill(0);for(const door of layout.doors){rows[door.y]++;cols[door.x]++;}inc(report.spatial.maxDoorsPerAnchorRow,Math.max(...rows));inc(report.spatial.maxDoorsPerAnchorColumn,Math.max(...cols));
 for(const name of ['entrance','exit']){const p=map[name],dist=distances(map,p.y*10+p.x);assert.ok(dist.every(d=>d>=0));inc(report.spatial[name+'NearestEdgeDistance'],Math.min(...ends.flat().map(([x,y])=>dist[y*10+x])));}
 if([0,1,12345,65535].includes(seed))report.examples.push({...layout,topologyFingerprint:specialMapFingerprint(map)});
}
report.averageDoors=report.totalDoors/65536;report.sha256=hash.digest('hex');report.topologySha256=topologyHash.digest('hex');report.ecologySha256=ecologyHash.digest('hex');
assert.equal(report.topologySha256,'b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58');assert.equal(report.ecologySha256,'04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a');
writeFileSync(new URL('../artifacts/special-map-doors-candidate-1.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
