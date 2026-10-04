# B3/D：地景 GPU 失败与资源重试

**共享图片 owner 现能区分下载失败和 GPU 失败；地景公开重试只在 GPU 失败时重建 Canvas/GPU。** 普通细图下载失败继续保留有效粗图。生产软件 WebGL 的一次真实着色器编译失败和重建已验证；clean-v8 在开发者工具的正常公开进入、2K 已绘来源及上下文回读已验证。原生 GPU 故障恢复、手机及完整体验仍未验证。

## 修复及责任

`sky-artwork-loader.ts` 的 `failed(image)`只处理已解码对象的 GPU 失败，锁存相应失败原因。`retry()`继续按既有规则重试失败资源，并返回是否需要重建 GPU；下载失败不要求退休有效粗图。`use-sky-artwork.ts`把这个结果交给消费者，`use-sky-landscape.ts`仍复用同一图片队列、发布/Canvas 代次和独立 alpha owner。页面的地景公开重试据此调用现有 `sky-canvas-lifecycle.resize()`，没有另建渲染器或资源缓存。

生产地景图片程序会锁存失败。以前细图触发程序失败后，随后粗图也被同一程序拒绝，但未通知图片 owner；粗图因此仍标为可用，可能让失败提示消失，且只重下图片不能清除程序锁存。修复后，锁存分支会报告当前受影响的图片，公开重试能重建 GPU。图片不可绘时仍由现有 scene 提交真实成功的程序模型及其 mask/披露；它不能冒充照片，也不能把下载完成当成成功已绘。

## 适用验证

[生产故障脚本](../scripts/experience-landscape-gpu-retry-2026-09-28.mts)读取原发布两档 PNG，实际浏览器解码并执行生产 GPU、TWGL、共享图片 owner。只对地景 fragment 一次追加编译错误，走真实编译失败；不修改生产候选，不伪造图片/绘制返回值。再将修复分支有界恢复为原锁存分支，比较实际消费者差异。

- 原分支：细图失败、粗图同样不能绘制，但只收到细图失败通知，粗图仍留在可用集合。
- 修后：细图与随后尝试的粗图都进入 GPU 失败，模型实际绘制；重试明确要求新 GPU 代次，原版 2K 图片恢复，恢复图与模型输出有实际像素差异。
- 两个条件的 GL 均为 0；最后纹理 2/2、程序 9/9、缓冲 8/8、着色器 18/18 创建/释放均配对，图片 owner 释放全部成功解码对象。它们是组件分配和释放证据，不是 native/GPU 总峰值或目标帧耗时。

详[实际结果](../../../../output/playwright/cloud-sky-landscape-gpu-retry-0928/result.json)和[恢复后的生产图片](../../../../output/playwright/cloud-sky-landscape-gpu-retry-0928/production-after-retry.png)。共享 loader 的下载/GPU 区别回归在原实现失败，修后通过；受影响请求、取消/迟到、粗图保留、alpha 与 Canvas 生命周期检查通过，Mini 类型检查通过。原/新回归、受影响检查、Context结构及diff检查记录见[开发检查](experience-landscape-gpu-retry-checks-2026-09-28.json)；Context工具不验证普通Markdown链接或事实正确性。

## 当前干净候选

当前唯一活动项目为 `weapp-check-sky-combined-clean-v8-0928` / SDK9441、PID28924。SHA256 `3de4187e77a39bb05b8c4a050264537bcc21319f74331c246c65275ca96c095b`，257 文件、4,466,556B；raw main2,078,174B、sky952,710B，均不是官方包体。无诊断/mock/临时代次/vConsole/sourcemap。构建通过，三类既有 warning 未扩大。见[候选](experience-combined-clean-v8-candidate-2026-09-28.json)、[构建记录](experience-combined-clean-v8-build-2026-09-28.log)和[逐文件/服务回读](experience-landscape-gpu-retry-readback-v8-2026-09-28.json)。

官方 CLI 绑定 9441 后，经公开 Map 搜索示例点进入星空，切手动、提交00:00、搜索定位 Rastaban、缩放85°。已绘图片来源明确为原发布2K，来源作者与照片限制保留；最终普通DAY、地景/星座开、W3关、无跟踪/面板，Canvas 与真实 BFF Context 都为16Z。原生捕获前后状态一致，截图原始192×413；它只证明本条件运行与来源，不能与旧大图作清晰度比较。详[本代原生观察](experience-landscape-gpu-retry-native-v8-2026-09-28.json)。

核新代正常帧后关闭 v7，9440 已无监听。8789 PID14388/exec22711 及原清单/两 PNG 保持原发布 SHA；共享8787/8788未动。没有在 native runtime 注入 GPU 故障，没有推手机、云部署、提交或推送。

v7 的[实际整页共存、LOD/细图500及设置文件2→0→2](experience-landscape-lod-coexistence-2026-09-28.md)保留原候选条件，不能自动升级为 v8 的原生故障恢复。故障版重试200网络行未及时收集的限制也保留；真实失败、已绘恢复和还原分别解释。

## 下一依赖

仍按唯一 PLAN 回到 B3 整页昼暮夜、局部/全天、普通/红光、浏览辨认与 C 影像组合质量，以及 D 未覆盖的稳定性。固定照片照明、亮晕、源条纹/复杂遮挡和其它配准不能由 LOD 或免责声明认定通过。用户暂不能用真机；姿态/校准、OS 后台、Android/iOS、首屏/帧时/峰值/流量/官方包体、独立审查与实际费用继续开放。商业范围、排除理由、成本和自主代码边界不变，新月面仍未推手机，旧 D 不能验收新版。Goal 保持 active、无预算。
