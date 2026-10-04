import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const edits=[
 ['project_context/architecture/runtime-and-domain.md',
  'Closest ready coarse levels survive refinement loading/failure with their real field, explicit retry and committed-image attribution. The scene resolves each actual target through the common catalog/TAN owner and shared GPU artwork program.',
  'A requested fine level also wants its immediate wider field within that existing two-image budget/queue. Closest ready coarse levels survive refinement loading/failure with their real field, explicit retry and committed-image attribution. The scene resolves each actual target through the common catalog/TAN owner and shared GPU artwork program, drawing the valid wider field first and finer field above it from the same optical publication. This preserves actual outer structure when a finite finer field replaces it; the opaque fine core remains unchanged. The queued frame compares both field identities/levels/geometry, so parent arrival/removal has an actual rendered effect. Each failed image retains independently usable pixels; attribution follows the finest successfully visible field after foreground masking, including an exposed parent when the fine field is entirely covered. The public page binds that actual field metadata and partial-failure retry to its current publication.'],
 ['project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
  '目标切换隔离旧清单、影像身份和出版，细档加载/失败保留同目标适用粗图并可显式重试。共享投影/GPU选择实际成功绘出的一个目标巡天波段：',
  '目标切换隔离旧清单、影像身份和出版。细档及其直接粗档共用原有两图缓存和有界队列；同一光学出版先画实际宽视场粗图，再叠细图，保留有限细图外围的真实结构。细档加载/失败保留同目标适用粗图并可显式重试；各图独立失败，实际可见的最细有效层绑定来源和重试，细图被地景完整遮住但粗图露出时保粗图来源。粗图到达/替换/移出应更新当前绘制帧。共享投影/GPU选择实际成功绘出的一个目标巡天波段：'],
];
for(const [file,from,to] of edits){const source=await fs.readFile(file,'utf8');assert.equal(source.split(from).length,2,file);await fs.writeFile(file,source.replace(from,to));}
console.log(JSON.stringify({changedSkyContext:edits.map(([file])=>file),scope:'Only the existing Cloud Sky optical responsibility; original inputs/rights/coverage/platform limitations preserved'}));
