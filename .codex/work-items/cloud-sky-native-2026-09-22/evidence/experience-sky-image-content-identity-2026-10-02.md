# 共享影像下载内容身份：持久缓存的前置边界

2026-10-02，root 实现，`sphere_grid` 独立审查。现有 `startSkyArtworkRequest` 在响应长度和 PNG/JPEG 尺寸检查后、写入文件和创建 native image 前，校验 manifest 声明的 SHA256 与实际收到的压缩字节。非法 manifest digest 在发请求前失败。同长度、同尺寸不再足以让换过内容的响应通过。

摘要计算复用 `miniapp-contracts/src/sky-image-display-support.ts` 的 `skyImageContentHash` 与已安装 `@noble/hashes` 2.0.1，没有新增依赖。原 encoded-display-support 的验证也使用这个同一字节身份函数。真实生产调用者已有 asset SHA，不新增 publication/API 字段；取消、迟到写入、解码尺寸和文件租约责任保持。

独立 [实际替换影像与有界绕过反例](experience-sky-artwork-digest-independent-review-2026-10-02.md) 和 [机器结果](../../../../output/sky-artwork-digest-independent-1002-r1/result.json) 绑定现源与实际已发布文件：有效 JPEG 改一个量化值，保持 68,725 B、512²、完整可解码，却改变 262,095 个像素。生产路径拒绝写入/解码；仅绕过 digest 判定的任务副本错误放行。它不是假装复原某个历史提交，也不是微信真机证据。独立实际 byte/dimension/decode、输入不变与 fixture 边界另有完整记录。

root 运行 request、file-retention、native-image-owner、native-image-chain 四个相关文件，36 项通过；这包括实际已发布 W3、固定天体、2MASS 的压缩字节，以及取消/返回/失败重试/独立文件释放。contracts 和 Mini 类型检查通过。普通 watch 继续编译，生成 common/sky bundle 已出现新 digest owner；未重启服务或派发开发器刷新。源码检查、编译和可控 native 回调不能认证当前开发器画面。六个 settings/outbox 保留文件逐字节不变，HEAD 保持 72e65cf3。

计算仅在下载响应成功后执行一次，不在渲染帧或原有保留文件再解码时循环。独立四文件桌面 1 warmup + 3 次测量见上述回执；其 Node/JIT 条件不代表手机帧时、native 内存、服务器容量或 200 DAU。

此修改只闭合 manifest-bound 公共下载路径的**收到字节身份**。独立 selected W3 request 仍需预先 publication/asset discovery 后迁移；其可变 URL 不能作长期缓存键。它没有实现跨启动持久缓存、写后 readback、磁盘损坏复核、配额/清缓存/版本迁移、静态出口部署或 native 验收；digest 也不能证明科学质量、素材许可或显示正确。唯一 PLAN 的共享影像质量/完整组合依赖继续，缓存仍是后续独立责任。
