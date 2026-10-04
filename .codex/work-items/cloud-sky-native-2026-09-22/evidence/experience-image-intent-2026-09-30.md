# 星座关闭与局部返回：共享图片 owner 修复

星座显示关闭后，旧页面仅提交空的图片需求，仍将共享加载 owner 保持为 active；已经解码的图片、编码文件和 Hook 状态因而继续驻留。页面现在把现有星座显示意愿传给同一 owner 的 active 输入。关闭显式退休请求、文件及 owner-tagged 状态；再次打开创建新的 owner。仍处于开启状态的局部放大只退图片需求，保留既有有界缓存，缩回宽角无需重新请求或解码。共享球面、配准、图片队列、解码和资源机制没有另建分支；原图清晰度与缓存额度没有变化。

这解决开关行为的资源归属，不代表完整资源峰值或整场体验已经通过。生产代码仅改 `spot-sky-page.tsx` 的 `useSkyArtwork` 调用条件。所有天体图片继续复用原有加载责任。

## 实际开发证据

- 同一回归读取真实页面调用表达式，再运行生产 Hook／loader／request；冻结修前页面时，关闭后的文件释放断言真实失败（0≠1），当前相关图片链 21/21 通过。最终测试、工作区 Mini TypeScript 检查与普通隔离构建均成功；构建原有三个警告保留。初期测试的异步提交顺序问题已修；根目录与工作区 TypeScript 版本不同，不修改配置或依赖来规避它们。
- [原始观察结果](../../../../output/playwright/cloud-sky-image-intent-0930/result.json)使用同一 60065 服务的真实出版 PNG／BSC 字节与原图摘要，真实 HTMLImage 解码，实际生产软件 WebGL 绘制和已绘帧点选。React effect 与原生文件回调使用受控适配；编码文件和 Blob URL 的计数来自该适配，不是微信原生文件系统或 GC 测量。
- 地点、2026-09-30 21:50:33／UTC+08 与实际 Altair 视角保持；390×844，宽角垂直 FOV 84.633°、局部 8.89°。17 张原图合计 494,470 编码正文 B，名义宽×高×4 为 12,320,768 B。修前关闭仍持有 17 张／17 文件／非空 Hook 状态；修后关闭这些 owner 计数归零，迟到写回也不能恢复旧状态。
- 开启→局部→宽角的请求仍为 17 次，原图无需重载。显式关闭→重开为新的 17 次请求，本次多传 494,470 正文 B；这是开发样本的重载代价，不是目标延迟、云账单或实际内存结论。
- 修前／修后的开启、局部、关闭和恢复画面逐 RGBA 与已绘拾取摘要一致；关闭确实改变图层像素，恒星场与 HR:7557 等真实点选保持。恢复与最初开启像素相同。观察结束后 owner 状态、受控文件及 Blob URL 归零，无页面／GL 错误。

实际图片：[开启](../../../../output/playwright/cloud-sky-image-intent-0930/current-wide-ready.png)、[关闭](../../../../output/playwright/cloud-sky-image-intent-0930/current-wide-off.png)、[恢复](../../../../output/playwright/cloud-sky-image-intent-0930/current-wide-restored.png)、[局部保留连线](../../../../output/playwright/cloud-sky-image-intent-0930/current-local-cache.png)。这四幅已逐一目视检查，属于自审。

## 候选与验收边界

普通 v48 候选已准备：257 文件／4,521,686 raw B／树 SHA `596ca70a782744e0a4a6e44efd8b85ff707afdb6ea2e3774f2dab55df135b9ab`。相对冻结 v47 仅 `sky/detail/index.js` 改变，增加 4 raw B；AppID 与源项目一致，诊断、测试夹具与反馈入口关闭。没有打开 v48 或推手机；raw B 不等于官方包体。

原生仍是 v47／s8 的欢迎页证据，SDK／当前 Sky／原生 Context／Canvas＋WXML 未取得。没有继续排队 SDK、刷新、重开项目或重建服务。服务仍为同一 60065／PID33832 epoch，原 Context revision1 及选定时刻不变；后台或软件输出不替代原生读回。[工具分流边界](experience-tool-startup-boundary-2026-09-30.md)与[冻结 v47 绑定](experience-scene-v47-binding-2026-09-30.json)保留原条件。

[本轮源码、候选、输入和结果绑定](experience-image-intent-binding-2026-09-30.json)记录最终文件摘要、检查入口与限制。原生文件删除／解码与 GPU 总峰值／GC／目标帧时、普通覆盖层／呼吸／完整旅程、面状纹理／灰白背景／条带／配准和昼暮夜组合、干净最终候选／官方包体／实际费用、最终必要独立审查与新版月面及 Android／iOS 手机验收继续保留。旧 v24 独立审查只保其适用范围，本轮自审不升级为最终独立审查。唯一后续依赖由 [PLAN](../PLAN.md)维护，全部有效商业范围及 33 项交付义务不变。
