import fs from 'node:fs';
const task='.codex/work-items/context-design-audit-2026-09-09/',root='docs/design-resources/wechat-miniapp/';
const ids={sky:'13823253487989500123',my:'11944978164995734673',search:'5585184579244766246',plan:'1643718854829580633',map:'13338420663663046308'};
for(const [name,project] of Object.entries(ids)){
 const state=JSON.parse(fs.readFileSync(task+'stitch-cleanup/'+name+'-after.json','utf8'));const current=state.items.find(x=>x.title.includes('当前精确参考'));
 const dir=root+name+'/candidates/context-audit-2026-09-09/';
 fs.appendFileSync(dir+'CURRENT.md','\n## 当前视觉与 Stitch\n\n[当前390px视觉](reference/'+name+'-current-2026-09-09.png) · [Stitch项目](https://stitch.withgoogle.com/projects/'+project+')\n\nStitch当前精确参考节点 `'+current.id+'`；它是从当前本地页面输出并同步的截图，不是可编辑HTML节点。可编辑交互源以本目录preview和页面引用的共享资源为准。Stitch保留仍适用的生成底稿/其他状态，清理已替代稿'+state.removed.length+'张；清理前源稿已归档在项目任务记录。\n');
}
for(const p of ['DESIGN.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'])fs.writeFileSync(p,fs.readFileSync(p,'utf8').trimEnd()+'\n');
fs.appendFileSync(task+'FINALIZATION.md','\nStitch五项目同步完成：5张精确当前截图均上传并命名；清理旧稿共22张（Sky5、My7、Search8、Plan2），Map无被替代独立稿。保留有效源状态/事件页/素材；每个项目有before源稿和after清单，UI删除后验证撤销可用。\n');
