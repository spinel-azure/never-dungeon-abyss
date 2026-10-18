import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import assert from 'node:assert/strict';
import {measureF4} from './special-map-f4-audit-core.mjs';
import {validateF4Report} from './special-map-f4-audit-validation.mjs';
const reference='9009aea720c705560a9e7cfa32d4c496caecbd6d';
const root=process.cwd(),temporary=mkdtempSync(join(tmpdir(),'nda-goddess-reference-'));
try{
 const archive=execFileSync('git',['archive','--format=tar',reference,'data','js','combat'],{maxBuffer:64*1024*1024});
 writeFileSync(join(temporary,'source.tar'),archive);
 execFileSync('tar',['-xf',join(temporary,'source.tar'),'-C',temporary]);
 const before=await measureF4(temporary,console.log),after=await measureF4(root,console.log);
 const baseline=JSON.parse(readFileSync(new URL('./special-map-f4-baseline.json',import.meta.url),'utf8'));
 const report={reference,seeds:after.seeds,ecologyProfiles:after.ecologyProfiles,referenceActual:before.actual,currentActual:after.actual,referenceFingerprint:before.fingerprint,currentFingerprint:after.fingerprint,adoptedF4BaselineMatches:validateF4Report(after,baseline).length===0,unchanged:JSON.stringify(before.actual)===JSON.stringify(after.actual)&&before.fingerprint===after.fingerprint};
 // Preserve the original historical record. This is a new recheck, not its replacement.
 writeFileSync('artifacts/goddess-superboss-compatibility-recheck.json',JSON.stringify(report,null,2)+'\n');assert.ok(report.unchanged);assert.ok(report.adoptedF4BaselineMatches);console.log('Reference/current generation and ecology hashes are identical.');
}finally{
 const checked=resolve(temporary),parent=resolve(tmpdir());
 if(dirname(checked)!==parent||!basename(checked).startsWith('nda-goddess-reference-'))throw Error('Unsafe temporary path');
 rmSync(checked,{recursive:true,force:true});
}
