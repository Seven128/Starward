# B2 土星主环几何阴影：独立数值基准、报告与绘制

## 结果及明确边界

报告为土星增加可选的发光时刻 Saturn→Sun 单位向量。Mini 用同一报告帧的环极轴、1-bar 扁球和 NASA/NSSDCA C/B/A 主环半径，在普通相位盘及 OPAL 历史纬度盘上计算环投向球体的几何影；环线中位于球体背光侧的段另行着暗色，继续受地平裁剪和点选约束。影的出现由当前几何计算，不使用历史 OPAL 图上的黑带。旧报告或坏太阳向量继续显示位置、相位和无影的环，坏极轴仍沿既有 PARTIAL 恢复。

主环透明度 `.2/.68/.57` 只是显示模型，不是实测光学厚度；硬边略作像素抗锯齿，不声称半影、真实光度、细小环缝或卫星影。目标 Android/iOS 微信原生 shader 编译、像素、控件合成、连续帧性能尚未验证。

## 与独立来源核对

使用官方 [PDS Rings Saturn Viewer 3.1](https://pds-rings.seti.org/tools/viewer3_sat.shtml)；Earth center、SAT415+SAT441+DE440、6 Saturn radii、A/B/C、Opaque，非产品影像源。其 [帮助页](https://pds-rings.seti.org/tools/viewer3_sat_help.shtml)说明不绘半影。两个 UTC 样本：

| UTC | PDS 环面观测张角 | PDS 环太阳纬度 | 本地 Astronomy Engine 观测张角 | 本地太阳纬度 |
| --- | ---: | ---: | ---: | ---: |
| 2017-06-15 12:00:00 | +26.59396° | +26.73010° | +26.59325° | +26.72972° |
| 2026-09-22 13:00:00 | −7.86528° | −7.52651° | −7.86511° | −7.52547° |

本地数值来自 Astronomy Engine `GeoVector` 光程推回、`RotationAxis`、`HelioVector` 的 Sun→Saturn 反向，并未将 PDS 输出当算法输入。产品报告使用观测地点而非地心；金标允许不同站位/星历的 `<0.02°` 差异。PDS 2026 样本相角 1.36601°、光行时 4219.781706 秒；本地地心约 1.37116°、4219.861 秒，未宣称逐位相同。Viewer 临时图名会变化，永久入口为上述表单和帮助页；本站图未复制进产品或任务资源。

## 责任、恢复与验证

- BFF `astronomy-engine-adapter.ts` 算法版 1.3.5，在土星发光时刻取太阳方向、以观测时刻 ENU 表示；可选计算失败仅撤回太阳方向。合同 `SkyPlanetGeometry.ringSunEnu?` 保持旧行兼容。Mini `sky-report-planets.ts` 去掉损坏的可选向量而保留极轴、环、七行星位置；新有效帧可恢复。
- Mini `sky-body-surface-orientation.ts` 统一经度中性的土星本体基；`sky-saturn-rings.ts` 统一主环半径、透明度和扁球光线求交；`sky-planet-disc.ts` 与 `sky-scene-render.ts` 将明暗环线交给同一地平/拾取路径；`sky-gpu-renderer.ts` 对普通盘与历史条带盘应用相同球面几何影。复核物理环面基时发现原先靠观察者的环扇区被判成远侧、在球体前被错遮；现按环面向量反向判定并由投在球体前的近环弧回归约束。环影与历史图像的责任分开，缺太阳方向不启用影。
- 独立 PDS 两季角度金标、坏太阳方向降级与新帧恢复、几何背光/向光/环外样本、实际场景暗环绘制及拾取回归均通过。天文复用/合同/报告/场景相关 49 项定向检查通过。首次 Mini 类型检查发现新增场景测试的异步快照变量被 TS 收窄为 `never`，修正测试类型表达后合同/BFF/Mini 三包类型检查通过；产品源码未因该测试错误改动。`npm run context:validate` 通过，只验证 Context 结构。影代码经独立 WEAPP 正式构建成功；构建只编译 TypeScript/打包，不编译目标 WebGL GLSL。
- 曾尝试用隔离浏览器的 `data:` 页面让真实 WebGL 编译器检查本次 GLSL；浏览器安全策略拒绝该协议并明确禁止通过其它浏览器或间接执行绕过，故没有继续尝试。shader 编译与像素仍归 P1 目标运行时，不将静态/构建通过说成已验证。

近/远环修正后的最终隔离槽 `apps/wechat-miniapp/dist/weapp-check-sky-b2-shadow-verified-0924` 的 `app.json` 已读回，构建 exit 0，见 [完整日志](b2-shadow-verified-build-2026-09-24.log)；仍有既有 CSS 顺序、单资产尺寸与 webpack 通用建议共 3 个 warning。原始目录字节 main 2,070,214 B、sky 904,560 B、spot 423,617 B、content 1,012,055 B；这不是微信压缩包大小或手机峰值。没有使用用户 Android、现用微信开发者工具、共享 8787 或活动 `dist/weapp`/`dist/weapp-check`。P1 平台、P4 设备峰值/流量、P5 独立审查仍开放，B2 与 Goal 未完成。
