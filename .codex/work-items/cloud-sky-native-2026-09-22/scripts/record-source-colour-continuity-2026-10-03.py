"""Record current source-copy increment without rewriting historical outputs."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[4]
task = root / '.codex/work-items/cloud-sky-native-2026-09-22'
out = root / 'output/sdss-source-colour-semantics-1003-r1'

def edit(path, transform):
    old = path.read_text(encoding='utf-8')
    new = transform(old)
    assert new != old, f'no_edit:{path}'
    path.write_text(new, encoding='utf-8', newline='\n')

evidence = 'experience-sdss-source-colour-semantics-2026-10-03.md'
paragraph = ('新增[实际来源配色说明](evidence/' + evidence + ')已进入共享SDSS来源owner：'
 'i/r/g映射红/绿/蓝属于处理合成色，不能仅凭绿色/棕色判噪声、伪影或无观测。'
 '官方相机响应仅支持不同带颜色差异的可能性，不供应具体绿点身份/线流量/实际CCD校准。'
 '六legacy与两封存显式science的当前controller返回及受控Provenance文本已读回，7项受影响检查通过；'
 '首次根cwd装饰器bootstrap失败保留，未改配置。影像/recipe/采用未变，原BFF最新代码是否加载未证；'
 '说明文本不修暖底/颗粒/疑似绿晕或通过图质。\n\n')
edit(task/'PLAN.md', lambda text: text.replace('下一直接项仍是完整候选质量：', paragraph +
 '下一直接项仍是完整候选质量：先区分真实波段颜色、已知flags/插值和处理偏色，不全图去绿或强匹配HST配色；', 1))
edit(task/'CONTINUE-CLOUD-SKY.md', lambda text: text.replace('## 6. 当前依赖与尚未执行的工作',
 paragraph + '## 6. 当前依赖与尚未执行的工作', 1).replace('current-execution-state-2026-10-03-r24.json','current-execution-state-2026-10-03-r25.json'))
english = ('\nSDSS source metadata now discloses i/r/g→red/green/blue as processed survey-band colour, '
 'not naked-eye natural colour. Colour alone does not establish noise, artefacts or missing observations; '
 'official mean imager response does not identify a particular green feature or supply current CCD calibration/line flux. '
 'Current controller and controlled Provenance text readback cover six legacy and two sealed explicit science publications. '
 'This source-copy change leaves images, frozen recipes and ordinary adoption unchanged, and does not close background, '
 'weak-structure, suspected halo, registration or native acceptance. See [source meaning and current consumers](')
for relative, prefix in [('data-pipelines/deep-sky/README.md','../../'),
 ('project_context/architecture/runtime-and-domain.md','../../')]:
    edit(root/relative, lambda text, p=prefix: text+english+p+'.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')
edit(root/'project_context/external-capabilities.md', lambda text: text+'\n**SDSS处理配色说明（2026-10-03）：** '
 '实际来源owner统一披露i/r/g→红/绿/蓝的处理色；绿色或棕色本身不是坏像素、噪声或无观测证据。'
 '官方平均响应表仅支持巡天带响应不同，不将其当当前frame逐CCD标定、具体HII身份或谱线通量。'
 '与HST不同带处理图不强行同色；六legacy/两显式science当前来源与受控说明消费者已读回。'
 '没有新依赖/影像加工/注册表采用，图质与源权益完整义务保持。见[当前说明及边界](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')

capture = task/'scripts/capture-current-execution-2026-10-03.ps1'
def patch_capture(text):
    text=text.replace('$sources = @(\n', '$sources = @(\n'
      '  "$taskRoot/scripts/experience-sdss-source-colour-semantics-2026-10-03.mts",\n'
      '  "$taskRoot/scripts/record-source-colour-continuity-2026-10-03.py",\n', 1)
    text=text.replace('$results = @(\n', '$results = @(\n'
      '  "$taskRoot/evidence/'+evidence+'",\n'
      "  'output/sdss-source-colour-semantics-1003-r1/result.json',\n"
      "  'output/sdss-source-colour-semantics-1003-r1/inputs-before.json',\n"
      "  'output/sdss-source-colour-semantics-1003-r1/inputs-after.json',\n"
      "  'output/sdss-source-colour-semantics-1003-r1/development-checks.json',\n"
      "  'output/sdss-source-colour-semantics-1003-r1/current-owner-executed.ts',\n"
      "  'output/sdss-source-colour-semantics-1003-r1/current-provenance-executed.tsx',\n", 1)
    lines=text.splitlines()
    observed=('Current common SDSS source owner now discloses processed i/r/g colour semantics. '
      'Six real legacy and two sealed explicit science publications pass current Nest/Fastify/controller source-response '
      'and controlled current Provenance text readback; exact version/credit/license/precision/limitations retained. '
      'Images/manifests/HST cached page/protected files unchanged; zero source-image requests or processing. '
      'Official document requests are research traffic. Mean imager response supports possible band-colour differences, '
      'not actual green-feature identity or current CCD/line-flux truth. Correct worker-cwd affected tests7 PASS; '
      'initial root-cwd decorator bootstrap failure retained separately, no build/config repair. '
      'No full old chain/matrix/quality/filter repeats. Source-copy does not close warm background, grain, suspected halos, '
      'weak structure, full registration, adoption, rights-credit review, native or capacity. '
      'Original BFF/watch kept; latest live code not proven loaded. Root self-review; independent review MISSING. '
      'Context/links/scoped whitespace checked by invoking turn.')
    next_value=('PLAN B: qualify actual source/mature processing for whole-image background, weak structure, '
      'low-brightness interpolation, single-scan and full registration. Distinguish true survey-band colour, '
      'known flags/interpolation and processing bias before repair; no blanket de-green or HST palette matching. '
      'Do not repeat full-SAT/58-core/cross-run/13k/unchanged filter/empty-query matrices or tone parameter sweeps. '
      'Quality and source rights-credit-processing review precede formal version/batch/static/API/client/source-route/cost. '
      'Native/public-time/router Back/independent review and production references/physical disk/mixed capacity stay open.')
    for index,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[index]="    toolObserved='"+observed+"'"
        if line.strip().startswith("next='"):lines[index]="    next='"+next_value+"'"
    return '\n'.join(lines)+'\n'
edit(capture, patch_capture)

# Match saved pre-execution source pins before copying code snapshots.
pins=json.loads((out/'inputs-before.json').read_text(encoding='utf-8'))
for relative,name in [('workers/miniapp-api/src/sdss-optical-imagery.ts','current-owner-executed.ts'),
 ('apps/wechat-miniapp/src/components/provenance.tsx','current-provenance-executed.tsx')]:
    data=(root/relative).read_bytes()
    assert hashlib.sha256(data).hexdigest()==next(p['sha256'] for p in pins if p['path']==relative)
    with (out/name).open('xb') as stream:stream.write(data)
with (out/'development-checks.json').open('x',encoding='utf-8') as stream:
    json.dump({'scope':'Observed tool outcomes recorded after execution; not reconstructed raw logs.',
      'initialRootCwd':{'exitCode':1,'scienceTestsPassed':4,'celestialFile':'BOOTSTRAP_FAILED_PARAMETER_DECORATORS'},
      'workerCwd':{'exitCode':0,'testsPassed':7,'files':['src/sdss-science-optical-imagery.test.ts','src/celestial-source-recovery.test.ts']},
      'configurationEdited':False,'nativeAcceptance':False},stream,ensure_ascii=False,indent=2)
    stream.write('\n')
print(json.dumps({'documentsUpdated':True,'codeSnapshotsPinned':True},ensure_ascii=False))
