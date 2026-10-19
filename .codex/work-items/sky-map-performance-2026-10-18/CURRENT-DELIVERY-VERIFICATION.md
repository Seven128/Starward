# 当前变更的共享验证与提交范围

2026-10-19。沿当前 PLAN 进行离线验证，复用 [A1 / preview 独审](A1-AND-PREVIEW-FIX-INDEPENDENT-REVIEW.md)与[原生刻度 / motion 独审](SKY-RULER-NATIVE-CADENCE-REVIEW.md)，没有重新选择方案。本轮覆盖的当前源码未发现新增未处理的消费者遗漏；必要本地共享检查现已通过。此结论不等于远端 CI、当前候选手机交付或完整 Goal 通过。

## 当前结果

| 检查 | 实际结果与范围 |
| --- | --- |
| `npm run test --workspace @starward/wechat-miniapp` | 2,650 项，2,649 passed、1 skipped、0 failed，149.8 秒；包含实际 Sky 页面、ruler、motion、相关数据 / 状态消费者的全部现有单元与组件夹具。唯一跳过项是 `sky-sdss-optical-page.test.ts` 的真实 science publication 用例，因本进程未设 `CLOUD_SKY_SCIENCE_PUBLICATION_PATH`；未将其记为通过。 |
| `npm run test:miniapp:workflow` 首轮 | 175 项，174 passed、1 failed。唯一失败是 `development-automation.test.mjs:159` 的 warm-entry 夹具；原失败日志完整保留，没有改写成成功。 |
| warm-entry 定向修复后 | `node tools/run-node.cjs --test tools/miniapp/development-automation.test.mjs`：9/9 passed。 |
| 同一完整 workflow 修后再跑一轮 | 175/175 passed，22.8 秒；preview/feedback 的三份边界测试仍全部通过，device capture、技能引用、observer 与 automation 工作流一起通过。 |
| `npm run test:miniapp:ui-contracts` | 4 项 source-pattern probes passed；输出明确保留 `product_conformance: unverified`。 |
| 受影响文件 `git diff --check` | exit 0；只有既有换行规范化提示。 |

原生布局独审的六个 normalized-LF SHA-256 已对当前文件逐项重算，全部一致；当前 full miniapp run 因此涵盖独审最终版本，而非更早修订。strict、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 的当前独立 exit 0，以及 A1 r3 完整构建 / maps / materialized 20/20，按既有 owner 复用；未无变化重复类型或构建。当前 A1 r3 身份以 [preparation](R17-NORMAL-A1-PREPARATION.md) 为准，本轮未改其生产输入。

脱敏日志保存在 ignored `tmp/current-delivery-{workflow,miniapp,automation-fixed,workflow-fixed}.tap` 和 `tmp/current-delivery-ui-contracts.log`。首轮失败与修后结果分文件保存。

## 本轮发现并修复的已有测试边界缺口

首轮运行前，`start-development-session.mjs` 与 `development-automation.test.mjs` 都没有本地 diff。生产 warm entry 已在任何服务启动前调用 `syncWechatideSkill` 并输出同步阶段 JSON，但去掉 import 后执行实际入口的 VM sandbox 没有这个依赖。它提前因缺少绑定而 reject，尚未进入原本要检查的 automation failure；在 `auto-failure` 场景留下 `cleanupCalls=0`，与既有 `=1` 断言冲突。原来不匹配错误原因的 `assert.rejects` 还会令较早场景误收这种提前失败。另一个旧假设是“任何 stdout 即发 SIGINT”；同步阶段输出已经使其不再表示应用 ready。

root 在获知原因后明确授权定向修复测试。本轮只修改该测试的现有共享场景 sandbox：注入有明确返回 / 失败的 skill-sync 依赖；只在实际 `status=ready` 输出后发模拟 SIGINT；为每个失败场景匹配具体预期错误。原 API failure、redirected output、automation failure 和 signal 场景及拥有子进程 / receipt 清理断言保留；在同一场景入口补充 skill-sync failure 与 reload-required，验证它们不启动子进程，并核对同步顺序和三个 signal handler 的退休。没有复制生产启动实现、恢复旧结构或放宽断言。

