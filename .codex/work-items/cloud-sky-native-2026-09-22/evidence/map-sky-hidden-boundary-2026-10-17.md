# Map 隐藏边界与合并前依赖核查

**用户后续决定：** “那看起来只有第一项能做，但是第一项还是等代码合并之后统一做吧”。下述Map隐藏边界P2保留未修复，实施明确延至两分支合并后；本分支当前不提前修改。届时需核对合并后的实际Map生命周期，不能直接套用本次输入的补丁建议。本记录保留发现时态与原反证，不将延期改为通过或继续请求本轮实现许可。

2026-10-17。用户在讨论 CDN、合并后包体优化及 Map 进入 Sky 是否卸载后，询问另一分支继续开发期间还有哪些有用工作。本次只做该新问题的有界源码核查及一次独立软件反证，不改变生产代码、唯一 PLAN 或原 33 项；不把此前已经充分验证的菜单、性能或失效 IDE 路径再跑一遍。

工作区为 `E:/dev/worktrees/Starward/remote-main-20260908`，分支 `codex/remote-main-20260908`。当前候选仍为 r378；既有 Goal 实际读回 `blocked`、无预算。当前范围仅有 Sky 入口 Map 转场例外，尚未扩为 Map 隐藏生命周期修改；以下窄修复是建议，不是已实施方案。读写审批及设备、云端条件沿原 REQUIREMENTS/CONTINUE。

## 独立审查结果

新只读代理 `/root/map_sky_hidden_boundary_review` 沿用户持续授权审查，已完成并结束。本次审查只覆盖隐藏边界及实际依赖，不冒完整 Goal 或原生性能审查。

**P2：隐藏后新收到的区域结束事件仍可改写公共 Context。**

- `apps/wechat-miniapp/src/pages/map/index.tsx:2109` 的原生区域事件入口检查 `nativeMap.isCurrent()` 和编辑器退出阶段，未检查页面活动状态。
- `native-map-recovery.ts:13` 的 `isCurrent` 保护原生实例代际和卸载，不包含页面隐藏。
- `index.tsx:1408` 的 `onRegionChange` 会为有效用户 drag/scale end 创建新位置 intent 和 250 ms timer；其异步守卫及 `resolveMapPoint` 的守卫（约 949 行）也没有页面活动检查。
- 回执通过后 `resolveMapPoint` 写入共享 `observationContext`，并离开先前选择地点。若事件在 Sky 已打开后才送达，旧地图可以把当前正式地点换为地图中心，影响 Sky 会话。

审查者用一次不落盘命令提取并执行实际生产 `useDidHide`、`onRegionChange`、`resolveMapPoint` 和 `userMapRegionEnd`，仅控制计时器与网络等外部端口。原始结果摘要：

| 受控输入顺序 | 最终可见性 | 位置解析请求 | viewport 写入 | Context 写入 | 清选点 |
| --- | --- | ---: | ---: | ---: | ---: |
| 区域结束事件 → hide → 执行剩余定时任务 | 隐藏 | 0 | 0 | 0 | 0 |
| hide → 新投递有效 drag/scale end → 执行定时任务并完成解析 | 隐藏 | 1 | 1 | 1 | 1 |

这证明生产回调在该事件顺序下存在软件处理缺口。没有启动原生运行时或手机；真实平台是否会投递该时序、发生频率、是否已造成用户可见故障均未测。未保存独立可重放脚本；复现入口和输出来自本次审查，不能将其写成整页或设备通过。主代理另行核对了实际 JSX、位置 intent、请求前后守卫及最终写入路径，与报告一致。

建议复用现位置 intent，加上由 show/hide 同步更新的活动状态检查，覆盖原生交互入口、延迟回调和异步回执；返回仍复用原地图相机与状态。仅在获得对应 Map 生命周期范围后实施，不用新的 Sky 专用旁路绕过 Map owner。现 `map-page-lifecycle.test.ts` 覆盖 hide 清理，`map-point-intent.test.ts` 覆盖旧请求和新选择竞争；若实施，只补该新增顺序及必要恢复回归，不扩大为一套新的性能验收。

## 已有暂停与未测成本

