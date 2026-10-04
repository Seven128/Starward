"""Reconcile current development, new transition gap, and explicit commit request."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import tomllib

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE=TASK/'tmp/prepared-progressive-version-before-2026-10-05'


def read(path): return json.loads(path.read_bytes())


def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}


def save(path,value):
    with path.open('x',encoding='utf-8',newline='\n') as f:
        json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')


def paragraph(text,needle,new):
    start=text.index(needle);end=text.index('\n\n',start)
    return text[:start]+new+text[end:]


def main():
    base=read(ARCHIVE/'scope-before.json')
    cp=read(TASK/'tmp/prepared-progressive-retention-inputs-2026-10-05.json')
    for row in cp['currentSources']+base['protected']:
        assert bind(ROOT/row['path'])==row,row['path']
    docs={row['path']:(ROOT/row['path']).read_text(encoding='utf-8') for row in base['documents']}
    for row in base['documents']:
        assert bind(ROOT/row['path'])==row
    prefix=TASK.relative_to(ROOT).as_posix()
    plan=prefix+'/PLAN.md';cont=prefix+'/CONTINUE-CLOUD-SKY.md'
    cost=prefix+'/evidence/prepared-imagery-source-coverage-cost-2026-10-04.md'
    sky='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'
    evidence='evidence/experience-prepared-progressive-publication-2026-10-05.md'
    new_next='**当前唯一下一依赖（B，2026-10-05 v2正常出版与暖缩放新缺口之后）：** 同源512/1024/1024新版本、标准writer/静态文件导出/真实HTTP→原page相邻档与来源Back/失败保粗已开发；旧v1身份不放宽，源下载/解码/投影/fit新增0。原8MiB保留假设已撤至现有2MiB，当前wanted两1024仍受保护；窄暖缩放稳定还原0差、图片无新传和最终退休成立，但暖缩回概览一帧实际Scene无Prepared图、概览两次/回细档一次来源null，可见持续时间/完整因果未知。下一先沿原退役/解码/已绘资格owner核这一受影响过渡并据实修保粗衔接；不凭猜测扩预算/新框架、不重跑闭合矩阵。随后仍须完整照片外沿/弱结构/昼暮/配准覆盖与批量适用性；跨源NOIR父层颜色/结构断层不采用，不透明化遮缺陷，PSF/noise条件暂停。新v2实际Caddy/TLS出口、兼容旧版/回滚/暂存保留和全机成本/混合容量仍开放，标准导出与loopback body不冒这些通过。普通registry空、新独审MISSING、旧FAILED和原缺证保，WEAPP/WXML/Android/iOS/33义务保持。[本代证据]('+evidence+')及[可分享咨询包](evidence/consultation-2026-10-05/README.md)给当前代码与实际输出。用户本轮授权全部变更提交并推当前分支，六项原有Settings/outbox原样独立提交；这是版本保存授权，不是产品采用、云部署或发布。只开发云观星/必要依赖、不核旧设计稿。C/D继续按已有实测与本依赖推进，不建立第二个next。'
    docs[plan]=docs[plan].replace('## 当前执行与收口（2026-10-05 Prepared真实边界与同源1024中档后）','## 当前执行与收口（2026-10-05 Prepared v2出版、暖过渡缺口与咨询快照）',1)
    docs[plan]=paragraph(docs[plan],'**当前唯一下一依赖',new_next)
    marker='新增[真实边界与同源1024中档]'
    pos=docs[plan].index(marker)
    docs[plan]=docs[plan][:pos]+'新增[同源多网格v2正常出版与实际消费者]('+evidence+')：新hash69e84259…e9d5a，三PNG4357051B，旧父c9b0592e…d667c保持；原输入复用，无新源处理。511前端/168后端实际page细档503保中档/重试、来源Back/hide、8像素组精确及全部活动退休。当前2MiB保留窄路径Prepared native等效8→1→8MiB、89请求body8980347B、三PNG只首传、3组像素和最终恢复精确；原task FOV末位失败保持，修task复用bundle。暖过渡Scene无图/来源null是新OPEN，不能以稳定还原称连续成功。标准静态v1+v2六PNG5509446B/整包86075579B是逻辑文件，不是网络出口/全机容量。合同/服务/类型/SDK有界检查通过，自审非独审，质量/native/采用均未过；六保护保持，全部提交按本轮明确授权执行。\n\n'+docs[plan][pos:]
    latest='**当前最新结果：** [同源v2正常出版与咨询快照]('+evidence+')已闭合真实hash/512-1024-1024、共享writer/标准静态文件/本地HTTP/原page来源Back与失败保粗的一条开发路径；新图总4357051B、默认registry空，完整质量/native/独审/实际静态出口仍缺。2MiB原保留压力不截断wanted两1024，窄暖往返稳定像素0差/图片只首传/最后活动退休，但一帧Scene无Prepared与三次最终来源null保OPEN，下一只看PLAN顶部的原owner过渡衔接。旧严格2RGB/cause UNKNOWN与原缺回执不倒填。用户2026-10-05明确授权所有当前变更提交推送；六项原有Settings/outbox保持原字节并独立提交，不是本轮修改其业务逻辑。完整咨询材料与精选远端实图/回执见[咨询包](evidence/consultation-2026-10-05/README.md)。工作区/分支不变，72e65cf3是本轮提交前基线，提交后核实时HEAD；无部署/采购/发布。'
    docs[cont]=paragraph(docs[cont],'**当前最新结果：**',latest)
    pos=docs[cost].index('\n\n')+2
    docs[cost]=docs[cost][:pos]+'**最新v2与当前保留成本边界（2026-10-05）：** [同源多网格出版/咨询快照](experience-prepared-progressive-publication-2026-10-05.md)复用宽母/细网格，源下载/解码/投影/fit新增0，OV512/MED1024/DETAIL1024三PNG4357051B。先前8MiB保留假设撤回现有2MiB（非活动硬cap）；窄实际page Prepared native等效8→1→8MiB、89请求body8980347B、PNG各首传/最终退休0。整段max texture11800576/nativeRGBAeq13369344/FS6224209/encoded6181707B分层，不能相加物理峰。暖过渡Scene无图/三次来源null保OPEN；稳定恢复0差不能证明连续无闪烁。原v2完整503/来源Back/hide代次104请求body10138051B独立保。标准v1+v2六PNG5509446B、整导出86075579B非全机盘/实际公网；新Caddy/TLS出口、旧版回滚暂存保留/全机资源与200DAU混合容量仍未验。成品采用/质量/独审/native未过，未知不填零，三512旧成本段仅为其历史版本。\n\n'+docs[cost][pos:]
    docs[cost]=docs[cost].replace('**最新真实边界/同源中档成本边界','**前代真实边界/同源中档成本边界',1)
    old=docs[sky]
    start=old.index('Prepared档位由');end=old.index('\n\n',start)
    durable='Prepared档位由真实源采样、实际视场/屏幕和资源决定，512不是上限。当前`prepared-optical-v2`严格512/1024/1024配置复用同源宽2048母图和独立1024细网格，绑定完整旧v1父、source/AVM/网格/处理回执与新不可变hash，不伪称全4096同母、不放宽原raw/display v1。共享出版/文件验证/HTTP/cache/Hook/TAN/Scene正常消费者已开发，普通registry空。新图4357051B，细节和同源中档清晰度有实际依据；NOIR raw/display直接作Hubble父层的颜色/结构断层不采用。原2MiB光学保留压力保持，当前wanted两1024逻辑8MiB受保护；暖缩回概览只剩1MiB，回细图无新增PNG/稳定全图0差、最终活动退休，压缩/native/GPU与各MAX分别核。暖过渡一帧Scene无Prepared及概览两次/回细档一次最终来源null仍OPEN，可见时长/完整因果未证；不以稳定恢复代替连续保粗、不凭猜测扩预算。原四帧2RGB各差1/cause UNKNOWN和最终退休MISSING保。完整照片外沿、弱结构、昼暮、绝对配准/覆盖、实际静态出口/保留/全机成本、新独审、WEAPP/WXML/Android/iOS仍未通过；仅文件导出不冒部署/出口。详[当前v2与实际消费者](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-progressive-publication-2026-10-05.md)，执行顺序仅任务PLAN维护。'
    docs[sky]=old[:start]+durable+old[end:]
    extra=['project_context/architecture/runtime-and-domain.md','data-pipelines/deep-sky/README.md']
    extra_before=[]
    for path in extra:
        target=ROOT/path;pin=bind(target);dest=ARCHIVE/path
        assert not dest.exists();dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(target.read_bytes());extra_before.append(pin)
        text=target.read_text(encoding='utf-8');i=text.index('\n\n')+2
        addition=('Prepared progressive publication now has an explicit `prepared-optical-v2` contract: OVERVIEW 512, MEDIUM/DETAIL 1024, frozen wide 2048 master plus same-source fine 1024 grid, with complete old-v1 ancestry, input/geometry/processing identities and a new canonical hash. This measured profile preserves strict old raw/display v1 and reuses existing publisher, file validation, HTTP, shared native loader and TAN/Scene consumers. `publish_prepared_progressive.py` validates cached products without another source decode/projection. Ordinary registry remains empty; explicit actual-page and standard file export are development evidence only. Optical retention stays at the existing 2MiB pressure target, protecting current wanted images (8MiB for both 1024 grids). A measured warm zoom-out intermediate Scene has no Prepared image; stable restoration does not close continuous fallback. Full quality/registration, actual static network exit/retention/capacity, native and new independent review remain open. See '+('[current evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-progressive-publication-2026-10-05.md)' if path.startswith('project_context') else '[current evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-progressive-publication-2026-10-05.md)')+'. Only the task PLAN owns execution order.\n\n')
        docs[path]=text[:i]+addition+text[i:]
    save(ARCHIVE/'additional-owner-documents-before.json',extra_before)
    for path,text in docs.items():
        (ROOT/path).write_text(text,encoding='utf-8',newline='\n')
    after=[bind(ROOT/path) for path in docs]
    save(ARCHIVE/'documents-after.json',after)
    # Current source scope is bounded and explicit; do not pretend it is every worktree file.
    original=read(TASK/'tmp/prepared-progressive-current-inputs-2026-10-05.json')
    transitions=[]
    for transition in original['authorisedSkyTransitions']:
        transitions.append({'before':transition['before'],'after':bind(ROOT/transition['after']['path'])})
    protected=[bind(ROOT/row['path']) for row in base['protected']]
    previous=read(TASK/'evidence/prepared-boundary-scope-verification-2026-10-05.json')
    immutable={}
    for key,rows in previous['unchangedOriginalMaterial'].items():
        rows=rows if isinstance(rows,list) else [rows]
        for row in rows:
            assert bind(ROOT/row['path'])==row
        immutable[key]=rows
    published=previous['unchangedPublishedOutputs']
    for group in published:
        for row in [group['manifest']]+group['binaryPins']:
            assert bind(ROOT/row['path'])==row
    manifest=tomllib.loads((ROOT/'project_context/context.toml').read_text(encoding='utf-8'))
    paths=[r['path'] for r in manifest.get('context',[])]+[r['context'] for r in manifest.get('areas',[]) if r.get('context')]+manifest.get('default_files',[])
    assert len(paths)==47 and all((ROOT/p).is_file() for p in paths)
    for path in [ROOT/'docs/cloud-sky-data-processing-display-consultation-2026-10-05.md',TASK/'evidence/consultation-2026-10-05/README.md',TASK/'evidence/experience-prepared-progressive-publication-2026-10-05.md']:
        for ref in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',path.read_text(encoding='utf-8')):
            if '://' not in ref and not ref.startswith('#'):
                assert (path.parent/ref.split('#')[0]).resolve().is_file(),(path,ref)
    assert docs[plan].count('**当前唯一下一依赖')==1
    assert len((TASK/'GOAL-CURRENT.md').read_text(encoding='utf-8'))<=4000
    command=lambda *args: subprocess.check_output(args,cwd=ROOT,text=True).strip()
    assert command('git','branch','--show-current')=='codex/remote-main-20260908'
    assert command('git','rev-parse','HEAD')=='72e65cf309d700cb7d40c5b7afd53660fd39fa35'
    assert not command('git','diff','--cached','--name-only')
    processes=json.loads(command('pwsh','-NoProfile','-Command',"@(Get-Process -Id 24040,18132 | ForEach-Object { @{id=$_.Id;startUtc=$_.StartTime.ToUniversalTime().ToString('o')} }) | ConvertTo-Json -Compress"))
    wanted={24040:'2026-09-30T18:03:53.4146084Z',18132:'2026-09-30T18:18:41.4359228Z'}
    assert len(processes)==2 and all(wanted.get(r['id'])==r['startUtc'] for r in processes)
    report={'status':'PRECOMMIT_PROGRESSIVE_SOURCE_DOCUMENT_PROTECTION_SCOPE','precommitHead':command('git','rev-parse','HEAD'),
        'branch':command('git','branch','--show-current'),'existingSourceChanges':transitions,
        'newProductionFiles':[bind(ROOT/p) for p in ['packages/miniapp-contracts/src/prepared-progressive-optical-publication.ts','packages/miniapp-contracts/src/prepared-progressive-optical-publication.test.ts','packages/miniapp-contracts/src/test-fixtures/prepared-progressive-optical-publication.ts','data-pipelines/deep-sky/publish_prepared_progressive.py']],
        'protectedUnchanged':protected,'currentRuntimeSourcePins':len(cp['currentSources']),
        'unchangedOriginalMaterial':immutable,'unchangedPublishedOutputs':published,'updatedDocuments':after,
        'contextPaths':len(paths),'processesUnchanged':processes,'consultation':bind(ROOT/'docs/cloud-sky-data-processing-display-consultation-2026-10-05.md'),
        'warmTransitionContinuity':'OPEN','ordinaryRegistryAdopted':False,'independentReview':'MISSING','goal':'active/unbudgeted/incomplete',
        'commitAuthorization':'User explicitly requested all changes committed and current worktree branch pushed; protected existing settings/outbox changes are byte-preserved and will be committed separately. No release/deployment authorization.',
        'limits':'Before Git commits, bounded source/document/input verification, not comprehensive product acceptance or whole-worktree security certification.'}
    save(TASK/'evidence/prepared-progressive-precommit-scope-2026-10-05.json',report)
    print(json.dumps({'existingSkySources':len(transitions),'newProductionFiles':4,'protected':len(protected),'updatedDocuments':len(after),'contextPaths':len(paths),'warmContinuity':'OPEN'},ensure_ascii=False))


if __name__=='__main__':main()
