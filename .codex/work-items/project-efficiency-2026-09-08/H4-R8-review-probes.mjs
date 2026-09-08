import { mkdir, copyFile, readFile, writeFile, utimes, stat } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import runtime from '../../../tools/run-node.cjs';
const task = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(task, '../../..');
const control = path.join(task, 'H4-R8-control-fixture');
await mkdir(control, {recursive:true});
const files = execFileSync('git',['ls-files','-z','--','package.json','tools/run-node.cjs','tools/deployment','infrastructure/deployment'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
// Newly introduced launcher may not yet be tracked; the workflows explicitly ship it.
if(!files.includes('tools/run-node.cjs')) files.push('tools/run-node.cjs');
for(const file of files) {
 const destination=path.join(control,file); await mkdir(path.dirname(destination),{recursive:true}); await copyFile(path.join(root,file),destination);
}
const tar = 'C:/Program Files/Git/usr/bin/tar.exe';
const tarEnv=runtime.nodeEnvironment(process.execPath);tarEnv.Path='C:/Program Files/Git/usr/bin;'+tarEnv.Path;
const inputs=['package.json','tools/run-node.cjs','tools/deployment','infrastructure/deployment'];
const digest=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
function archive(name, normalized) {
 const output=path.join(task,name);
 execFileSync(tar,[...(normalized?['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner']:[]),'-czf','../'+name,...inputs],{cwd:control,stdio:'pipe',env:tarEnv});
 return output;
}
const selected=path.join(control,'package.json');
await utimes(selected,new Date('2026-09-01T00:00:00Z'),new Date('2026-09-01T00:00:00Z'));
const plain1=await digest(archive('H4-R8-plain-before.tar.gz',false));
const stable1=await digest(archive('H4-R8-normalized-before.tar.gz',true));
await utimes(selected,new Date('2026-09-02T00:00:00Z'),new Date('2026-09-02T00:00:00Z'));
const plain2=await digest(archive('H4-R8-plain-after.tar.gz',false));
const stable2=await digest(archive('H4-R8-normalized-after.tar.gz',true));
const imported=spawnSync(process.execPath,['tools/run-node.cjs','-e',"import('./tools/deployment/promotion-request.mjs').then(()=>console.log('control-import-ok'))"],{cwd:control,encoding:'utf8',windowsHide:true,timeout:10_000});
const npmCli='C:/Users/777/AppData/Local/nvm/v24.16.0/node_modules/npm/bin/npm-cli.js';
const dryCli=spawnSync(process.execPath,[npmCli,'run','deployment:create-request','--','--help'],{cwd:control,encoding:'utf8',windowsHide:true,timeout:10_000});
const minimumRoot=path.join(root,'tmp/context-ci-926d2fac2c40477ebfb2e41c966ae1f8');
let minimal;
try {
 const [bin]=runtime.resolveArguments(['--bin','project-tiny-context-harness','ty-context','validate-context'],{cwd:minimumRoot});
 const manifest=JSON.parse(await readFile(createRequire(path.join(minimumRoot,'package.json')).resolve('project-tiny-context-harness/package.json'),'utf8'));
 minimal={resolvedInsideMinimalInstall:bin.startsWith(minimumRoot),version:manifest.version,binExists:(await stat(bin)).isFile()};
} catch(error){ minimal={error:error.message}; }
const results={
 controlFiles:files.length,
 archive:{sameFileBytes:true,onlyModifiedMetadata:'package.json mtime',plain:{before:plain1,after:plain2,equal:plain1===plain2},normalized:{before:stable1,after:stable2,equal:stable1===stable2}},
 controlRuntime:{node:process.version,importExit:imported.status,importStdout:imported.stdout.trim(),importError:imported.stderr.trim(),npmDryCliExit:dryCli.status,npmDryCliDiagnostic:dryCli.stderr.trim().slice(-2000),expectedValidationReached:dryCli.stderr.includes('release_request_path_not_absolute:outputPath'),noPackageInstallation:true},
 minimalContextResolution:minimal,
};
await writeFile(path.join(task,'H4-R8-review-probes.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
