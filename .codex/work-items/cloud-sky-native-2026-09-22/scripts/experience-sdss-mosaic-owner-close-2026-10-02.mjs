import fs from 'node:fs';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const status='共享source/TAN owner已从原单field48.4369%推进到[真实六字段同母图](evidence/experience-sdss-m51-mosaic-2026-10-02.md)：18缓存帧、共同几何权重、同母图一次RGB/三级、科学coherent可取与独立band供给分开；全2048²同fieldgri采样支持已证。partial mask/data缺陷有真正修前287→修后0回归；[独立审查](evidence/experience-sdss-m51-mosaic-independent-review-2026-10-02.md)实际核完整arrays/PNG/WCS/原资产。旧singlefield/201assets/6保留文件保持，新r2候选未采用。[真实软件GPU与编码比较](evidence/experience-sdss-mosaic-composition-and-encoding-2026-10-02.md)补齐来源图伴星/斜切缺口，默认暗棕/细节、明亮背景矩形仍开放；有损字节小不等画质好，lossless opaque RGB已测像素不变。当前下一依赖是共同全局transfer/源PSF与颜色、共享粗细单一贡献/失败回退、背景/窗口边界和编码取舍；task透明/叠加方案可能重复coarse+fine信号，先核真实消费者，不当现v1 opaque已修或已采用。继续使用已缓存科学母图及研究，写新generation，不重复source/Moon或重启选型。[asTrans诊断](evidence/experience-sdss-astrans-approximation-audit-2026-10-02.md)仅声明假设，精准配准/fpM/PSF/整体图质未验；M82等义务不减。正式版本/旧offer/已绘来源、持久缓存、原生/手机暂停、总资源/200DAU容量与最终验收全部保留，Goal active无预算未完成。';
for(const file of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md']){
  const pathname=task+file,old=fs.readFileSync(pathname,'utf8');
  const line=/^\*\*M51共享影像（2026-10-02）：\*\* [^\r\n]*/m;
  assert(line.test(old));assert(!old.includes('partial mask/data缺陷有真正修前287→修后0回归'));
  fs.writeFileSync(pathname,old.replace(line,'**M51共享影像（2026-10-02）：** '+status));
}
fs.appendFileSync(task+'PROGRESS.md','\n\n## 2026-10-02 完整母图/partial契约与实际天空编码\n\n'+status+'\n');
const architecture='project_context/architecture/runtime-and-domain.md';
const old=fs.readFileSync(architecture,'utf8');
const before='Multi-field expansion belongs here with explicit coherent field/band contribution and overlap rules, preserving independent source availability and measured zero/negative values.';
assert(old.includes(before));
const after='Multi-field processing uses one normalized per-field geometric weight for all available gri bands before one RGB transform. `build_mosaic_master` rejects duplicate/incomplete field-band sets and can require complete coherent target support. Aggregate `ProjectedBand` masks describe the actual coherent coadd data, including NaN outside support; `GriMaster.independent_band_unions`/`BandSourceUnion` separately expose source supply without claiming an aggregate measurement. Known independent per-field zero/negative samples remain available in source sidecars. Geometric weights are not confidence/PSF/noise/exposure or display alpha, and calibrated sky is not subtracted twice. New transparent/additive display choices also need explicit progressive replacement of the same master signal: fine availability and display alpha are different responsibilities, and failed/partial fine must retain usable coarse results; a larger coarse-plus-fine signal is not a quality improvement.';
fs.writeFileSync(architecture,old.replace(before,after));
const readme='data-pipelines/deep-sky/README.md',source=fs.readFileSync(readme,'utf8');
const anchor='Display alpha is separate from sample availability and scientific validity.';
assert(source.includes(anchor));assert(!source.includes('`build_mosaic_master` keeps aggregate coherent'));
fs.writeFileSync(readme,source.replace(anchor,anchor+'\n`build_mosaic_master` keeps aggregate coherent-data masks consistent with\nfinite coadd samples; `independent_band_unions` separately describes known\nsource supply. `require_complete=True` checks coherent same-field gri support,\nnot only three separate band unions. Common geometric weights preserve the\nshared band contribution; no automatic background offset or second calibration\nis inferred from overlap. Progressive display and lossless/lossy encoding\nremain independent review obligations before publication.'));
console.log('Closed the bounded mosaic mechanism and retained the next quality/LOD/encoding dependency.');
