# WEAPP 原生 TabBar 派生件

微信官方预览要求每个原生 TabBar 图标不超过 40 KiB；采用的 256px `map--day--selected.png` 为 46,063 bytes，不能直接进入 `app.json`。

本目录四个文件服务原生 Map/My TabBar；主包“我的”页的 DAY 默认头像还复用其中的 `account-user--day--default.png`，按最新设计显示为 36px，避免再打包一份 224px 派生件。用户已保存的头像仍使用原图，内容分包的默认头像仍使用其本地 224px 运行时派生件。

这四个文件从采用包同名 256×256 RGBA 母版以 Lanczos 缩放为 192×192 RGBA PNG，保持完整透明画布、色彩和状态构图，不裁边、不转调色板、不覆盖母版。由相邻 [`weapp-runtime/generate.py`](../weapp-runtime/generate.py) 统一生成：Pillow 12.3.0 的 `optimize=True`、`compress_level=9` 后使用离线 Zopfli 无损压缩，逐像素校验模式、尺寸及全部RGBA（含透明区域RGB），仅接收更小的结果。当前文件均低于 40 KiB；其余消费者按各自运行时资源入口取用。

精确源哈希、输出哈希和字节数由 [`weapp-runtime/manifest.json`](../weapp-runtime/manifest.json) 的 `tabBarVariants` 维护，避免生成器与静态表分别拥有当前值。
