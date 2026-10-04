import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const destination=path.join(task,'tmp/v47-candidate-fingerprint.json');
await assert.rejects(fs.access(destination),{code:'ENOENT'});
const frozen=JSON.parse(await fs.readFile(path.join(task,'evidence/experience-scene-v46-binding-2026-09-30.json'),'utf8'));
const before=await fingerprintBundle(path.resolve(frozen.build.path));assert.equal(before.sha256,frozen.build.treeSha256);
const after=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-scene-v47'));
const prior=new Map(before.files.map(file=>[file.path,file.sha256]));
const changedFiles=after.files.filter(file=>prior.get(file.path)!==file.sha256).map(file=>file.path);
const removedFiles=before.files.filter(file=>!after.files.some(next=>next.path===file.path)).map(file=>file.path);
assert.deepEqual(changedFiles,['sky/detail/index.js']);assert.deepEqual(removedFiles,[]);
const sourceConfig=JSON.parse(await fs.readFile('apps/wechat-miniapp/project.config.json','utf8'));
const config=JSON.parse(await fs.readFile('apps/wechat-miniapp/dist/weapp-check-sky-scene-v47/project.config.json','utf8'));
assert.equal(config.appid,sourceConfig.appid);
const result={recordedAtUtc:new Date().toISOString(),before:{sha256:before.sha256,fileCount:before.fileCount,totalBytes:before.totalBytes},
  after,changedFiles,removedFiles,appIdMatchesSource:true,
  limit:'Plain isolated candidate fingerprint before native opening; raw bytes are not official package size'};
await fs.writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({before:result.before,after:{sha256:after.sha256,fileCount:after.fileCount,totalBytes:after.totalBytes},changedFiles,appIdMatchesSource:true}));
