import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=process.argv.slice(2);
const maps=[];
for(const path of paths.length?paths:['apps/wechat-miniapp/dist/weapp/sky/detail/index.js.map']){
  const bytes=await fs.readFile(path);maps.push({path,bytes,map:JSON.parse(bytes)});
}
const files=['spot-sky-page.tsx','sky-scene-render.ts','sky-sdss-optical-completion.ts'];
const comparisons=[];
for(const file of files){
  const sourceBytes=await fs.readFile('apps/wechat-miniapp/src/features/sky/'+file);
  const entries=[];
  for(const {path,map} of maps){
    const matches=map.sources.map((source,index)=>({source,index})).filter(({source})=>source.includes('/'+file));
    entries.push(...matches.map(({source,index})=>({mapPath:path,source,
      sourceMapContentSha256:typeof map.sourcesContent?.[index]==='string'?digest(map.sourcesContent[index]):null,
      exactRawSource:map.sourcesContent?.[index]===sourceBytes.toString('utf8')})));
  }
  comparisons.push({file,sourceSha256:digest(sourceBytes),entries});
}
const target='output/science-optical-completion-consumer-1002-r2/'+(paths.length?'watch-readonly-owner-maps.json':'watch-readonly.json');
await fs.writeFile(target,JSON.stringify({scope:'Read-only emitted source-map identity. No watch process/PID/IDE/rendered-runtime/interaction verification.',
  maps:maps.map(({path,bytes})=>({path,mapSha256:digest(bytes),mapBytes:bytes.length})),comparisons},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({target,sha256:digest(await fs.readFile(target)),comparisons}));
