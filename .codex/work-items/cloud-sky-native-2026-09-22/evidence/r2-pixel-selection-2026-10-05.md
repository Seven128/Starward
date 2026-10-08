# R2实际像素选档与往返开发证据

范围限当前分支源码和受控软件page开发路径；R1旧证据/失败全部保留。本轮没有提交推送、注册普通Prepared或设备验收。唯一执行顺序继续由PLAN顶部拥有。

## 当前实现

- `sky-optical-pixel-sampling.ts`复用现原生registration、stereographic相机和保守raster边界，求实际绘图像素对已解码源网格的放大倍数。滚转、偏心、斜视及各轴真实尺寸进入计算；没有用M51旧固定角比例或假定DPR。它是有界九点采样估计，不供应仪器PSF/分辨率、科学有效性或任意宽视角严格误差证书。
- 选最粗的可见、未放大超过一个framebuffer像素的出版网格；全部不够时用实际最细网格，有限外沿不扩覆盖。几何/尺寸未知时保上一个适用档或概览，确证全家族出屏才退休。真实page传当前已接受相机和Canvas实际取整drawingWidth/Height。
- 反向降档需20%像素余量；大跨度缩小时可以降到已有余量的中间档。历史仅属于同kind/ref/hash/Canvas/revision，通过React提交保存；同hash元数据刷新不重置，新版本/Canvas/失活会重置。原队列、文件、decode和R1失败保粗机制继续复用。

## 有效检查

8个受影响文件65项全通过，0跳过；Mini类型检查通过。原R1的71通过/1实际科学出版fixture条件跳过仍保原范围，不能把两批相加当最终矩阵。原始输出见`tmp/r2-affected-tests-2026-10-05-r1.log`及`tmp/r2-typecheck-2026-10-05-r1.log`。

包括：同.2°视角DPR1需MEDIUM、DPR3需DETAIL；512/1024源格与1171×2533实际取整尺寸；偏心/滚转90°相机解析Jacobian对独立实际ray差分；细图不覆盖外围不盲请求；未知observer/尺寸保适用档；公开重试、同帧备用真实来源、对象/版本/退休。角度旧策略和移除滞回的有界mutation分别暴露像素密度/往返反例。初次缺目录frame夹具失败及类型诊断已修，没有放宽产品预期。

实际完整Taro JSX、React/Query、原Map入口和Sky公开pinch/Back、当前HTTP/真实资产、software WebGL路径：`output/playwright/cloud-sky-prepared-handoff-1005-lod-r4/`，512输入前后hash不变、89请求、59 Scene。样本仍是既有M82 v2，不重加工。

- .5°概览→.2°中档；.36/.4°四次公开往返共用中档decoded object13，PNG body计数2→2；真实logical/drawing均390×844。没有声称相机裁窗完全不上传GPU。
- .05°细档→.5°概览→.05°细档：六个暖回完成帧均为真实Prepared来源，0 source-null；细档前后RGBA逐字节相同，PNG三图均只初次传200 body，最后Back/unload释放活动decode/GPU/lease/传感器。
- 原相机basis/center/frame/dimensions精确相同；FOV在预先保留的浮点roundoff范围内，实际float32 projection scale相同。`warm-camera-identity.json`明确分开derived-double readout和GPU精度；未放宽framebuffer字节比较。

SCSS仅绑定未合成；native端口是受控MapFS/image/geometry，浏览器GPU为软件实现。上述不能冒微信WXML/Canvas、Android/iOS、整场物理峰、普通采用、完整旅程或修后独审。

## 保留失败与Q2责任

- `lod-r1`是诊断执行入口遗漏stdin参数，脚本未更新，范围守卫阻止构建；原目录保留。
- `lod-r2`在暖回中插入额外.0625°视角；相同.05°相机/源/时刻的严格RGBA仍差35通道/35像素，每通道最大1。它仍是FAILED，不能用r4直接往返成功倒填。现texture owner会保包含下一请求的较宽窗口，证据与缓存历史相关，但该失败运行未绑定真实uniform/window，原因仍待Q2有界验证，不宣布完全定位/修复。
- `lod-r3`直接pinch回细，0像素差、同光学uniform；因derived-double scale末位不同触发过严的相机readout断言，未到最终退休。r4只修诊断中的GPU精度断言/保留FOV既有roundoff界和严格RGBA，完成退出证明。r3保失败终态，不改判为完整通过。

R2开发责任有结果；跨历史裁窗严格一致性、同源过渡/真实外沿、PNG/JPEG native和完整图质仍由Q2/P1/A1承担。不要无据扩缓存、改成全部整纹理或建立新框架。修后独审MISSING、实际DevTools FAILED、手机/物理资源未验继续保留。
