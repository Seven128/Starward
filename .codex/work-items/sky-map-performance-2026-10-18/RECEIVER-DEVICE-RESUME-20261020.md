# 接收机设备恢复

当前状态：`LOCAL_SERVICE_READY__USB_HTTP_VERIFIED__AUTO_PUSH_RESULT_UNKNOWN__PHONE_UNBOUND`。
用户已恢复完整Goal并优先三类叠层、正常播放及六字段快速调时。以下仅是继续实际性能工作的准备，不关闭任何产品验收。

## 当前候选与服务

- 当前源码完整构建：`tmp/r17-normal-a1-review-r10-usb/manifest.json`；source binding `09dca55e3c5f9421812d4602ce2ccedf53534b61b4bf4e9889122b98c57e6ca9`，bundle `669e8ee3ee2b5af0eac7807b15e5db57a582c5c705d61da150900da390a2ca4c`，337文件/5,003,598B，main余量103,220B，31份map留包外。沿原r10完整正常路径、15秒metrics和60秒同run Pause，不恢复gen24或gen26。
- 原builder仅补显式`STARWARD_R17_RUNTIME_CONFIG`、Windows模板CRLF归一，以及显式`--usb-reverse`输入和独立输出目录。LAN仍拒绝loopback；USB仅接受配置中明确`transport: usb-reverse`和`127.0.0.1:8798`。原LAN完整包及source保留，未送达手机。
- 本机复用既有`data-handoff-20261018/isolated-pg-data`的r6恢复库；原逻辑dump841,634B、SHA `1199bd4710b7760795655dbf5deb63ca90037d6c315a5be4eb19d52fad74f5be`，先前独立恢复证明73表/22迁移，当前再次核PUBLISHED inventory和只读连接。更早working集群虽通过发布查询，但备份时缺系统文件；未拼文件/覆盖修复，未作为当前API数据源，确认无其他客户端后已正常停止本轮启动的该集群。
- API loopback8799使用当前Postgres repository、独立MemoryCache和既有明确SAMPLE_DATA天气adapter。禁迁移、提醒、acceptance/fixture全局开关，连接默认只读。LAN/USB公共桥继续剥离身份头、限制路由和写入，沿同一32文件collector。原8791、账号、N05、R6不动。
- 复用本机已恢复Map静态包`89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0`的524成品和热点terrain metadata；原r6数值输入仍在。Sky实际消费者补齐LFS catalogs/images及原lock的opencc-js1.4.2；资产与lock没有源码变更。
- 实际公共搜索200、匿名Context resolve201、完整Sky200/SAMPLE_DATA（917,193B）。这些只证明本地消费者就绪，不是真实天气或手机性能结果。

## 设备和网络

用户说明电脑/手机同处需房号认证的酒店Wi-Fi，VPN和TUN必须保持开启。默认选择Meta；物理WLAN存在同子网路由。用户明确授权一条仅该手机的ActiveStore临时直连路由。实际直连TCP仍超时、无线端口在手机监听、WLAN邻居Incomplete；不推断酒店具体配置。

本轮专用路由和限定手机/程序/8798的防火墙规则已实读移除。未关闭、重配VPN/TUN或修改原配对。

当前改用官方ADB reverse的USB通道：先检查既有映射，再用`--no-rebind`建立仅`tcp:8798 → tcp:8798`，实际手机HTTP200。保持USB连接。只在完成本轮后移除这一已绑定映射，不能`--remove-all`。一次性Toybox HTTP探针必须保stdin短暂开启；仅TCP建立或命令exit0不证明收到响应。

私有运行根为`%USERPROFILE%/.starward-private/sky-map-20261020/device-resume`，含runtime/API配置、collector、USB映射绑定、网络清理读回及HTTP输入。原件不入Git。当前loopback桥入口是任务`tmp/r17-normal-phone-bridge.mjs`，API入口`tmp/r17-normal-profile-api.mts`；这两件、完整USB候选和未完交付判断所需原件已通过原owner-only Drive保存、独立读回和新目录2,642文件恢复，见[恢复回执](RECEIVER-DEVICE-TRANSFER-20261020.json)。凭据/API私有配置、数据库、node_modules、活动日志和二维码未进入此包；未变输入继续复用原恢复owner。

## 下一动作

用户随后明确要求使用推送。原QR generation1已由现有feedback owner退役；同一feedback当前generation为`generation-000002-aU7Lag`，完整包哈希不变。legacy `auto-preview`进程退出0，但返回只有CLI进度形式，封装未取得结构化业务终态/任务号，当前`official.disposition=unknown / result_unrecognized`。没有把exit0或画面作为官方成功、没有重复推送。一次guarded只读capture见Starward已有Map和TW marker，USB桥只有root预检请求，尚不能绑定新包；该图不提供新候选输入授权。已请求用户说明是否收到并打开开发预览推送，不读取微信消息列表。

已定位封装适配缺口：当前安装的公开`wechatide -c Codex auto_preview`提供结构化业务结果；旧兼容CLI只输出spinner。现有`device-feedback-official.mjs`已改为在同一明确Electron安装具备`skill-index.js`时使用该公开入口，保Codex client、pending任务号和未知/失败禁止自动fallback。独审发现的“调用前port拒绝误记UNKNOWN”已修，0次调用为not_invoked可恢复，真实调用后timeout仍保unknown；42项相关检查通过，独审无剩余P1/P2。这是后续调用的修复，不能倒推原generation2或gen26成功。实际推送结果/当前新包画面成立后，才绑定并开始原PLAN地形跨覆盖及正常Play/六字段观察。

memory watcher可显式第五参数`usb`；`STARWARD_R17_MEMORY_ROOT`选本机私有输出，禁止checkout内路径。沿原时钟锚点和取样语义，不补写旧r10记录。5项anchor和4项项目skill检查、Context结构检查已过；尚未运行手机memory watch。

必要独审已核原LAN适配的原始模板哈希、LF/CRLF同1583输出、两份完整包，以及只读API/原桥精确边界；USB边界随后增补，仍需随实际运行核其输入/输出。未把准备或历史独审当当前手机验收。