- hide 已取消原有位置 timer/intent、停止面板弹簧与拖动；Map/bootstrap/Sky forecast 自动触发按可见性关闭，forecast 有效期 timer 清理；terrain 下载取消，原生叠加层执行 suspend/remove。
- 原生 `<Map>`、Zustand 字段订阅、Query observer/cache 和页面局部状态保留。Map 的 `spotOverview` 与 Sky 正式点 overview 共用 Query key，尚无独立多余请求的证据。`enabled: false` 不等于取消全部在途请求，不能以全局取消破坏共享消费者。
- Sky 播放预览为局部时间状态，明确提交公共时间和切换主题才更新相关全局字段。主要地图 marker/几何派生已有 memo；没有证据支持“地图跟随 Sky 每帧重算”。
- 原生地图隐藏后的 CPU、GPU、定位流、内存驻留及卸载后返回代价仍需实际设备对照。本次不预定卸载地图，也不声称修一个守卫就提高帧率。

## 合并前已经可确定的依赖

只读 TypeScript import 可达性核查解析了 177 个主包入口可达应用源码（并非 emitted 模块重量或运行时测量）：

- `app.tsx → sky-image-file-session.ts`：旧原生临时文件清理。
- `app.tsx → sky-public-image-runtime.ts → sky-public-image-cache.ts`：公共图片缓存初始化。
- `app.tsx → api-client.ts → sky-public-image-runtime.ts`：全局临时缓存清理在 await 前建立图片代次隔离，不能只移动启动引用而遗漏此消费者。
- `app.tsx → api-client.ts → sky-report-catalog.ts`、`sky-target-instant-response.ts`：共有 API 入口引用。Map 本身也使用 Sky forecast，文件名含 Sky 不是全部可移出的证据，须按真实调用者分离。

实际 r378 `app.js` 存在缓存初始化/旧文件清理标识，主包 `common.js` 存在公共图片缓存目录及资源路由校验；`sky/detail/index.js` 和 `sky/sub-vendors.js` 已在 Sky 分包。当前安装的 Taro webpack5-runner 4.2.1 默认 `optimizeMainPackage.enable = true`，所以“开启分包优化开关”不是当前待做修复。

此前已读回 r378：main 2,079,989 B，sky 1,494,144 B；主包图片 914,071 B，其中底部 Tab 96,867 B、其他图片 817,204 B。这是本地未压缩文件口径，其他图片数量也不是保证可迁出的字节数。没有读取另一开发分支或执行合并，不把两份主包直接相加或声称已测到合并体积。

包体实现仍宜基于合并后的最终依赖图集中处理。本次明确了合并时的检查入口，未修改全局打包或缓存架构。

## 本次输入身份

| 输入 | SHA256 |
| --- | --- |
| `pages/map/index.tsx` | `fad4783a85c4b0ecc94df458f9e054f279fd10bd81e91317f15fbaed344bddff` |
| `pages/map/native-map-recovery.ts` | `2830d6403c97d10e8b65a2b7e60bbbf6814214c2aa18faacf538ed62a299c184` |
| `pages/map/map-region-event.ts` | `5db332ea28878ef6818fc9f16d2c4751674bc2baf4bc5962688f93a8784a4564` |
| `hooks/use-resource-query.ts` | `f1db809073ded04de84210b9468c8e52c6598bb988bcbb29d13bf22580d615a9` |
| `hooks/use-forecast-query.ts` | `491816e585e865dfde580437fe79592f088e5e7c6cdbec4ed077bb738f3d1e4c` |
| `app.tsx` | `b9c4b46467d97bffefa29a605d3a91e0f32ca7fed2f636a5e3945d2c17037e9b` |
| `services/api-client.ts` | `64f410e6a8312e38bcb1f004d74dd4dae75fd95810556a76e1d882b6748f6253` |
| `services/sky-public-image-runtime.ts` | `1ac10536a6446a2062f2720f3c30096950fcf6a44e5b35a7c116d4ab866e4b33` |
| `config/index.ts` | `ca6ecd278a24740e4457346247a622d203e307381e34e59e8b5ec87ce0b7a2d3` |

源码相对路径均从 `apps/wechat-miniapp/src/` 起算，`config/index.ts` 从应用根起算。适用已安装 Query 为 5.90.21。当前未改变这些输入，未生成新候选包；原 33 项、UI06、冻结图质/来源及云端/设备缺证保持。
