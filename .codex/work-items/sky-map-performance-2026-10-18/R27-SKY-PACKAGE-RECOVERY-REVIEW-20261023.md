# R27 Sky 包边界恢复独立源码审阅

2026-10-23。审阅者 `r27_sky_package_independent_review`，独立于本批实现者。**未发现需要阻止唯一新 gen33 prepare/build 的 P1/P2 问题。** 本结论只允许 Root 继续既定恢复边界；不表示实际分包图已恢复、官方已准入、目标已关联或产品内存问题已解决。

## 审阅范围与实际操作

完整读取[实施记录](R27-SKY-PACKAGE-RECOVERY-IMPLEMENTATION-20261023.md)、[实际打包失败边界](R27-ACTUAL-PACKAGING-BOUNDARY-20261023.md)、PLAN 相关性能/阻塞/恢复规则、最新开发 Skill 与完整性能方法；逐件读取私有 before→current 差异，追踪共享 hook、真实全局 Query provider、R25 adapter、R26/R27 变换、R27 observer、watcher 和消费者测试。读了实际检查脚本、原首错、修后输出和日志。

本次仅执行本地只读源码/证据检查和 hash 读回，新增本报告。没有运行 prepare/build/inspect、测试/类型检查、preview、watcher、collector、服务、IDE、手机操作或网络写入，也没有修改任何旧冻结产物、生产文件、PLAN/HANDOFF/INDEX。旧 107 项资格未重跑。

## 共享窄端口与真实消费者

- `scripts/r27-query-callback-ports.ts:4` 的两个固定方法引用与一次注册 owner 没有 import、产品值索引、key/sample/payload 历史、timer 或额外 queryFn 包装。未注册和注册后，`r27QueryWrapper` 均返回传入的同一 wrapper；调用注册方法的返回值不能替换它。重复同身份注册可重入，冲突方法显式拒绝。
- `scripts/r27-query-callback-instrumentation.mjs:56` 只在新恢复模式把共享 hook 接到同目录 ports。页面 begin/end/pageFn 仍接原 Sky adapter；`instrumentPage` 保留 loading/recovery/normal 三个真实 return，并返回原 callback/ReactNode。没有每 render 注册，也没有另建查询或状态 owner。
- 同文件 `:90` 在 adapter 模块创建原 `callbackLinks` 后立即固定注册其既有两个方法；这发生在该模块加载时，早于消费者执行 `SpotSkyPage` 的首个已观察 render。共享层不再反向 import 完整 Sky adapter。**编译后的模块归属、唯一实例及目标装载时序仍须实际构建/目标验证。**
- `scripts/r27-query-callback-links.ts:33` 接受 unknown client 后，先按当前已登记 pageFn 做身份 gate，再检查 `client === miniappQueryClient`，仅通过同一固定 provider 的 `defaultQueryOptions({queryKey}).queryHash → getQueryCache().get` 精确读取。真实 `useResourceQuery` 没有 per-call hash override；本批没有 cache.find/getAll、外部 provider 方法调用、Query key 保留、Query 配置/GC/重试/调度更改或以类型断言跳过边界。
- 无关 pageFn 不触发 lookup；已登记 pageFn 配外部 provider 也不读取外部或全局 cache，进入原缺失 query-owner 分支，关系仍 unknown。原 observer 的 WeakRef unsupported、构造/deref 失败及未建立关系均不改写成 collected/false。

## 原观察与生命周期保持

R27 adapter 变换继续把 start、stopTracking、两处 release 接到原 R25/R26 owner。端口固定注册保留到模块生命周期，Pause 不解除它；原 observer 的 active/tracking gate 阻止新增关联，首次 drain 仍从既有弱见证读取真实 Query options/cache。seal/release 清空原弱见证，下一合法 start 重置原 run 与关联，而非创建另一套 owner。

原 aggregate ID 1–8、单个当前 render、首次创建关联、active-5 与首次 drain-10 两次观察及其原时间均保持。后续 packet 不重新采集/改写首次 drain 时间。同 render 只建立限定关联，不能宣称 callback→aggregate 强边或 retaining root。只持固定诊断方法不会新增产品对象强索引。

`normalPlayTrialMs` 仍为 20,000ms；实际 R25 变换把旧 retirement 60 秒计时恢复为原 20 秒同 run 产品 Pause，15 秒 metrics 与 90 秒 seal 仍独立。原单 flight、每包有限重送、不可变字节、10 checkpoint 与 32KiB 上限未变。hide/retire/scope/release 和下一合法 run 仍走既有 owner。

