import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import assert from 'node:assert/strict';
const reference='9009aea720c705560a9e7cfa32d4c496caecbd6d';
const root=process.cwd(),temporary=mkdtempSync(join(tmpdir(),'nda-goddess-reference-'));
try{
 const archive=execFileSync('git',['archive','--format=tar',reference,'data','js','combat','tools/verify-special-map-f4-compatibility.mjs','artifacts/v2-ecology-candidate-1/audit.json'],{maxBuffer:64*1024*1024});
 writeFileSync(join(temporary,'source.tar'),archive);
 execFileSync('tar',['-xf',join(temporary,'source.tar'),'-C',temporary]);
 const audit=readFileSync(join(root,'tools/verify-special-map-f4-compatibility.mjs'),'utf8')
  .replace("'artifacts/special-map-f4/compatibility.json'","'artifacts/goddess-superboss-compatibility-raw.json'")
  .replace('assert.equal(report.passed,true);','');
 const measure=directory=>{
  const script=join(directory,'tools/.goddess-compatibility.mjs');writeFileSync(script,audit);
  try{execFileSync(process.execPath,[script],{cwd:directory,stdio:'inherit'});return JSON.parse(readFileSync(join(directory,'artifacts/goddess-superboss-compatibility-raw.json')));}
  finally{rmSync(script,{force:true});rmSync(join(directory,'artifacts/goddess-superboss-compatibility-raw.json'),{force:true});}
 };
 const before=measure(temporary),after=process.env.NDA_REUSE_CURRENT_AUDIT==='1'?JSON.parse(readFileSync('artifacts/goddess-superboss-compatibility.json')):measure(root);
 const report={reference,seeds:after.seeds,ecologyProfiles:after.ecologyProfiles,referenceActual:before.actual,currentActual:after.actual,referenceFingerprint:before.fingerprint,currentFingerprint:after.fingerprint,legacyF4ExpectationMatches:after.passed,unchanged:JSON.stringify(before.actual)===JSON.stringify(after.actual)&&before.fingerprint===after.fingerprint};
 writeFileSync('artifacts/goddess-superboss-compatibility.json',JSON.stringify(report,null,2)+'\n');assert.ok(report.unchanged);console.log('Reference/current generation and ecology hashes are identical.');
}finally{
 // mkdtemp path checked before removal, never a repository path.
 const checked=resolve(temporary),parent=resolve(tmpdir());
 if(dirname(checked)!==parent||!basename(checked).startsWith('nda-goddess-reference-'))throw Error('Unsafe temporary path');
 rmSync(checked,{recursive:true,force:true});
}
