# 地形与云观星性能维护四点落实核对

2026-10-30，当前聊天 `01a18cc7-bcc4-7f02-aa10-4e3bc8a4922c`。这是[唯一PLAN的四项增量](PLAN.md#performance-maintenance)的结果与证据，不是第二份方案。用户要求四点完成后停止；完整Goal仍未完成，工具状态为paused。授权及停止边界见[RESUME](RESUME-20261030.md#性能维护四点授权)。

## 结论与核对范围

第1、2点以当前代码、真实调用者和行为验证为交付对象。已采用的公共机制确实落实在代码中；本轮未发现必须再改生产代码的具体缺口，未做无依据的重构，也不把新增文档冒作新性能修复。第3、4点补进现有开发skill和架构Context，使后续功能开发、重构及维护能够直接读到约束。四点结果见下文；当前停止状态只归[HANDOFF](HANDOFF.md)。

已通过read_thread读取用户指定的五个聊天；聊天标题只作导航，按用户有效修订及原证据核对：

- [开发计划方案1](thread://01a17ea8-2bd8-7b92-8872-68aa791e5c14?hostId=local)、[开发计划方案2](thread://01a18656-71e8-79e2-80d6-b73b25f1e436?hostId=local)、[开发计划方案3](thread://01a18a43-d31c-7ee3-a724-71d100acd6bf?hostId=local)。
- [地形与云观星时间模块性能分析](thread://01a17ec2-603b-7dd1-85f9-766993aea660?hostId=local)、[性能内存方向的代码质量纠偏](thread://01a18716-9a69-7002-a7fe-6e4acbfbe295?hostId=local)。

结合当前源码/调用链、提交及原任务证据，而不是仅靠聊天摘要或提交标题判断。核对时main/HEAD为`1fd25800fb624d39fd98248f1aa3ac1da33c7de2`；`d7f80883`保留较早性能checkpoint，但近期Query、精确时刻reader、帧工厂和F04等仍有dirty/untracked实现与回归。不能把HEAD、远端CI或普通旧候选当成覆盖了这些增量。

## 1. 前次分析与优化是否实际落实

| 原共识/责任 | 当前代码及证据 | 判断 |
| --- | --- | --- |
| 地形先分清现成供给与源等待；完整粗父图不能冒最终LOD | [地形有限供给](TERRAIN-D1-IMPLEMENTATION-20261028.md)、[17窗/606成品](TERRAIN-OBSERVED-BATCH-20261028.md)及[真实请求/接管/返回](TERRAIN-DEVICE-20261029.md)；客户端由[地形查询](../../../apps/wechat-miniapp/src/hooks/use-terrain-overlay.ts)与公共安装owner接通 | 已实施并有对应目标证据。陌生区域首次源等待不冒已提速；地形成品不证明EOG/ECMWF已供给。 |
| 公共文件、下载、替换和资源退休归共享owner | [文件资源](../../../apps/wechat-miniapp/src/services/raster-image-resources.ts)、[唯一Map文件实例](../../../apps/wechat-miniapp/src/services/map-raster-files.ts)、[公共安装](../../../apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts)、[公共coordinator](../../../apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts) | 三种栅格真实共用；失败删除继续记账、reader/pin/alias、旧新图替换及迟到命令有统一规则。 |
| F04要真实退休旧图层，不能凭超时/换Map清零 | [Map session](../../../apps/wechat-miniapp/src/pages/map/native-map-session.ts)与[页面原节点保留](../../../apps/wechat-miniapp/src/pages/map/index.tsx)保持直接前任key/id到registered raster owners退休；[修复手机结果](TERRAIN-DEVICE-20261029.md#f04-resource-repair-user-result) | 已有旧remove成功、pin=0、三个旧coordinator退休和后继恢复；物理native/GPU字节仍未知，5秒按钮持续显示未观察，不重演。 |
| 时间意图、供给和实际接受帧分别有权威owner | [时间状态](../../../apps/wechat-miniapp/src/features/sky/sky-observation-time.ts)、[geometry供给](../../../apps/wechat-miniapp/src/features/sky/use-sky-time-geometry.ts)、[单绘制writer](../../../apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle.ts)及[页面真实消费者](../../../apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx) | 六字段/ruler/Play共用意图；latest与一个在途writer区分；名称、拾取、来源沿accepted身份。不能把请求时刻冒已绘时刻。 |
| 降低无用引用/分配，保合法缓存、科学内容与精度 | [公共Query wrapper](../../../apps/wechat-miniapp/src/hooks/use-resource-query.ts)、[精确reader](../../../apps/wechat-miniapp/src/features/sky/sky-time-target-query.ts)、[BSC帧](../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts)、[SAO帧](../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts)、[公共transform](../../../apps/wechat-miniapp/src/features/sky/sky-stellar-transform.ts) | 当前源码已接通作用域隔离、reader退休、帧工厂边界及冗余ray引用释放；BSC/SAO共用精确时间计算，未通过削星数或精度换性能。 |
| 按现有输入寿命复用、按证据选择绘制优化 | [Sky性能Context](../../../project_context/architecture/runtime-and-domain.md#cloud-sky-performance)保留已采用的帧调度、绘制/文字复用、场景输入与资源寿命分层；[D2原始证据](SKY-D2-CAUSAL-20261028.md)持有后续实际窄修与普通运行结果 | 已采用机制保留。不要把所有研究候选技术都算作承诺的必做项。 |
| 播放准备合并/准入前移、延期纹理上传 | [D2唯一方案](PLAN.md#sky-time-performance)及原Context中的理由与重开条件 | 明确维持不采用。更多pool、缓存、worker、多Canvas等仍须具体热点与净收益；不是本轮漏实现。 |
| 正常暂停/退出改善与物理内存归因分开 | [D2普通运行与自然回落](SKY-D2-CAUSAL-20261028.md)、[最新范围裁决](RESUME-20261030.md#本日后续范围裁决与当前两项核验) | 用户已收口本轮D2。已观察结果复用；历史OOM根因、逐资源物理字节和容量未知保真，后续实际故障才查新现场。 |

## 2. 模块、数据、状态及公共优化

地图当前真实链路为：领域查询/资格/descriptor → `useRasterImage` → `mapRasterFiles` / `raster-image-resources` → `useMapRasterInstallation` → `createMapGroundOverlayCoordinator` → native Map session。地图页面的terrain、light、cloud三个安装调用均走这条公共链，地形图像请求从自己的hook进入同一文件owner。

| 责任 | 共同维护的规则 | 合理的独立部分 |
| --- | --- | --- |
| 文件与传输 | 单一共享资源实例；已有项数/编码字节/并发上限；读者独立取消；实际失败删除与物理alias记账 | descriptor的发布身份、来源质量、字节/hash声明来自对应数据owner。编码文件预算不是native/GPU预算。 |
| 原生安装与退休 | 同一安装hook/coordinator；Map/camera代隔离；图片/范围/来源成对；实际回执后退休pin，保迟到/失败清理责任 | 三层独立需求和状态实例。地形preview/final优先级、夜光年度资格、云量发布/精确时刻`retentionKey`不同，不能统一成一个业务状态机。 |
| 故障Map与跨页 | 原Map session/recovery管理当前权限和直接前任；F04修复使所有注册栅格owner都有原生清理目标 | retained My、正常Sky清理、故障换Map各自生命周期继续区分。卸载和物理销毁不是同一事件。 |
| Sky时间与绘制 | 原时间/供给owner、latest/单writer与accepted身份；BSC/SAO共用transform；共享Query按需隔离长期回调 | 精确响应缓存、页面reader、publication、当前帧、decoded/GPU资源各有寿命。Sources共享请求不能因另一个读者隐藏而被取消。 |

因此公共文件、安装、退休机制的修复会使三个栅格消费者共同受益。地形预制/源下载消除属于地形供给，旧cloud polygon兼容支路不经过栅格链；云量/光害正式数据未就绪时也不能声称已有同等显示或性能实测。

页面仍协调多个owner，部分接线测试仍使用源码提取，这些是维护关注点；本次未发现三层各自复制同一文件/native状态转换或需要新建统一引擎的证据。按现有[维护边界](../../../project_context/architecture/maintenance-boundaries.md)，后续确有重复政策才收回原owner；不按页面行数或测试数量发起重构。

## 3. 面向后续开发的通用沉淀

已扩展现有[开发skill](../../skills/starward-miniapp-development/SKILL.md)及其入口元数据，并接入[开发时性能与内存维护参考](../../skills/starward-miniapp-development/references/performance-maintenance.md)。相关feature/refactor在修改长期回调、缓存、共享异步、页面/native寿命、高频更新或大集合/图像时读取适用规则，无须等到用户报告卡顿。

参考覆盖可达引用与闭包、reader与数据寿命分离、共享取消及迟到隔离、有界缓存与工作量、分配/大对象复制、React/Taro更新、分页/LOD、图像解码/native/GPU分账、验证与记录。闭包、循环引用或ref本身不能直接判泄漏；要找出超过需求寿命的强持有链。React memo不是释放机制，源码模块级工厂也不必然保持压缩后的捕获边界。

默认应遵守的是正确所有权、失效和释放；新增pool、预取、缓存、并发、worker/WASM等须有实际瓶颈与净收益。`Object.freeze(function…)`只解释现用构建链的局部防内联措施，不升级为通用内存优化。没有增加固定性能数值、全组合用例、例行Profiler、审查agent或审批门槛。[AGENTS](../../../AGENTS.md)已有共享实现、预算和验证约束及开发skill入口，未复制一套新规则。

通用来源为实际查阅的官方资料：[MDN内存管理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)、[闭包](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)、[React Effect](https://react.dev/reference/react/useEffect)、[React memo](https://react.dev/reference/react/useMemo)、[Taro优化](https://docs.taro.zone/docs/optimized)、[Chrome内存诊断](https://developer.chrome.com/docs/devtools/memory-problems)、[WebGL实践](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)。当前依赖为Taro4.2.1/React18.3.1；Taro文档中的旧3.x细节未作为现用API/配置采用，浏览器例子不证明WEAPP能力。微信原生性能页面本次未成功取得正文，不冒作已阅读来源。

## 4. 对应Context及防退化边界

更新原[地图责任段](../../../project_context/architecture/runtime-and-domain.md#map-raster-publication-and-delivery-boundary)及[Sky性能段](../../../project_context/architecture/runtime-and-domain.md#cloud-sky-performance)：明确三层真实共用/独立状态、供给侧差异；把旧“两栅格owner”改为实际注册owner；补BSC/SAO缓存帧工厂在实际构建链保持词法边界的原因、适用限制和回归入口；将历史计划降回采用/实验依据，当前执行指回唯一PLAN。

代码能表达当下实现，但通常不能完整表达“为何不能重新合并”“为何一个看似有利的优化被否决”和证据的适用范围。长期维护采用三层保护：非显然边界旁的已有注释、已有行为回归、Context中的责任/理由/重评条件。通用方法进入skill；时长、候选、采集原件和当前状态留任务证据。一项观察若无跨次决策价值，不必强行永久沉淀。安装这些规范不证明未来所有修改会自动合规。

## 本轮实际验证与保全

以下是在当前dirty源码上实际运行的既有检查，未新增只验证文案的测试：

| 检查 | 实际结果与边界 |
| --- | --- |
| Map公共行为：`raster-image-resources`、`map-raster-files`、`terrain-ground-overlay`、`use-map-raster-installation`、`native-map-session`五份既有测试 | **58/58通过**。覆盖共享reader/pin/alias、失败删除、迟到native、云量时刻替换、preview/final与旧Map退休。历史terrain测试名下的兼容入口实际转调公共coordinator。 |
| Sky/Query行为：共享Query及retention、time query及retention、cached owner retention、observation time、time geometry、canvas lifecycle、star draw preparation、stellar transform共十份既有测试 | **98/98通过**。覆盖真实Query缓存/读者、当前压缩机制下的持有边界、单writer/迟到取消、时间供给/反向长按及完整星表精度。源码提取、受控VM/GC和native模拟只提供相应软件证据。 |
| `npm run test:project-skills` | **4/4通过**。 |
| `npm run context:validate` | **通过**；只验证manifest及显式控制源，不验证普通Markdown链接或事实正确性。 |
| skill frontmatter及入口YAML | 仓库已安装YAML parser检查字段、name、description、占位及interface通过。官方Python `quick_validate.py`实际尝试因缺PyYAML未能运行，不冒该工具通过，也未为文档安装依赖。 |
| 本次新增/修改链接、局部差异和源码保全 | 本轮10份文件的新增/修改本地链接及锚点、局部空白检查通过；8份关键源码（含中断EOG WIP）SHA、main、HEAD与Git index与改前相同。全仓`git diff --check`结果及完整局部差异保存在下方回执目录。 |

未运行新的手机、Heap/Profiler、collector、网络脚本、普通退出或全产品构建。复用原D1/D2/F04目标证据；本轮软件回归不重证目标物理内存或完整产品验收，不改变原UNKNOWN/停止条件。

本轮文档前像、校验日志及最终回执保在`E:/Dev/Starward-data/development/performance-maintenance-20261030-01a18cc7`。保留main、全部既有dirty/untracked和中断EOG WIP；本轮未修改生产源码/测试、提交或推送，也未操作设备、共享服务、DB或发布。完整Goal仍有原未完结果，本次四点结束后停止。