## 固定新代与 Map 观察边界

`scripts/build-r17-normal-baseline-v3.mjs:26` 新标志只有与 `--review-r27 --observe-a1 --usb-reverse --current-ui` 同用才合法。固定新目录 `tmp/r17-normal-a1-review-r27-usb-sky-package`、gen33、slot `r17-a1-r27-sky-usb`；原 current-ui 仍为 gen32。旧模式的 scope/目录/slot/generation/模板声明未被新标志重定向。

新模式仅关闭 terrain-wait/native-region **任务注入**，保留生产 Map 全部源码与数据/相机/生命周期。builder 的两个条件分支及既有实际内存变换检查相符：6 个 Map terrain 消费者字节不变，没有 task marker/terrain binding/native-region 文件。新 scope、bindingInput 与限制字段如实声明这次只观察 Sky，不能用于补写 Map task 已观察。现有 DAY LIGHT 和两个 catchMove 面板没有在此批被改写。

`scripts/r25-watch-checkpoint-arrivals.mjs:10` 新有限入口只路由对应新 trial；新模式明确要求 manifest generation33，并继续校验实际 packet 的 generation、sourceHash、schema、runId/sequence 文件名。旧 current-ui 仍路由 gen32，历史输出形状保留。源码读回不是 watcher 已启动或新文件已到达的证明。

## 已有检查与独立读回

实读检查输出：R27 core/adapter/ports 消费者 19/19；补齐 exact-provider 反例的 2 条 focused case 通过，与前者重叠不累加。before→current test 差异保留原断言，并把相关旧消费者扩展到两种接线；没有 skip、删掉既有行为断言或修改协议来迁就新结果。

实读原正常行为 fixture 的调用与输出，当前实际源的内存变换 30 项全部 true，包含实际 accepted copy、原 setter/ref/三个 null 退休、15 秒导出、20 秒同 run Pause、hide/unmount/替换 run 和不可变字节重试。production 与完整 virtual-host prepared strict 类型均为 0；`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 保持。首轮准备态 2 个 TS2339 原件明确保留，修复仅在精确身份 guard 后读取固定 provider，不把首错宣称产品失败。

已实读有限入口检查脚本/输出：比较的 28 个旧声明结果一致、7 个非法新组合拒绝；4 个真实 CLI 检查均为 unsupported operation，未进入候选写入。源码变换剥离检查保留原页面/共享 hook 字节。以上均是已有检查的审阅，没有重跑以扩大计数。

本审阅独立重算以下 hash，全部吻合：

| 读回范围 | 结果 |
| --- | --- |
| 私有 `source-before` manifest 与 5 份原脚本 | manifest SHA `b9cf29a39449401e8feff35ca329f024d1be587339dd7f3fd775bc86bf144a88`，5/5 无差异 |
| 当前 6 个任务脚本 | 与 `implementation-final-readback.private.json` 的大小/hash 身份一致，6/6 无差异 |
| 6 个保护文件 | PLAN、gen32 manifest、Map/index、两个 catchMove 面板、普通 use-resource-query，6/6 无差异 |
| 所列 6 份检查日志/JSON | 与最终证据读回记录一致，6/6 无差异 |
| 新 trial | 审阅时仍不存在 |

私有证据 owner 为 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-packaging-recovery-20261023`。没有复制其私有原件到仓库。

## Root 下一步与尚未证明的结果

可以沿实施记录，仅对唯一新 gen33 prepare/build。继续保护当前准备元数据、普通 gen16 和失败 gen32；不得 refresh/重建旧冻结代或重发原拒包。新实际编译图须证实：完整 8 个 observer/adapter 模块位于 Sky、主包只有同一个窄 ports 实例、真实消费者仍接同一 observer；再核完整双包/maps、origin、既有预算/static guards 与旧冻结身份。此处没有承诺可扣除的字节数或官方安全余量。

本地检查不能替代同配置官方成功准入；成功后仍需实际可见更新/bind及有用非空 8 样本、真实注册/关联和观察成本。若新官方仍拒包，保全新首错及包图后定位第一剩余边界，不串试压缩/disable/减少星或样本。完整 UI、叠层、Sky 六字段/正常 Play、资源退休、OOM 原因与 Goal 验收义务均保持未完成。
