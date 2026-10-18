import {isDeepStrictEqual} from 'node:util';
import {F4_SEEDS,F4_PROFILES} from './special-map-f4-audit-core.mjs';
export function validateF4Report(report,baseline){
 const failures=[];
 const equal=(name,actual,expected)=>{if(!isDeepStrictEqual(actual,expected))failures.push(name);};
 equal('schemaVersion',report.schemaVersion,1);
 equal('seed coverage',report.seeds,F4_SEEDS);
 equal('profile count',report.ecologyProfiles,F4_PROFILES.length);
 equal('ordered profiles',report.profiles,F4_PROFILES);
 equal('baseline seed coverage',baseline.seeds,F4_SEEDS);
 equal('baseline ordered profiles',baseline.profiles,F4_PROFILES);
 equal('hash keys',Object.keys(report.actual||{}).sort(),Object.keys(baseline.expected).sort());
 for(const [key,expected] of Object.entries(baseline.expected))equal(key,report.actual?.[key],expected);
 equal('fingerprint',report.fingerprint,baseline.fingerprint);
 equal('geometryWithoutTheme',report.geometryWithoutTheme,baseline.geometryWithoutTheme);
 equal('per-profile ecology',report.profileHashes,baseline.profileHashes);
 return failures;
}
