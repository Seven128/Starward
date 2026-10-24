# R20 Native 快捷偏好当前预设投影修复

本轮完成本地消费者修复与定向验证，等待新的独立审查、新完整 APK 及真机复测。未宣称 Native 持久化全部验收、精确定位/完整 family、生产或 Goal 完成。层叠性能、云观星播放性能和 OOM 仍保留后置。

## 输入与事实边界

- Root 提供当前基线 HEAD：`b4d2654540e203ffa247e31b1cc21db70aeab4e9`。本代理没有执行 Git、ADB、构建、设备、API、网络或共享服务动作，也没有修改 Goal/PLAN/HANDOFF/Context。
- Root 真机旧包 SHA256：`53960d39ea3d5e865306699e49497cd74919b996efeb6ab96a635079383cce1e`。Root 经真实 Preferences 保存行星/不步行，看到 r2/已保存；仅 force-stop/冷启动后，经 My 再打开 Preferences，r2 仍在而快捷控件回到银河/800m。PID 变化由 Root 的 restart intent/result 记录。本代理没有重复重启或清理数据。
- 私有证据目录：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/native-functional-ui-53960d39/`。本代理实际查看初始 `screen-289df83f-9482-4ac3-80f4-a0a500021d51.png`、保存后 `screen-a6aff78d-1ca4-45ac-a17d-55518fca9338.png`、冷启后 `screen-f0fc0b74-4288-4136-a695-6fa60487ec55.png`，没有复制图片或个人数据到仓库。
- 本地原源码的独立反例区分了两个责任：保存后关闭 SQLite 连接、卸载 Screen、重建模块/runtime/store，再走原生产 SQLite adapter hydrate，完整 canonical profile 仍等于已保存的行星/0；随后实际 Screen 的行星选中断言失败。此结果证明这条本地链的消费者投影缺陷，不能替代真机 canonical 存储审计，也不应把原手机现象直接称为存储丢失。
- 复用现有 PLAN/HANDOFF、REQ、Native DESIGN 与 mobile-shell/preferences 用户结果、UIUX Native mapping/wording，以及 v2/CAS/current-projection 的既有实现和报告。没有重开方案或重新生成设计资源。

## 实现与责任

只写 6 个源码/测试文件：

1. `apps/mobile/src/features/preferences/use-profile-editor.ts`：从现完整 Wizard 迁移完整预设草稿、可见会话、当前版本、保存中后续修改与错误恢复责任，供 Wizard 和 Quick 两个真实消费者复用。保留原 `createProfileSaveAttempt`，没有新造 pending/CAS/repository 平台。
2. `apps/mobile/src/features/preferences/quick-profile-resolver.ts`：快捷适配器只校验其可编辑的目标与步行距离，并保留整个 runtime 已验证 profile。完整运行时仍负责写入契约，避免完整 Wizard 的隐藏名称长度等文本编辑约束阻断合法原预设，或无声剥离未编辑字段。
3. `apps/mobile/src/features/preferences/profile-target-labels.ts`：共享完整目标标签，Quick 的多目标摘要和 Wizard 使用同一标签所有者。
4. `apps/mobile/src/features/preferences/PreferenceWizard.tsx`：迁移到共享编辑会话，保留现完整字段、Zod/RHF 与原保存协议，接收 hydration ready 和同 id 当前 profile 查询。源版本变化时保留草稿，提供明确放弃并读取动作。
5. `apps/mobile/src/shell/MobileShellScreen.tsx`：删除永久银河/800m局部默认和从 unrestricted 重建完整 profile 的 `makeQuickProfile`。Quick 编辑当前完整预设，只改变 `targets` 与 `travel.maxWalkingKilometers`，保留 id/name/createdAt 及其它字段。不再由快捷选择推断 observerTypes/equipment/drive/directAccess/lens。
6. `apps/mobile/src/features/preferences/QuickPreferences.test.tsx`：实际 Screen→RuntimeRoot→shell-store→domain runtime→生产 Expo SQLite adapter 的消费者验证；仅 SQLite/crypto 的 Native primitive 用真实 Node 文件 SQLite/crypto 替代，RN primitive 在 jsdom 渲染。

当前完整语义：单目标且可由快捷按钮精确表示时才显示选中；多目标、不在三种快捷目标中的合法目标，不取第一项；步行只匹配精确 0/0.8/2，null 显示未限制，其它合法数值原样说明，不近似取档。新客无隐含银河/800m选中，也不将样例伪装为已应用。摘要用“已填”区分未保存输入。

正常初始读取、冷启重建、pristine 切换预设会显示当前完整预设。dirty、保存中、未知结果期间不被 late hydration/新版本/切换无条件覆盖，原输入和原稳定 attempt 保留。当前源变化时显示草稿归属与明确放弃/读取动作；保存旧 id 草稿会明确显示“保存并切回此预设”。未变输入的未知结果重试仍提交原 candidate，包括原时间戳及对象身份；真正新编辑沿既有新 intent 规则处理。已知 revision refusal 后，第一次失败保留输入，下一次显式保存才以 authoritative 当前同 id profile 合并仍 dirty 的字段并重新校验，保留其它后来保存字段。

保存成功时比较既有 `canonicalJson` 的语义身份，避免 Zod 与读回对象键顺序不同被误判为保存期间的新编辑。复用的纯函数位于现 domain `runtime-json.ts`，没有修改 domain、state、storage、schema 或依赖。

基础预设保存后仍保留其 id；原身份区把所有 `base` 说成“未设置限制”会误述此结果，已改为“用于当前推荐”，只有未编辑基础 r1 保留“当前”徽标，已保存 r2 正常显示“已保存 · 当前”。

## 验证与原件

所有本轮任务材料在 `tmp/native-quick-preferences-projection-20261025/`，没有清理旧原件或构建。

- `baseline-source-freeze.json` / `baseline-source-inputs/`：修改前 19 个源码/关键 control 的原始字节与 SHA256。
- `baseline-reopen-counterexample.log`：原实际消费者反例 **1/1 失败**。canonical 整体读回相等的断言已先通过，失败点是冷启后行星未选中。当前回归在该反例上扩展；没有把扩展后的测试文件误称为初次测试的逐字原件。
- `first-shared-editor-check.log`：初次迁移 **7/7 通过**；`shared-consumers-check.log`：扩展后 **11/11 通过**。
- `complete-consumers-check.log`：一次中间检查 **18/19 通过、1 失败**，原 Wizard 保存后重开时未再次关闭。原因是原 JSON 键顺序比较造成假“后续修改”；已按上文语义身份修正。`semantic-identity-consumers.log` 为修正后 **19/19 通过**。
- `final-consumers.log`：最终源码（含基础预设文案与可移植临时数据库路径）**3 个文件、19/19 通过，命令退出 0**。包括 Quick 5 项、现 Wizard 6 项、现 shell startup 8 项。覆盖冷启后显示、完整非快捷字段保留、合法短名称、多目标与非三档、0/null、pristine 切预设、late hydration/dirty输入、当前 id 变化、实际 SQLite commit 丢 ack 的稳定重试、实际版本拒绝后显式合并恢复。
- `final-mobile-typecheck.log`：`node ../../tools/run-node.cjs --bin typescript tsc --noEmit`，退出 0。`first-mobile-typecheck.log` 为更早通过的记录，不代替最终记录。
- 定向消费者最终命令：`node ../../tools/run-node.cjs --bin vitest vitest run src/features/preferences/QuickPreferences.test.tsx src/features/preferences/PreferenceWizard.test.tsx src/shell/shell-startup.integration.test.tsx`，cwd `apps/mobile`。
- 对本轮 6 个文件做尾随空白检查为 0；相对 baseline 只有 Screen/Wizard 两个原文件发生预期变化，另外 17 个 baseline controls 的 SHA256 全部一致。
- 本地测试无 listener、无真实 provider、无手机动作；所有本测试 SQLite 句柄已由 afterEach/coldReopen 关闭，React root 已卸载，命令进程已退出。合成 SQLite 原件保留。最终测试使用系统 tmp 下 `starward-quick-preferences-*`，避免把 Windows/task 专用目录写死到产品测试。

## 冻结与剩余边界

源码停止写入，终态 `source-freeze.json` SHA256：

`03ef7f3e7c84da39badb885dec51fa5b1122df7e1641960aad929dc58efcee4e`

manifest 包含 28 个完整原始输入：本轮 6 个 writes、17 个未变 baseline controls，以及 RuntimeRoot/PrimaryTabBar/tsconfig/root package/Node launcher 的关键当前 controls；全部原始字节在 `final-source-inputs/`。PrimaryTabBar、已审手工行程、定位实现、state/domain/storage 保持未改。此冻结仅绑定列出的消费者源码与 controls，不冒充完整构建输入 manifest。

Root 后续须用新的独立审查与完整新 APK 复测实际普通 App：正常 My→Preferences、保存行星/0、仅 force-stop并冷启、同 id r2 与完整快捷语义读回、完整 Wizard/切预设与未知结果恢复相关消费者。当前已安装旧包不含本修复。本地 SQL/jsdom 通过不证明 Expo Native SQLite、手机 UI、精确位置、完整 family、不同版本、服务或生产验收；本代理也没有检查或宣称当前 CI 全绿。所有原 Goal 未完成义务仍由唯一 PLAN/HANDOFF 保留。
