# R20 Map 故障目标观察的现有入口核对

2026-10-24，限定只读准备。root 独占构建、IDE、手机、服务及网络；本作者只读取现行规则/源码，写本文，没有操作这些资源或修改生产、正式测试、Context、PLAN、HANDOFF、INDEX、Git。当前候选身份归 root 的 [Map 证据](R20-MAP-FAULT-SESSION-20261024.md)，本文没有新构建或手机结果。

## 结论

**现有仓库入口不能直接提供一条不依赖业务 API 的、非空产品 Map 栅格故障→重建手机诊断。** 这是当前 Harness/数据入口的缺口，不是微信原生 Map 永久不支持故障观察的结论。

源码责任的 never-callback 修复及其独审直接复用；普通手机 Map→My→Map 也不重做。仍欠实际 native fault→唯一节点替换→恢复输出，以及独立的原生资源退休资格。第一项源码通过不能关闭后两项。

root 已据本次边界决定：**本轮不新建 task-shadow/offline-provider 或新的 fixture 平台**。为这一次观察新增整段离线数据和文件适配不相称。恢复真实 API/资源通路后，再评估最小一次 callback 控制；原 Goal/唯一 PLAN 的目标义务继续保留。

## 实际查到的能力边界

| 既有入口 | 实际职责 | 对本问题的限制 |
| --- | --- | --- |
| `tools/miniapp/device-feedback-fixture.mjs` 及 `device-feedback-fixture-content.mjs` | 临时独立 A/B 页面、一个按钮及输入终态；明确 `productBuildReferenced:false` | 不加载产品 Map、raster hook/coordinator 或 native session，不能拿它的推送成功认证本问题 |
| `MINIAPP_DEVELOPMENT_FIXTURE_MODE` | 当前调用用于 TRIAL 光学/媒体可呈现资格；配置可选择固定 fixture 输出目录 | 不内置 API 响应、不提供离线 Map metadata/本地栅格 seed，不会自动令现 Map 有非空覆盖 |
| `app.tsx::__STARWARD_MINIAPP_ACCEPTANCE__` | reset/resetNetwork/resetPreservingIdentity、Context/Sky/偏好只读检查 | 没有 native Map 故障、文件 seed、丢 callback 或 callback 放行入口；不调用 reset 改当前账户/安装身份或 N05 条件 |
| `services/acceptance-diagnostics.ts` | 有界查询事件记录、Sky scene inspection | 非权威观察，不供应 Map 图像或替换原生命令；不能把该 flag 当故障开关 |
| `run-wechat-devtools-session.mjs::captureFaultAndRecovery` | 既有 BFF 停止/重启后的页面错误/恢复 Harness | 依赖可达 BFF、SDK page 操作与 `restartApi`；不制造 ground-overlay 永不回调。现有 platform simulation 控制 GPS/compass/motion，不控制 createMapContext/ground-overlay |
| `inject-terrain-wait-observer.mjs` | task-staging 下给 metadata、下载、file-ready、安装结果及真实动作加有界观察 | 仍消费真实 terrain metadata/文件，不供离线数据，不注入故障；不是 ready-to-run 的本问题诊断 |

以上由当前代码实际读取与限定搜索得出，没有安装依赖、调用 IDE/MCP/ADB、运行脚本或读取私有配置/凭据。

## 首个未满足的产品责任输入

实际 Map 的地形安装输入来自 `pages/map/index.tsx` 的 `terrain.candidate`；`hooks/use-terrain-overlay.ts` 先经 `getTerrainOverlay/getTerrainOverlayPreview` 获得 metadata，再经 `useRasterImage` 获得真实路径，才向 `useMapRasterInstallation` 交付非空 `src/bounds/data`。

`services/map-raster-files.ts` 的唯一共享实例通过 `createRasterFileAdapter` 使用 `Taro.downloadFile`，把合法 `/v2/terrain/assets/...png` 或版本化 night-light 路径拼到当前 API origin；没有包内 PNG/local-file 的注册入口。`raster-image-resources.ts::retainPath` 只接纳该 owner 已持有的文件，否则抛 `raster_image_file_not_owned`。因此，把任意包内图片路径塞给 coordinator 会绕过负责边界或直接失败，不能算真实文件 pin 路径。

同一 owner 已有 `snapshot().nativePins` 等有界标量，可在将来的目标观察复用；不需另造 pin 计数器或第二资源 store。`use-map-raster-installation.ts` 的真实 context 在闭包里按确切 `nativeMap.mapId` 创建，当前没有可由手机现有 UI 激活的一次性回调门。

## 构建与冻结边界

`config/index.ts` 的 isolated-check slot 只准 plain build，明确拒绝 fixture、acceptance/request diagnostics；release output 同样拒绝这些组合。不能把多个现有 flag 拼成一个不存在的诊断模式。

旧 `scripts/build-r17-normal-baseline-v3.mjs` 把既定 trial/source/project、slot 和 generation 25/27/32/33/34 固定绑定，相关 review 模式还要求 `--usb-reverse`。本轮**不导入/运行**该 builder，不换参数覆盖冻结代，不沿它创建新的 reverse 或重启旧 bridge。可以参考其源码保全方法，不能把参考当执行授权或新的 build owner。

## 目标观察重开条件

这部分是原 PLAN 目标观察的条件说明，不替代 HANDOFF 的当前唯一下一步：

- 真实 API/资源已可达，当前 Map 通过同一 metadata→共享文件→raster hook→coordinator 成功取得非空覆盖；保原账号、相机、选择和 Context。
- 若仍需可控故障，只在原 context/确切 Map id 端口评估一次性 callback 控制，保留真实原生命令。当前 coordinator 同时采纳 callback 与返回的 Promise；仅丢 `success` 而让 Promise 正常完成不会产生所需故障，不能把这种无效注入当反例。
- 用原恢复入口替换一次 failed session，分别观察新实例的实际输出、原实例晚回调/移除及共享 owner 的 pin 效果；不新增另一 Map writer/renderer，不扫描相邻 disable 或 profiler。
- 即使故障后实际恢复或旧 overlay remove 得到确认，也不认证整幅旧 Map/decoded/GPU 的销毁。没有资格化销毁确认时，native-unknown 及完整反复故障/资源/OOM 义务仍保留。

重开前由 root 按届时真实能力选择最小控制；本文没有实现、运行或批准一个新故障注入平台。

## 检查与资源

按当前 [开发 Skill](../../skills/starward-miniapp-development/SKILL.md)、[性能方法](../../skills/starward-miniapp-development/references/performance-investigation.md)、[设备 Skill](../../skills/starward-wechat-device-verification/SKILL.md)、PLAN Refactor 1 与 [源码独审](R20-MAP-FAULT-SESSION-REVIEW-20261024.md)执行本次读取。首次合并输出截断后已按缺失范围补读；两个猜测路径查询失败后改用真实文件发现，不把失败查询当能力缺失。

本文本地链接与 whitespace 检查通过。不新增测试、进程、监听、设备会话或待清理构建；当前 EfkxhB、所有冻结代/Harness、私有原件及 root 在途工作不变。本子任务答案已足够，交付后结束。
