# R27 实际主包准入失败与最小恢复边界

2026-10-23。有限只读归因；未执行构建、预览、bind、手机输入、服务或 metadata 修改。仅新增本报告。gen32 及其私有冻结原件继续保留，不得原地改写、refresh 或重建。

## 已确认的第一失败边界

本次 feedback `starward-device-feedback-oqGaEc` 明确绑定 `generation-000001-TUe7SW/project`、bundle `3bb55a21a8845b9367d0445113620be94cea95f42bc930070806d0014d7c3aa6`，344 件/5,126,615 B。该 prepared generation 的同调用原件 `.official-process-2b20f997-12f3-4635-9ede-e022a8307e97.json` 为 exit 1、truncated=false、observedBytes=retainedBytes=2,246；诊断文件本身为3,388 B，SHA `9f6d63ce67f2ec7b685ab26d3e4803aeef6b4fbb3813e81ce58704f6057ffd5b`。

独立解码其 stdout 得2,191 B、SHA `eecb878bd3cd7b2f3bfd3547708406a100c95fa1d045629643ec3ff831ad6ca9`：outer `ok:false`、`errorType:MCP_TOOL_ERROR`、`source:mcp_business`、`code:"10"`、`tool:auto_preview`，`detail.rawResult.success:false` 且同 code，明确报告 **main package source size 2081KB exceed max limit 2048KB**，没有公开 taskId。这是这一次已结束调用的业务失败；不能归成网络/VPN 推断或仅凭 CLI 退出码判断。

现有 parser 保留 `official.result.status:unknown`/success=null 是通用防重放策略，本报告不建议放宽。Root 可在完整保全、同 generation/hash/diagnostic 及 official 前态严格比对后，沿既有 forensic resolution 模式追加 task-local failed disposition，保留原 unknown 与原诊断；这不是伪造新官方回执。不 bind、不重发同包；失败回执本身不证明手机是否已受影响，现态由 Root 单独观察。

## 静态预算的实际含义

`tools/miniapp/inspect-production.mjs` 的 `summarizePackageBytes` 按输出文件路径归属加总磁盘字节；builder 的 `mainHeadroomBytes` 是2,097,152减此加总。gen32 manifest 仍为 `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`，其 main=2,073,782 B、余量23,370 B 是准确的**本地输出文件**统计。它没有模拟官方后续打包，不能建立真实可推送准入。本次实际拒包已经推翻该准入推断；无需提高预算或改写旧统计。官方2081KB与本地计数的具体转换/额外成本，本次尚未归因，不能用差值虚构一个通用安全余量。

普通gen16私有 `header-handle-boundary-repair-20261023/normal-manifest.private.json` 为 main=2,035,453 B，和gen32相差38,329 B；二者另含Map观察及源版本差异，这不是单独R27的因果净成本。普通成功也不替代R27实际准入。

## 实际编译图确认的依赖问题

冻结 hook `source/apps/wechat-miniapp/src/hooks/use-resource-query.ts:1` 从 Sky 的 `r25-memory-lifetime-adapter` 导入两个观察端口；当前生产 hook 没有此依赖。全冻结源码核对，该 hook 是唯一非Sky生产模块导入 adapter 的入口；其他 adapter 消费者都在Sky内。

不止源码推测：gen32实际主包 `common.js` 为519,719 B/SHA `afd15479fe74d8ec2cdc74ccd5ea44e1660448f544a4ee1fa14c10ea3b333909`，包外 `common.js.map` 为1,671,131 B/SHA `561711a17cebcf7dd23e946c5e587e164242bce4692ee0d4228b505a4489cc96`，与冻结manifest一致。map确实把R27 callback observer/links、R26 aggregate/fiber/owner、R25 lifetime/stellar/adapter共8个任务模块映射到主包common，而不是Sky包。按每个source-map生成段到下一段/同行结尾的UTF-8区间统计，8个模块合计26,521 B；同在main的Sky `r17-ruler-entry-runtime`另2,648 B。此方法只表明实际生成区间的归属，不包含模块包装、重新优化效果或官方打包成本，**不是可直接扣除的收益承诺**。

因此可确认：共享hook反向依赖完整Sky adapter，使这组诊断模块进入main，是应修的包图边界。尚未确认：该路径是官方全部超额的唯一原因；仅迁移上述模块就一定低于2048KB。官方名义超额33KB，尤其不能以26.5KB映射区间直接宣称可通过。

## 建议的最小恢复实现

只在未来新恢复代、新目录实施；保留gen32及所有旧代。沿现有 `r27-query-callback-instrumentation.mjs`/builder owner修正接线，不修改普通生产或创建新的业务owner：

- 共享层只放任务专用的两个窄端口及固定注册入口，无Sky/adapter/Taro/QueryClient的运行时导入、样本、key、payload、timer或缓存。未注册时wrapper原对象返回、owner无操作；已注册也原样返回同一个wrapper，不创造包装闭包。
- 只由Sky adapter注册其固定诊断方法。注册须早于本run第一个已观察page render/hook调用；可在adapter模块装载时固定注册，由现有observer的active/tracking gating管理。不得每render重建或注册捕获产品对象的闭包。共享端口只持固定任务方法，原WeakRef样本与生命周期仍在既有observer内；最终release仍清空原观察状态。若选择解除注册，则只在最终release作身份核对解除，并在下一合法start恢复，不能在Pause提前切断drain。
- page begin/end/page callback、aggregate同render关联、原8个aggregate ID、page/wrapper/Query的WeakRef及unsupported/unknown语义保持。Query精确身份仍由原links在同一全局provider，以`defaultQueryOptions({queryKey}).queryHash`→`cache.get`读取；不枚举cache、不调getter、不改变Query调用/GC/调度。
- 原15秒metrics、20秒同run产品Pause、90秒seal、原active-5/首次drain-10两次观察及保留原观察时间、32KiB不可变包/有限重试全部保持；Play、BSC/SAO数量、场景、UI和全部R27样本不能用来换包大小。

先用一次新代的完整构建回答包图是否恢复；若这项真实修正后官方仍拒包，把新实际首错及分包图交回owner，再定位剩余任务成本。不得以重复原包、增预算、删星/样本或禁用场景绕过，也不能为补足未知官方差值先试一串压缩变体。

## 必要验证与边界

复用已有R27 core及正常行为fixture，新增范围只覆盖新窄端口：未注册/注册均保持函数身份；无关query不触发lookup；同provider自定义hash及禁止find/getAll；Pause后不添样本且drain仍可读；最终release/后续合法start不串run。现有源码变换完整剥离还原、严格生产/准备类型、原30项正常行为和相关checkpoint消费者继续有效；不重做旧107项资格。

新代须实际读回：主包不再含8个完整observer/adapter、它们保留于Sky，窄端口只有一个运行时实例；全部真实消费者仍关联同一observer；完整两份bundle、包外maps、origin、package/static guards及旧冻结hash保持。注册前后时序和有用非空8样本仍待目标验证，source map不能代替它们。包图与本地预算通过后还须同官方配置真正预览成功，才进入Root的实际可见更新/bind及有限目标采集；本报告没有关闭Sky持有根、OOM、叠层或完整Goal的任何义务。