本轮唯一测试改动是 `tools/miniapp/development-automation.test.mjs`，修后 normalized-LF SHA-256 为 `f6a4d101972d526fd5a1e3735ec59aefc4c51dad794673ce45a51dce655b35ba`。生产入口未改；没有访问或同步本机官方技能安装。

## 可以独立形成代码提交的责任

以下是完整的源码 / 测试集合，提交时应按责任一并纳入；这里的“可提交”指本地代码及已有独审证据足以形成可审阅提交，不表示已获手机或发布验收。

1. **官方预览结果与绑定保护（8 文件）：** `tools/miniapp/device-feedback-{official,preview,session,binding}.mjs`、`tools/miniapp/device-feedback.mjs`，以及 `device-feedback.test.mjs`、`device-feedback-preview.test.mjs`、`device-feedback-boundaries.test.mjs`。核对了两个真正的 ordinary-preview caller 都先持久化返回 handle，再做后验完整性 / QR 检查；自动预览保留真实 stdout 分类；load、preview、refresh、bind、stop 都沿共享状态规范化与 UNKNOWN / pending 守卫。auth success 仍不能完成业务 preview。当前仓库没有遗漏仍使用旧返回合同的真实 caller。`recordOfficialTaskResult` 只接收原 task 的显式查询结果，不自行发起轮询或业务预览。
2. **Sky 时间窗口恢复与原生布局换算（7 文件）：** `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`、`orientation-ruler-layout.ts`、`sky-overlay-motion.tsx`，以及 `orientation-time-ruler.test.ts`、`orientation-time-ruler-window.test.ts`、`orientation-ruler-layout.test.ts`、`sky-overlay-motion.test.ts`。核对了 ruler 的程序定位和拖动换算共用实际投影；ruler 的唯一生产入口接入 time surface 的结束事件与 live active；search / object / layers / time 四类 disclosure 仍沿同一共享 surface，新增回调为可选且过滤子节点事件。Map 的明确独立几何没有被迁入 Sky owner。settlement / native-position 等未改源码的真实依赖由现有测试覆盖。
3. **warm-entry 测试适配（1 文件）：** `tools/miniapp/development-automation.test.mjs`。这是本轮定位后的独立测试修复，可单独提交；不要求把 unrelated workflow / skill / Context 变更混入以上两组代码提交。

preview 组与 Sky 组之间没有新增运行时依赖，可以独立提交。Sky 三个生产文件及其对应测试应作为一组，避免单独提交 consumer 而缺失 owner。上述前两组分别沿其已有独审；本轮测试适配由本执行者修复，不能把这项自检称为另一份独立审查。

## 其余 dirty 成果与未关闭义务

`tools/miniapp/device-test.mjs` / `.test.mjs` 的不可覆写截图路径与 receipt 是本轮之前的工作，本轮完整 workflow 覆盖了现有回归，但未重新作其独立审查，应继续保留其原责任与证据。已有 AGENTS、两项项目 Skill、performance 方法、Context / manifest / development-feedback / settled-candidate 变更，以及本任务全部文档、JSON、诊断脚本、历史 trial 与观察记录均继续保留；本轮不将它们自动归入上述生产修复提交，也不重写其状态。

读取了当前 Product CI / Context structure workflow：本轮覆盖相关本地 miniapp / workflow 检查，未执行远端 CI、Linux 环境、后端全套发布 / OCI / infrastructure 或发布动作，不能报告整体 CI 已绿。未构建、提交、切换分支、访问设备 / ADB / IDE / SDK / 服务、读取私人账号或原始 profile，也未编辑 PLAN / HANDOFF / INDEX / Context。

gen26 原官方结果 **UNKNOWN** 仍不能重发或绑定；r3 当前实际送达、真实 transition endpoint / tick 中心 / scroll offset / 取消恢复、Sky A/B、地形 file-ready 对实际覆盖顺序及完整 R/H/A/N 验收均维持其各自未验证状态。8791 / N05 / 已送达 R6 / 配对 / VPN 的保护边界未变。
