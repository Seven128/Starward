# Sky 跨窗口等待连续性独立审查

2026-10-19；审查者 `review_crossday_pending_fix`，独立于实现者。结论：**源码修复在本次范围内通过独审，未发现 P1/P2 或其他需返修问题；真机修复确认仍未完成。** 基线 `3818b44009d53d4b27cb16a95904c42ed3723af7`，保留 `codex/remote-main-20260908` 及其它未提交成果。

审查范围是 [修复说明](SKY-TIME-PENDING-CONTINUITY-FIX.md)、其 JSON 和其中列出的六份生产／既有 fixture 文件。六份实际 SHA-256 均与作者记录一致。控制依据是 Screen Contract 的等待／失败保有效已绘天空、PLAN R17 的同一时间／原生 accepted writer／消费者责任，以及开发 skill 的性能方法。复用 [r8 已独审的实际交互证据](R17-A1-R8-TIME-INTERACTION-RESULT.md)：19日10:00白昼切前一日10:00，供给等待时曾退回04:30夜景。本次没有重录、操作设备或将旧包画面当作修复后的结果。

实际代码检查结果：

- `sky-time-presentation.ts:86` 的顺序为当前可用请求 → 预览中的当前有效 accepted 输入 → committed。取消后 `requestedAt === committedAt`，旧 accepted 预览不能胜出；原窗口不支持 committed 时仍由原报告恢复，不借迟到外窗改写时间。
- `spot-sky-page.tsx:2154` 的 scope 票据随报告、Context/time binding、committed、mode、原生代、可见性／资源资格和 Canvas 失败改变。复用检查还核对当前 native generation、报告 Context、frameAt 与输入 row.at。原有 `invalidated`／`failed`／`suspended` 继续清空 accepted 槽；A→B→A 的已失效输入不能凭值相同复活。
- `:1934` 沿原有 accepted publication 保存输入和 scope；`:2001` 的实际 `sameScene` 比较也包含二者。没有另一个时间 writer、历史帧集合、计时器或请求调度器。新增引用只保存当前帧所用的原报告、模型与必要呈现输入，不以诊断计数或新准备冒充接受。
- `:2190` 至 `:2196` 将独立取得的 fine-target 供给合入同一待绘输入，再交给原生接受者。等待时 fine-target 绑定因新请求未 ready 而为空，已有 accepted 目标随输入保留；不会重新把同一目标合并链变成逐帧历史。BSC/SAO、太阳系、光学影像、星座／坐标网格、地景着色及 draw 继续消费同一几何报告和实际 row.at。位置与已绘位置的模型算法身份分别取其对应呈现输入。
- `:2166` 只从 `requestedTimePresentation` 判断新请求的 geometry ready；`:2994` 的状态仍结合真实 accepted 时刻。保旧天空不会把等待或失败写成新请求成功。公共 Apply guard／事务本次未更改，不能由这项修复声称 Apply 或持久化已验收。

独立复跑作者明确列出的 12 个受影响测试文件，**133/133 通过**；Miniapp TypeScript **5.9.3 `--noEmit` 通过**；六文件 `git diff --check` 通过，只有既有 CRLF 规范化提示。新增 fixture 执行实际页面的选择表达式、draw 输入及五类实际 timed resource 参数，覆盖 pending／failed、fine-target 保留、供给接管但未 accepted、取消与迟到结果、报告／Context／模式／原生／隐藏失效及 A→B→A。未弱化原行为断言。

为核对 fixture 直接构造 accepted 帧之外的新接线，另在内存中提取并执行页面现有 `sameScene` 表达式：相同当前输入可接受；只替换输入、scope、frameAt 或 native generation 均被拒绝，共五项断言通过。这只补充软件接受边界，不声称 native pixels、React 调度或设备时延。

没有返修建议。交付前保留两项已有依赖：root 适配 finite task builder 的 `same_time_memo` 锚至 `requestedTimePresentation`，计量仍只计真实新准备；随后完整构建并用同候选确认一次真实跨日等待和取消。完整 A/B、Apply／持久化及其它 Goal 范围不由本审查关闭。现场、服务、配对、账号、N05、R6、gen26 均未触碰；未修改生产、协调文档或 Git 历史。

机器记录：[SKY-TIME-PENDING-CONTINUITY-REVIEW.json](SKY-TIME-PENDING-CONTINUITY-REVIEW.json)。
