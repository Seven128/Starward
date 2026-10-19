# Sky ruler stable native surface

2026-10-19；`stabilize_native_ruler_surface`；基于 `c6bb28bc55b8b3e2ed2e32090f05512e233c4253` 的有界源码修复，**SOURCE_CHECKS_PASSED / NATIVE_UNVERIFIED / INDEPENDENT_REVIEW_PENDING**。没有构建、预览或设备操作，也不将此修复写为 r7 手机通过。

## 已知边界与此次改动

沿 [r7 原始结果](R17-A1-R7-ENTRY-RESULT.md)和 [native visibility 调查](NATIVE-RULER-VISIBILITY-BOUNDARY.md)执行既定稳定节点方向：r7 已完成 endpoint 后 fresh geometry、隐藏状态 `animated:false` 定位及正确 actual offset 准入，但首次可辨尺窗和终图仍为 noon，字段为04:30。准入时原 JSX 同时切换 ScrollView 本体 visibility、卸载位置恢复 Button；预览取消 SoftButton 也是包含 ScrollView 的条件兄弟。Taro sibling 删除会重新 hydrate 父 `cn` 是源码事实；这些更新是否导致本次微信 native 失位仍 UNKNOWN。

- `OrientationTimeRuler` 的 enhanced ScrollView 本体不再携带 admission style。其挂载、id、class、尺寸、既有 scroll props 和唯一 `createRulerScrollPosition` writer 保持；没有新增 `scrollLeft`、第二 writer、定位轮询、固定等待或替换组件。
- 同一固定 track 与 axis 用 opacity 表达刻度准入，track 保持布局且未准入时不命中。固定透明 position guard 通过既有 `catchMove`/停止冒泡屏蔽未准入尺区域输入；准入后自身 opacity0 / pointer-events:none，不从父节点删除。
- 恢复 Button 始终留在 guard 内，只改变自身 disabled/文本。它从 `var(--type-body-secondary-line)` 以下至尺底部占位，以 flex 居中，保留44Px最小命中；不再把定位文案铺到 current-label 所在行。准入或交互锁定时，即使直接调用旧 handler 也不能发起 retry。
- Cancel SoftButton 始终留在原同级槽。非预览时仅自身隐藏、禁用、停止命中，handler 再次核预览资格；不因 preview/cancel 增删包含 ScrollView 的父 `cn`。未改变实际取消所归属的时间 owner。

原始行身份、精确供给、fresh endpoint 测量、准备→揭示换代、单原生非动画入场、手势/inertia/重抓、resize 持拖投影、跨日窗口与取消、显式 retry、六字段与 Apply 事务均保原责任。空供给的既有 truthful empty 分支未改，固定结构承诺适用于当前非空尺 owner。

## 资源与实际输出

已读 Sky Screen Contract 当前修订、开发及 performance-investigation 方法、interaction skill、DESIGN 的相关独立小程序合同和唯一采用 HTML `5385664345158066168`。该 HTML SHA `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`，末尾中心 `.76→1` / 180ms scale+fade 规则、76px尺区域和六字段语义保持，`sky-overlay-motion` 未改。当前生产 viewport/track 的76Px尺寸及原 cadence 保持，仍由同批 native axis/tick/offset 投影建立实际单位。

实际查看 r7 冻结 frame8 `frames/000515380.png`（恢复文案与04:30叠字）和 bound terminal `screen-8335fb95-…png`（04:30字段/noon尺）。原采用 `adopted-stitch-render.png` 持续缺失，未重新生成或冒充查看；此次没有新 rendered output，不认证完整资源还原或修复后的物理位置。

## 检查与边界

新增一个结构回归先在未改生产源码上运行，真实失败于本体 `style.visibility:hidden`；修复后通过。它在实际组件的既有有状态 fixture 中检查准入、preview切换、resize失败及显式retry期间 ScrollView 自身 style/class、固定 sibling slots、track/axis准入、guard命中退役及隐藏 recovery/Cancel 不发动作。未在 fixture 中虚构“visibility必使native重置”的平台行为。

- 原窗口/跨日/取消/几何/settlement/native-position 五文件：**42 tests /42 pass /0 fail /0 skip**，约10.206s。
- 绑定 miniapp `typescript@5.9.3` 的 `tsc --noEmit -p apps/wechat-miniapp/tsconfig.json`：exit0，无诊断。
- 三个改动文件 `git diff --check`：exit0；仅既有 working-copy CRLF→Git LF 提示。
- 没有重复全2668、没有增加测试框架或新的诊断采集。既有 v2 注入的唯一 writer / props / gesture anchors 所在代码未改；完整候选由 root 负责构建核验。

未增加首次偏离 selector batch：现有源码与像素已足以执行这一个明确稳定边界，不借新工具扩大范围。首次可见与终态的真实对齐、恢复文案不叠字、准入后实际可拖/取消、必要跨日恢复仍由下一完整候选的 targeted native feedback 建立。若稳定候选仍失位，不能继续称 visibility 或 sibling 重发是唯一原因；下一只读观察沿既定 public offset / selected tick-axis rect / id,dataset / 当前 scroll-track-surface style 批次，不据迟到0事件自行重定位。

源码精确 bytes/hash 与命令见 [JSON](SKY-RULER-STABLE-NATIVE-SURFACE.json)。独审、候选构建与实际设备结果未完成；A、B、Terrain、H1–H8 和全部 Goal 剩余义务保持。未编辑 PLAN/HANDOFF/preparation/builder/候选，未 commit、切分支或触动8791/N05/R6/gen26/pairing/VPN。
