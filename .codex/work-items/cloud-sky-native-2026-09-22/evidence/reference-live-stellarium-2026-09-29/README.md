# Stellarium公开界面观察

2026-09-29通过Browser插件打开官方网页，公开搜索Altair、打开星座插画、用公开加减按钮缩放并暂停/恢复播放；没有读取或修改隐藏引擎状态。五张1280×720原始Browser JPEG全部实际查看，指纹和条件见[captures.json](captures.json)。

暂停时刻21:00:40、Near Singapore（仅界面地点名，数值坐标未核），29.6°有明确天鹰插画，8.89°及2.67°局部无插画且更多星点可见。参考与小程序视口、FOV定义、地点、曝光和数据覆盖未完全配准，因此这是有界行为参照，不是像素一致验收或固定阈值依据。

2.67°恢复公开播放后，时钟从21:00:41推进至21:01:25，公开Az/Alt也变化。对象仍被选中，锁定状态未明确；未取得跨倍率、未跟踪相机的定量像素速度，不称已认证速度比。一次公开空白坐标点击未见失焦，不以该操作推断产品规则。结束时再次暂停。

[官方navigation.c](https://github.com/Stellarium/stellarium-web-engine/blob/master/src/navigation.c)与[core.c](https://github.com/Stellarium/stellarium-web-engine/blob/master/src/core.c)将时间推进、FOV和相机/锁定分别处理，支持“同一时间速率下放大投影更易察觉移动”的解释；公开仓库代码不认证网页部署二进制。仅阅读行为，未复制AGPL源码。用户最新澄清不要求1.7°启动阈值。

本批不采用参考中的Gaia数据/成品天图，不扩大商业范围，不生成或编辑天文素材；选择、光晕、星芒、深空辅助层和整体质量仍须按现有owner与实际目标输出验证。
