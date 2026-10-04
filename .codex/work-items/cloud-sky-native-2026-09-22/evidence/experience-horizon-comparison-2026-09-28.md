# B3 地平附近可比画面与夜间地面可读性修订

## 可比条件与观察

公开示例点22.4826799N/114.5557147E，Asia/Shanghai；Mini民用2026-09-29 00:00（16:00Z），手动Vega方向，垂直85°，几何地平线进入下半画面。参考Stellarium Web暂停在2026-09-28 23:59:58，时间相差2秒。Mini逻辑画布390.4×844；网页实读Canvas CSS 390.4×844。参考使用短边FOV，按既核投影换算对应40.78913364849271°；页面URL的地点、时刻、Vega与FOV及实际画布都核过。临时浏览器viewport已reset，标签页保留交接。

[参考实际画面](experience-horizon-85-reference-matched-2026-09-28.png)（21982B，SHA256 `6317971b6e4d07d1a65fe149ad606402578207c81c6be7a1c2d84f8e149bdb44`）在默认环境图层下能辨认前景地表、远处树/低轮廓和天空分界。[旧候选原生画面](experience-horizon-85-native-2026-09-28.png)（92877B，SHA256 `14a70ddf2e1aa70139dcfbac16de912e3747a62d0d2b0010e7895ff2b8084ee9`）虽有正确天空/地面分界，地面接近一块黑平面。参考默认地景素材/星目录不能直接作为本产品商业输入；Gaia等排除理由仍有效。两端实际截图呈现比例不同，不能用上述图逐像素比较或据此宣布星密度/配准通过。

## 修订与结果

仅调整自有`sky-landscape.ts`的夜间**图表显示曝光**：环境底值随已有daylight从夜间0.30平滑回白天原0.12，原0.22日光项/0.68直射项、当前太阳、同一相机、几何地平线以下的平面和红光独立分支均保持。没有新增站位遮挡、真实亮度/月光/天气承诺，也没有使用参考图片或引入纹理下载。此改动只影响地面色值，不改变星层或拾取owner。

新`weapp-check-sky-horizon-0928`独立本地构建后，通过官方CLI和SDK重新走Map公开点→手动Sky→00:00→中文织女星搜索定位→向实际Canvas发送双点事件从45°到85°。[修订原生画面](experience-horizon-85-brightened-native-2026-09-28.png)（96456B，SHA256 `b271ae0628ae9ca4af5ea21b3e264a418840f993dec4e6b550e738b3ea922a00`）地面纹理现可辨；Canvas读回4121真实亮星、16Z、85°。固定截图地面矩形x20–176/y321–393的[可重跑sRGB测量](experience-horizon-contrast-2026-09-28.json)均值由9.65升到19.18代码值；这是模拟器截图亮度，不是测光/手机屏幕读数。当前新候选12:00[白天实图](experience-horizon-noon-brightened-native-2026-09-28.png)（25937B，SHA256 `5f763bbfdd1ced483c2526f0b58908cdf3470e10fb7501c36b1ebeff860ffa47`）地面/天空仍按时刻变化；时间控件收起后85°恢复。随后已恢复00:00/85°、手动Vega方向供续验。

这只缓解**可读性**，没有补出参考的远近轮廓、空间深度和整体场景质量。不能称B3完成，也不预设树/山或现场DEM为普遍硬依赖。进一步环境投入应按完整浏览体验的实际影响排序，并保持遮挡与星点点选的一致性；不能贴一张伪现场图凑效果。

在同一新候选00:00/Vega方向，还通过官方SDK向实际Canvas发送双点事件由85°放至267.8°[全天圆盘](experience-horizon-full-dome-2026-09-28.png)（SHA256 `dd093fd5dad5c708e2bde1f1edc09d27b27e36ad868d2e7abf72f62290b29b79`），再反向返回85°[局部画面](experience-horizon-dome-return-2026-09-28.png)（SHA256 `6a70a8eb1ce273400feed8505f57f331f6914e317bf167601c239928dc3b53bf`）。全天图中的完整地平圆盘位于画面内，星座详细层不出现在全天；[同一像素测量](experience-horizon-contrast-2026-09-28.json)排除系统栏/胶囊/底部后的x0–196/y44–399，往返前后变化为0像素。当前Canvas仍读回16Z/4121星，真实本机MEMORY_TEST BFF再次GET HTTP200、16Z/revision4（与旧JOURNEY的内存Context/revision8不同）。它证明此手动方向、视场及地景组合的开发回程一致，不证明物理双指手感、传感器跟随返回或手机合成。

## 开发检查与剩余目标证据

受影响地景、帧/时间消费者17项通过，Mini typecheck退出0；当前独立WEAPP build退出0，已有样式顺序与webpack尺寸/建议三类警告继续存在（[构建日志](experience-horizon-build-2026-09-28.log)）。最初误带`DEVELOPMENT_FIXTURE_MODE`被现有隔离普通构建守卫拒绝，去掉后正常构建；没有放宽守卫。任务候选以HORIZON0928编译标识与官方CLI exact-project/runtime核对；loopback API仅本地开发，不可推手机、不是干净交付候选。之前JOURNEY候选的组合交互证据仍属其字节；地景这次改动未在其上重新跑一遍全部旅程或目标手机。

本代手机真实合成、姿态/校准/后台、帧时/内存、官方包体、iOS、成本与独立审查仍缺。优先按PLAN继续其余组合机制/干净候选，不让草地精修无限占主线。
