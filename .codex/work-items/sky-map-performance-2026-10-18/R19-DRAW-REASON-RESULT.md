# r19 正常手机分钟长按：绘制原因复核

2026-10-21，独立只读复核。**已定位到必要动画仍触发完整 Scene 绘制；尚未证明应删掉哪项计算，也不足以采用新的投影缓存、节流或 gen24。** 分钟输入有中间结果，不能把 57 次绘制减为 14 次当作修复目标。没有改生产代码、操作手机/IDE/服务、提交或上传。

## 这次实际发生了什么

正常预览 r19，source `ba176fb416984bf3b2a05c40c2038c08dd477c0abc93b49994e7dd84219be155`，generation 27；264.355°、384 × 796.800 CSS px、夜间有星点和地景。原件 `baseline-r17-1-qjrmi38yd9.json`，SHA-256 `9501a8c41269161ac2a7e6aafd76fe856e2f5f3065e5111a9407aadfb8da30b9`。采样模式字段 `DAY` 是显示模式，不能把它当太阳在地平线上方；实际图片和非零星点提交确认夜空负载。

|事实|结果|
|---|---:|
|输入 / 已消费准备 / 首次 accepted|14 / 14 / 14|
|晚于下一输入的首次 accepted / 未消费准备 / geometry 调用|0 / 0 / 0|
|首次 accepted 的 wall elapsed|73–139 ms，p50 109 ms|
|请求 / 实际 paint / 合并|74 / 57 / 17|
|paint 原因|4 effect；23 stars；15 effect+stars；9 names；1 effect+names；5 images|
|unknown / 失效帧 / invalidation|0 / 0 / 0|
|draw wall elapsed|57 次，22–62 ms，p50 29、p95 45，已知 subtotal 1,765 ms|
|typed buffer 上传|114 次，共 29,089,872 B；不是驻留字节或 GPU 耗时|

各原因请求为 effect 21、stars 38、names 10、images 5；相机为 0。37 次 paint 只有 continuation 原因，其余 20 次包含 effect。原因是原调度器中合并请求的并集，不表示内容相等或浪费。paint 环只保留末 32 次，前 25 次的原因仍在总直方图，但没有逐帧成本关联。57 次 nativePaintOwner 已知 subtotal 1,769 ms 与 draw 嵌套，不能相加或换算物理 FPS。

独立解码原手机视频 12.230289 秒并查看 7 个有用全幅视频样本及操作前截图：media 2.470300 秒显示 20:19:38；2.669956 显示请求 20:20、已接受 20:19；2.969722 为请求 20:23、已接受 20:22；3.468622 为请求 20:27、已接受 20:26；4.168222 为请求 20:32、已接受 20:31；4.493078 已到 20:32:38 预览，星座/星点有中间移动。已查样本没有日期回跳或只在末次更新的现象。媒体时间未与 collector 时钟硬配对，离散抽帧不认证主观流畅、物理 FPS、全部六字段或无泄漏。

## 实际 owner 与可避免工作的边界

1. `sky-star-transition.ts` 保留一个 accepted 状态，按 Context/mode 和每层 publication 身份匹配。BSC 的 catalog 来自 `sky-stellar-scene.ts` 的 publication WeakMap；相同 publication 的 report/scene 包装变化不会自动让星点重新从零淡入。`retarget` 从当前 live opacity 向新 target 走 160 ms。时间变化保留新坐标，禁止旧时刻退出残影；高度透射、太阳亮度和真实供给/可见性改变会改变 target。不是仅因 `at` 字符串改变就重置所有星。
2. `spot-sky-page.tsx` 在成功 copy 后提交该状态，只要 camera/star/name/image owner 尚未结束，就向同一个 writer 请求续帧。r19 的 38 次 star 请求已确认这条真实路径。删除这些请求会改变已采用的渐变和终点，不能用节流来掩盖。
3. `sky-scene-render.ts` 的每次绘制仍执行 BSC/SAO 遍历、投影、appearance、transition Map/point 快照、pick/name 收集和点顶点写入；`sky-gpu-renderer.ts` 在 flush 时创建 `Float32Array` 并上传。相同 exact-time 的 direction/position/transmission 已由 `sky-stellar-transform.ts` 惰性复用，屏幕投影及显示对象/顶点打包则再次执行。名称/图片续帧也走完整 Scene；这是可研究的重复工作，不是已证明的主成本或泄漏。
4. **现有 `base` 读数几乎为零不能排除星点计算。** 它只包 `resolveSkySceneFrame` 的返回；当前实现返回惰性 transform，实际向量/位置、投影和 transition 工作发生在后续 `forEachProjected`/画点循环内，计入整个 draw。反过来，29 MB 上传量也不能证明上传耗时主导。fineTarget 回包可令 scene memo 重建，但本次没有其身份/成本关联，不据额外 effect 数恢复 gen24。

## 下一次只回答一个问题

保留已有输入/accepted/原因计量与完整显示。若当前真实 CPU 录制路线仍被 GUI 输入边界阻塞，在**下一次必要候选**通过现有计量 owner 同时补两处有界 inclusive span：BSC+SAO 画点遍历，以及 renderer `submit` 的 typed packing/GL submission；按实际 paint 的 input/effect 与 continuation 分类。仅聚合次数、已知 elapsed 与未知覆盖，不逐星记录、不保存 frame/report，也不改 writer。注意首个 `disc` 可能 flush 前一图元，submit 可嵌套在画点遍历中，因此不能相加或称作纯 CPU/GPU 时间。

如果画点遍历明显主导而 submit 很小，再在该 owner 选择保持精确坐标、渐变、pick/source 和退休语义的局部复用；如果 submit 主导，检查原上传/打包 owner；如果两者都小，沿同次 draw 剩余责任定位。不要再单独重录同一种原因直方图、泛化 profiler 或将未变终态直接缓存为整帧。本次只缩小修复责任，不改变跨日供给和 Memory/retainer 的独立未决状态。

四份必要原件已复制到私有 `r19-native-update/draw-review` 并逐份 SHA-256 读回，恢复记录为该目录 `preservation.json`；未变源码复用 r19 冻结目录，六份相关源码与冻结 manifest 的 production binding 完全匹配。汇总、精确 source/bundle、源文件哈希和可复核结果见 [JSON](R19-DRAW-REASON-RESULT.json)。
