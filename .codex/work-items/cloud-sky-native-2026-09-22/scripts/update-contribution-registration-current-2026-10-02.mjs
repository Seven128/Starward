import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const old = '当前按[正常消费者审计](evidence/experience-sdss-normal-level-integration-audit-2026-10-02.md)及[贡献边界审计](evidence/experience-artwork-contribution-boundary-audit-2026-10-02.md)推进最小WebGL1资格/显示信号、实际后续alpha与finish导航、max归约/读回及量化/资源可行性；再稳定光学/W3选择和完成帧来源，接normal group绘制与恢复。CPU双bitplane和新合同未采用，FBO试验不提升成普通绘制/native验收；';
const next = '[精确TAN/已绘寿命开发闭合](evidence/experience-sdss-science-registration-retirement-development-closure-2026-10-02.md)已保原始plane权重与实际publication几何，并统一退休图片的status/recovery/cue/modal资格；[最小FBO可行性开发闭合](evidence/experience-contribution-fbo-development-closure-2026-10-02.md)已核同prepared纹理/实际后续alpha/finish/MAX，但仅96×128 task条件。当前依[正常消费者审计](evidence/experience-sdss-normal-level-integration-audit-2026-10-02.md)、[完整consumer边界](evidence/experience-sdss-science-normal-consumer-boundary-2026-10-02.md)及[贡献边界](evidence/experience-artwork-contribution-boundary-audit-2026-10-02.md)，先落实shared资格/真实photo/UNKNOWN receipt及有界资源、初次setup失败/context恢复；再稳定whole-cutout光学/W3互斥和完成帧全部来源消费者，接normal group绘制/partial/粗层恢复。RGBA8零不等于无贡献，positive不等于饱和后counterfactual色差；不得按亮度触发coarse/W3回填。CPU双bitplane/新合同未采用，FBO小试不提升成普通绘制/high-DPR/native性能或画质验收；';
const replaceOnce = (raw, from, to, file) => {
  assert.equal(raw.split(from).length, 2, 'unique current owner fragment: ' + file);
  return raw.replace(from, to);
};
for (const name of ['PLAN.md', 'STATE.md', 'INDEX.md', 'HANDOFF-2026-10-01.md']) {
  const file = task + '/' + name, raw = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, replaceOnce(raw, old, next, file));
}
const context = 'project_context/architecture/runtime-and-domain.md';
let raw = await fs.readFile(context, 'utf8');
const anchor = 'The current normal scene explicitly excludes this science envelope from legacy JPEG opacity passes.';
raw = replaceOnce(raw, anchor, anchor + ' `sky-artwork-registration.ts` keeps the existing unit-ray entry and owns raw affine plane points; `sky-sdss-science-registration.ts` uses full publication center and actual level TAN/CRPIX through the supplied validated report matrix without separately normalizing anchors or re-orthogonalizing it. It preserves the published linear-TAN approximation, not original-source distortion or a universal GPU precision bound; the normal caller still owns same-frame selection. Optical status/recovery and optical/infrared named cues share their existing live completed-image gates with modal provenance, withdrawing retired handles while preserving independently current images and the completed immutable hash.', context);
const fbo = 'A WebGL1 ROI-FBO/max-reduction/readback path is only a bounded feasibility candidate:';
raw = replaceOnce(raw, fbo, 'A task-only WebGL1 96x128 prepared-texture FBO/MAX trial has exercised actual destination-alpha attenuation and finish/navigation clear with independent pixel/state/resource readback, but no normal receipt, high-DPR/repeated-frame/native budget or complete setup/context-loss recovery is adopted:', context);
await fs.writeFile(context, raw);
await fs.appendFile(task + '/PROGRESS.md', '\n2026-10-02：精确science TAN/raw plane及completed图片寿命consumer已获[有限开发闭合](evidence/experience-sdss-science-registration-retirement-development-closure-2026-10-02.md)：旧单位API保持，新配准保实际M权重、pub center/档位几何，旧queued图片退休时status/recovery/cue与modal同步。真实修前回放失败、修后影响检查/TSC及独审/root当前绑定成立；tiny normalize mutant不能被原容差杀死的诊断保留，controlled45°几何反例有作用，不冒称真实新publication。现watch成功编译当前page，无重启。\n\n同prepared窗口/GL uniforms的[最小FBO可行性](evidence/experience-contribution-fbo-development-closure-2026-10-02.md)已取得一次96×128实际softwareGPU、独立及root整图/状态/账本读回；资格与照片强度分开、additive保留/真实前景衰减/finish导航清除/MAX均有效，数学正值量化0需UNKNOWN。旧registration执行证据不升级新raw-plane；部分sourceavailability、普通W3/credit、完整setup/context失效、390×844/DPR与成本仍未验。唯一PLAN下一依赖为shared贡献/uncertainty receipt与有界失败恢复，然后whole-cutout谱段/完成消费者和normal group。源画质、WXML/native、手机新月面、总资源/混合200DAU和完整交付保留；6保留修改、HEAD/branch不动。Goal active无预算未完成。\n');
console.log(JSON.stringify({ currentOwnersUpdated: 4, context, singlePlanRetained: true }));
