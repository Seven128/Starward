# R27 gen32 对原有限 Sky 问题的适用性独审

2026-10-23。**可以在原 PLAN 的真实依赖阻塞分支中，限定使用现有冻结 gen32 回答原八个 aggregate 与 fine-target Query 回调的关联/弱寿命问题。此次四处 Map 差异未发现使该观察失效的源码机制。** 这不是当前 UI 候选、采集已准入或性能修复结论；不需要因此重建冻结包、新增变体或重跑本机资格。Root 仍独占手机，普通 gen16 尚未被本代理切换。

## 直接核对

已读 PLAN 的执行顺序与阻塞分支、最新 HANDOFF、[剩余 UI 范围](R19-REMAINING-UI-SCOPE-20261023.md)、R27 当前 UI 准备/最终独审、原 Query 集成/独审/观测器及[host 恢复结果](R27-LIVE-COLLECTOR-RESUME-RESULT-20261023.md)，并按当前开发 Skill/性能方法核对实际实现。记忆只用于定位既有 UI 优先级，最终判断以本次源码和上述现文为准。

独立读取实际冻结 manifest 和 `source`，用现有 `fingerprintBundle` 只读核验 `project/weapp`：manifest `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`，source `3808382a6b7fc8dee945b1bfe42e563fa6793182d80dd6a99253c58f4aa88c3c`，整包 `3bb55a21a8845b9367d0445113620be94cea95f42bc930070806d0014d7c3aa6` / 344 件 / 5,126,615 B，均与 manifest 同。实际 project 配置指向 `weapp/`、generation32；这些是磁盘身份，不是手机身份。

本代理逐件重算全部 1597 项 production bindings：1593 同，仅下列四项不同、无缺件。四份私有 before 原件均恰与冻结 production hash 同；完整 before→当前 diff 与 before→冻结 Map diff 已直接读取。另核实际 prepared 的四文件及 Sky page、共享 Query hook、SAO hook、Map/Sky lifecycle/return/entry 和 primary navigation 的绑定；R27 observer/links/instrumentation/protocol 当前模板也均与冻结绑定同。未把原报告中的测试结果写成重新执行。

| 实际差异 | 对有限观察的影响与保留边界 |
| --- | --- |
| Map `index.tsx` 新 import、一次 `projectMapLayerLegend(displayedLayer, mode)` 与图例 JSX | 只投影图例；不写原 layer、Context、Query、相机或导航状态。新增 helper 只对已知 DAY 五档分组，未知及其他模式保原语义；其 test 不作为产品运行源。当前 Map 每次 render 多出少量投影分配，不能据此说两包运行成本/基线完全相同。 |
| `map-layer-selector.scss` 新一条 legend-heading 规则 | 仅 Map 图层文档标题样式，不修改 Sky Canvas、视口或包内 Sky 样式。gen32 保留修前冗长 LIGHT 表达，不能用它验当前紧凑图例。 |
| `spot-panel.tsx` / `pending-proposal-panel.tsx` 各加 `catchMove` | 仅原 document 手柄 View 的 native move 边界；原 callbacks、档位、固定云观星动作、正文滚动和退出逻辑未改。gen32 仍有旧手柄裁顶风险；普通合法面板的固定云观星入口不依赖新增属性，不能把冻结包的旧表现当修复回归或当前 UI 验收。 |

## 实际生命周期与因果边界

直接读取 Map 的 `openSkyPage`：两栅格 `suspendForExit` → 等待两者 ready → current 检查 → scope-checked 小快照 → `beginEntry` → `redirectTo`；失败释放/恢复及迟到结果保护均不在四项差异中。冻结 Map 相对原件只加既有 task terrain/native-region 观察和 marker，没有改这条退出链。`mapUnloaded` 来自真实组件 cleanup；Sky mount/accepted-ready 另有各自 owner，源码存在不等于本次 native remove 或目标卸载已经成功。

Sky 返回仍实际调用 `openPrimaryPage`；旧 Map 被移除时由 primary-page-navigation 的 `reLaunch` 重建，经同一身份检查恢复面板/阅读位置，未恢复旧底栏模型。架构段落中历史 `switchTab`/custom Tab 叙述不能覆盖当前 Screen Contract 和本次实际代码。四差异没有改 snapshot scope，也没有新增跨页保留资源。

Sky fine-target 的 key/enabled/真实 queryFn、共享 wrapper/provider、正常 Play、SAO 选择/loader/解析与原 R27 同 render 关联站点均未因这些 UI 修复改变。因此在同一次合格 gen32 运行内，对具体旧 aggregate、创建 render 的 page callback、wrapper、实际 Query/options 的有限关系仍有解释价值。只有合格样本中 aggregate 尚活而其具体 callback 已收集，才可排除该链；options 阳性仍不是 callback→aggregate 的强边或最终根。源码相同不保证目标实际建立关联，unknown/未完成继续沿原停止条件，不加扫描或改 Query GC。

Map 卸载不等于 JS 模块、Query cache、native/GPU 已全部物理回收。旧图例和手柄可改变进入前布局/触摸及分配历史，诊断自身也有开销；跨包、不同 API/cache/进程或供给状态的 PSS/存活数不能直接比较为 gen16 的内存收益或无泄漏。此次适用性不能推广到完整 Map 资源回收、正常持久 Play、六字段流畅度或 OOM 修复。

## 沿原 owner 的必要准入与停止

这些是既有观察条件，不增加新 Gate：使用原合法正式点/已验证 Context 的真实 Sky 入口，不绕过账号或提案权限；绑定实际候选/目标实例与当前 run，保最大/全天空、地景、过去起始时刻、真实非空 BSC 和实际加载/accepted SAO 及相关 cache 状态。磁盘包、目录名、旧 gen14/r26 截图或仅 asset200 不替代该运行事实；不为此次关联新增私有账号探测或重做历史手机资格。

Root 的 host-only 恢复及修正计数证明原 19 件保留、13 位余量、R27 为 0；本代理未操作或重新验证服务。这不替代第一真实 baseline 的 source/generation/run 校验及 active-5/首个 drain-10 的原 ID、窗口、有效负载与 Query 关联读回；baseline 不要求已有八样本。按原单次有界 20 秒产品 Pause/15 秒 metrics/90 秒 seal 与有限预算执行；必要关联缺失则在原边界停止，不追加压力或另派变体。

临时使用诊断包与严格按采用稿实现的要求不冲突：最新仓库生产源码与普通 gen16 分别保有实施和当前目标反馈入口，冻结包只作为明确标记的有限观察输入。保全当前 feedback、沿既有 owner 在诊断结束后恢复最新普通 UI；旧 UI 差异和未验状态不得从记录消失。UI、叠层和人类双指依赖继续保留，不能由此升级为整体验收。

本次只新增本报告；无手机/IDE/ADB、服务、构建/refresh/inspect、测试、网络写、账户/N05/R6、Context/PLAN/HANDOFF/INDEX、上传/提交或清理操作。早期两个大范围读取/字典概览被截断、一次安装 hook 路径猜测失败；随后用真实路径及有限完整比对补齐，均无产品效果，不作失败机制或通过证据。没有新增常驻进程或待清理输入。
