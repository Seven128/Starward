# C02 暮光条件与 SAO 分片选择（2026-09-24）

## 触发与责任

当前原生绘制 `sky-scene-render.ts` 使用同一精确报告时刻的 `skySolarLightAt`，普通模式按 `skyStarAppearance(magnitude, fov, sunAltitudeDeg)` 淡出星点；暖红观测模式故意省略太阳高度，保留查找星图。此前 `sky-stellar-tile-selection.ts` 只按夜空阈值检查分片最低星等，故普通模式中没有任何可绘 SAO 点时仍能发出这些分片请求。`use-sky-stellar-supplement.ts` 持有同一视角的 wanted 集合、取消和当前分片工作集，页面只供应已有报告时刻与模式，不增第二套时间或光照计算。

## 修复与反例

- 先增 `sky-stellar-tile-selection.test.ts`：3° 视野、最低视星等 9 的真实结构分片在太阳高度 -12° 应不选，-18° 应选；省略太阳高度代表暖红/未知条件，仍应选。修复前第一断言失败，实际选中 `east-equatorial`。
- 选片现在把已核太阳高度传给与绘制共用的 `skyStarAppearance`。页面从同一个 `reportData.hourly`、`row.at` 运行 `skySolarLightAt`；仅普通模式传太阳高度，暖红模式传 `undefined`。选片 memo 把太阳高度纳入依赖，时间或模式改变会更新 wanted；既有 loader 对不再需要的分片中止请求和撤销工作集。
- 太阳数据缺失或无效时，`skySolarLightAt` 返回 `null`，选片按原有夜间星图条件继续，避免把未知太阳高度当作白天而误删星层。星表星等、绘制透明度和点选阈值均未改。

## 观察

- 定向星等/选片/加载器 12/12；小程序全量 824/824；Mini TypeScript 检查退出 0。架构 owner 已同步该既有责任的新选片条件；`npm run context:validate` 退出 0（仅结构校验）。`git diff --check` 退出 0；只报告了既有工作树换行转换警告。
- `sao-twilight-selection-probe.mts` 使用正式 SAO v2 索引与 BSC v3 报告几何，在深圳 22.5/114.5、2026-10-08T13:00Z 的固定观察帧、390×844、七档 FOV × 六档俯仰 × 十二档朝向共 504 个视角，分别给出控制的太阳高度条件。原始输出在 [`sao-twilight-selection-2026-09-24.json`](sao-twilight-selection-2026-09-24.json)。-18° 夜间与暖红/缺太阳条件：504/504 非空、每视角最大 19 片／1,109,570 出版物字节；-12° 航海暮光和 0° 白天：504/504 空选片。此为所选出版物压缩字节的静态统计，不是实际网络传输、缓存命中、解码内存或 GPU 时间。
- 用户正在使用开发环境；未重建可能属于其活动项目的 `dist/weapp-check` 或 `dist/weapp`，也未接触 Android、源 WeChatIDE 窗口、共享 8787。独立 WeChatIDE 项目仍停欢迎页，故没有本次变更的原生请求/画面证据。正式构建、微信运行时的日夜/暖红切换、流量及目标手机表现保持未验证。
