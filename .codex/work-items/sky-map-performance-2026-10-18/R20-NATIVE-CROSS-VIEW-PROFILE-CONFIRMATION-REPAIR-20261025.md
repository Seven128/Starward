# Native 跨视图未知保存确认修复（2026-10-25）

已在共享 editor 内完成限定修复并冻结，等待全新独审及 Root 的新 APK／真机验证。原严格反例修前失败，修后连同原九条控制 **10/10**；受影响三文件消费者 **26/26**，Mobile TypeScript退出0。这里是实施者证据，不能代替独立审查或目标运行时验收。

## 输入与责任

沿唯一 PLAN／最新 HANDOFF 的 Native 偏好消费者责任、Source `mobile-shell-and-preferences`、core-journeys、Native DESIGN 与当前 interaction Skill／Native mapping／wording，修复[最终独审已证 P2](R20-NATIVE-PROFILE-EDITOR-REPAIRS-FINAL-REVIEW-20261025.md)。前轮四项修复、v2／CAS／current projection、稳定 candidate 与原始 receipt owner直接复用，没有重做方案。

基线为 `tmp/native-profile-editor-review-repairs-20261025/source-freeze.json`，SHA256 `9ae02daa71c78cf4bef5afbd52542c25c1bbff5a20915c03550b8a211bed5925`。先逐件核28项长度／SHA并保存完整原字节、manifest及原独审测试／失败日志至本轮 `baseline-source-inputs/` 和 `original-review/`，原文件未覆盖。本轮未调用 Git；Root提供的3d23是独立模块交付背景，旧 CI不覆盖这里的未提交源码。

原问题有同一 owner 内两处不一致：UI按原始输入显示“确认上次保存”，实际 attempt 却按当前视图解析后值选择 candidate；完整视图还可能对原 Quick已接受的合法短名称新增校验拒绝。只把 parsed identity换成 raw而继续执行新视图校验，不能完整恢复该确认能力。

## 最小实现

仅修改两个文件：

- `apps/mobile/src/features/preferences/use-profile-editor.ts`：共享一个“原始输入是否仍是原未知保存”判断。原确认沿 RHF既有提交／busy／session／owner检查，用原始输入身份选择原冻结 candidate；不再让另一个字段视图的规范化或更严校验重解释该已派发意图。真正改变后的输入仍经当前视图的 resolver校验，才构造新候选。候选对象、时间戳、重放与CAS仍由未改的 `profile-save-attempt.ts`／runtime／storage owner负责，没有新增 pending API或持久格式。
- `apps/mobile/src/features/preferences/QuickPreferences.test.tsx`：增加三个真实组件→生产SQLite adapter回归；新开独立SQLite连接读取 canonical projection和完整持久字节，连接均在finally关闭。

规则按原始提交输入区分同次确认与显式新修改，与现有动作呈现一致；它不修改已存文本、不剥除字段、不改变完整编辑的新输入校验，也不把已知冲突、当前B或新视图当作旧A的新owner。原四项修复的草稿共享、异步提交锁、迟到完成保护和确认文案保留。

## 实际验证

证据目录：`tmp/native-cross-view-profile-confirmation-repair-20261025/`。

1. **原严格反例修前1失败，修后通过。** 本轮 `lifecycle.test.tsx` 仅把合成SQL输出目录改为本轮所有，原断言未改。`original-counter-before.log`退出1；修后 `original-counter-and-controls-after.log`为2文件10/10、退出0，包含原反例及九条既有机制。原空白A r6字节不变、写数5→5、B仍当前、错误清除且完整视图关闭；没有用零写掩盖确认失败。
2. **三个永久回归修前3失败、修后通过。** 分别覆盖原字段空白被新视图规范化、原合法一字名称被完整视图更严校验，以及真实新编辑仍触发该完整校验。最后一条在校验拒绝后撤回新编辑，原确认仍可零新增写完成，证明没有把所有未知状态都作为绕过校验的许可。见 `permanent-regressions-before.log`／`permanent-regressions-after.log`。
3. **受影响消费者3文件26/26、退出0。** `QuickPreferences`／`PreferenceWizard`／`shell-startup.integration`，见 `final-consumers.log`。没有把上述定向重跑和原作者／独审总数相加为新的完整验收。
4. **Mobile类型退出0**，见 `final-mobile-typecheck.log`。限定源码尾空白检查为0，最终28项与各自raw复制逐件一致。

真实 Screen、RuntimeRoot、editor、原attempt／store／domain及生产SQL adapter不替换；RN primitives渲染为jsdom，Expo crypto用Node原语，只有Native SQLite primitive替换为真实Node文件SQLite。全部数据为合成资料。这些结果不证明 Expo Native SQLite、手机像素／键盘／Back／生命周期、实际权限与GPS、iOS、生产或完整family。

定向命令：

```powershell
# cwd: repository root; original assertions, task-owned output copies
node tools/run-node.cjs --bin vitest vitest run .codex/work-items/sky-map-performance-2026-10-18/tmp/native-cross-view-profile-confirmation-repair-20261025/lifecycle.test.tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/native-cross-view-profile-confirmation-repair-20261025/semantics.test.tsx --root . --reporter verbose

# cwd: apps/mobile
node ../../tools/run-node.cjs --bin vitest vitest run src/features/preferences/QuickPreferences.test.tsx src/features/preferences/PreferenceWizard.test.tsx src/shell/shell-startup.integration.test.tsx --reporter verbose
node ../../tools/run-node.cjs --bin typescript tsc --noEmit
```

## 冻结与收尾

`tmp/native-cross-view-profile-confirmation-repair-20261025/source-freeze.json`：**28项，2本轮修改／26原字节不变**，SHA256：

`b7fbf6c562163418e1f0ac86cef7bdd88e291295ac4ab63a222e053c0b0417ca`

`productWrites`沿用前轮完整8文件交付写集，`modifiedThisRepair`明确只有上述两份；不能把26项control夹带为本轮改动。终态原字节在 `final-source-inputs/`，原28项另存；末核／执行与资源记录在 `end-pins.json`／`completion.json`。

自有React roots已卸载，SQLite句柄及独立读回连接已关闭，所有测试／类型命令已终态退出，末查本轮候选Node进程0；没有listener或外部在途操作。源码写入已停止，便于Root安排全新独审。

未改Root PLAN／HANDOFF／Context／Goal、状态／domain／storage、定位／Activity模块、底栏、配置或Git；未操作设备、ADB、APK构建、服务、provider、网络、VPN、Secret。Root提供的旧阴性APK与手机r2原件继续保留；新源码未编包／安装，不能借已编旧包冒本轮通过。首次许可、fresh GPS、新建完整预设静态线索及所有其它未完成义务仍归原owner；两类性能后置，OOM和完整Goal未完成。
