import fs from 'node:fs';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const status='共享source/TAN owner已从原单field48.4369%推进到[真实六字段同母图](evidence/experience-sdss-m51-mosaic-2026-10-02.md)：18缓存帧、全2048²同fieldgri采样支持、共同几何权重与partial mask/data真正修前287→修后0；[独立审查](evidence/experience-sdss-m51-mosaic-independent-review-2026-10-02.md)实际核arrays/PNG/WCS/GPU/编码与旧资产。[全局transfer实物独立核](evidence/experience-sdss-global-transfer-independent-review-2026-10-02.md)证明三档同一次母图映射，提亮显结构也显噪声，颜色/PSF/画质未采用；共享单场/拼接transfer owner已实现，当前收口开发验证与独立复核。[真实消费者审计](evidence/experience-sdss-progressive-consumer-audit-2026-10-02.md)核现v1 opaque fine内部正常替代coarse，稳定W3选择域互斥；重复贡献仅是未采用additive/signal-over候选风险。下一依赖为共享独立coverage控制的一次粗细贡献/失败回退及实际背景/窗口边缘、颜色/细节和编码取舍。[六字段源质量](evidence/experience-sdss-m51-field-quality-2026-10-02.md)已核actualCAS/PSF：两run清晰度有差别，score0由PHOTO_STATUS=TOO_LONG影响，不能当缺失/坏原帧，也不据scalarPSF去卷积/调权重；fpM/空间PSF/精准配准/完整质量仍未验。[已有组合/编码](evidence/experience-sdss-mosaic-composition-and-encoding-2026-10-02.md)不凭亮度或小字节验画质；old singlefield/201assets/6保留文件保持。继续 cached 科学母图/新generation，不重 source/Moon、不重启选型；M82等、新版合同/旧offer/已绘来源、持久缓存、native/手机暂停、总资源/200DAU容量与最终验收全部保留。Goal active无预算未完成。';
for(const file of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md']){
  const pathname=task+file,old=fs.readFileSync(pathname,'utf8');
  const line=/^\*\*M51共享影像（2026-10-02）：\*\* [^\r\n]*/m;
  assert(line.test(old));assert(!old.includes('六字段源质量'));
  fs.writeFileSync(pathname,old.replace(line,'**M51共享影像（2026-10-02）：** '+status));
}
fs.appendFileSync(task+'PROGRESS.md','\n\n## 2026-10-02 同母图transfer/真实消费者与源清晰度\n\n'+status+'\n');
const architecture='project_context/architecture/runtime-and-domain.md';
let source=fs.readFileSync(architecture,'utf8');
const before='New transparent/additive display choices also need explicit progressive replacement of the same master signal:';
const after='Current v1 opaque SDSS fine interiors replace their coarser field through source-over; selected and wide W3 have disjoint stable page eligibility domains. Do not relabel unadopted task-composite risks as those existing runtime defects. New transparent/additive display choices also need explicit progressive replacement of the same master signal:';
assert(source.includes(before));assert(!source.includes('Field-level CAS quality'));
source=source.replace(before,after);
const anchor='Source primary TAN is an approximation; retained full astrometric coefficients and diagnostic assumptions do not certify absolute alignment.';
assert(source.includes(anchor));
source=source.replace(anchor,'Field-level CAS quality/score, per-band image/calibration flags and noise-effective PSF width supplement source review; they do not locate pixel artifacts or supply a spatial PSF. A catalog PHOTO_STATUS timeout can force score zero without establishing an intrinsically bad corrected frame, so do not drop galaxy samples by that scalar alone. Catalog recalibration metadata does not authorize recalibrating already calibrated frame arrays. Display exposure/upscaling does not restore source seeing/sampling-lost detail; scalar PSF widths alone cannot justify deconvolution or replacement of shared geometric weights. '+anchor);
fs.writeFileSync(architecture,source);
console.log('Updated current continuity and durable source/consumer boundaries; quality/runtime adoption remains open.');
