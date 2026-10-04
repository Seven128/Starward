"""Keep the one current plan and offline/production cost boundary explicit."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
out=ROOT/'output/offline-sky-chain-allocation-1003-r1'
report=json.loads((out/'role-refinement.json').read_bytes())
assert report['totalSelectedPaths']['allocationBytesByUniqueIdentity']==5397218888
evidence='experience-offline-sky-chain-allocation-2026-10-03.md'
def edit(path,fn):
    old=path.read_text(encoding='utf-8');new=fn(old);assert old!=new
    path.write_text(new,encoding='utf-8',newline='\n')
paragraph=('D新增[当前离线源/加工链分配](evidence/'+evidence+')：不同于既有单静态包，'
 '当前月面及SDSS/Prepared选定4004文件身份的本机分配5,397,218,888B，含离线源/工具/工作产物；'
 '原月面cache组发现已有venv，保存列表另分角色，不能全当原影像/生产依赖。'
 '实际科学工作目录709,820,416B、两个共同显示候选各56,000,512B，不能以一个候选代全部工作盘。'
 '未重复导出/HTTP/store库存/加工/全源hash，未清理；新角色自读回不认证Linux180GB余量、完整保留引用或200DAU容量。\n\n')
edit(TASK/'PLAN.md',lambda text:text.replace('审查依据见[目标/架构/性能/成本审查]',paragraph+'审查依据见[目标/架构/性能/成本审查]',1))
edit(TASK/'CONTINUE-CLOUD-SKY.md',lambda text:text.replace('## 6. 当前依赖与尚未执行的工作',paragraph+'## 6. 当前依赖与尚未执行的工作',1)
 .replace('current-execution-state-2026-10-03-r25.json','current-execution-state-2026-10-03-r26.json'))
deployment=('\n**离线源/加工工作盘与生产成本边界（2026-10-03）：** 当前选择的月面原源/SDSS输入、'
 '科学数组/显示候选/显式出版和月面服务源路径已有本机FileStandardInfo分配与file identity读回；'
 '月面cache含已有venv，须分离原源、探针与离线工具。一个显示candidate不代表全部科学加工工作盘，'
 '也不能把这些离线源/工具全部归为客户端传输或生产服务依赖。'
 '具体实测值/范围见[当前分配与角色修正](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').'
 '该证据不核其余家族/历史源或完整OCI/DB/log/backup/mount/release/rollback全集，'
 'Windows分配不是Linuxexclusive物理盘；180GB余量、可回收量/TTL和200DAU混合容量仍未验。\n')
edit(ROOT/'project_context/deployment/decisions-and-verification.md',lambda text:text+deployment)
edit(ROOT/'data-pipelines/deep-sky/README.md',lambda text:text+'\nOffline cost accounting keeps original inputs, processing tools, '
 'science/diagnostic work arrays, unadopted display candidates and sealed publications separate. '
 'The existing moon cache also contains a local venv; a cache directory is not automatically raw image storage or a production dependency. '
 'Selected current retained paths now have Windows file identity/AllocationSize readback, with role refinement of the saved inventory; '
 'this neither republishes sources nor supplies cloud headroom/reclaimability. See [offline-chain allocation scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/'+evidence+').\n')
def update_capture(text):
    text=text.replace('$sources = @(\n','$sources = @(\n'
      '  "$taskRoot/scripts/inspect-offline-sky-chain-allocation-2026-10-03.py",\n'
      '  "$taskRoot/scripts/classify-offline-sky-allocation-2026-10-03.py",\n'
      '  "$taskRoot/scripts/record-offline-allocation-continuity-2026-10-03.py",\n',1)
    text=text.replace('$results = @(\n','$results = @(\n'
      '  "$taskRoot/evidence/'+evidence+'",\n'
      "  'output/offline-sky-chain-allocation-1003-r1/result.json',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/file-readback.json',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/directory-readback.json',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/input-pins.json',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/executed-script.py',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/reused-file-attribute-owner.py',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/role-refinement.json',\n"
      "  'output/offline-sky-chain-allocation-1003-r1/role-refinement-executed.py',\n",1)
    observed=('New independent PLAN D selected offline-chain file attribute measurement:4004 paths and distinct file identities, '
      '5,389,624,643 logical bytes and5,397,218,888 FileStandardInfo allocation bytes. '
      'Current moon TIFF/SDSS frame-FPM-CAS/science arrays/display candidates/science-Prepared publication workspaces '
      'and moon service source paths only. Two attribute/directory snapshots stable; original small source and six protected pins exact. '
      'Raw source size matches existing declared bytes, no full source-content hash reread/admission claim. '
      'Moon cache unexpectedly includes existing local venv; saved inventory role refinement corrects raw-only group meaning '
      'without another filesystem scan. Original actual measurement kept. '
      'No processing/download/export/HTTP/store scan/deletion/retention policy or production dependency changes. '
      'No new production source edits or test-matrix repeats. B lacks qualified background subtraction/de-green evidence; '
      'whole quality/rights-credit-processing/native/capacity remain open. '
      'Existing BFF/watch retained, latest live code not proven loaded. Root self-review; independent review MISSING. '
      'Context/links/scoped whitespace checked by invoking turn.')
    lines=text.splitlines()
    for i,line in enumerate(lines):
        if line.strip().startswith("toolObserved='"):lines[i]="    toolObserved='"+observed+"'"
    return '\n'.join(lines)+'\n'
edit(TASK/'scripts/capture-current-execution-2026-10-03.ps1',update_capture)
print(json.dumps({'planContextUpdated':True,'noProductionChanges':True}))
