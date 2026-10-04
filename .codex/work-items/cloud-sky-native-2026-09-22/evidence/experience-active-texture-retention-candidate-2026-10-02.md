# 本帧纹理保留：有界责任与成本候选，未采用

2026-10-02。复用独立闭合的五个 W3-off、selected-null、DPR1 真实默认 Hook 条件及 15 帧实际纹理调用；不改生产代码、图像、透明度、窗口几何或预算。这个实验针对“每帧实际需要的纹理超过帧后 16MiB，所以每帧再上传”的机制。它不是新验收计划，执行仍归唯一 PLAN 的共享资源责任。

入口：`scripts/experience-active-texture-retention-candidate-2026-10-02.mts`。结果 `output/active-texture-retention-candidate-1002-r2/result.json`，723793B，SHA `997f12c81b5826fbf417f60bee2b9117ad3c64100f01a443c0641e1d7cebe3ba`。输入为 `output/full-hook-resource-independent-1002-r2/result.json`，SHA `8bd7f8e49a40e3995abfab33b8c8e37cf7db7bf2127634c1b01c257304e7e41f`；实际 production owner SHA `cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e`。执行原 owner 与仅两处责任变化的副本，baseline 的逐事件/峰值/保留字节精确重现独审数据。

候选只改副本：新源上传前，保护已经在本帧使用的身份及显式 multisampler pin；帧末释放未用身份，保留本帧实际 working set。16MiB 继续作分配压力目标，但 **不再保证本帧末 ≤16MiB**。因此它是明确的政策变化和更高持续驻留成本，不能写成免费缓存收益或旧预算保持。

| 同一调用序列的 mock GL 结果 | 原 owner | 候选副本 |
| --- | ---: | ---: |
| 五条件 15 帧最大逻辑纹理峰值 | 30,932,992B | 30,932,992B |
| 最大帧后持续驻留 | 16,777,216B | 30,932,992B |
| 139°第二帧源上传 | 14,417,920B | 0B |
| 139°第三帧源上传 | 14,155,776B | 0B |
| 139°进入首帧源上传 | 23,068,672B | 31,981,568B |
| 139°进入首帧峰值 | 26,214,400B | 30,932,992B |
| 15 帧累计源上传 | 107,479,040B | 87,818,240B |
| 15 帧累计 GPU copy | 15,007,744B | 15,007,744B |

第一帧上传退步来自压力淘汰了本帧后面仍会用的旧身份；不能只报暖帧归零。全旅程最大相同也不表示每个转向条件都不增加峰值：139°之后的全天首帧开始仍持有 30,932,992B，而原方案只持有16MiB。该已持有值计入候选帧峰值，未隐去。记录的条件切换不是连续转向或所有不同集合。

可选 copy 故障由 mock framebuffer capability 明确拒绝：原/候选都返回同一完整源窗口；最大逻辑纹理峰值均31,981,568B，但候选帧后也保留31,981,568B。这个例子证恢复意义保持且持续成本更高；没有新 GPU/driver 故障注入。空帧、identity retirement 与 dispose 均归零，退休后 get 不再上传/复制。每次调用返回的 source id/object identity 与源像素窗口 plain value 相同；它只证明调用意义，**不证明已绘像素**。

r1 停在 separate VM Object prototype 的 deepStrictEqual 诊断：打印值一致，未产出结果。其执行源/副本目录保留。r2 只将窗口记录归一为 plain JSON value 后比较，没有放宽坐标、尺寸或资源断言。

结论：这个责任变化值得与窗口候选一同做有界评估，但目前未采用。更高持续驻留、进入首帧上传退步、真实 driver/deferred deletion、移动视野集合、粗细双 sampler/失败回退、W3/Moon/SDSS/selected、新 Canvas/hide/context loss 都要先有对应实证及独立审查；不能从本实验给出目标内存、性能或200DAU容量结论。旧16MiB合同维持生产原状。原景别、所有有效图层、科学覆盖和完整体验义务保留。

## 后续较小变化对照（历史候选不改）

root 另取同15帧，只改变 finish、保留 previous-frame allocation guard。`output/active-texture-retention-candidate-1002-r3/result.json` 1,088,703B，SHA `b5e18a6517597e826d87b3827fe1dd29abc908d2f1d2bd6624d53c600166aec1`；原 r2 副本/结果保持。这个较小变化仍有相同30,932,992B最高持续驻留，却累计 source-upload90,963,968B，高于 current-used 候选87,818,240B；139°第二帧仍上传12,058,624B，第三帧才归零。previous-frame guard 不能保护新进入本帧、已经使用的身份，因此没有同时降低持续成本和重复上传。此项仅root作者mock控制，未单独独审，不新增GPU矩阵、不采用。后续实际正常矩阵和共享边界分别见 [GPU实物](experience-active-texture-retention-gpu-2026-10-02.md) 和 [独立读回](experience-active-retention-boundary-and-normal-independent-review-2026-10-02.md)；开发采用与目标验收由后续当前owner记录，不能追溯改写本候选的历史“未采用”。
