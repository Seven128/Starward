# 实际公开图层、时间跟踪及资源开发证据

2026-10-04；Goal active、无预算。本轮只改云观星页面一行 aria-label，以及任务验证和 Sky Context/进度。没有修改云观星之外的业务逻辑；六项 Settings/outbox 文件保持原 hash，原 BFF/watch 未重启，无提交、推送、发布、下载或重新加工。

当前完整 Sky/Sources JSX、installed Taro/React/Query Provider 与 official page instances 在同一受控 native port、Chromium 软件 WebGL 下执行。401 个实际前端输入、162 个实际 API project dependency-graph 源、31 个公共 read 文件及 r55 的 287 个选定源/六保护前后绑定。图并非完整执行分支或外部库 trace；SCSS 只绑定、没有原生合成。r55 是修标签后的严格输入检查点，内部旧 toolObserved 是 r54 历史手势结果，不是本轮时间结果。

公开地景/两类网格开关改变实际 Scene 参数和保存像素，关闭网格恢复原帧。公开星座插画关闭令原注册的活动解码句柄从 8 降至 1，恢复后冷帧像素保持。修前实际按钮说明“关闭地平坐标网格，保留地平线”与原 renderer 关闭整个辅助不符；只改为“关闭地平坐标网格与地平线”。原绘制行为未改。封存修前页面与前端 hash、修后文本及根字节路径确认生产文件只有这个 UTF-8 字符串替换。

45° 下公开 W3 开关仅验证意图与不满足资格：原 owner 要求至少 60° 且夜间，实际没有 W3 tiles 供应，银河继续供应。不能把开关点击或同图层图片当 W3 替换通过；下一路径须进入适用宽场。

公开 Canvas 点选 HR:8162，在重叠资料中选择 Alderamin，再公开跟踪。时间轴“播放 1×”按真实 Date.now 连续更新，首个暂停样本推进 1.419 秒；公开取消恢复原观测时刻和跟踪相机。再次播放、暂停并“设为观测时间”，实际 Context 提交为 2026-10-04T13:00:01.393Z。暂停、提交后及 Sources/Back 回程的同帧投影中心均为 HR:8162；回程保同 Sky 实例、提交时刻、相机和选中引用，保存 RGBA 精确。最后停止跟踪、hide/unload、Query/API clear 后活动资源均退休。只供本次两段约 1.4 秒样本，跨午夜、时间尺拖动、全部倍率、跟随校准、选中影像细化失败保粗和完整组合仍未验。

任务诊断装饰原 native image register/unregister；记录弱引用，不保存原 current 回调，并核最后所有登记都注销。原 GL create/delete、bufferData/texImage2D（含 activeTexture unit）和原文件 write/rename/unlink 成功失败 callback 观察模型/暂存状态。1796 个采样中独立最大值如下，各层不是同一时刻，不求和为物理总峰：

| 观察量 | 字节或数量 |
| --- | ---: |
| MapFS logical（含暂存） | 1,168,143 B |
| GPU texture upload model | 9,437,184 B |
| GPU buffer upload model | 56,640 B |
| 活动 decoded image handles | 8 |
| 原图 RGBA 等价值 | 13,369,344 B |
| encoded 已计量 | 1,145,719 B / 29 项 |
| encoded reserved | 703,555 B |
| encoded running | 2 |
| pending native requests（含 API） | 4 |
| clear 期间 retired encoded | 29 项 |

Source hide 时活动 native 登记、文件 lease、GL handle 为零；最终 encoded/decoded/root Query/pending/GL 活动为零，文件只留 26 B 空库存。原图等价值、驱动上传模型、暂存、数值 mask 必须分层；hide/final 的 last-frame mask 是历史帧，不能当活动 mask。弱引用/注销不证明 GC、驱动物理内存或手机峰值；GL wrapper、native callback/MapFS 仍受控，诊断开销不供帧时/吞吐结论。Scene 的 supplied image 与 surface 返回 true 可能包含回退，不单独证明图片参与绘制；本次不是日月七行星/所有影像家族完整资源账。

失败保持原状态：r1 实际只运行 grid-only，旧任务 result 泛称 time/tracking 不能认证时间，旧 GPU binding 未按 activeTexture unit 观察不能升级新模型。r2 真实公开时间轴触发验证端口缺 `.node()`，失败及 React 错误保存；r3 仅补受控 ScrollView node/命令端口，复用 r2 同 bundle，产品共享滚动 owner 未改。端口不认证 native 节点存在/几何/真实滚动。错误根路径 TypeScript 命令选择 6.x 后 TS5101 保留；使用 App 已装 5.9.3 原 tsc 命令通过，没有修改配置或依赖。

主要保存输出：[r3 result](../../../../output/playwright/cloud-sky-real-taro-layer-time-1004-r3/result.json)、[根保存读回](../../../../output/sky-real-taro-layer-time-readback-1004-r1/result.json)、[r2 failure](../../../../output/playwright/cloud-sky-real-taro-layer-time-1004-r2/failed.json)、[原页面封存](../../../../output/playwright/cloud-sky-real-taro-layer-time-1004-r1/spot-sky-page-before.tsx)、[App typecheck](../../../../output/playwright/cloud-sky-real-taro-layer-time-1004-r2/app-typecheck.txt)。r3 正常退出、浏览器及隔离 API 关闭；45 个 HTTP 正文 4,804,092 B，121 个 Scene 调用不是验收数。八份 PNG/RGBA 经根翻转/hash 读回，网格开/关及跟踪/返回实际图已查看；网格变化可见，跟踪回程保存图相同，只认证软件 Canvas 输出。根读回为自审，独立审查 MISSING。

下一执行只由 PLAN 控制。WEAPP/WXML 已知失败、手机/Android/iOS/新版月面、全家族物理临时峰、完整交互、B 背景接缝绿晕/弱结构/配准/来源出版、空 Prepared、保留引用和全产品 200DAU 成本容量继续开放。
