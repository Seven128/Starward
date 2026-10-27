# R20 Native 偏好共享编辑四项独审修复

本轮已完成四项已证 P2 的本地合批修复，源码冻结，等待 Root 安排新的独立审查和新 APK/真机验证。此文是实施者报告，复用旧独审旅程后的通过结果不是新的独立审查结论。

## 输入与保全

复用唯一 PLAN/HANDOFF、Native shell/preferences Source 用户结果及共享状态要求、当前 UIUX Skill 的 Native mapping/wording、Native DESIGN 与 Screen Contract。保留原 v2/CAS/current-projection、稳定 save attempt、完整字段定义和实际 store/runtime/SQLite owner，没有重写存储或扩大“新建完整预设”范围。

入口冻结为 `tmp/native-quick-preferences-projection-20261025/source-freeze.json`，SHA256 `03ef7f3e7c84da39badb885dec51fa5b1122df7e1641960aad929dc58efcee4e`。修改前逐件验证 **28/28** 长度和 SHA，并保存全部原始字节至 [baseline-source-inputs](tmp/native-profile-editor-review-repairs-20261025/baseline-source-inputs/)，记录见 [baseline-pins.json](tmp/native-profile-editor-review-repairs-20261025/baseline-pins.json)。原失败独审、probes、SQL 与日志未覆盖。

本轮事实来自 [语义独审](R20-NATIVE-QUICK-PREFERENCES-SEMANTICS-REVIEW-20261025.md) 和 [编辑/恢复独审](R20-NATIVE-PROFILE-EDITOR-RECOVERY-REVIEW-20261025.md)。Root 先前按失败冻结构建的 `eb5c3724…` 未安装；实际手机、原 r2 数据、新包与现场资格均继续由 Root 独占。本代理没有设备、构建或 Git 操作，不据此宣称当前 main 或 CI 状态。

## 修复结果

1. **完整条件说明真实。** Quick 默认说明改为“保留现有完整设置，可进入完整偏好修改。”冷恢复的停车/安全照明/车辆直达等已有要求不会再被说成“不限制”；持久字段未改成样例或 unrestricted。
2. **Quick→完整入口使用同一完整草稿和 attempt。** `PreferenceWizard` 支持调用方提供实际 editor，完整字段只呈现该实例。Quick 卡进入时直接使用 Quick 的 RHF/完整候选/原 attempt，关闭返回 Quick、重开继续同一输入，显式保存才写入。独立入口保留独立编辑 owner，首次使用才创建，并保留该 owner；原“新建完整预设”回调仍按原 active profile 行为，本轮不声称修复或验证其新建能力。
3. **已知冲突重试固定原目标。** `useProfileEditor` 在 RHF 异步校验前锁住提交、原 id、编辑代次、attempt 和版本。已知拒绝后的下一次显式保存，先在锁内以 authoritative 同 id 版本合并仍 dirty 的字段，再通过快照 resolver 校验完整候选。resolver 不再收到可被后续编辑改动的同一个活动对象；跨 await 不会重读 mutable form 生成候选。重置期间的瞬间 pristine 不允许当前 B 接管 A。完成后仍保留保存中/校验中产生的新输入，原 CAS/receipt 不变。
4. **未知结果确认不承诺切换。** 未变原输入显示“确认上次保存”，来源变化说明明确“确认上次保存不会切换当前预设”。它仍重放原 candidate/对象/时间戳和已有命令身份，不激活旧 A 或增加写入。真正新输入继续使用既有显式新 intent 语义，动作显示“保存新的修改”；未改 `profile-save-attempt.ts`。UI 对比采用提交前输入身份，避免 Zod 合法文本规范化被误当作新编辑。完整视图关闭/重新打开有独立呈现代次；旧完成不能关闭新视图，校验尚未完成时关闭也不能从失效视图开始派发。

本轮实际修改 6 个原文件：

- `apps/mobile/src/features/preferences/use-profile-editor.ts`
- `apps/mobile/src/features/preferences/PreferenceWizard.tsx`
- `apps/mobile/src/features/preferences/QuickPreferences.test.tsx`
- `apps/mobile/src/features/preferences/PreferenceWizard.test.tsx`
- `apps/mobile/src/shell/MobileShellScreen.tsx`
- `apps/mobile/src/shell/shell-startup.integration.test.tsx`

两个既有 Wizard/startup 测试仅更新未知确认/新修改的动作定位，原 candidate/持久断言保留。Quick 测试增补实际共享草稿关闭/重开、A/B 已知拒绝、未知确认零写与异步校验期间新输入四个机制，并在既有高级条件案例核对真实说明。旧 `quick-profile-resolver.ts`、目标标签、schema、稳定 attempt、state/domain/storage、底栏、定位与配置均保留原字节。

