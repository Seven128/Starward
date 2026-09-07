import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(), directory=path.resolve(import.meta.dirname,'..');
const paths=[
 'docs/design-plans/Starward_Codex_执行提示词.md','docs/design-plans/Starward_设计资源Skill_开发方案.md','docs/design-plans/Starward_地图与我的_UI重构_测试方案.md',
 'AGENTS.md','project_context/global.md','project_context/context.toml','DESIGN.md',
 'project_context/areas/main/screen-contracts/wechat-miniapp.md',
 ...['map-and-finder','surfaces-and-controls','spot-and-sky','shared-state-and-recovery','information-design'].map(n=>`project_context/areas/main/screen-contracts/wechat-miniapp/${n}.md`),
 'apps/wechat-miniapp/src/pages/map/index.tsx','apps/wechat-miniapp/src/pages/map/spot-panel.tsx','apps/wechat-miniapp/src/pages/map/time-ruler.tsx',
 'apps/wechat-miniapp/src/features/my/my-library-page.tsx','apps/wechat-miniapp/src/features/my/plan-entry.ts',
 'apps/wechat-miniapp/src/components/semantic-asset.tsx','apps/wechat-miniapp/config/index.ts','package.json'
];
const sourceFiles=await Promise.all(paths.map(async file=>({path:file,sha256:createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')})));
const run={schema:1,runId:'20260907-skill-validation',repository:root,researchHead:'424c971be1a27b0587c1789ba5e736f1a57aade2',executionHead:'d0c77b613ebc581ee0be9cf283d1edb631643b2c',startedAt:'2026-09-07T07:04:51+00:00',model:{id:'gpt-6-astra',effort:'high',source:'current task host rollout turn_context fields; read 2026-09-07, not model self-report'},versions:{codex:'0.144.5',node:process.version,runtime:'chrome browser-client 26.901.51231; Scripter not probed yet'},runtime:{path:'scripter-chrome',status:'unverified',fileKey:null},usage:{inputTokens:null,outputTokens:null,reason:'per-experiment host usage not yet available; no estimate substituted'},sourceFiles,failures:[{phase:'P0',kind:'browser-action-timeout',detail:'Google account selection returned timeout; later Figma page confirmed successful login. No repeat click.'}],manualInterventions:0,initialWorktree:['untracked .codex/work-items/miniapp-integrated-2026-09-06/; preserved'],adoption:'unselected',production:'unchanged',figmaAccount:{tier:'starter',seat:'View',source:'Figma connector whoami; no account personal fields retained'}};
await fs.writeFile(path.join(directory,'run.json'),JSON.stringify(run,null,2)+'\n');
console.log('Saved source hashes and observed non-secret environment metadata.');
