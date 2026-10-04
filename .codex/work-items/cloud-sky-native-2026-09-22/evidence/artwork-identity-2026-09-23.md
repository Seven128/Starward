# 同内容图片的瓦片身份修复（2026-09-23）

责任在 `apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts` 与 `use-sky-artwork.ts`，消费者包括星座图、W3 红外、候选光学 HiPS 和月/火固定贴图。原队列按 SHA-256 复用一个已解码 native bitmap，这一资源复用正确；但用于触发 `update` 和 `emit` 的变化键也只有 SHA。两个位置不同、图片字节相同的瓦片依次被选择时，第二个位置不会进入 `images`，旧瓦片身份仍留在绘制快照。原 `retainedImages` 又从首次下载资产的 ID 推导，可能将粗层回退投向旧坐标。

新增回归先在未修代码上失败：从 `order:1:4` 切换至同 SHA 的 `order:1:5`，实际仍返回前者。修复后以 `(id,SHA)` 判定要更新的身份，解码条目保留当前所用 ID 集；一份 bitmap 可同时供两块同内容瓦片使用，切换到下一层后仅保留最后选中瓦片的坐标身份，未重新下载或解码。旧资源释放、失败/重试及 Canvas owner 仍沿既有路径。

定向 `sky-artwork-loader`/request/optical-selection 11/11；Mini 全量 804/804；Mini TypeScript 类型检查退出 0；`MINIAPP_ISOLATED_CHECK_BUILD=1` WEAPP 构建退出 0。日志：`artwork-identity-mini-tests-2026-09-23.log`、`artwork-identity-isolated-build-2026-09-23.log`。构建仍有先前 CSS 顺序、页面/common 包体积及 webpack 性能 3 类警告。增加同时两瓦片共 SHA 的断言后，队列定向 5/5 复跑通过；无需重复全量构建，因为此后只改了测试断言。

官方 wechatide 能打开 `dist/weapp` 窗口，但本轮 `simulator_screenshot` 超过一分钟仍未返回；终止等待并关闭本轮窗口，没有产生截图文件。上一轮独立 `dist/weapp-check` 的 currentPage/console 同样无响应。没有占用 Android、ADB、扫码、发布或联系数据方。WebGL 实际瓦片像素、目标设备内存/帧耗时与 PS1/SkyMapper 商业分发权利仍开放；本修复只解决已解码图像的身份与坐标一致性。
