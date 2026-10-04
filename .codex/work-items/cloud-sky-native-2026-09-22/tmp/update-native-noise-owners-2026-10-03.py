from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'

def replace_once(path, old, new):
    raw = path.read_bytes()
    a, b = old.encode(), new.encode()
    assert raw.count(a) == 1, (path, raw.count(a))
    path.write_bytes(raw.replace(a, b))

replace_once(TASK/'PLAN.md',
    '下一直接项是现有corrected frame的SKY/CALIB与实际相机噪声支持、跨带资格和必要共同显示处理，再核真实弱结构/颜色',
    '现有frame/CAS已进入[原生噪声owner与相关性实测](evidence/experience-science-native-noise-2026-10-03.md)：旧receipt逐对象保持、六份真实patch像素保持，i带噪声较高；平方插值系数/复用native的4×4均值相关性已核，不把same-run overlap当独立曝光。未改科学/权重/显示/版号。下一直接项沿已核三带资格和原生噪声边界选择有依据的共同显示小路径，先比较真实弱结构/颜色与失败恢复；不将局部noise模型直接冒全幅confidence/coadd权重，也不重复旧全幅PSF/flag/重叠矩阵')
replace_once(TASK/'PLAN.md',
    '核真实层级/背景/颜色/PSF/弱结构/已绘来源Back及独审；旧encoded/v2合同与默认保留。',
    '核真实层级/背景/颜色/PSF/弱结构/已绘来源Back及独审；已有原生frame/CAS噪声owner/局部相关性只供有界量测，不供应完整coadd置信或普通显示采用。旧encoded/v2合同与默认保留。')
replace_once(TASK/'CONTINUE-CLOUD-SKY.md',
    '以下均是相应代码/输入/运行条件下的开发证据，不是完整 native 或最终验收；详细失败记录和独审入口在各文档内。',
    '以下均是相应代码/输入/运行条件下的开发证据，不是完整 native 或最终验收；详细失败记录和独审入口在各文档内。\r\n\r\n- **当前原生噪声支持：** [frame/CAS owner与实际相关性](evidence/experience-science-native-noise-2026-10-03.md)保留只读CALIB/SKY并精确绑定实际相机参数，原receipt和旧真实patch保持；噪声、flags、science availability与alpha分开。单像素variance平方系数、块均值的native复用相关性及same-run overlap不能当独立曝光已核；只供有界量测，没有新显示/权重/出版/default。当前下一依赖由PLAN顶部更新，真实弱结构/颜色、完整来源Back/native和独审未闭合。')
replace_once(ROOT/'project_context/architecture/runtime-and-domain.md',
    'Target resource ownership has three distinct layers:',
    '`data-pipelines/deep-sky/sdss_frame_noise.py` owns cached Field camera-parameter binding and requested native-pixel statistical variance. The corrected-frame reader retains read-only CALIB/ALLSKY/XINTERP/YINTERP from already admitted bytes without rewriting its v1 receipt or calibrated science. Parameters join exact field/band, preserve large Field IDs as strings and reject ambiguous/missing rows, changed bytes or invalid gain/darkVariance. The official counts formula reverses calibration/sky subtraction for variance only; missing metadata, unsupported SKY extrapolation, invalid calibration or variance remain unavailable, independent of finite black/negative samples and fpM flags. Shared source geometry applies, but variance interpolation requires squared coefficients and adjacent target samples reuse native pixels. Same-run overlapping frames are not independent exposures. This bounded native model does not include full native/coadd covariance, sky-model/systematic uncertainty, inverse-variance coadd weighting or display/quality adoption. Existing projection, coadd and publication consumers remain unchanged. See [actual native noise boundary](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-native-noise-2026-10-03.md).\r\n\r\nTarget resource ownership has three distinct layers:')
replace_once(ROOT/'project_context/external-capabilities.md',
    '完整图质/独审与普通采用未闭合，见[发布/消费者证据]',
    '原生噪声owner复用实际frame的CALIB/SKY和字节绑定CAS相机参数，仅反算统计variance，不再次校准/扣sky；重采样相关性和same-run重叠不得忽略，局部模型不供应完整coadd权重/置信或显示采用，见[实际noise边界](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-native-noise-2026-10-03.md)。完整图质/独审与普通采用未闭合，见[发布/消费者证据]')
checkpoint = TASK/'scripts/capture-current-execution-2026-10-03.ps1'
replace_once(checkpoint,
    "  'data-pipelines/deep-sky/sdss_gri_tan.py',",
    "  'data-pipelines/deep-sky/sdss_gri_tan.py',\r\n  'data-pipelines/deep-sky/sdss_corrected_frame.py',\r\n  'data-pipelines/deep-sky/sdss_frame_noise.py',\r\n  'data-pipelines/deep-sky/test_sdss_frame_noise.py',\r\n  \"$taskRoot/scripts/experience-science-native-noise-2026-10-03.py\",")
replace_once(checkpoint,
    "  'output/science-colour-width-1003-r1/result.json',",
    "  'output/science-native-noise-1003-r1/result.json',\r\n  'output/science-native-noise-1003-r1/frame-model.html',\r\n  \"$taskRoot/evidence/experience-science-native-noise-2026-10-03.md\",\r\n  'output/science-colour-width-1003-r1/result.json',")
raw = checkpoint.read_bytes()
replacements = {
    b"    toolObserved='": "    toolObserved='Current native noise owner retains 218948B admitted calibration/sky metadata per frame, binds actual Field gain/darkVariance by exact field/band, and preserves old receipt/science/publication. Actual six flag-clean patch paths replay old receipt and sampled science exactly. Native formula agrees with direct FITS reference; missing metadata, camera mismatch, invalid calibration/variance and SKY edges remain unavailable. Single target variance needs squared interpolation coefficients; 4x4 mean covariance needs combined shared-native coefficients (conditional variance median 1.847-1.864 times independent-target sum). Same-run patch correlation 0.9718-0.9904 does not establish independent exposures. Six new native-noise boundary checks and 38 affected frame/stencil/gri/noise checks passed. No science downloads, full coadd/noise/confidence image, image/display/weight/publication/default change or repeated LOD/static/disk/DevTools matrix. Prior new publication-specific bounded source chain and software Scene evidence remain under their exact old runs; actual router/page/Back/time/native, full quality and review still open. Context/links/scoped whitespace checked by invoking turn.'",
    b"    build='": "    build='No new WEAPP build in this noise increment; existing watch process retained. Prior R5 page/source map and CSS order warning remain historical evidence.'",
    b"    next='": "    next='PLAN B: actual frame/CAS native noise and local resampling correlation now bounded-verified; choose evidence-based common display small path with actual multiband flags/noise constraints, compare real weak structure/color and failure recovery before adoption. Do not promote native diagonal variance to full coadd confidence or count same-run overlaps independently; do not repeat unchanged full PSF/flag/overlap or LOD/red matrices. Full actual page/Back/time/native and independent review open. D actual references/production disk/whole-product cost/mixed capacity independent open. Defaults unregistered, HST sky/rights unresolved.'"
}
lines = raw.splitlines(keepends=True)
for prefix,new in replacements.items():
    indices = [i for i,line in enumerate(lines) if line.startswith(prefix)]
    assert len(indices)==1
    lines[indices[0]] = new.encode()+b'\r\n'
checkpoint.write_bytes(b''.join(lines))
print('Updated current owners and checkpoint statements; old checkpoints untouched.')
