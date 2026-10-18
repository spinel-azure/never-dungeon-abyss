import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {measureF4} from './special-map-f4-audit-core.mjs';
const [ref,output]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(ref||'')||!output)throw Error('Usage: node tools/measure-special-map-f4-reference.mjs FULL_COMMIT_SHA OUTPUT_JSON');
const temporary=mkdtempSync(join(tmpdir(),'nda-f4-reference-'));
try{
 const commit=execFileSync('git',['rev-parse',ref+'^{commit}'],{encoding:'utf8'}).trim();
 const archive=execFileSync('git',['archive','--format=tar',commit,'data','js','combat'],{maxBuffer:64*1024*1024});
 writeFileSync(join(temporary,'source.tar'),archive);execFileSync('tar',['-xf',join(temporary,'source.tar'),'-C',temporary]);
 const report={sourceCommit:commit,...await measureF4(temporary,console.log)};
 mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({commit,actual:report.actual,fingerprint:report.fingerprint}));
}finally{
 const checked=resolve(temporary);
 if(dirname(checked)!==resolve(tmpdir())||!basename(checked).startsWith('nda-f4-reference-'))throw Error('Unsafe cleanup target');
 rmSync(checked,{recursive:true,force:true});
}
