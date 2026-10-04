import hashlib, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[4]
task = '.codex/work-items/cloud-sky-native-2026-09-22'
def read(p): return (root / p).read_text(encoding='utf-8-sig')
def write(p, v): (root / p).write_text(v, encoding='utf-8', newline='')
def digest(p): return hashlib.sha256((root / p).read_bytes()).hexdigest()
def obj(p): return json.loads(read(p))
if sys.argv[1] == 'prepare':
    p = task + '/CONTINUE-CLOUD-SKY.md'
    s = read(p)
    old = 'PLAN唯一下一依赖已按2026-10-03实际执行更新：'
    assert old in s
    start = s.index(old)
    end = s.index('\n', start)
    s = s[:start] + '新增[公开图层/时间跟踪/资源开发](evidence/experience-real-taro-layers-time-tracking-resources-2026-10-04.md)：实际完整页面公开网格/地景/插画切换、HR8162跟踪、1×播放暂停/取消/提交新观测时间及Sources/Back保持相机/时刻/选中与RGBA，最后全部活动退休。生产仅Sky页面一行网格关闭说明修正，其他业务逻辑与六保护不变。原native登记注销、弱引用诊断、文件callback暂存、activeTexture上传模型分层观察，非GC/物理总峰；45°W3意图不合资格，不冒实际供应。401前端/162服务project图/31公共read和r55全287源绑定，r3正常退出/根保存读回自审；r1grid-only旧泛称与旧GPU观察、r2验证端口node缺失及错误根TS6命令失败保持，App已装5.9.3通过。\n\nPLAN唯一下一依赖已按2026-10-04实际执行更新：下一组合为选中细化失败保粗与适用宽场W3/银河替换，随后补横向全天/释放中断及跨午夜/时间尺等剩余义务；native/手机、全家族与物理资源仍缺。没有新根因不重跑完整矩阵、本轮短时间/图层组合或DevTools启动。当前唯一执行顺序直接见PLAN顶部及当前依赖段；共享图质异常继续复用真源/母图/LOD，过质量与完整普通发布/来源条件再采用Prepared/default。真实引用/计费出口/端云总成本和200DAU混合容量仍未验；准确顺序及完成条件只在PLAN当前表维护。' + s[end:]
    assert s.count('current-execution-state-2026-10-04-r54.json') == 2
    s = s.replace('current-execution-state-2026-10-04-r54.json', 'current-execution-state-2026-10-04-r56.json')
    write(p, s)
    p = task + '/scripts/capture-current-execution-2026-10-03.ps1'
    s = read(p)
    names = ['build-real-taro-layer-time-journey-2026-10-04.mts', 'experience-real-taro-layer-time-journey-2026-10-04.mts', 'readback-real-taro-layer-time-journey-2026-10-04.py']
    s = s.replace('$sources = @(\n', '$sources = @(\n' + ''.join(f'  "$taskRoot/scripts/{n}",\n' for n in names), 1)
    paths = [task + '/evidence/current-execution-state-2026-10-04-r55.json', task + '/evidence/experience-real-taro-layers-time-tracking-resources-2026-10-04.md', 'output/sky-real-taro-layer-time-readback-1004-r1/result.json']
    for lane in (1, 2, 3):
        folder = root / f'output/playwright/cloud-sky-real-taro-layer-time-1004-r{lane}'
        paths.extend(p.relative_to(root).as_posix() for p in sorted(folder.iterdir()) if p.is_file() and p.name != 'continuity-checks.json')
    # Freeze a literal evidence list now, rather than a runtime directory enumeration.
    s = s.replace('$results = @(\n', '$results = @(\n' + ''.join(f"  '{n}',\n" for n in paths), 1)
    tool = 'r55 strict287+6protected; actual401frontend162backendproject31publicread source bindings. Public grid-landscape-artwork toggles restore saved pixels; HR8162 track/real1x play-pause-cancel restores original instant-camera/replay-commit13:00:01.393Z/actualSourcesBack sameinstance-committedinstant-camera-selection-RGBA/stoptrack-finalretirement. r3normalexit0/browserisolatedAPIclosed/45bodies4804092B/1796resourceSamples; separate observed maxima MapFSlogical1168143B texture-upload9437184B buffer-upload56640B decodedhandles8 sourceRGBAequivalent13369344B encoded29items1145719B reserved703555B running2 retired29. WeakRef originalregister-unregister diagnostics do not prove GC; historical lastframe hiddenmask notactive; suppliedimages-surface true can include fallback. 45degW3 intentineligible noW3tiles, >=60replacement remains. r1grid-only generic status and old non-unit GL model not time/current-model proof; r2task ScrollView.node missing FAILED preserved, r3taskport only repaired/reusedr2bundle. App installed TS5.9.3 exit0, root TS6 TS5101 failed command preserved. Production only Sky one-line grid aria-label repaired; no otherbusiness/6protected/BFF-watchrestart/downloadprocessing/phone/commitpushdeployadoption. Savedrootreadback selfreview, controllednative/uncomposedSCSS/softwareWebGL notnative-physical-allfamily-fulljourney-capacity-independent acceptance. Goalactiveunbudgeted.'
    nxt = 'PLAN A/D actual selectedfinefailure-coarse and eligible >=60W3-galactic replacement plus SourcesBack; remaining horizontal-fullsphere/releaseinterruption/crossmidnight-publicruler time combinations/fullfamily owner parsed-mask-decode-nativeGPU-encodedcoldlease-staging-temporarypeak-retirement. Do not replay closed short1x-layer-HR8162-Source r3 or vertical-pinchSource/oldsource-r11-Hook7-five-solar-old9-clear2-rollback-static-processing/unchangedDevTools startup. Preserve32MiB-two-transfer-frameintegrity-leases-cancel-coarse-6protected/nootherbusiness. Bfullqualityrights-publication/emptyPrepared-science/HSTrectangleFAILED/M82incomplete; nativeWXMLFAILED/Android-iOS-newMoon/oldnewbinary200MB/physicaltotal/retentionrefs/whole200DAU-cost-egressCPU-RSSDB-Redis-outbox-media-12Mbps10-20mixedcapacity180GB/independentreview remain. Goalactiveunbudgeted/no commitpushdeployadoption.'
    s, n = re.subn(r"    toolObserved='[^\n]*'", f"    toolObserved='{tool}'", s); assert n == 1
    s, n = re.subn(r"    next='[^\n]*'", f"    next='{nxt}'", s); assert n == 1
    write(p, s)
    print(json.dumps({'prepared': True, 'newTaskSources': names, 'additionalEvidence': len(paths)}))
