import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const git=(...args)=>execFileSync('git',args,{maxBuffer:64*1024*1024});
const root='.codex/work-items/cloud-sky-native-2026-09-22';
const files=git('diff','--cached','--name-only','-z').toString().split('\0').filter(Boolean);
const batch=execFileSync('git',['cat-file','--batch'],{input:files.map(p=>':'+p).join('\n')+'\n',maxBuffer:256*1024*1024});
let offset=0;
const mismatches=[],findings=[],entries=[];
const rules=[['private-key',/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{40,})\b/],['aws-key',/\bAKIA[A-Z0-9]{16}\b/],['credential-url',/\b(?:https?|postgres(?:ql)?|redis):\/\/[^\s/:]+:[^\s/@]+@/],['literal-bearer',/Bearer\s+[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]+/]];
for(const path of files){const end=batch.indexOf(10,offset);const [oid,type,size]=batch.subarray(offset,end).toString().split(' ');if(type!=='blob'||!Number.isFinite(Number(size)))throw new Error('invalid_batch');const body=batch.subarray(end+1,end+1+Number(size));offset=end+2+Number(size);entries.push({path,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')});if(/^(workers\/miniapp-api\/assets|packages\/astronomy-core\/data)\//.test(path)&&!body.equals(readFileSync(path)))mismatches.push(path);if(!body.includes(0)){const lines=body.toString('utf8').split('\n');lines.forEach((line,i)=>{for(const[name,re]of rules)if(re.test(line))findings.push({path,line:i+1,rule:name});});}}
writeFileSync(root+'/tmp/checkpoint-staged-audit-2026-10-01.json',JSON.stringify({entries,mismatches,findings},null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),publicationByteMismatches:mismatches,sensitivePatternLocations:findings},null,2));
