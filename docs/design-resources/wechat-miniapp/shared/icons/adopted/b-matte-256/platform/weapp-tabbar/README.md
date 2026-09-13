# WEAPP 原生 TabBar 派生件

微信官方预览要求每个原生 TabBar 图标不超过 40 KiB；采用的 256px `map--day--selected.png` 为 46,063 bytes，不能直接进入 `app.json`。

本目录四个文件只服务原生 Map/My TabBar。它们从采用包同名 256×256 RGBA 母版以 Lanczos 缩放为 192×192 RGBA PNG，保持完整透明画布、色彩和状态构图，不裁边、不转调色板、不覆盖母版。生成使用工作区随附 Pillow 12.3.0、`optimize=True`、`compress_level=9`。当前文件均低于 40 KiB；其他消费者继续使用原始 256px 资源。

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| account-user--day--default.png | 18,956 | c7aa85953491fd060c1dbba9e43cf646335e2583f4dc44ea48a42213a314d7dd |
| account-user--day--selected.png | 19,989 | f4b2aa7b39d947ef6786b8414ec2ca47f5319a1901fc57b8ba9119d403febacd |
| map--day--default.png | 27,155 | 9019875c05308c5488403e46af3c9c8e329b776a2b45f642286b48101c48b500 |
| map--day--selected.png | 30,767 | 769b149a13f781d3cb75edf4decca84139a97057c779b0b4e644b3a596fe084b |