elif sys.argv[1] == 'verify':
    cp = task + '/evidence/current-execution-state-2026-10-04-r56.json'
    state = obj(cp)
    for key in ('currentSources','protected','evidence'):
        for row in state[key]:
            assert (root / row['path']).stat().st_size == row['bytes'], row['path']
            assert digest(row['path']) == row['sha256'], row['path']
    prior = obj(task + '/evidence/current-execution-state-2026-10-04-r54.json')
    old = {r['path']:r for r in prior['currentSources']}
    changed = [r['path'] for r in state['currentSources'] if r['path'] in old and r['sha256'] != old[r['path']]['sha256']]
    new = [r['path'] for r in state['currentSources'] if r['path'] not in old]
    allowed = {task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/scripts/capture-current-execution-2026-10-03.ps1','project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md','apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'}
    assert set(changed) == allowed, changed
    assert len(new) == 3 and all('layer-time' in p and p.startswith(task + '/scripts/') for p in new)
    page = 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'
    before = (root/'output/playwright/cloud-sky-real-taro-layer-time-1004-r1/spot-sky-page-before.tsx').read_bytes()
    assert before.replace('关闭地平坐标网格，保留地平线'.encode(), '关闭地平坐标网格与地平线'.encode()) == (root/page).read_bytes()
    assert digest('output/playwright/cloud-sky-real-taro-layer-time-1004-r1/spot-sky-page-before.tsx') == old[page]['sha256']
    files = [task+'/PLAN.md',task+'/CONTINUE-CLOUD-SKY.md',task+'/evidence/experience-real-taro-layers-time-tracking-resources-2026-10-04.md','project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']
    count = 0; missing=[]
    for p in files:
        for link in re.findall(r'\]\(([^)]+)\)',read(p)):
            link=link.strip('<>').split('#')[0]
            if not link or ':' in link or link.startswith('/') : continue
            count += 1
            if not ((root/p).parent/link).exists(): missing.append([p,link])
    assert not missing, missing
    assert state['worktree']['stagedEntries'] == 0
    assert state['goal']['status'] == 'active' and state['goal']['budget'] is None
    assert {p['ProcessId'] for p in state['processes']} == {24040,18132}
    out = {'status':'CURRENT_LAYER_TIME_INCREMENT_CONTINUITY_VERIFIED','checkedAt':datetime.now(timezone.utc).isoformat(),'checkpoint':cp,'checkpointSha256':digest(cp),'sourcesExact':len(state['currentSources']),'evidenceExact':len(state['evidence']),'protectedExact':len(state['protected']),'changedSelectedSourcesFromR54':changed,'newTaskSources':new,'productSelectedSourcesChanged':[page],'exactOneLineAriaOnly':True,'stagedEntries':0,'goalToolReadback':{'status':'active','budget':None},'originalProcessesLive':state['processes'],'contextValidation':'exit0; manifest/controlling source paths only','diffCheck':'exit0','ordinaryLocalLinks':{'files':len(files),'links':count,'missing':missing},'scope':'Selected source epoch and six protected continuity; no outside-Sky business logic change. Saved root readback owns pre-Context-update epoch. Software/controlled native diagnostics are not physical/full-family/independent acceptance.'}
    write('output/playwright/cloud-sky-real-taro-layer-time-1004-r3/continuity-checks.json',json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(out,ensure_ascii=False))
else: raise ValueError(sys.argv[1])
