# 原生中文搜索、跟踪、预览取消（2026-10-09）

Goal active、无预算、未完成；复用现指定分支与 warm 8791 内存测试服务/官方 DevTools，无本模块业务代码、构建或新服务变化。33项原值、原生可见组合 FAILED、设备/物理/独审缺口保持。

同一公开列表 Input 输入“织女星”，真实查询经历 pending 后得到唯一 Vega / HR7001，资料中文身份及19:00方位320.6°/高度67.5°可读。点“跟踪天体”后定位中心 `(195.1999969482422,421.99999999999983)`，45°视场，选择十字与“已选择跟踪Vega”语义来自当前已绘场景。未注入 store、调用 handler 或 mock wx API。

公开时间面板点“播放1×”→“暂停”：实际已绘时刻 `2026-10-09T11:00:16.142Z`，比提交时刻前进16.142秒；与取消后的相机 forward 比较，方向实移0.052554709300712286°，Vega仍居中，其他标签坐标变化。预览截图天空38438像素变化，最大通道138，证明操作有实际绘制效果。

点公开“取消”后，时刻恢复 `2026-10-09T11:00:00.000Z`；Vega/天琴座/Eltanin/M57全部公开标签样式坐标精确恢复。479×1035截图顶部102行之外446907天空像素RGBA差0、最大通道0、SHA256 `696c70bfd76016878e67e303b3f8545481083fa8f8890ca1ffd1533264c5dfd2`。原/native原始时间字符串有 `...11:00:00Z` 与 `...11:00:00.000Z` 两种形式，按同一瞬间/公开view.frameAt比较，未伪造字符串相等。

服务 GET `/v2/observation-contexts/ctx%3Ada84136d-c910-4599-b93b-4f6ffe7937e0` 实际200/FRESH，仍原Context/revision3/selectedAtUtc19:00。预览没有提交；这是当前内存状态读回，不证明持久恢复/真实公开地点/容量或真实设备跟踪。

原始回执与截图在 `output/cloud-sky-native-session-2026-10-09`：搜索结果 `automation_evaluate-1791514194547.json`；资料 `1791514211113`；初始跟踪 `1791514225017`；活动预览 `1791514252326`；暂停 `1791514268458`；取消 `1791514286439`；三个 `vega-track-*.png` 已实际查看。`search-track-time-pixels.json` 保首次像素epoch/service PENDING；`search-track-time-context.json` 和 `search-track-time-readback.json` 保存后来真实服务核验，不覆盖旧pending。

控件、名字和十字仍未在官方星空截图中可见，维持 FAILED_DEVTOOLS_COMPOSITION；SDK命中/节点/像素均不冒正常可见交互通过。原Canvas/clone错误、图质、真实手机和独审缺口保持。一次官方network导出不可解析仍UNKNOWN，console空不抹旧失败。随后原生资源责任发现清单200但公共缓存空，隔离16B原生读回是跨realm真ArrayBuffer/instanceof false；下一修并实测当前二进制边界，不重跑本段或Sources闭合路径。
