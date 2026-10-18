import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
const baselinePath=new URL('../tools/special-map-f4-baseline.json',import.meta.url);
const originalBaseline=readFileSync(baselinePath,'utf8');
const measured=JSON.parse(readFileSync(new URL('../artifacts/special-map-f4/history-gold.json',import.meta.url),'utf8'));
function check(mutator){
 const directory=mkdtempSync(join(tmpdir(),'nda-f4-negative-'));
 try{
  const report=structuredClone(measured);mutator(report);const path=join(directory,'test-report.json');writeFileSync(path,JSON.stringify(report));
  const result=spawnSync(process.execPath,['tools/verify-special-map-f4-compatibility.mjs','--check-report',path],{encoding:'utf8'});
  assert.equal(result.error,undefined);assert.equal(readFileSync(baselinePath,'utf8'),originalBaseline,'checker must not adopt test data');
  return {status:result.status,report:JSON.parse(result.stdout)};
 }finally{const target=resolve(directory);assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('nda-f4-negative-'));rmSync(target,{recursive:true,force:true});}
}
test('F4 selected historical baseline passes through actual CLI',()=>{const r=check(()=>{});assert.equal(r.status,0);assert.equal(r.report.passed,true);});
for(const key of ['v2Structure','v2Ecology','v1Topology','legacyTopology','v1Doors','v1Ecology'])test(`F4 CLI rejects altered ${key} digest without changing baseline`,()=>{
 const r=check(report=>{report.actual[key]=(report.actual[key][0]==='0'?'1':'0')+report.actual[key].slice(1);});
 assert.equal(r.status,1);assert.ok(r.report.failures.includes(key));
});
for(const [name,change] of [
 ['fingerprint',r=>r.fingerprint='00000000'],['seed coverage',r=>r.seeds=65535],
 ['profile count',r=>r.ecologyProfiles=21],['ordered profiles',r=>r.profiles.reverse()],
 ['per-profile ecology',r=>r.profileHashes[0].sha256='0'.repeat(64)],
 ['geometryWithoutTheme',r=>r.geometryWithoutTheme='0'.repeat(64)]
])test(`F4 CLI rejects altered ${name}`,()=>{const r=check(change);assert.equal(r.status,1);assert.ok(r.report.failures.includes(name));});
test('F4 changed historical outputs are classified by profile, not blindly accepted',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../artifacts/special-map-f4/'+name+'.json',import.meta.url)));
 const old=read('history-before'),weighted=read('history-after'),gold=read('history-gold');
 const baseline=JSON.parse(originalBaseline);assert.deepEqual(old.actual,baseline.previousBaseline.expected);
 assert.equal(old.fingerprint,baseline.previousBaseline.fingerprint);
 for(const r of [weighted,gold])assert.equal(r.geometryWithoutTheme,old.geometryWithoutTheme);
 const changed=(a,b)=>a.profileHashes.flatMap((p,i)=>p.sha256===b.profileHashes[i].sha256?[]:[p.profile]);
 assert.deepEqual(changed(old,weighted),gold.profiles.filter(p=>!p.themeId));
 assert.deepEqual(changed(weighted,gold),gold.profiles.filter(p=>p.themeId==='gold'));
});
