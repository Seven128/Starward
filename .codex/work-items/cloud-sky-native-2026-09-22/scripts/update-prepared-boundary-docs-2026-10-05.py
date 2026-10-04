"""Close the saved boundary slice without promoting its known failures."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE = TASK / 'tmp/prepared-boundary-before-2026-10-04'
HUMAN = TASK / 'evidence/experience-prepared-boundary-applicability-2026-10-05.md'


def main():
    before = json.loads((ARCHIVE / 'scope-before.json').read_bytes())
    for row in before['sources'] + before['protected'] + before['documents']:
        assert hashlib.sha256((ROOT / row['path']).read_bytes()).hexdigest() == row['sha256'], row['path']
    assert not HUMAN.exists()
    owner_texts = {row['path']: (ROOT / row['path']).read_text(encoding='utf-8') for row in before['documents']}
    evidence = '''# 实际细粗边界、来源适用性与中档采样（2026-10-05收口）

本代只修改云观星任务脚本、证据和四项归属文档；生产源码/其他业务逻辑修改0。沿既有510前端/167后端、正式Map→实际Sky page、原Hook/Scene/renderer补一个必要公开平移条件，不核旧设计稿、不重跑已闭合组合。实际生成目录仍以1004命名；本文件是北京时间2026-10-05的收口，不改变其运行代次。原source、母图、出版及六项Settings/outbox保持原字节，独审MISSING、普通Prepared registry空。

## 真实结果与限制

复用前代1024 Hubble细图及原三张512 Hubble PNG，在同390×844、.05°、2026-10-04T13:00:00Z视场执行公开触摸平移，显露细图边界。四帧依次为Hubble原粗层、NOIRLab raw中档、NOIRLab display中档、还原Hubble粗层。实际细层/粗层均参与，原GPU资格函数执行；新细/粗小样未被旧v1合同支持，最终来源完成仍为null/UNKNOWN，旧descriptor只供归一化名义几何。

完整输出已检查：原512 Hubble中档在细图之外明显模糊；直接换NOIRLab粗层有更明显的颜色、结构断层。raw/display都不能直接作Hubble高清的合格父层。这不排除NOIRLab宽场候选的独立用途，不支持全图校色、重拟合坐标或用透明度掩盖缺陷。

四帧运行在严格还原断言失败处退出，[原failed.json](../../../../output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/failed.json)保留，未生成成功result/资格数组/最终逻辑退休回执。保存的完整GL像素读回确认：两个RGB通道、两个像素各差1，位置为top-first(234,600)/(359,810)，成因UNKNOWN。相机/时刻相同不能解释差异；浏览器/服务关闭不能填成原代次native句柄、文件租约或GPU逻辑退休通过。后续成功不倒填这项FAILED；前代中心还原0差也只保其原条件。

## 有依据的中档改动

原Hubble中档来自冻结2048母图的1024×1024中心裁片，再box2成512；原细层512来自512裁片。前代新细网格1024来自同原JPEG/AVM的细域新采样，本代不重复它。

只将既有1024中档裁片原样导出：[缓存母图中档结果](../../../../output/prepared-hubble-medium-sampling-1004-r1/result.json)。共用现有premultiplied box factor1，无源RGB解码/投影/背景估计/颜色拟合/锐化/feather；全RGBA、二值几何alpha、有效黑色和缺测隐藏RGB与母图裁片精确。PNG1886809B，SHA256为54f5e457eeca1a9d7c41b9fea0a54ca76a7380ef4ff14421b8af26b57aa38aec；RGBA4194304B，约0.206s。旧raw/display v1的512身份和不可变hash不放宽。

在同实际page只新增这一高分辨率父层条件，[当前运行result](../../../../output/playwright/cloud-sky-prepared-boundary-medium-1004-r1/result.json)及[当帧资格/资源](../../../../output/playwright/cloud-sky-prepared-boundary-medium-1004-r1/boundary-comparisons.json)保存原GPU查询真实positive/has及完整图。父层结构更清晰，采样落差减小；没有新混合或边缘遮蔽。边界/完整弱结构、绝对配准、真实照片外沿、昼暮偏白仍未通过，不以局部清晰证明整张合格。

## 名义覆盖与读回

[本代名义几何](../../../../output/prepared-boundary-geometry-1004-r1/result.json)沿生产registerSkyTanOpticalField/unprojectSkyPoint/skyArtworkUvAtDirection，用当前代次实际观察矩阵和完整390×844像素中心射线；无图片重处理。名义域both220266、coarse-only108894、fine-only0、neither0。431对相邻边界像素仅排除y<60的已知顶部保留区域，四个粗层条件对应的源alpha邻域均255。它证明这一名义域内有几何支持，不证明科学覆盖、GPU Float32逐像素mask相等或绝对天文精度，不倒填失败代次的观察/退休事实。

[保存数据读回](../../../../output/prepared-boundary-readback-1004-r1/result.json)首轮通过：五份GL→PNG→GL全值精确、共同view/time相同、全中档母图crop及PNG/Npy精确、原失败与缺证保留、本代资格及最终退休成立。四邻输出的最大RGB跳变中位/p90/max分别为原Hubble512 7/15/51、同源1024中档6/15/52、NOIR raw12/30/68、NOIR display14/32/69。这些值含真实星点/结构和采样差异，只是描述性诊断；没有图质阈值、PSF或仪器接缝归类，不能说所有统计均改善或质量通过。

## 总资源、出口与退休

失败四帧代次同时登记原三512、细1024、两个NOIR512，共6图/9MiB native-RGBA等效；原代次最终逻辑退休MISSING。

新同源1024父层代次同时登记原三512及两个1024，共5图/11MiB等效，不冒理论替换后的9MiB。完成帧GPU纹理4194456B、buffer9540B；该阶段保存的纹理copy观察最大9830552B。完整旅程952观察各自最大纹理11800576B、buffer26112B、native-RGBAeq13369344B、FS3019252B、encoded2977051B/reserve703555B。各MAX不相加为物理总峰；临时copy/旧新共存和退休分层。该代次hide→释放额外注册→原unload/query/file-cache清理后native/纹理/buffer/文件租约及活动/退休记录最终0，仅验证当前代次。

新代次89请求、body5776962B；旧Hubble三PNG仅首传1152395B。新1024图使用任务dataURL，未经过新版本实际HTTP/static/cache/lease链，不能用此body/旧URL证明新出版出口。两次实际page复用同五份bundle，前端构建0。四主输出组逻辑35494523B（失败矩阵19094085、母图中档6089017、新父层page9848651、几何462770），不含reader/scope/docs，含副本与GL诊断；不是生产库存、wire、180GB全机余量或200DAU容量。无源下载/付费设施/采购/部署/发布。

## 归属决定与下一依赖

已测得细档及中档1024收益，不能继续把统一512当需求上限；低采样NOIRLab也不能靠加像素冒高清。冻结宽母2048与新细网格1024来自同源/同近似AVM，但不是一幅新4096母图，不得把两者标为旧v1同母三级。下一依赖只由[当前PLAN](../PLAN.md)维护：沿现有来源/TAN/多级/严格出版与消费者，核实可复用的同源多网格身份/几何与最小必要新版本，先闭合正常出版、静态/HTTP与实际消费者的一条路径；只有真实不足才扩大投影网格，不无变化重处理原片或盲做整幅4096。完整质量/配准/覆盖、旧版回滚暂存保留/全机成本及混合容量继续开放，普通registry不采用。

WEAPP WXML FAILED_DEVTOOLS、Android/iOS、新月面手机、独审和全部原33项义务原样保留。当前证据是源码之外的实际软件page开发验证，不是目标运行时或最终验收；Goal仍active、无预算、未完成。
'''
    plan = str(TASK.relative_to(ROOT) / 'PLAN.md').replace('\\', '/')
    continue_path = str(TASK.relative_to(ROOT) / 'CONTINUE-CLOUD-SKY.md').replace('\\', '/')
    cost = str(TASK.relative_to(ROOT) / 'evidence/prepared-imagery-source-coverage-cost-2026-10-04.md').replace('\\', '/')
    sky = 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'
    new_next = '**当前唯一下一依赖（B，2026-10-05真实边界/同源中档之后）：** 必要公开平移已显露细粗边界，直接NOIRLab raw/display作Hubble父层出现颜色/结构断层，不采用、不全图校色或透明化遮缺陷。同源cached母图1024中档原样导出、与已有1024细网格在同实际page更清晰，源RGB/投影/fit新增0；边界相邻contrast中位7→6、p90仍15/max51→52只是描述，完整质量/真实外沿/弱结构/昼暮/配准未过。原四帧严格还原2RGB通道各差1、cause UNKNOWN及最终退休MISSING保FAILED；仅新1024父层代次GPU原资格positive/has/最终source UNKNOWN与全部活动退休成立。现有v1强约束2048同母/三级512，不能借旧hash采用两1024。下一最小依赖是沿既有来源/TAN、共享多级/出版/几何及实际消费者，核冻结宽母2048＋新细网格1024同源多网格的真实身份、几何和最小必要新版本；优先复用已测输入/像素，先闭合标准出版→静态/HTTP→相邻档/来源Back/释放的一条实际路径，只有证据证明复用不足才扩大投影网格，不能无变化重做原片/旧三级/背景fit或盲造全幅4096。旧raw/display v1严格身份保持，不另建renderer/cache框架；完整图质/配准覆盖、静态真实出口/旧版回滚暂存保留/全机成本通过前不采用，普通registry空、新独审MISSING和旧FAILED保持。已闭合冷暖/图层/Back/迟到、中心采样与四源边界矩阵不重跑，PSF/noise仍暂停。详[本代边界/适用性/资源](evidence/experience-prepared-boundary-applicability-2026-10-05.md)、[前代采样](evidence/experience-prepared-sampling-applicability-2026-10-04.md)及[来源/成本](evidence/prepared-imagery-source-coverage-cost-2026-10-04.md)。C只据实测核queue/decode/暖缓存/SAO去重与必要寿命责任，16MiB仅压力参考；D保真实出口分类/保留/全机成本和混合容量。WEAPP/WXML、Android/iOS、200DAU全小程序及33义务保持；只云观星/必要依赖，不核旧设计稿，无提交部署发布。'
    text = owner_texts[plan]
    old_heading = '## 当前执行与收口（2026-10-04 Prepared源/出口采样与1024真实页面后）'
    assert text.count(old_heading) == 1
    text = text.replace(old_heading, '## 当前执行与收口（2026-10-05 Prepared真实边界与同源1024中档后）')
    start = text.index('**当前唯一下一依赖')
    end = text.index('\n\n', start)
    text = text[:start] + new_next + text[end:]
    paragraph = '新增[真实边界与同源1024中档](evidence/experience-prepared-boundary-applicability-2026-10-05.md)：production修改0、源RGB/投影/背景fit/前端build新增0。四帧跨源矩阵实际颜色/结构断层，严格Hubble还原2像素/2RGB通道各差1/cause UNKNOWN，原失败与最终退休MISSING保。只新增cached母图1024裁片原样导出1886809B/4MiB/约.206s及同实际page一项；父层更清晰但全部quality未过，无feather/校色。五GL-PNG-GL全值精确/当前名义431边界pair读回，不能作科学/绝对配准。新代次GPU资格has/positive真实执行、最终source UNKNOWN；原三512＋两1024 native等效11MiB，完成texture4194456B/该阶段copy观察9830552B，整段纹理/nativeMAX各自保、不冒物理峰，本代最终活动退休0不倒填失败代次。89请求body5776962B/旧三PNG仅首传1152395B，新图dataURL未过新HTTP/static/cache。四主输出35494523B不含reader/scope、非生产库存/全机SSD。普通registry空/独审/native/容量未验，下一仅顶部；两网格不冒旧同母v1，原pins/六保护/进程/HEAD保持。'
    insert = text.index('\n\n', text.index(new_next)) + 2
    text = text[:insert] + paragraph + '\n\n' + text[insert:]
    owner_texts[plan] = text
    text = owner_texts[continue_path]
    start = text.index('**当前最新结果：**')
    end = text.index('\n\n', start)
    text = text[:start] + '**当前最新结果：** [真实细粗边界/同源1024中档](evidence/experience-prepared-boundary-applicability-2026-10-05.md)沿原actual page仅补必要平移。直接NOIRLab raw/display作Hubble粗层显著颜色/结构断层，不采用；原Hubble四帧严格还原2RGB通道各差1、cause UNKNOWN，原失败/最终逻辑退休MISSING保。冻结母图1024中档裁片原样导出1886809B，新增源RGB/投影/fit/build0；只新增同源高父层一项实际page，父结构更清晰但完整质量/弱结构/外沿/昼暮/配准未过。5全GL-PNG-GL精确/新代次原GPU资格has/positive、最终来源UNKNOWN，原三512＋两1024登记11MiB与copy峰分层，本代全部活动退休0不倒填失败。89请求body5776962B/新图dataURL未过新版本HTTP/static/cache，四主输出35494523B非生产库存/全机容量。唯一下一依赖只见PLAN顶部的同源多网格真实身份/几何与最小出版版本，不重跑已闭合边界/组合/源处理；旧v1严格2048同母/512身份保持，不盲做4096。生产/其它业务/六保护/原进程/HEAD不变，普通registry空、独审/native/33义务保，不核旧设计稿。' + text[end:]
    prior = '**前代采样结果：** [源/出口采样及1024实际page](evidence/experience-prepared-sampling-applicability-2026-10-04.md)同view/time的中心细纹改善和还原0差只保原条件；本代边界平移的严格失败不回写其历史结果。Hubble较高源采样和NOIRLab较低源采样分开，已有细1024不重复解码/投影；原source/母/出版保持，无普通采用。后续只由PLAN当前顶部控制。'
    index = text.index('\n\n', text.index('**当前最新结果：**')) + 2
    owner_texts[continue_path] = text[:index] + prior + '\n\n' + text[index:]
    text = owner_texts[cost]
    index = text.index('\n\n') + 2
    cost_new = '**最新真实边界/同源中档成本边界（2026-10-05收口）：** [细粗边界与适用性](experience-prepared-boundary-applicability-2026-10-05.md)production/源RGB解码/投影/背景fit/前端build新增0。原母图1024中心裁片原样PNG1886809B/单图RGBA4194304B/约.206s，细1024复用前代不重做；两网格不是新4096同母v1，旧出版不变。新实际page原三512＋两1024native等效11MiB，GPU完成4194456B/buffer9540B、该阶段copy观察9830552B，整段952观察textureMAX11800576B/native13369344B/FS3019252B/encoded2977051-reserve703555B各分层，不冒物理峰；本代活动/退休0不倒填四帧失败的缺回执。89请求body5776962B，旧三PNG只首传1152395B，新1024由task dataURL未走新HTTP/static/cache/lease，真实出版出口仍缺。四主输出35494523B含失败/bundle/GL诊断，不含reader/scope、不是生产库存/180GB全机余量或wire。跨源raw/display父层图质失败、严格还原2RGB各差1/cause UNKNOWN保持；同源1024父层更清晰但完整质量未过。无新源下载/许可费/设施采购部署，未知成本不填零。普通registry空、独审/设备、标准静态/旧版回滚暂存保留/全机混合容量仍未验。'
    text = text[:index] + cost_new + '\n\n' + text[index:]
    text = text.replace('**最新采样/实际细图成本边界：**', '**前代采样/实际细图成本边界：**', 1)
    owner_texts[cost] = text
    text = owner_texts[sky]
    start = text.index('Prepared档位应由')
    end = text.index('\n\n', start)
    durable = 'Prepared档位由真实原源细节、实际已绘视场/屏幕及资源决定，512不是需求上限；低采样源不靠增像素冒高清。实际.05°/390×844页面512细图约1.875558倍屏幕放大，Hubble细域1024更清晰；冻结2048母图内已有的1024中档裁片原样导出也减少细粗采样落差，无背景/颜色fit、feather、锐化或新细节。公开平移显露边界后直接NOIRLab raw/display作Hubble父层有颜色/结构断层，不具备直接替换资格，不能以ICC/名义同坐标推断可互换。两个1024来自同源/同近似AVM却不是一幅新4096同母图；旧raw/display v1严格2048同母/三级512及immutable hash保持，必要新尺寸/多网格必须有真实版本/来源/几何，沿现有多级/出版/HTTP/租约/相邻档/Scene消费者，不能另建缓存或放松归因/完整性。小样原GPU资格函数执行后最终新出版来源UNKNOWN，不借旧hash采用；新代次旧三512＋两1024登记11MiB-RGBA等效与GPUcopy分别测、最终活动退休0，不按各MAX冒物理峰。四帧跨源矩阵严格还原2RGB通道各差1、cause UNKNOWN及原代次最终逻辑退休MISSING保FAILED；新条件成功不能倒填旧失败或推广中心还原。细粗边界/真实照片外沿、完整弱结构、昼暮、绝对配准/覆盖、标准静态实际出口/保留/全机成本未过，普通registry空、新独审MISSING、WEAPP/WXML/Android/iOS/容量仍未验。详[真实边界/适用性/资源](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-boundary-applicability-2026-10-05.md)及[原源/出口采样](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-sampling-applicability-2026-10-04.md)，具体当前执行只由任务PLAN维护。'
    owner_texts[sky] = text[:start] + durable + text[end:]
    assert owner_texts[plan].count('**当前唯一下一依赖') == 1
    with HUMAN.open('x', encoding='utf-8', newline='\n') as handle:
        handle.write(evidence)
    after = []
    for path, text in owner_texts.items():
        assert text != (ROOT / path).read_text(encoding='utf-8'), path
        with (ROOT / path).open('w', encoding='utf-8', newline='\n') as handle:
            handle.write(text)
        raw = (ROOT / path).read_bytes()
        after.append({'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    with (ARCHIVE / 'documents-after.json').open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(after, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    print(json.dumps({'updatedOwnerDocuments': len(after), 'newEvidence': HUMAN.relative_to(ROOT).as_posix(), 'productionChanged': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
