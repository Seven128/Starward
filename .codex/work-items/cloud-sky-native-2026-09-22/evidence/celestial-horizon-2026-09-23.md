# 日月行星几何地平线修复（2026-09-23）

受影响源：`apps/wechat-miniapp/src/features/sky/sky-{moon-disc,planet-disc,scene-render,render-surface,gpu-renderer}.ts`。原太阳盘按逆立体投影视线逐像素裁剪地平线；月亮圆心高度小于 0° 即整盘消失，行星同样提前剔除，普通相位/月火贴图着色器会将低于地平线的像素绘出。土星环为 CPU 线段，原先也未裁剪。

现在月亮和七行星仅在中心高度低于负半角直径时整体剔除；普通相位和月/火贴图片元与太阳盘共用 `skyRay(v_pixel).z < 0` 裁剪。场景将同一相机 `SkyArtworkView` 传给三个圆面绘制入口，土星环只在接近地平线时按 `unprojectSkyPoint` 裁线，远离地平线沿原快路径。圆心低于地平线的亚像素行星不绘点或建立点选目标；有可见部分的高倍率球面仍可绘出。此处是零度几何地平线，不含真实山脊或大气折射。

定向测试 12/12：月亮中心 -0.1°/直径 0.5° 仍提交，同画面圆内有地平线上下视线，中心 -0.3° 被剔除；土星中心 -0.003° 的可见球面被提交，原环存在地下端点，最终提交环端点均在地平线以上且数量减少，地下中心不产生点选对象；球面已完全落下至 -0.015° 时外环仍有可见线段，至 -0.03° 时球面和环均退出。`npm test -w @starward/wechat-miniapp` 803/803，`npm run typecheck -w @starward/wechat-miniapp` 退出 0，`MINIAPP_ISOLATED_CHECK_BUILD=1` 的 `npm run build:weapp -w @starward/wechat-miniapp` 退出 0，`git diff --check` 退出 0。新增环外缘分支后，定向 12/12、typecheck 和隔离 WEAPP 构建再次退出 0，完整构建输出见 `celestial-horizon-isolated-build-2026-09-23.log`。构建仍有此前已存在的 CSS 顺序、`sky/detail/index.js` 256 KiB / `common.js` 318 KiB 和 webpack 性能警告。

通过官方 wechatide MCP 检查登录与 skill 版本正常，打开独立 `dist/weapp-check` 项目窗口；但 `automation_runtime_info(currentPage)` / 定向控制台读取超过约 50 秒未返回，取消等待并关闭该窗口。因此本轮没有着色器实际编译日志或地平线像素截图。没有使用 Android、ADB、扫码、真机预览、外部部署或数据源写入。后续需在可靠 DevTools/Android WebGL 运行时用月升落或受控报告帧观察普通相位与月/火贴图、土星环的地平线剪裁，并核查性能；这不完成 C05 或整个 goal。
