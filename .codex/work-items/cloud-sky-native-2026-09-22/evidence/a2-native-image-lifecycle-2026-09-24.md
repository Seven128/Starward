# A2 图片资源组合生命周期（非手机开发检查）

2026-09-24。属于 PLAN 的 A 公共底座。作者检查了 BFF 正式出版、Mini 清单消费者、`useSkyNativeImages`、原生请求/临时文件/解码队列、`sky-gpu-textures`、Canvas 代次和页面重试。既有 owner 可复用，未发现需要改变代码责任或新增依赖的依据；本轮只增加两条跨 owner 检查。

## 正常与恢复链

- `sky-native-image-chain.test.ts` 读取仓库正式 W3 manifest 的实际图块字节，核文件长度及 SHA，经过真实 `startSkyArtworkRequest`、`createSkyArtworkLoader` 和 `createSkyGpuTextures`。旧图已上传时新图请求中的一个写入被取消，迟到的写入只清自己的文件；新图解码失败仍保留旧图，显式重试后新图进入 GPU，旧 GPU 身份被释放；最后所有已持有临时文件及纹理释放一次。
- 同文件再以实际 Clementine 月面 JPEG、2MASS 银河 JPEG 和 OPAL 木星 PNG 核 manifest 长度/SHA、编码尺寸、同一原生请求/解码/GPU路径和释放。这里的图像 `onload` 与 WebGL 操作由可控 native port 驱动；字节是真实发布资产，画面像素不是微信结果。
- `sky-native-image-owner.test.ts` 执行生产 `useSkyNativeImages` hook 的 effect：相同 Canvas 下出版版本变化、Canvas 节点/代次变化，在 effect 清理前的渲染即不暴露旧图；新 owner 请求并解码另一张图片；hide 撤回并释放。与已有 `sky-canvas-lifecycle.test.ts` 的重建/晚回调、`sky-artwork-loader.test.ts` 的队列/粗层/GPU失败、`sky-fixed-image-status.test.ts` 的清单刷新保留一起覆盖边界职责。
- 页面当前 `wideFieldEnabled && presentedFov>=60` 时关闭2MASS hook，渲染器亦互斥；W3 selector最多12张512²图（12MiB RGBA），共享 GPU owner 16MiB。各图片 hook 分别保留自身解码图，16MiB不能解释为整页CPU或设备峰值限制，P4继续开放。

## 检查与限制

- 新增两条链、Canvas owner、原有请求/队列/Canvas/固定图状态共24项定向检查通过：[组合日志](a2-image-boundary-final-2026-09-24.log)。新增正式资产第三用例最终3/3：[资产日志](a2-native-production-assets-2026-09-24.log)。Mini typecheck通过：[日志](a2-native-image-typecheck-final-2026-09-24.log)。仅增测试，未改正式运行代码，不因测试改动重建活动WEAPP输出。
- 这是 native port 替身下的请求/缓存/GPU归属检查；正式微信像素、Canvas与WXML合成、Android来源返回已知失败、iOS、实际峰值内存/帧耗时仍需后置目标验收。先前正式镜像与本地 HTTP 资产验证见 INDEX 的历史 A/B2 证据，不由本测试重证真实部署。
- A2 阅读发现独立的 C 分支缺口：生产未配合格光学出版时页面仍可能请求关闭的 optical manifest，并把404呈为“重试光学影像”。此项归 C 的商业可用性/显示语义，须在 C/D 前修；它不改变 A/B 依赖顺序。须以当前实际普通商业配置复核，不将静态阅读误记为已观察到的线上故障。

A 的数据链 A3 仍待；本证据不宣布 A 或 Goal 完成。
