# C04/C05 固定影像来源刷新失败的真实状态

当前 2MASS、Clementine 月面与 Viking 火星贴图都通过 `useResourceQuery` 获取版本清单，通过同一个 `useSkyNativeImages` owner 持有已解码图像。`useResourceQuery` 在重新获取失败而缓存清单仍有效时同时给出 `data` 和 `refreshError`；旧三个 hook 把任何 `refreshError` 计作 `failed`。因此已经显示的历史图仍在 Canvas 中，银河页面却提示“已回退到银河方位示意”，月/火页面也称“影像暂不可用”。重试按钮还调用 `canvasLifecycle.resize()`，不必要地重建一个仍在工作的画布。

修订后的共同状态函数 `sky-fixed-image-status.ts` 以当前 canvas owner 的解码图是否存在区分：无图且清单/刷新/解码失败为 `failed`，已有图但清单刷新失败为 `refreshFailed`。三层页面各自用准确的“来源更新失败、已加载历史影像仍可查看”通知和独立重试入口；已有图的来源重试只重取清单，不强制重建 Canvas。无图/GPU 失败仍走原回退及完整图层重试。此修改不改变影像像素、出版物、权限或来源。

回归 `sky-fixed-image-status.test.ts` 的关键反例是“解码图仍在而刷新失败”：旧 hook 的 `failed` 表达式会错误为真，新共同状态返回 `failed:false,refreshFailed:true`；无图刷新失败、原生解码失败和不活动视图分别维持回退/静默。定向相关 17/17、Mini 全量 820/820、Mini typecheck、隔离 `dist/weapp-check` 构建、Context validate 和 diff check 均退出0；原始日志 `fixed-image-refresh-mini-tests-2026-09-24.log`、`fixed-image-refresh-build-2026-09-24.log`，后者保留已有 CSS 顺序、资源体积和性能三类 warning。没有接管当前微信工具窗口、共享 8787 或 Android；因此此修正的页面通知/重试仍待真正 WEAPP 运行时观察，目标设备合成与性能继续开放。

同轮木星素材调查只将 [NASA Science 3D 木星资源](https://science.nasa.gov/3d-resources/jupiter/)与[JPL 地图总说明](https://maps.jpl.nasa.gov/tmaps/)列为**候选**。后者明确气态行星静态图只具代表性，NASA 文件未给本初子午线/左右经度像素的完整定义；详细文件 SHA、权利判断与拒绝直接接入的原因在 `../PLANET-TEXTURE-SOURCE-RESEARCH.md`。没有发布木星图、改动天文位置或声称当前红斑经度。
