import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const out = 'output/local-object-region-context-update-1002-r1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const old = '当前依赖：先按真实目录major/minor/PA、exact TAN与实际选中支持核对象局部区域/可辨语义和既有参照，明确unknown/有效黑核/亮coarse外围；不能先造whole-buffer pre-aid getter或点亮度阈值。依据闭合后再实施一次共同局部观察/decision与完整自然淡化恢复，并测完整场景成本/native预算与默认采用。完整源质量/PSF/颜色、其余对象、组合/平台/资源及200DAU交付义务继续；独立整场资源责任可依原PLAN推进。';
const next = '[目录中心/对象局部region前置](evidence/experience-local-object-region-development-closure-2026-10-02.md)已有限开发闭合并获[实际独审](evidence/experience-local-object-region-independent-review-2026-10-02.md)：新报告传原ICRS center/形状cache版本，旧cache缺中心保持unknown；shared raw-plane ellipse保真实轴/北向东PA/同report旋转，actual science submission保存同ref冻结域，normal noport不扫描。当前39/51只是几何完整输入，非谱带mask/可辨认或需求上限。实际新owner/PNG四邻与独立矩阵核分离亮coarse外围，精确边界有数值舍入，未来排样不能据此直接证EMPTY。当前依赖：依据既有参考和actual selected支持定义有解释的局部观察/共同decision及边缘政策，再以一次pre-aid flush、signal revision和accepted/native寿命落实完整自然淡化恢复；不能用global HAS/whole-buffer或点亮度替代。独立[完整资源入口](evidence/experience-complete-resource-composition-preparation-2026-10-02.md)已核五合法pose/现有输入，正在推进同Canvas真实Hooks/SAO、细图挂起失败重试及压缩/解码/texture-buffer-FBO计量，尚无新GPU/native/容量结果。App TS与限定合同/provider检查已过，worker全量七条未改路径类型错误保FAILED。完整源质量/PSF/颜色、其余对象、ordinary science/default、组合/平台/native预算及200DAU交付继续。';
const files = [`${task}/PLAN.md`, `${task}/STATE.md`, `${task}/INDEX.md`, `${task}/HANDOFF-2026-10-01.md`,
  'project_context/architecture/runtime-and-domain.md',
  'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md', `${task}/PROGRESS.md`];
const before = [];
const proposed = [];
for (const file of files) {
  const bytes = await readFile(file), text = bytes.toString('utf8');
  before.push({ path: file, bytes: bytes.length, sha256: hash(bytes) });
  let changed;
  if (file.endsWith('/PLAN.md') || file.endsWith('/STATE.md') || file.endsWith('/INDEX.md') || file.endsWith('/HANDOFF-2026-10-01.md')) {
    if (text.split(old).length !== 2) throw new Error(`current dependency guard: ${file}`);
    changed = text.replace(old, next);
  } else if (file.endsWith('/PROGRESS.md')) {
    if (text.includes('local object region：几何前置有限开发闭合')) throw new Error('progress already updated');
    changed = `${text}\n\n## 2026-10-02→10-03 local object region：几何前置有限开发闭合\n\n[统一闭合](evidence/experience-local-object-region-development-closure-2026-10-02.md)及[独审](evidence/experience-local-object-region-independent-review-2026-10-02.md)完成原目录ICRS中心/报告形状cache版本、旧cache兼容与shared raw-plane ellipse，同ref exact science submission保存冻结域；default不增加无需求扫描，现有共同aid/expected fine-coarse/资格来源不变。当前39完整几何与missing字段、真实selected支持/亮coarse区域外分开，边界数值误差不供absence/EMPTY/readability证书。actual新production CPU与独立Gaussian/TAN/原PNG读回分代保留，3个有效变异/中心变化与冻结/actual Scene call控制已核。\n\n原75行为检查保r1源码；新test optional字段改真实omit后的6区域/App TS5.9.3通过，production/data未变，不重ray/GPU。三个过期canvas-time fixture失败已保raw并仅修对应断言/真实owner绑定，完整文件通过。root合同/provider限定检查通过、全worker七条未改路径类型错误仍FAILED；作者/root/独审task脚本失败保原代。当前Scene53c5/page522不升级旧GPU/new native证据，六保留文件与HEAD不动。唯一下一依赖由PLAN维护；独立五态完整Hook/SAO/资源恢复测量已进入执行准备，尚无新整场结果。local observation/decision、源质量/PSF/颜色、default/native/全交互及200DAU交付仍OPEN，Goal active无预算未完成。\n`;
  } else {
    const marker = 'experience-common-opacity-development-closure-2026-10-02.md';
    const at = text.indexOf(marker), end = text.indexOf('\n', at);
    if (at < 0 || end < 0) throw new Error(`context anchor: ${file}`);
    const nl = text.includes('\r\n') ? '\r\n' : '\n';
    const paragraph = file.includes('/architecture/')
      ? 'Catalog local-domain geometry is now owned by `sky-deep-sky-region.ts`, using optional source-bound `DeepSkySceneCatalogEntry.icrsCenter`, original full axes/north-east PA and the actual report rotation through the existing raw-plane/inverse owner. The BFF catalog provider supplies the original center and versions report shape separately from unchanged catalog bytes; old cached reports retain unknown regions. The client does not import the Node catalog loader or borrow image/time-model centers. Only the explicit matching science submission retains a frozen domain; normal no-port/no-image callers skip the new search. This bounded geometry/contract/controlled-consumer and independent CPU/raw-PNG development does not implement local observation/readability, spectral segmentation, conservative edge/absence proof or a new aid rule. Exact ellipse-boundary rounding needs its own policy before a future sampling consumer excludes data. See the [local-domain closure](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-local-object-region-development-closure-2026-10-02.md).'
      : '目录对象区域现由原ICRS中心、真实两轴/北向东PA与当代report旋转定义；旧缓存无中心或缺维度/方向时保未知，不借图片中心、零PA或圆形猜补。当前[共享区域有限开发](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-local-object-region-development-closure-2026-10-02.md)及独审只闭合几何前置和同ref显式science提交的冻结域；39个完整对象是当前来源状态，非范围上限。目录椭圆不是当前谱带分割、有效mask或可辨认度，边界舍入不提供absence/EMPTY保证；域外亮coarse/全局HAS不证核心可辨。它暂未改变共同辅助透明度或普通science默认，局部观察/自然淡化恢复、整体画质/成本和目标验收继续按原要求。';
    if (text.includes(paragraph)) throw new Error(`context already updated: ${file}`);
    changed = text.slice(0, end + 1) + nl + paragraph + nl + text.slice(end + 1);
  }
  proposed.push({ file, text: changed });
}
// All guards/readable evidence resolved before the first governing mutation.
await readFile(`${task}/evidence/experience-local-object-region-development-closure-2026-10-02.md`);
await readFile(`${task}/evidence/experience-local-object-region-independent-review-2026-10-02.md`);
await mkdir(out);
await writeFile(`${out}/before.json`, JSON.stringify(before, null, 2));
for (const { file, text } of proposed) await writeFile(file, text);
const after = await Promise.all(files.map(async file => { const bytes = await readFile(file);
  return { path: file, bytes: bytes.length, sha256: hash(bytes) }; }));
await writeFile(`${out}/after.json`, JSON.stringify(after, null, 2));
console.log(JSON.stringify({ status: 'UPDATED_CURRENT_OWNERS', files: files.length, currentDependency: next }));
