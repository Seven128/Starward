"""Record actual quality decisions and current owners; never alter prior runs."""
from pathlib import Path
import csv
import hashlib
import io
import json

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'

def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}

def write_new(path,value):
    assert not path.exists()
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def edit(path,old,new):
    text=path.read_text(encoding='utf-8');assert text.count(old)==1,(path,old)
    path.write_text(text.replace(old,new),encoding='utf-8',newline='')

tone_dir=ROOT/'output/sdss-display-tone-1003-r2'
tone=bind(tone_dir/'result.json');assert tone['sha256']=='bd8401846dea373e567b84bacdf15bf64e581ba7b9548a84aa6bcdb5911ab846'
for name in ('inputs-before.json','inputs-after.json'):
    rows=json.loads((tone_dir/name).read_bytes());assert all(bind(ROOT/r['path'])==r for r in rows)
write_new(tone_dir/'assessment.json',{'result':tone,'decision':'REJECTED_TONE_ONLY','viewed':bind(tone_dir/'three-level-tone-and-official-comparison.png'),
    'basis':['Actual overview grain/background worsened; actual detail became washed out.',
        'Lupton amplitude is not established physical linear sRGB, so no missing-gamma claim.'],
    'ordinaryAdoption':False,'scientificCorrection':'NONE','fullQuality':'UNVERIFIED','independentReview':'MISSING'})

reg_dir=ROOT/'output/sdss-measured-registration-1003-r1'
reg=bind(reg_dir/'result.json');assert reg['sha256']=='2b1d33729c1d10550860bc67cc146d1fa464858ea0ac68b0962e88606862371d'
for name in ('inputs-before.json','inputs-after.json'):
    rows=json.loads((reg_dir/name).read_bytes());assert all(bind(ROOT/r['path'])==r for r in rows)
sd=ROOT/'output/sdss-registration-stars-center-supplement-1003-r1'
receipt=json.loads((sd/'receipt.json').read_bytes());raw=(sd/'response.csv').read_bytes()
assert receipt['status']==200 and receipt['bytes']==len(raw)==264
assert receipt['sha256']==hashlib.sha256(raw).hexdigest()=='ff1172f49a6461ca7061925307ea63b2b72c30adbf6f13b48ed3bcd8b6bc39cf'
lines=[l for l in raw.decode('utf-8-sig').splitlines() if l and not l.startswith('#')]
primary_lines=[l for l in (ROOT/'output/sdss-registration-stars-1003-r1/response.csv').read_text('utf-8-sig').splitlines() if l and not l.startswith('#')]
assert lines[0]==primary_lines[0] and len(lines)==1
assert not list(csv.DictReader(io.StringIO('\n'.join(lines))))
write_new(reg_dir/'assessment.json',{'result':reg,'viewed':bind(reg_dir/'distributed-actual-star-patches.png'),
    'scope':'Measured catalog/asTrans and existing saved-output development only; no WCS or image alteration.',
    'centerSupplement':{'response':bind(sd/'response.csv'),'receipt':bind(sd/'receipt.json'),'query':bind(sd/'query.sql'),'validatedRows':0,
        'meaning':'No detections supplied under declared type/mode/brightness/complement filters. Not absence of physical stars or intrinsically bad corrected frames.'},
    'existingFieldQualityEvidence':bind(TASK/'evidence/experience-sdss-field-quality-independent-review-2026-10-02.md'),
    'decision':'RETAIN_LINEAR_WCS_NO_BLIND_SHIFT','completeRegistration':'UNVERIFIED','centerCatalogSupply':'UNAVAILABLE_IN_DECLARED_QUERY',
    'independentReview':'MISSING','sourceImageRequests':0,'productionCorrection':'NONE'})

plan=TASK/'PLAN.md'
old='下一直接项仍是完整候选质量：依据当前保存结果和成熟实际处理先处理棕色底、标记源周边/处理边界、完整弱结构/覆盖与配准证据；'
new='最新[成熟显示/固定色调否决](evidence/experience-sdss-mature-display-and-tone-2026-10-03.md)已查看三级当前/一次OETF/缓存官方图，单独色调显著放大暗颗粒而否决，已知四处不满足论文SAT亮核恢复条件。新增[真实星点/逐带配准](evidence/experience-sdss-measured-star-registration-2026-10-03.md)用173检测的实际中心/颜色、18缓存frame和15条目标内qualified检测核保存science/estimate；r公式与目录一致，目录并非独立天体测量真值。两个中心field补查仍零行，与已知TOO_LONG风险分开记录，不当恒星不存在/科学零值或整图坏。没有盲改WCS/shift或把15检测当完整质量。\n\n下一直接项仍是完整候选质量：依据当前保存结果与实际源/成熟处理资格，处理整图背景/弱结构和flags支持边界；中心目录缺口须真实源/处理依据，星色不能代替扩展天体逐像素DCR、PSF或被扣模型，不重查相同空表/旧origin矩阵，不再扫描gamma/sigma/gain。配准完整义务继续保留；'
edit(plan,old,new)
edit(plan,'实际加工snapshot/source-chain及保存输出已开发并修对象身份逃逸；下一步处理现存色底/标记边界/弱结构与配准，',
    '实际加工snapshot/source-chain及保存输出已开发并修对象身份逃逸；固定单独色调已否决，真实星点/asTrans及目标内保存输出已有限核，中心目录仍缺，不盲改WCS。下一步按真实源/处理资格处理整图色底/弱结构/flags边界与完整配准，')
