import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareReleaseCandidate } from '../../../tools/deployment/prepare-release-candidate.mjs';
const task=path.dirname(fileURLToPath(import.meta.url));
const directory=path.join(task,'H4-R8-candidate-retry-'+Date.now());
await mkdir(directory,{recursive:true});
const baseDeployEnvPath=path.join(directory,'base.env');
await writeFile(baseDeployEnvPath,'STARWARD_ENVIRONMENT=production\n');
const original={baseDeployEnvPath,outputPath:path.join(directory,'fixed-revision','deploy.env'),imageReference:'example.invalid/starward@sha256:'+'a'.repeat(64),revision:'b'.repeat(40),releasedAt:'2026-09-08T01:00:00.000Z'};
const first=await prepareReleaseCandidate(original);
const before=await readFile(original.outputPath,'utf8');
let repeat;
try {repeat=await prepareReleaseCandidate({...original,releasedAt:'2026-09-08T01:01:00.000Z'});}catch(error){repeat={error:error.message};}
const distinct=await prepareReleaseCandidate({...original,outputPath:path.join(directory,'fixed-revision','run-2','deploy.env'),releasedAt:'2026-09-08T01:01:00.000Z'});
const result={scope:'prepare-only local synthetic metadata, no full environment validation or promotion',first:first.disposition,retrySamePath:repeat,originalUnchanged:before===await readFile(original.outputPath,'utf8'),retryDistinctAttempt:distinct.disposition};
await writeFile(path.join(task,'H4-R8-candidate-retry-probe.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
