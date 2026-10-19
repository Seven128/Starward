# A1 r4 手机时间尺独立输出复核

2026-10-19；`development_feedback_only`。结论为 **FAILED_NATIVE_ENTRY_COHERENCE**：跨日和取消在已观察范围内改善，首次入场仍失败。四张终态对齐不能覆盖过程问题，不作为 settled-candidate 或完整 Goal 验收。

应用 `f5a7c85e78d0fe0aa8a07dd29bcccd76c97326699f12ac7a07837fca5440ebb8`，buildSource `d613ace6f658eb0eb086558333e3e0473b74123cf54ab0013f7695bdec316a70`，buildGeneration 27 / 本次独立反馈 generation 1。官方预览成功及独有 label 绑定由 root 提供；本独审不读写会话状态。

## 实际结果

| 场景 | 独立观察 |
| --- | --- |
| 首次打开时间面板 | 原编码帧 10、PTS 4.447133s 首次可辨面板中，日期是 19 日、字段是 04:30，但尺为 14/16/18/20/22；帧 13、4.506167s 为 18/20/22/00/02。尺随后向左经过午夜，再往返漂移后归位。仍失败。 |
| 19→18 | 字段保留 04:30，等待天空状态后进入预览；2fps 全段及 10fps 动作采样未见旧空白、下午或绕回窗口。终态日期 18 日，实际 04:30 tick 对齐。 |
| 18→17 | 日期变为 17 日、04:30 保留；等待状态消失后进入预览。已采样过程未见旧错窗，终态 tick 对齐。 |
| 取消回 19 | 日期和时间回 19 日 04:30，预览与取消文字消失；采样过程及直接提取的最后编码帧 PTS 3.807522s 保持正确窗口，终态 tick 对齐。 |

入场蓝色中心轴位于原图 x540。真正 04:30 高亮长刻线在 PTS 4.604133s 为 x655，4.655767s 短暂穿至 x537.5，4.688456/4.706511s 为 x502.5，5.023089s 为 x521.5，5.039422s 为 x561.5，5.206578s 为 x576.5，最后编码帧 5.231200s 才为 x539.5，之后独立截图亦对齐。像素证据不能决定原生滚动动画与 rows 替换的因果。

四张独立终态 PNG 的蓝轴 bbox 均为 x539–541、y2051–2097；实际选中 tick 中心依次约为 x539.5、540、540、540。量测按高亮刻线、相邻时间标记和真实 cadence 定位；“预览”后缀导致的文字位置变化不作为 tick 偏移。以上是编码栅格近似值，不建立新容差或物理时间指标。

## 归档与边界

开始时仅冻结两个指定目录当时已有的 24 个文件、8,260,538B。原件复制前后与独占目标 SHA 全部一致，10 份截图 sidecar 均与像素 hash/长度一致。原件、旧批次及 gen26 UNKNOWN 保留。

外部归档：[a1-r4-ruler-motion-archive-20261019](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r4-ruler-motion-archive-20261019)。原件 manifest SHA：`b2be2b094a956abd1932b95c0a2b8d7273fd56c98007d3603d031fd851a9d6bd`。详细复核、32 张实际查看图像、原 PTS、像素规则及派生图 hash 由该目录 `review.private.json`、`review.private.md`、`samples-manifest.private.json`、`pixel-measurements.private.json` 拥有。

沿原时间线先 fps 再 trim，不重置 PTS；原始入场帧和最后取消帧另行直接选取。新入场初版编码图的 0–11 仅为 select 后局部序号，已由带真实原帧 9–20 标注图取代；其原 PTS 未失真。旧 r3 错误 trim/reset 尾图未使用。采样时间标签可重复或漏掉编码帧，网格空格不是产品空白帧。实际文件时长不等于请求的 6 秒。

未验保留：触摸/拖动/重抓、resize、隐藏/替换组合、真实 transitionend 与同批原生几何事件、物理 FPS、精确 180ms 过渡时长、完整视觉一致性、A 输入关联、B 正常 Play allocation/暂停排空/退出、地形文件与原生完成及其它完整 Goal 义务。本次未操作设备、ADB、DevTools、服务、feedback/session、源码、构建或 commit；未改 PLAN/HANDOFF/preparation。
