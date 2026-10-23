# R27 当前 UI 最终有限接线独审

## 结论

2026-10-23，独立源码与准备结果审查。**本轮有限变更未发现剩余 confirmed P1/P2，可以继续由 Root 按既有 owner 处理实际候选；不认证手机采集、UI 还原、流畅度、泄漏根因或完整 Goal 完成。**

本代理仅新增本报告。没有修改源码、测试、PLAN、HANDOFF、Context、manifest 或冻结原件，没有执行构建、inspect、手机/ADB、IDE、服务、collector、缓存或网络操作。没有重复既有 107 项资格或宽测试。

## 输入与独立读回

实际读取当前 AGENTS、开发 Skill 与最新性能方法、当前 UI 准备报告、此前 R27 集成独审，并直接核对本轮两个脚本、修改前私有原字节、首次 build 保全日志/manifest、生成源码及实际 project 配置。当前 Mini Program 的导航/前台/返回职责依据现有 Screen Contract、primary-navigation 与 NativeBack 实现；本次没有重新选择或生成设计资源。

最终 manifest 在 `2026-10-23T00:50:54.537Z` 开始一次读取，后续对其内存快照逐件核验，于 `00:50:55.903Z` 完成；其 SHA-256 为 `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`。

| 实际读回 | 结果 |
| --- | --- |
| 当前 production bindings | 1597 件，全部实际字节 hash 匹配 |
| 当前 prepared bindings | 1618 件，全部实际字节 hash 匹配 |
| task template bindings | 59 件，全部实际字节 hash 匹配；与旧 gen31 比较仅 `inject-terrain-wait-observer.mjs` 改变 |
| 依赖链接 | 两个 node_modules 均为 junction，realpath 与当前仓库安装一致 |
| builder / source binding | 当前 builder 与 manifest 一致；source 为 `3808382a6b7fc8dee945b1bfe42e563fa6793182d80dd6a99253c58f4aa88c3c` |
| 旧 gen31 manifest | `34c003743125b49a507f8d935543fd82c87662be1de27e4ed14feba8344a63d5`，与私有 before 原字节相同 |

以上为本代理独立文件读回；manifest 内原 30 项检查均为 true，但本代理没有把再次读取该结果写成重新执行测试。整个旧 gen31 树的逐件保全由此前 owner 负责，本次没有重做该全树检查。

## 有限入口与短 slot

直接比较私有 before 与当前 builder，新增项仅为 `--current-ui` 的布尔选择、有限资格、固定目录后缀、generation32、文案标记及 `uiSource: current-production-source`。该参数只允许与 R27 / A1 / USB 一起使用；重复、未知、多 revision 的原拒绝条件保持。没有任意输出路径、额外 revision 或新观察机制。未带该参数时，原 trial、slot、generation 与模式选择表达式保持原语义。

首次 build 的 task 日志仍明确保留 `miniapp_isolated_check_slot_invalid`；当次保存 manifest 的 `result` 为 null。后续差异严格只有一行：当前 UI 选择 `r17-a1-r27-ui-usb`，其他分支仍沿原表达式。此固定 slot 长 17，符合生产配置原有 `/^[a-z0-9][a-z0-9-]{0,30}$/u`；原完整 trial 名不符合。生成配置与生产相比仅增加既有 hidden-source-map 接线，未扩大 slot 守卫、允许 watch/fixture/诊断混用或开放 caller 路径。

源码、输出、project 与 source-maps 都落在新固定 trial 内；bundle 输出是其 `source/apps/wechat-miniapp/dist/weapp-check-r17-a1-r27-ui-usb`。`prepare` 仍要求新目录，`refresh-unbuilt` 仍要求本 scope / generation / sourceDirectory、`result === null` 且输出/project 不存在，并以独立 `preparation-attempt-*` 保全原 manifest/检查；当前实际存在 `preparation-attempt-1`。`build` 仍要求输出/project 不存在，不能原地重建冻结候选。`inspect` 仍明确写入当前准备 JSON，保持 UNACTIVATED / PHONE_UNVERIFIED，而非自动激活。

## 当前 UI 与前台返回职责

对当前生产 Map 与生成 Map 的完整 diff 只包含原 task terrain/native-region 的 import、真实手势/enable/nativeUpdated 观察与 marker；没有旧 Map 页面替换、导航、样式、面板恢复或按钮布局改写。

本次 terrain 锚点精确迁移到 `{pageVisible && !eventModalPresent ? <FloatingNotificationHost /> : null}`，生成结果仍完整保留此条件，marker 仍受 `visible={pageVisible}` 约束。`pageVisible` 实际来自 primary-navigation 的 Map foreground subscription；show/hide、请求取消、位置/弹层清理和 Map 真实事件资格保持。既有 region 变换在同一 `nativeMap.isCurrent()` 分支内增加观察，没有删除已有 foreground / editor-closing 资格。

当前 `NativeBackBoundary`、primary-navigation/controller、页面 presentation、My library/page、Search、LayerSheet 与 `use-panel-return-position` 均与 production bindings 一致；生成 Map 仍有 LayerSheet 进入时的 extent/selection/position 快照及关闭恢复通路，未回退本轮已修复的阅读位置与 unmount 退休责任。除既有 task 增量涉及的 Map/Sky 源文件外，当前 UI 资源、样式令牌和上述导航消费者沿生产字节进入准备；45 件 delta 没有另引入旧 UI 页面。实际 project 配置为 gen32，`miniprogramRoot: weapp/`；没有指向旧 gen31 项目。

这证明当前源保留与准备接线，不能替代在新候选上比较实际采用稿、原生合成或手机返回表现；此前普通 gen14 的产品证据也不能无条件冒作新诊断包验收。

## R27 观察语义

R27 observer、links、instrumentation、协议、collector 与其余 58 份模板 hash 均未因本次 UI 接线变化。既有集成独审中的 Query 默认 hash owner、精确 Cache get、至多八个弱见证、原函数/返回值身份及异常 unknown 语义继续适用。本次未重新实现或扩展这些机制。

生成 controls/adapter 仍实际接入 R27 links，并保留 15 秒 metrics、20 秒同 run 产品 Pause、90 秒 seal/release；没有新增 Play、扩大样本、延长观察阶段或以每帧历史替代弱见证。新的 source binding 包含当前 production 身份、builder/template、gen32、USB origin hash 和 uiSource，未把它冒为 bundle 字节。

## 生成结果与边界

本次读取的最终 manifest 声明 bundle `3bb55a21a8845b9367d0445113620be94cea95f42bc930070806d0014d7c3aa6`、344 件 / 5,126,615 B、30 份外置 source maps；实际新 project 目录和对应配置已读到。完整 bundle 双份指纹、预算、类型与正式 build/inspect exit 结果由 Root 负责，本代理未重复执行或以声明代替自己的未执行检查。

目标 WeakRef/Query 安装时序、真实非空 BSC/已加载 SAO、collector 新包落盘与观察成本仍需后续既有目标路径证据。当前关联只覆盖 render 完成及所读 owner/options，不自动证明闭包强边、React commit、持有根或泄漏。手机尚未切换并非本次源码准备的产品失败，也不能据此将未验证项写成通过。普通 gen14、当前 collector/服务和完整 Goal 的其余义务仍由原 owner 承接。

本次最终脚本身份：builder `c21ce55ecd1ae14c858ba54c9fac50c74eda680d28b7b76ea16c1cb3e925600b`；terrain transform `1521d5183e2c513e48f4f770e96c87dddf4f8ddc5cb53efa0a8d231ca8bc2010`。
