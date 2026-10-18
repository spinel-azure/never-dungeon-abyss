import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureF4} from './special-map-f4-audit-core.mjs';
import {validateF4Report} from './special-map-f4-audit-validation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(readFileSync(new URL('./special-map-f4-baseline.json',import.meta.url),'utf8'));
const args=process.argv.slice(2);let input=null,output=resolve(root,'artifacts/special-map-f4/compatibility.json');
while(args.length){const flag=args.shift(),value=args.shift();if(!value)throw Error('Missing option value');if(flag==='--check-report')input=value;else if(flag==='--output')output=resolve(value);else throw Error('Unknown option '+flag);}
// --check-report validates recorded/test data only; normal invocation ALWAYS measures all seeds.
const measured=input?JSON.parse(readFileSync(input,'utf8')):await measureF4(root,console.log);
const failures=validateF4Report(measured,baseline);
const report={...measured,baselineCommit:baseline.baselineCommit,expected:baseline.expected,expectedFingerprint:baseline.fingerprint,passed:failures.length===0,failures};
if(!input){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({baselineCommit:baseline.baselineCommit,passed:report.passed,failures,actual:report.actual,fingerprint:report.fingerprint},null,2));
if(failures.length)process.exitCode=1;