cont=TASK/'CONTINUE-CLOUD-SKY.md'
edit(cont,'棕色底、标记边界/弱结构、完整配准/普通出版/成本/独审仍缺，唯一下一依赖见PLAN。',
    '新增[固定色调否决](evidence/experience-sdss-mature-display-and-tone-2026-10-03.md)与[真实星点配准](evidence/experience-sdss-measured-star-registration-2026-10-03.md)：旧三级PNG精确重现后一次OETF放大暗颗粒，未采用；173检测/15条目标内资格保存输出有限核，中心两field补查空表保缺失，与旧TOO_LONG风险不混同科学坏值。不盲改WCS/shift或循环参数。棕色底、flags边界/弱结构、完整配准/正式出版/成本/独审仍缺，唯一下一依赖见PLAN。')
# Markdown label and destination both mention the checkpoint; exact pair.
edit(cont,'[current-execution-state-2026-10-03-r19.json](evidence/current-execution-state-2026-10-03-r19.json)',
    '[current-execution-state-2026-10-03-r20.json](evidence/current-execution-state-2026-10-03-r20.json)')

runtime=ROOT/'project_context/architecture/runtime-and-domain.md'
anchor='Target resource ownership has three distinct layers:'
paragraph='Current saved-output quality assessment rejects a tone-only sRGB-shaped OETF: actual dark background grain increases and Lupton amplitudes are not established linear sRGB. Official SDSS JPEG uses additional processing, but its diagram does not supply reusable code/parameters; the reference itself includes warm tones, so all brown values cannot be labelled sky. Actual measured-star centers/colours and retained asTrans provide bounded metadata consistency and saved science/display centroid comparison. Catalog/frame share upstream astrometry, central TOO_LONG fields supply no detections under the declared queries, and aperture moments are not PSF/absolute registration or full-image quality. Keep original linear WCS and scientific values; no inferred shift, diffuse DCR, saturation repair from code255 or catalogue score reweighting follows. See [mature display and rejected tone](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-mature-display-and-tone-2026-10-03.md) and [actual measured-star boundaries](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-measured-star-registration-2026-10-03.md).\n\n'
edit(runtime,anchor,paragraph+anchor)
ext=ROOT/'project_context/external-capabilities.md'
anchor='**M51 原科学输入候选（2026-10-03，未采用）：**'
paragraph='**成熟显示/真实配准资格（2026-10-03，未采用）：** 官方JPEG有额外去噪/位置/色调处理，公开流程图不提供当前代码/参数/代码rights；缓存官方图本身有暖底。一次固定OETF因实际暗颗粒劣化否决，不把Lupton幅值冒物理linear sRGB；论文SAT亮核恢复的真实资格在已知四点未成立。真实173条目录中心/颜色与原18frame已有限核，15条目标内qualified检测比较保存science/estimate，小移动不冒全图质量；两个中心field的补查空表及旧TOO_LONG风险不当科学零/原frame必坏。星点目录和frame共享上游解算，不是独立绝对真值，扩展DCR/PSF/弱结构仍缺。无全图shift、再扣sky/gain或新WCS采用；PyDL astrom未实现，不安装；未知代码rights不因公开说明外推。见[成熟显示否决](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-mature-display-and-tone-2026-10-03.md)与[真实星点证据](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-measured-star-registration-2026-10-03.md)。\n\n'
edit(ext,anchor,paragraph+anchor)
readme=ROOT/'data-pipelines/deep-sky/README.md'
anchor='Use the existing pinned offline requirements and cached inputs; these owners\n'
paragraph='Current quality research rejects applying a tone-only sRGB-shaped curve to\nLupton output: the actual saved overview gains dark grain, and physical linear\nsRGB input is not established. Measured catalogue centers/colours now have\nbounded asTrans/current-image comparison, but catalogue and frames share their\nupstream solution. Empty central-field query results remain unavailable input,\nnot physical zero or automatic frame rejection. Keep scientific values and the\noriginal linear WCS; no blind shift, repeated sky subtraction, saturation repair\nfrom encoded255, or diffuse per-pixel DCR follows. Full colour/background, weak\nstructure, registration and source qualification remain open. See [tone\nassessment](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-mature-display-and-tone-2026-10-03.md) and [actual measured-star\ncomparison](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-measured-star-registration-2026-10-03.md).\n\n'
edit(readme,anchor,paragraph+anchor)
print(json.dumps({'tone':bind(tone_dir/'assessment.json'),'registration':bind(reg_dir/'assessment.json'),'documentsUpdated':5}))