## 实际检查

证据目录为 `tmp/native-profile-editor-review-repairs-20261025/`。

| 检查 | 实际结果和边界 |
| --- | --- |
| 旧独审严格旅程副本 | **8/8，exit 0**。见 [final-strict-probes.log](tmp/native-profile-editor-review-repairs-20261025/final-strict-probes.log)。SQL A r5 同时包含行星/0/夜间徒步；已知冲突重试 A r6 保留后来 city/parking，B 仍 r4；未知 A 确认精确字节不变、零新增 SQL 写且 B 仍当前。 |
| 受影响实际消费者 | **3 文件、23/23，exit 0**。见 [final-consumers.log](tmp/native-profile-editor-review-repairs-20261025/final-consumers.log)。包含原 19 项和新增 4 项；合法短名称、多目标/未代表值、0/null/非三档、完整字段、dirty/late hydrate、保存中后改与关闭/重开旧完成保护均保留。 |
| Mobile TypeScript | `node ../../tools/run-node.cjs --bin typescript tsc --noEmit`，**exit 0**，见 [final-mobile-typecheck.log](tmp/native-profile-editor-review-repairs-20261025/final-mobile-typecheck.log)。 |
| 源码/资源末核 | **28 项中 6 项本轮修改、22 项原字节不变**，本轮源文件尾随空白 0。所有 probe React roots 已卸载、SQLite 句柄关闭，相关 Node 命令终态退出；[resource-summary.json](tmp/native-profile-editor-review-repairs-20261025/resource-summary.json) 末核自有 Node 进程 0，未创建 listener。 |

严格恢复副本保留原 SQL/行为断言，仅将原未知 case 的动作定位由错误承诺的“保存并切回此预设”改为“确认上次保存”，并增加旧切回按钮不存在及“不切换”说明断言。原 [lifecycle.test.tsx](tmp/review-profile-editor-recovery-20261025/lifecycle.test.tsx) 和本轮逐字副本 `original-lifecycle.test.tsx` 保留；语义副本只把输出/合成数据库目录改成本轮所有，原期望未改。实际语义读回见 [actual-effects.json](tmp/native-profile-editor-review-repairs-20261025/actual-effects.json)。这些是实施者重跑证据，不冒充新的审阅者结论。

`first-repair-probes.log` 为初版 8/8；随后加强了候选校验快照和永久回归。`first-consumers.log` 保留 **22/23**：唯一失败是旧 startup 测试仍查找已更名的“保存偏好”；修正该动作定位后最终 23/23。没有删除失败原件或降低持久断言。原独审两个严格失败和一项文案失败仍保存在原报告目录。

定向命令：

```powershell
# cwd: apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/preferences/QuickPreferences.test.tsx src/features/preferences/PreferenceWizard.test.tsx src/shell/shell-startup.integration.test.tsx --reporter verbose
node ../../tools/run-node.cjs --bin typescript tsc --noEmit

# cwd: repository root
node tools/run-node.cjs --bin vitest vitest run .codex/work-items/sky-map-performance-2026-10-18/tmp/native-profile-editor-review-repairs-20261025/lifecycle.test.tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/native-profile-editor-review-repairs-20261025/semantics.test.tsx --root . --reporter verbose
```

## 冻结与保留义务

[source-freeze.json](tmp/native-profile-editor-review-repairs-20261025/source-freeze.json) SHA256：

`9ae02daa71c78cf4bef5afbd52542c25c1bbff5a20915c03550b8a211bed5925`

包含上述 **28 项**的当前长度/SHA/基线 SHA，完整终态原字节在 `final-source-inputs/`。`modifiedThisRepair` 是本轮实际 6 项；`productWrites` 为合并前轮基础后的 8 项交付写集，包含前轮未变的 resolver/标签及本轮两个既有测试适配。Root 可以独立推进其它已审模块的 HEAD；本冻结不依赖把历史 b4d26545 冒充当前 HEAD。

本轮未修改 Goal、PLAN、HANDOFF、Context、Git、其他模块或共享现场。新独立审查、新 APK 与实际 Android Expo SQLite/普通 UI/保存及冷启、键盘/Back/原生生命周期仍需 Root 完成；本地 jsdom/Node 文件 SQLite 不替代这些资格。权限交接另属 Root 串行模块，未在此实施。iOS 运行、完整 family/生产/多版本及其它原 Goal 未完成义务全部保留；层叠与云观星播放性能/内存/OOM 继续后置且未关闭。
