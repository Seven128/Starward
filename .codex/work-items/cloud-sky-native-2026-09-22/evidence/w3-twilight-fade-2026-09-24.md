# W3 暮光层渐显：2026-09-24

商业版已发布的可选 AllWISE W3 广角红外层在太阳高度刚到 -12° 时，选片 owner 开始提供瓦片，而绘制 owner 原以固定 0.48 透明度立刻提交。这会让已缓存图在阈值帧突然出现，与同层下方的银河背景 -12° 至 -18° 渐显不一致。

`sky-scene-render.ts` 现在只在已有精确观察帧、普通显示模式和非零银河背景强度时提交 W3，并以 `0.48 * skyGalacticBandAt(...).strength` 绘制。W3 的 ≥60° 视场条件由既有 `use-sky-wide-field-w3.ts` 保持；在这个区间内视场因子恒为 1，-12°/ -15°/ -18° 分别为 0/0.24/0.48。光学 HiPS 仍独立保持 0.8，不受红外过渡影响。暖红模式和失效时刻仍不提交 W3。

新渲染回归修复前失败（-12° 边界仍提交 7 个 W3 mesh）；修复后 `sky-galactic-band.test.ts` 与 `sky-hips-scene.test.ts` 定向 9/9。现有 HiPS 两例从无太阳数据的夹具改为具有 -18° 太阳高度的真实夜间语义，另在缺太阳数据时断言不再提交 W3。小程序全量 825/825、typecheck 退出 0。此证据仅是正式 scene 提交给原生 mesh 的状态与透明度，不是微信 Canvas 的像素、控件合成、手机帧耗时或内存。用户当前占用的 Android、源微信开发者工具窗口及共享 8787 均未使用；未重建其活动 `dist/weapp` 或 `dist/weapp-check`。

PS1/ SkyMapper 本轮仅复核公开政策，未新增生产影像、修改 TRIAL 准入或作商用权利完成判断。 [SkyMapper 官方 DR4 文档](https://skymapper.anu.edu.au/data-release/)确认公开图像/目录与覆盖边界；[SkyMapper 引用页](https://skymapper.anu.edu.au/how-to-cite/)列论文、DOI 和致谢，但网页超时，使用现有已保存的官方元数据证据。现有自托管、CDS 加工瓦片再分发和规模成本缺口依旧。
