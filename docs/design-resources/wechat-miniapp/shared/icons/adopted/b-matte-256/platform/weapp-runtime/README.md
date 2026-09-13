# WEAPP runtime derivatives

本目录只服务微信小程序发布包。采用源仍是上两级 `assets/` 中的 71 份 256×256 RGBA PNG；运行时派生以 Lanczos 等比缩放到 224×224 RGBA PNG，保留完整透明画布、锚点、颜色、状态和构图，不裁边、不转索引色、不重绘。页面内图标的实际展示尺寸不超过 96px，因此该派生仍有至少 2.3 倍像素余量。

派生原因是微信预览按主包源文件计算 2048KB 限额：直接复制 256px 采用源时，真实上传报告主包 2088KB。原生 TabBar 另受单图 40KiB 限制，继续使用相邻 `weapp-tabbar/` 的 192px 专用派生。

使用工作区随附 Python/Pillow 执行 `generate.py`。`manifest.json` 记录每个源文件与派生文件的 SHA-256 和字节数；生成过程会断言源为 256×256、结果为 224×224 RGBA。
