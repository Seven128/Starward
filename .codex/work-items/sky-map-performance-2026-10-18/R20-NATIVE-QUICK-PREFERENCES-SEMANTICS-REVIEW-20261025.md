# Native 快捷/完整偏好语义独审

2026-10-25，非作者独立审查。结论：**当前冻结源仍有一项已证 P2 显示含义错误，不能按本范围无缺陷通过。** 两条真实消费者保存/重建机制通过，未发现这两条链丢失完整字段。Root 已收到最小反例；本报告不实施修复，也不等待或复用本审阅者追加审查。

## 范围与输入

按当前 AGENTS、`project_context/global.md` 默认入口、architecture 与 Native preference lifecycle owner、Mobile/core-journeys/verification、唯一 PLAN/HANDOFF 的 Native quick/full 责任、Source Plan `OUT mobile-shell-and-preferences`、Native DESIGN、最新 `uiux_design` skill/Native mapping/wording，以及既有 v2/CAS/Web CAS 和本轮作者报告核对。沿 Quick/Wizard → `use-profile-editor`/RHF/各自 resolver → 原 `profile-save-attempt` → shell-store → preferences-runtime → domain runtime/state → 生产 Expo SQLite adapter 追踪。未重写已完成基础，也未重复配对审阅者的 dirty/unknown/conflict 全套。

绑定作者 [source-freeze.json](tmp/native-quick-preferences-projection-20261025/source-freeze.json)：SHA256 `03ef7f3e7c84da39badb885dec51fa5b1122df7e1641960aad929dc58efcee4e`，28 个输入。开始与结束逐件长度/SHA 核对均零错配；末核 UTC `2026-10-24T22:35:59.1913300Z`，原件 [end-pins.json](tmp/review-quick-preference-semantics-20261025/end-pins.json)。此 manifest 不冒充完整构建输入。

实际查看 Root 私有旧包证据目录 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/native-functional-ui-53960d39/` 中保存后 `screen-a6aff78d-1ca4-45ac-a17d-55518fca9338.png` 与冷启后 `screen-f0fc0b74-4288-4136-a695-6fa60487ec55.png`：前者 r2/行星/不步行，后者仍 r2 而银河/800m。旧 APK SHA 为作者/Root 提供的 `53960d39ea3d5e865306699e49497cd74919b996efeb6ab96a635079383cce1e`。未复制像素或私人数据。图片可证旧消费者现象；本审阅者没有操作手机或读取其数据库，不能据此声称手机存储丢失。

## 已证 P2：冷启说明把已保存的高级条件称为“不限制”

位置：`apps/mobile/src/shell/MobileShellScreen.tsx:521`。`recommendationState` 冷启初值为 ready，hydration 恢复完整 profile 不把此值改为 stale；正常首次进入当前 Screen 会显示：

> 未选择的完整字段保持“不限制”，不会静默套用样例默认值。

独立反例从原 facade 保存合法 `base` r7，含 `directAccessRequired=true`、停车/安全照明硬要求、出行/设备/类型等完整字段，再正常装载真实 RuntimeRoot/Screen。新的数据库连接直接读取生产表的 canonical current profile，完整条件仍在；实际渲染的上述 Text 却将快捷区没编辑的完整条件描述成不限制。它会误导用户判断哪些约束用于推荐，违反此次修复“快捷只改变代表字段且完整含义如实显示”的要求。

最小修复方向是默认说明明确保留当前完整字段，并由完整入口修改；不要把持久化改成 unrestricted 来迁就文字。正确期望的失败保留在 [final-run.json](tmp/review-quick-preference-semantics-20261025/final-run.json)，不把它写成预期失败通过。

## 独立实际验证

自有 [semantics.test.tsx](tmp/review-quick-preference-semantics-20261025/semantics.test.tsx) 复用作者已经建立的 Native primitive/运行边界，案例及预期独立选取；不复写作者 19 项矩阵。真实生产 Screen、RuntimeRoot、store、schema/domain、保存/CAS SQL 不替换；Expo SQLite 的 Native 原语改用真实 Node 文件 SQLite，crypto 改用 Node crypto，RN primitives 用 jsdom 展示。`rawCurrent()` 新开独立数据库连接，直接读取 `preference_runtime_state`，不是仅查 store/facade 返回值。

| 独立机制 | 实际结果 |
| --- | --- |
| 合法一字名称“家”，完整非快捷字段，未代表的空间站+日出/日落联合摄影、1.237km，仅快捷改步行 0，保存再卸载 UI/关闭连接/重建 modules-runtime-store/读回 | **通过**。r7→r8，id/name/createdAt、类型、意愿、出发地/城市、全部其它出行字段/开关、设施、设备、焦段与多目标完整相等；仅步行、revision、updatedAt 变化。初始不取第一目标或最近档，冷读准确显示0。 |
| 真实完整 Wizard 入口将驾车距离0改3.125，保存后返回 Quick，仅选流星，再保存和冷重建 | **通过**。r7→r8→r9；直接 SQL 验完整 identity 与非编辑字段保真，walking=null保持未限制，不变成0/.8/2；冷读流星正确。 |
| 已编辑 `base` 冷hydration后的完整条件说明 | **失败**，上述 P2。SQL 保留约束，实际 Text 错误。 |

最终定向命令：

```powershell
node tools/run-node.cjs --bin vitest vitest run --root D:/dev/Starward/.codex/work-items/sky-map-performance-2026-10-18/tmp/review-quick-preference-semantics-20261025 semantics.test.tsx --reporter=json --outputFile=D:/dev/Starward/.codex/work-items/sky-map-performance-2026-10-18/tmp/review-quick-preference-semantics-20261025/final-run.json
```

结果 **2 passed / 1 failed，exit 1**。保存与读取实际值在 [actual-effects.json](tmp/review-quick-preference-semantics-20261025/actual-effects.json)，日志 [final-run.log](tmp/review-quick-preference-semantics-20261025/final-run.log)，合成 SQLite 文件保留在同目录 `sql-*`。首轮 Wizard case 因本审阅 fixture 使用不存在的“保存预设”按钮名而失败；改为实际“保存并设为当前预设”后该机制单独1/1及最终整组通过。它是已纠正的测试定位错误，不是产品缺陷；首轮实际值保留 [first-actual-effects.json](tmp/review-quick-preference-semantics-20261025/first-actual-effects.json)。

另外只读注意到“新建完整预设”当前回调仍仅开启 activeProfile 的 Wizard（Screen 235/600/607附近）；是否可正常新建多套尚未通过实际入口验证，不在此报告冒作新已证 P2。依 Root 收口指令不继续扩测，作为已有完整消费者的待判别提示返回原 owner。

## 结束与保留义务

所有本测试 React roots 已卸载、SQLite 句柄（含独立读回连接）已关闭、Node 命令均终态退出；未创建网络 listener。仅写本报告和自有 ignored tmp。未执行 Git、ADB、APK/build、IDE、设备、provider/API、网络、服务或 Secret 操作，未改产品、合同、配置、Context、Root docs/Goal。全部冻结输入末核不变。

当前 P2 未修；修复需要新的冻结与新独审。此受控链不能证明 Expo Native SQLite、手机正常/冷启完整 UI 与布局、OS许可、Native生命周期、不同版本兼容、完整family、生产或整个 Goal 通过。新 APK/实际手机验证仍属 Root；两类性能及 OOM 后置但未关闭，全部其它 PLAN/Goal 未完成义务保留。
