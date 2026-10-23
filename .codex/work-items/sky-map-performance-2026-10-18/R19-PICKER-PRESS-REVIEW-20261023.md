# R19 原生 Picker 按压独立审查（2026-10-23）

审查结论：当前源码与采用合同核对，未发现本批新增的 confirmed P1/P2。此结论覆盖公共按压 helper 和 5 个消费者文件的 8 处 Picker 声明，不认证原生 Picker 的实际打开、取消或按压表现，不关闭 R19。

## 依据与方法

由独立审查代理读取仓库 AGENTS、`project_context/global.md`、architecture、当前 `uiux_design` / `starward-miniapp-development` Skill，以及 shared-state-and-recovery“公共按压与来源入口”、DESIGN 小程序 §5、§7.1、§8 和 [已有公共按压记录](R19-SHARED-PRESS-IMPLEMENTATION-20261022.md)。未扩大无障碍范围。

实际查看现有采用包 `implementation-input-20261022/review-images/press.png`，读取 ADOPTION 与 `source/candidate-preserved/review.mjs` 的公共按压实现。其约束是立即反馈、80ms 按下 / 140ms 释放、brightness .96、文字/布局/命中区不缩、禁用无假按压，Picker 的选择、取消和数据语义仍由原生控件及原业务 owner 保有。本审查未更新或重新选择设计资源。

审查当前 6 个生产 TSX、公共 SCSS、相关消费者样式和安装的 Taro View 类型；执行一次最小相关测试及只读 AST 清单。没有可独立恢复的本批补丁前 TSX 快照；HEAD 又不包含此前本轮 UI，故没有把整个 dirty diff 归给本批，也不声称逐字节的前后差分证明。实现方说明的 tag/import/disabled 补丁范围，仅作为范围提示，结论来自当前源码与上述约束的核对。

## 共享 owner 与 Button 回归核对

- `pressFeedback` 只组合 className、hoverClass 和原生 hover 的 0/0 时间。它没有 hooks、状态、计时器、测量或事件注册。
- SharedButton 仍只输出一个 NativeButton；disabled、loading、aria-busy 合并为 unavailable，原 click 在不可用时被拦截，touch/cancel/long-press/platform ports 继续透传。`surface/icon/none`、`self/child/before` 与 hoverClass="none" 分支仍在同一 owner。
- PickerTrigger 只输出一个 NativeView。原 children、className、style、普通属性和原生事件经 rest props 保留；它不添加 Button、点击命令或手势 owner。仅公共 hover 与反馈类由该适配器接管，disabled 是反馈输入而不被误当作 View 的原生禁用能力。
- 禁用时 PickerTrigger 移除反馈类并令 hoverClass="none"，父级 Picker 同时保持真正的 disabled。即便旧 native hover 类尚待平台清理，也不再具备本适配器的 face/base 类组合来显示这套按压效果；平台实际复位时序仍待目标观察。
- 公共 SCSS 没有改变宽高、display、padding、margin、border 几何或 hit surface transform；本批 Picker 使用 surface/self，仅采用 filter、内阴影及 transition。原消费者的 44Px/54Px 最小高度、flex、文字与 chevron 类仍保留。源码结构与样式不能替代原生几何测量。

## 全部 Picker 声明核对

只读全生产 TSX 搜索得到以下 8 处 `<Picker>`；AST 再确认各自恰有一个 PickerTrigger 触发面、父/子 disabled 表达式相同、原生 onChange 仍在 Picker 上。

| 消费者 | 声明位置 | 原生模式与禁用 owner | 内容及数据职责 |
| --- | --- | --- | --- |
| achievement/index.tsx | 62 | selector；`!years.length` | 年份 range/index、统计年与原 setYear 保留 |
| contribution-form-sections.tsx | 340 | 复用 date/time；`disabled` | DateTimeField 的 value/onChange 与 field/focus-ring 保留 |
| plan-editor-page.tsx | 1478 | selector；`formReadOnly` | 正式地点 range/index、retainDraft/选点/清错保留 |
| plan-editor-page.tsx | 1519、1530 | date/time；`formReadOnly` | 观测起始日期/时刻、原 retainDraft 和清错保留 |
| plan-timing-fields.tsx | 40、45 | date/time；`disabled` | 结束/出发共用行，按原 dateKey/timeKey 写 PlanTiming |
| plan-travel-fields.tsx | 74 | selector；`disabled` | modes/index、交通方式 label 和原 onChange 保留 |

DateTimeField 与 PlanTimeRow 会被多次复用；8 是声明数，不能当作运行时触发面的总数。触发面没有取得表单持久化、账户、离开守卫、选点或异步请求的所有权。

## 本审查实际检查

`node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/components/shared-button-press.test.ts`：**4/4 通过**，0 失败，约 2142.5408ms。执行当前生产 facade，覆盖原 Button 命令/不可用态、touch/取消/long-press/platform 透传、scrim，以及 Picker 单一 NativeView、同一内容/style/touch port/公共 hover、禁用撤下反馈。

有界 AST 检查：**8/8 声明符合单一触发面及相同父/子禁用条件**。首次将审查脚本经 stdin 传入项目 Node wrapper，被 wrapper 以“需 script 或 node options”拒绝，未执行检查；随后改为其支持的 `-e` 一次完成，exit 0。这是审查命令入口错误，不是产品失败。

实现方 [Picker 实施记录](R19-PICKER-PRESS-IMPLEMENTATION-20261023.md) 的 26/26 和 TypeScript exit 0 是集成方已有开发证据；本审查未重复全量、类型检查或扩大平台矩阵。

审查时 6 个生产文件 SHA-256：

| 文件（相对 apps/wechat-miniapp/src） | SHA-256 |
| --- | --- |
| components/shared-button-press.tsx | `96b83de867161a473c86b0b7e8eb87000f81d203bcc5ebb9ff83f015e26d70f7` |
| content/achievement/index.tsx | `41671b8870584dd105455ac8622ff7ba2d2450b534735b9d7ba1a38c52340df4` |
| content/contribution/contribution-form-sections.tsx | `14f0353ad6e49d361558973a467aa8f4fc8dd84a2c5c8b0ef15683c4aa795942` |
| content/plan/detail/plan-editor-page.tsx | `91fc557e4d6e2d7de39cf0e56e972318dc9bd158d855730328dc87fa7feb50ff` |
| content/plan/detail/plan-timing-fields.tsx | `1df2db2518ae227ec8b2985c3153e07e27a420db23fb1c8dd4c729aedecfa542` |
| content/plan/detail/plan-travel-fields.tsx | `eacb6c782d67fa56d7c92b0fdb3952f63e53b152c6e714db5a4cda1050182862` |

## 原生与候选边界

新 Picker 源码尚未完整构建或送手机。gen8 二维码 ready、未绑定，且该冻结 prepared/dist 不含这批源码；旧 gen3 按压片段也不是此新 View facade 的原生通过证据。

未来包含本批源码的正常候选仍须核对原生 Picker 打开/选择/取消、禁用切换、滑出/滚动接管及按压复位，并实际比较反馈、文字与命中区域。安装的 View 类型支持 hoverClass/start/stay，仅能证明 API 映射存在；Node 输出不能证明平台取消行为、80/140ms 物理时序或主题下实际画面。沿根任务已有候选和按压验收安排合并观察，无新增专项矩阵。

本子任务仅新增本证据文件；未修改生产/测试/PLAN/HANDOFF/Context，未执行全量、构建、预览、设备、服务、网络、Git、上传或原件处理。
