# Sky ruler stable native surface — independent review

2026-10-19；审查者 `review_stable_ruler_surface`。结论为 **SOURCE_REVIEW_PASSED / NATIVE_UNVERIFIED**；未发现 P1/P2，未修改生产或测试源码。此审查允许进入既有完整构建与 targeted native feedback，不认证原生修复、r7 通过或完整 Goal 完成。

## 范围与依据

完整读取[作者记录](SKY-RULER-STABLE-NATIVE-SURFACE.md)及 JSON、[r7 visibility 边界调查](NATIVE-RULER-VISIBILITY-BOUNDARY.md)、[r7 原始结果](R17-A1-R7-ENTRY-RESULT.md)及 JSON。依照当前 AGENTS、global、Mini Program / Sky Screen Contract、DESIGN 对应条款、development skill、performance-investigation 方法和 interaction skill，复核实际组件、调用方、SCSS 最终覆盖、SoftButton 与原布局/定位/settlement owners。用户明确排除无障碍新增、屏幕阅读器和大文字专项，本次不扩展这些范围。

实际读取唯一采用 HTML `5385664345158066168` 的时间控制、76px 尺区域及末尾生效的中心 `.76→1` / 180ms scale/fade，SHA 为 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`。独立查看 r7 冻结 `frames/000515380.png` 和 bound terminal `screen-8335fb95-…png`：前者恢复文案与04:30叠字，后者04:30字段对应 noon 尺。原采用 PNG 仍缺失，未生成替代，未将源码映射当完整视觉一致性。

## 已核查责任

- **原生节点与父 cn。** 非空尺分支中 ScrollView 的类型、id、class、尺寸来源和直接兄弟槽固定；admission 不再修改 ScrollView 自身 style。axis、track、guard 只改各自 opacity / pointer-events；恢复 Button 固定在 guard 内。Cancel 的 SoftButton 固定挂载；实际 SoftButton 一直返回同一 Button/Text 结构，只改 disabled、class 和自己的动作资格。preview / Play 引起的 current-state Text 增删发生在 current View 自己的 cn；tick label 的变化发生在各 tick 自己的 cn，并不删除 ScrollView 的直接兄弟。
- **实际 Taro 路径。** 对照已安装 Taro 4.2.1 的 react `getUpdatePayload` / `setProperty`、runtime `Style`、`removeChild` / `updateChildNodes` 和 root `performUpdate`：style 更新定位到该节点 st；删除子节点重发其直接父 cn，并可覆盖 cn 下的局部更新。这次消除了由恢复 Button 和 Cancel 条件删除造成的 ruler 父 cn 重发。没有声称所有祖先永远不更新、相同 sid 必保 native instance，或微信一定因 visibility 重挂载。
- **换行与迟到。** row map 的精确 `${row.at}:${index}` 身份与空供给分支不变。真实跨日/窗口替换仍有 track 子行更新，这属于必要供给变化；render 同步退休 nativeRows，旧 rows / revision / selection / lifecycle 的回执不能准入。准备→揭示的几何门换代、endpoint fresh batch、非动画隐藏定位及实际 offset 准入未改。A→B→A、迟到 node/geometry、隐藏和 resize 反例均保留。
- **输入、取消和恢复。** 未准入时固定 guard 截获尺区事件，track 不命中；准入后 guard 自身 opacity0 / pointer-events:none，恢复 Button disabled 且 handler 再核资格。合法 ScrollView 触摸、fractional preview、释放惯性、重抓与 Cancel 仍由原 owners 处理；Cancel 固定在 guard 之后的独立同级槽，源样式没有把它放到恢复盾下。隐藏 Cancel 禁用、不命中，并有 isPreviewing handler 守卫；实际 SoftButton 另守 disabled。恢复 Button 从 current-label 的行高以下开始，底部伸展且至少44Px，以 flex 居中，不再 inset0 将文字放在 current label 行。最终尺高76Px保持；这只是布局责任核对，实际像素和命中仍待 native。
- **没有引入第二机制。** 单一 `createRulerScrollPosition` writer、原生 scroll physics、精确供给、现有时间预览/Apply事务和 `.76→1` motion 均保留。没有 scrollLeft / scrollWithAnimation JSX writer、固定等待、定位轮询、事件0自动纠正、第二时钟、诊断读或新组件变体。

## 独立验证与结论边界

审查者独立运行原五文件 targeted 检查：**42 tests /42 pass /0 fail /0 skip，6405.5256ms**。包括生产组件多次 render 的 hook fixture、真实 native-position owner 的延迟 node/offset 回调、跨日/取消、admission与固定槽、native offset未到达、endpoint 失败重试、A→B→A、fractional drag、inertia / 重抓、持拖 resize、隐藏/卸载及 same-row Play 不逐帧查询。它们建立的是这些逻辑/结构/延迟回执语义；fixture 没有模拟“opacity或visibility必导致原生重置”，也不能测试 WEAPP 合成或 CSS 命中。

`git diff --check` 三文件 exit0，仅既有 CRLF→Git LF 提示。源码字节/hash 与作者记录完全相同，因此复用作者对相同三文件的 TypeScript5.9.3 exit0 及先失败后通过的结构回归，不额外重复全2668或新增测试框架。无新发现需追加反例或修码。

**原生仍未验：** 第一可辨及终态刻度是否与04:30一致；固定 guard 准入后实际不拦拖动/刻度/Cancel；失败恢复文案是否在真实字号下不叠 current label，以及真实 retry；受影响跨日、取消及重抓的目标结果。r7 失败仍为失败，当前 dirty 源码不改变 r7 冻结包。下一候选若仍失位，须沿既定一次 public offset / selected tick-axis rect / 身份与可见样式观察区分剩余边界，不能凭本审查把 visibility / sibling 重发说成唯一根因或继续相邻样式试错。

精确三文件身份、命令与证据限制见 [JSON](SKY-RULER-STABLE-NATIVE-SURFACE-REVIEW.json)。本次只读既有文件/图片、运行针对性测试并写这两份独审报告；未触设备、ADB、IDE、服务、feedback、构建、预览、Git 提交或 coordinator 文档。A、B、Terrain、H1–H8 与完整 Goal 其余义务不变。
