"""Reconcile one completed developer dependency into existing task/Context owners."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
summary = '新增[完整Taro页面/Query/已绘Scene](evidence/experience-real-taro-page-2026-10-04.md)：原SpotSkyPage完整JSX/实际context lookup→store→overview-report/useSkyForecastQuery、已装真实Provider/useQuery和官方Taro页面生命周期/components mapping已执行；398实际构建源及r51的274源/六保护前后精确，无生产或其他业务改动。公开manual tap冷943 SAO→hide-clear活动文件0→同hash新delivery返回一asset503保898/8404BSC→公开重试943，原index304/只失败tile重取；相同390×844RGBA与PNG独立保存字节读回。原完成snapshot388对象/3逻辑名称同坐标，Canvas touch真实重叠HR8162/SAO19309列表→公开选择Alderamin→选中marker/资料HTTP/modal→关闭保selection。最终root/Query/native请求/GPU句柄0、encoded owner全部活动0/epoch2/MapFS26B；70正文6069829B非真实出口/容量。r1-r10任务接入/提前捕获/错误唯一选择假设与root文件名误假设失败保持；r11正常exit0/根readback-r2自审非独审。CSS未合成/受控几何与MapFS不是WEAPP，历史Image引用不认证native退休/物理峰，后端完整transitive epoch未独立冻结。原WXMLFAILED/native完整组合/来源Back/图质/200DAU容量与保留缺口开放。没有BFF-watch重启/下载加工/依赖变更/手机/提交推送部署采用。'
next_step = '当前唯一下一依赖是A/D的真实整页组合：上述完整JSX/context-report/Scene及公开重试、已绘标签/触摸重叠选择已取得开发事实，沿同一真实页面/Query/provider继续执行公开拖动缩放至数值全景与地景渐隐恢复、选中细化失败保粗、图层、连续时间/跟踪，以及实际Sources页面/Back→hide/返回组合；以已绘相机/frame/source身份核所有家族正常/失败消费者，并单列encoded/临时staging、解析模型、decode/native/GPU及退休记录，不把历史Image引用或软件句柄求和冒物理总峰。复用已装official Taro page bridge与当前单encoded owner/隔离API，下一受影响lane显式传本次checkpoint，补冻结后端实际源/科学资产epoch；不把记录navigateTo当Source route已运行，不手写effect/Provider替代公开动作。已闭合r11清理回程重试/标签pick、Hook7阶段、五组合/solar/old9/clear2/rollback/static/加工矩阵不重复跑。根据实际组合瓶颈才改队列/decode/暖缓存或提取生命周期；没有新根因不重启DevTools/BFF/watch。若目标原生能力仍失败，保持该层FAILED并推进PLAN既有B/D独立事项，不换选型/新框架或扩其他业务。保32MiB/two-transfer/同帧/科学bytes/完整写入/租约/取消迟到/粗回退及六保护，禁止改云观星以外业务逻辑。B整图背景接缝绿晕弱结构配准覆盖/rights/来源批量出版、空Prepared/science registry/HST矩形FAILED/M82缺输入；旧新WEAPPbinary/200MB/native完整gesture-time-followcalibration-sourceBack/WXMLFAILED/Android-iOS新Moon/物理总峰/retention refs/whole200DAU月成本流量/CPU-RSS-DB-Redis-outbox-media/12Mbps10-20混合容量/180GB/独审仍开放。Goal active无预算；无提交推送采购云部署发布或重复下载加工。'

def write(p, text): p.write_text(text, encoding='utf-8', newline='')
plan = TASK / 'PLAN.md'
s = plan.read_text(encoding='utf-8')
old_top = '**当前唯一下一依赖（2026-10-03局部匹配否决后）：** A/D已核真实Provider/完整SAO Hook；推进真实整页JSX/context-report/Scene消费者，完整图质/原生/物理/容量未验，当前具体行动与不可扩大范围见下面当前依赖段。'
assert old_top in s
s = s.replace(old_top, '**当前唯一下一依赖（2026-10-04真实整页增量后）：** A/D已核完整JSX/context-report/Scene及公开重试/标签触摸选择；沿同一实际页面推进剩余全景/渐隐、选中/图层/时间跟踪与Sources/Back组合及全家族资源。完整图质/原生/物理/容量未验，具体行动与范围见下面当前依赖段。', 1)
matches = re.findall(r'当前唯一下一依赖是A/D的真实整页消费者：[^\n]+', s)
assert len(matches) == 1
s = s.replace(matches[0], summary + '\n\n' + next_step, 1)
write(plan, s)

entry = TASK / 'CONTINUE-CLOUD-SKY.md'
s = entry.read_text(encoding='utf-8')
anchor = re.findall(r'新增\[真实Taro React/Query消费者\][^\n]+', s)
assert len(anchor) == 1
s = s.replace(anchor[0], anchor[0] + '\n\n' + summary, 1)
assert 'current-execution-state-2026-10-03-r51.json' in s
s = s.replace('current-execution-state-2026-10-03-r51.json', 'current-execution-state-2026-10-04-r52.json')
write(entry, s)

spot = ROOT / 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'
s = spot.read_text(encoding='utf-8')
anchor = '用户确认以下补充为原云观星完整体验的一部分'
assert s.count(anchor) == 1
paragraph = '当前完整SpotSkyPage JSX及actual context/report/forecast/resource Query、官方Taro page生命周期与同一真实Provider已取得独立于前述Hook阶段的有界软件开发证据。公开manual/tap、hide-clear/返回新交付、单SAO503保粗/公开retry，Scene完成snapshot/真实逻辑标签/Canvas touch重叠选择/选中marker及资料modal消费相同帧身份；软件RGBA冷恢复一致，卸载清Query后encoded活动/逻辑root/记录GPU句柄0。Styles只pin未合成、native几何/文件API受控、历史Image诊断保留不供native退休/GC或全物理峰；actual Sources page/Back、剩余公共拖动全景/时间跟踪/校准及跨家族完整组合、WEAPP WXMLFAILED/Android-iOS新版Moon/图质容量保留验收仍缺，不能合并各历史lane冒完整旅程。详[完整实际page证据及范围](../../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-real-taro-page-2026-10-04.md)。\n\n'
s = s.replace(anchor, paragraph + anchor, 1)
s = s.replace('整页SpotSkyPage/report-context/Scene与公开重试/Back消费者仍未由本项执行', '该Hook阶段未执行整页SpotSkyPage/report-context/Scene与公开重试/Back，后续整页边界见下一段')
write(spot, s)

runtime = ROOT / 'project_context/architecture/runtime-and-domain.md'
s = runtime.read_text(encoding='utf-8')
anchor = '`PreparedOpticalImageryService.publishedAssets()`'
assert s.count(anchor) == 1
paragraph = 'The complete current SpotSkyPage JSX, installed React/Query Provider, actual context lookup/store/report/forecast consumers and official Taro page lifecycle now have bounded development execution through the same owners. Actual WEAPP-mapped tap actions supply manual entry and public SAO retry after hidden-page cache clear; Scene completion, real logical labels, canvas touch/overlap choice, selected marker and information modal share the painted identity. Same-camera software PNG/RGBA restore and final logical root/Query/encoded activity/GPU-handle retirement were saved and read back. Native APIs/geometry/MapFS remain controlled; pinned SCSS was not composed. Historical Image diagnostics retain references and cannot establish native decoded retirement or physical total. Actual source-page navigation/Back, remaining full-sphere/gesture/time/tracking combinations, native WXML/device/quality/capacity and independent review are still open. Backend current controllers executed on an isolated fixture-repository/weather service, but its full transitive source epoch was not independently frozen. No production source or other business logic changed. See [complete page scope and saved outputs](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-real-taro-page-2026-10-04.md).\n\n'
s = s.replace(anchor, paragraph + anchor, 1)
s = s.replace('This is not full SpotSkyPage/report-context consumer, WXML/Canvas, public UI or native physical resource validation.', 'That Hook lane did not execute the full SpotSkyPage/report-context or public UI; subsequent complete-page evidence is scoped separately below, with WXML/native physical acceptance still open.')
write(runtime, s)
print('Updated PLAN/CONTINUE and Sky portions of two existing Context owners; no production edits.')
