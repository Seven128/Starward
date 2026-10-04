import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const out='output/public-image-demand-type-boundary-context-update-1003-r1';
await fs.mkdir(path.join(ROOT,out));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=async p=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const files=[...['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md'].map(p=>task+p),'project_context/architecture/runtime-and-domain.md'];
const before=await Promise.all(files.map(bind));await fs.writeFile(path.join(ROOT,out,'before.json'),JSON.stringify(before,null,2));
const old='App TS与限定合同/provider检查已过，worker全量七条未改路径类型错误保FAILED。';
const next='App TS与限定合同/provider检查已过；2026-10-03 [公共影像纯类型边界修复](evidence/experience-public-image-demand-type-boundary-development-2026-10-03.md)已独审并精确采用，实际完整worker/App TS5.9.3均通过、三源生成JS保持、六保留项不变，旧七条FAIL只保历史。当前完整资源入口在同五态内补actual previousaccepted反馈/240ms returning及实际wanted额外本地SAO，仍未运行新GPU；准备/静核不验客户端总峰值。';
for(const p of files.slice(0,4)){
 const s=await fs.readFile(path.join(ROOT,p),'utf8');assert.equal(s.split(old).length,2,p);
 await fs.writeFile(path.join(ROOT,p),s.replace(old,next));
}
const progress=files[4];let s=await fs.readFile(path.join(ROOT,progress),'utf8');
s+='\n\n## 2026-10-03：公共影像纯类型依赖修复\n\n[实施与检查](evidence/experience-public-image-demand-type-boundary-development-2026-10-03.md)及[独立源码审查](evidence/experience-public-image-demand-type-boundary-independent-review-2026-10-03.md)：纯DeepSky request生命周期类型不再经Taro runtime进入Node Scene消费图，接口归现cache契约且runtime type re-export兼容。实际只读原7→内存候选0，精确采用后实际完整worker/App TypeScript5.9.3 exit0，缓存/请求既有18项行为exit0；三源声明的生成JS相同，六保留文件/分支/HEAD不变。原目录region失败回执及旧图保持历史，不升级GPU/native/质量/容量。新完整资源单lane在freeze前补actual accepted反馈/returning时钟和按真实wanted读取现本地SAO，暂无新实际GPU结果。\n';
await fs.writeFile(path.join(ROOT,progress),s);
const owner=files[5];s=await fs.readFile(path.join(ROOT,owner),'utf8');
const lines=s.split(/\r?\n/);const index=lines.findIndex(x=>x.startsWith('Target resource ownership has three distinct layers:'));assert(index>=0);
const paragraph='The public-image metadata demand lifetime type (`SkyPublicImageDemand`) is owned by `apps/wechat-miniapp/src/services/sky-public-image-cache.ts`, alongside its platform-free lease/acquisition contracts. `sky-public-image-runtime.ts` owns the WeChat adapter and epoch-retirement delivery, and type re-exports the same interface for compatible consumers. Pure `deep-sky-image-request.ts` reads this contract directly from the cache owner; Scene/request consumers must not import Mini Program platform modules merely for lifecycle types. This keeps Node compilation independent of Mini Program globals and Taro ambient timers without changing runtime cache, cancellation or budget semantics.';
assert(!s.includes(paragraph));lines.splice(index+1,0,'',paragraph);await fs.writeFile(path.join(ROOT,owner),lines.join('\n'));
const after=await Promise.all(files.map(bind));await fs.writeFile(path.join(ROOT,out,'after.json'),JSON.stringify(after,null,2));
console.log(JSON.stringify({out,updated:files.length,scope:'Current owner facts and latest state only; no old evidence rewritten'}));
