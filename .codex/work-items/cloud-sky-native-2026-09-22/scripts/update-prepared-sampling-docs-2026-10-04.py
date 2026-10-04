"""Update four existing owners from a completed bounded sampling experiment."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE=TASK/'tmp/prepared-sampling-before-2026-10-04'
cp=json.loads((ARCHIVE/'scope-before.json').read_bytes())
readback=json.loads((ROOT/'output/prepared-hubble-sampling-readback-1004-r2/result.json').read_bytes())
assert readback['status']=='SAVED_REAL_SOURCE_SAMPLING_AND_ACTUAL_PAGE_READBACK'
assert readback['r1R2FullPixelsExactlyEqual'] and readback['r2OriginalGpuQualificationExecuted']
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for row in cp['documents']:
 assert bind(ROOT/row['path'])==row,row['path']
 assert (ARCHIVE/row['path']).read_bytes()==(ROOT/row['path']).read_bytes()
texts={row['path']:(ROOT/row['path']).read_bytes().decode('utf-8') for row in cp['documents']}
plan='.codex/work-items/cloud-sky-native-2026-09-22/PLAN.md'
text=texts[plan]
text,count=re.subn(r'^## 当前执行与收口（[^\r\n]*）', '## 当前执行与收口（2026-10-04 Prepared源/出口采样与1024真实页面后）',text,count=1,flags=re.M);assert count==1
start=text.index('**当前唯一下一依赖')
end=text.index('新增[处理版真实同page组合/迟到取消]',start)
current='''**当前唯一下一依赖（B，2026-10-04来源/出口采样及1024实际page之后）：** 已分开原源与出版采样限制：同view/时刻390×844、.05°实际保存帧中心pitch约.21327″，512细图约1.875558倍屏幕放大；Hubble M82/M51细档名义源采样约1724/1428，NOIRLab M82 Large/M51 4k约482/411，不是PSF/完整质量。复用缓存Hubble只对同DETAIL新采样一次1024，无整幅4096母/旧三级/背景fit，当前完整page/原粗图/renderer对照细纹更清晰、还原0差，1024最终来源UNKNOWN且未出版；r2执行原GPU归因后抑制声明，全部原source/母/出版pins保持。下一最小未闭合依赖是显露细图边界后的真实接续：复用本代1024 Hubble细图、原Hubble粗图和NOIRLab raw/display缓存，在当前实际page/Scene只补必要平移条件，核同源粗细与宽场/高清跨源的几何、颜色、背景边缘/弱结构，连同已有昼暮偏白证据决定各源适用尺度。不能把中心清晰或名义采样当完整目标质量，不能直接把NOIRLab细图换全部高清；不盲锐化/加像素/套跨源全图校色、M51北晕背景或透明化遮矩形。真实收益明确后才沿现有共享几何/多级责任定义必要尺寸和版本/实际发布消费者，旧v1严格512和不可变hash保持；不能让当前512成为需求上限或另建渲染/缓存框架。已有无变化冷暖/图层/SourceBack/迟到矩阵、本中心采样与源RGB/投影/背景fit不重跑，暂停PSF/noise仍暂停。完整图质/配准覆盖、标准静态真实出口/旧版回滚暂存保留/成本通过前不采用，普通Prepared registry空，独审MISSING和旧FAILED保持。详[本代采样/页面/资源](evidence/experience-prepared-sampling-applicability-2026-10-04.md)、[前代完整组合/迟到](evidence/experience-prepared-display-combinations-2026-10-04.md)及[来源/成本表](evidence/prepared-imagery-source-coverage-cost-2026-10-04.md)。C只据实测核queue/decode/暖缓存/SAO去重与必要寿命责任，16MiB仅压力参考；D保真实静态出口分类/保留/全机成本和混合容量。WEAPP/WXML、Android/iOS、200DAU全小程序及33义务保持；只云观星/必要依赖，不核旧设计稿，无提交部署发布。

新增[实际来源/出口采样与1024细图](evidence/experience-prepared-sampling-applicability-2026-10-04.md)：生产改动0。Hubble cached RGB仅因新细网格解码1次/1024投影1次，旧source/母/三级/fit重做0；PNG2334559B/单图RGBA4194304B，约2.498s，非整个4096母图或科研产品。510前端/167后端实际page控制→1024任务图→原图还原，原GPU归因在r2真实执行（positive/has），最终新出版来源UNKNOWN；两个相同全帧/8 GL-PNG-GL/12原源四邻证人精确，全活动退休。细纹更清晰，边界/昼暮/弱结构/配准及普通发布未过，不能冒旧512 v1采用。1024阶段完成texture4681880B/保存copy观察9662616B，额外4MiBbitmap与原三512共7MiB，理论替换+3MiB不冒本次共存；全程MAX11800576纹理/13369344native-RGBAeq分层非物理总峰。r1跳过归因查询但绘制已有copy，r2资源峰未新增，不能编差。reader首次枚举present错/失败保，r2仅task修positive，源/运行不重跑；四主输出44722516B不含reader/scope、非生产库存/全机SSD。全部旧图/pins/六保护/BFF-watch/分支HEAD不变，普通registry空、独审/native/质量容量保未验，下一仅顶部。

'''
text=text[:start]+current+text[end:];assert text.count('**当前唯一下一依赖')==1;texts[plan]=text
cont='.codex/work-items/cloud-sky-native-2026-09-22/CONTINUE-CLOUD-SKY.md'
text=texts[cont];needle='**当前最新结果：**';assert text.count(needle)==1
current='''**当前最新结果：** [源/出口采样及1024实际page](evidence/experience-prepared-sampling-applicability-2026-10-04.md)实证Hubble细源被当前512出口限制，NOIRLab较低原采样不能靠增像素冒高清。同view/时刻实际页面的1024任务细图较清晰、切回512全像素精确；仅新细网格一次源解码/投影，没有整幅4096母/旧三级/背景fit。原GPU归因在r2执行，最终小样source UNKNOWN，未出版/普通registry空；额外4MiBbitmap与原三512共7MiB、保存临时copy及退休分层核，不冒physical/容量。reader首次错枚举失败保，r2仅任务修正，生产源码0改。下一仅PLAN顶部的必要边界平移/同源与宽场高清接续，不重跑中心采样或旧组合/源处理；尺寸/版本采用与完整图质/静态出口仍待后续，旧失败/独审/设备/33义务保。只云观星/必要文档、不核旧设计稿、六保护/原进程/HEAD不变。

**前代组合结果：**'''
texts[cont]=text.replace(needle,current,1)
sky='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'
text=texts[sky];heading=text.splitlines()[0];at=text.index(heading)+len(heading)
para='''

Prepared档位应由真实来源细节、实际已绘视场/屏幕与资源决定，现有512不是需求上限，也不对低采样源盲增像素。2026-10-04同相机/时刻390×844、.05°实际page验证中心每逻辑pixel约.21327″，512细档约1.875558倍屏幕放大；cached Hubble M82细域名义1724源采样而NOIRLab Large约482，名义密度不证明PSF/绝对精度。既有source/TAN owner只对Hubble同细域一次1024采样，小样在原page/原粗图/renderer更清晰、切回旧图精确；无整幅4096母、背景/颜色fit或新算法。旧raw/display v1身份与严格512保持；1024不是出版/采用，旧descriptor仅供归一化名义footprint，最终source completion UNKNOWN，不能借原hash。原GPU归因已真实执行后抑制不受合同支持的声明；额外bitmap4MiB与原三512同时登记逻辑7MiB，临时copy/原旧纹理分别观察并全部退休，不按静态帧差/各MAX冒物理峰。默认registry空、边界/跨源/昼暮/弱结构与完整质量未过，独审/native/Android/iOS/成本容量仍未验；必要新尺寸应沿版本化共享几何/多级出版与实际消费者，不能另建系统或放松归因/完整性/寿命保护。详[真实采样/同page/资源证据](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-sampling-applicability-2026-10-04.md)，具体当前执行只由任务PLAN维护。
'''
texts[sky]=text[:at]+para+text[at:]
cost='.codex/work-items/cloud-sky-native-2026-09-22/evidence/prepared-imagery-source-coverage-cost-2026-10-04.md'
text=texts[cost];heading=text.splitlines()[0];at=text.index(heading)+len(heading)
para='''

**最新采样/实际细图成本边界：** [Hubble细源与512出口](experience-prepared-sampling-applicability-2026-10-04.md)已分开原源与导出损失：同.05°实际DPR1页面512纹理约1.875558屏幕像素/texel，1024约.937779。新Hubble细域仅一次cached JPEG RGB/一次现有TAN1024投影（约2.498s），不重建4096母或旧三级/背景；原PNG586384B→任务PNG2334559B、单图RGBA1→4MiB，离线RGB37392000B逻辑不是RSS。原三512+额外1024共同登记7MiB，理论替换+3MiB不能冒本次实际共存；实际GPU完成帧4681880B/该阶段保存copy观察9662616B，整段MAX11800576纹理/13369344native-RGBAeq独立，最终活动/退休0。r1 skip归因查询但绘制已copy，r2执行查询没有新增模型峰；中心细纹改善不供边界/完整质量。两actual page每段89请求body5776962B，旧三PNG各首传1152395B，新PNG由task dataURL不经HTTP/static/cache/lease，普通新出口、临时峰/容量尚缺。四主输出44722516B不含reader/scope，含两bundle/GL诊断，不是生产库存/全机SSD；无新外部图源下载、许可费、付费设施/采购/部署。旧出版/母图/六保护保持，512不是需求上限，但1024尚未版本化/采用；NOIRLab低名义源采样约482/411不因加像素成高清。完整发布/旧版回滚暂存保留、跨源接续、静态真实出口/全机成本与200DAU混合容量继续未验。
'''
texts[cost]=text[:at]+para+text[at:]
# Check every edit against archived input before writing any owner.
for row in cp['documents']:
 assert texts[row['path']]!= (ROOT/row['path']).read_bytes().decode('utf-8')
for rel,text in texts.items():(ROOT/rel).write_bytes(text.encode('utf-8'))
after=[bind(ROOT/row['path']) for row in cp['documents']]
with (ARCHIVE/'documents-after.json').open('x',encoding='utf-8') as f:json.dump(after,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'updatedOwners':len(after),'planHasOneCurrentDependency':texts[plan].count('**当前唯一下一依赖')==1,'productionSourceChanges':0},ensure_ascii=False))
