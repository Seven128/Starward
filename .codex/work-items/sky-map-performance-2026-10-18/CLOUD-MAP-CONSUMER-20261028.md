# 云量 Map 第三消费者：接线、生命周期与构建

归唯一 PLAN P2。用户再次明确“继续吧”后，Root 复用暂停增量完成接线、责任层检查和普通 WEAPP 同步。**软件实现已完成本轮检查，新 grid 实际显示、三层合成/物理释放与完整 Goal 仍未验。** 当前状态只归 HANDOFF；没有修改 PLAN、数据资格、运行数据指针或正式 ready。

## 已完成的地址与文件边界

Root仅修改`src/services/map-raster-files.ts`及原测试：旧地形/夜光相对API路径保持；新云量只准入原静态object key形状的canonical HTTPS完整URL，路径为`/v2/cloud/assets/<numericManifestSHA>/cloud-<descriptorIdentity>.png`。拒绝业务API同HTTPS origin、凭据、query/fragment、路径转义/dot段与非canonical端口；没有新增编译变量、开发origin或业务API云图fallback。实际URL仍须来自后续已资格的API/正式静态发布，格式准入不授OSS/域名或来源资格。

原8files/16MiB/2transfers、哈希校验、writable路径及native pins共用一个owner。Root及fresh独审各运行原文件9/9通过，混合三类消费者没有扩编码文件/传输限额。fresh审阅源码SHA `5bec15b3e569a7d77ed48bae0550c4e35e4168cfb1185ae81846d77079f9d9bb`，测试SHA `c83e5ed19bffbdd7f326e9c1f28208f162e12bd254daec4f6788888f493849e6`。这些不证明三层解码/native总像素预算、实际OSS传输、合成或物理释放。

## 继续后的完整接线

暂停时全部增量已保留，原中断代理不复用。本轮新代理分别完成 projection/hook 和共享安装器，Root 完成 Map 消费者、错误/来源接线、集成检查与构建：

- 新`src/services/map-cloud-raster-presentation.ts`：云图与当前 Context/pin/精确 UTC 时刻、源版本/原生两端与权重、完整来源记录、有效期、固定窗口及内部覆盖、像素质量和 URL 双 hash 的窄身份投影。有效零可用；部分支持保 PARTIAL；未准备/全缺测/范围外/过期/读取失败保不同含义，READ_FAILED 进入原错误链。
- 新`src/hooks/use-map-cloud-raster.ts`：数据候选沿自身校准时钟/到期；视野暂时未知不误清仍有效的旧覆盖，不拉伸旧范围。新 Context/pin/精确时刻、关闭和过期沿原退休责任处理。
- 改`src/hooks/use-map-cloud-presentation.ts`：旧v1 polygon/snapshot与新grid路径分开。
- 改`src/pages/map/use-map-raster-installation.ts`：可选 `retentionKey` 只由云量传入；换 pin/精确时刻须沿原 coordinator 取得真实清理确认。修复离开期间身份变化、随后取消离开时的 clearance 等待：resume 先关联最新清理票据，再恢复原安装。失败保 unknown/native 占有，不自动 busy 重试或超时清 pin。
- 改`src/pages/map/index.tsx`：新 cloud IDs91305/91306、zIndex2，旧 terrain91301/2、night-light91303/4 不变；共用 `useRasterImage`、installation 及三层 suspend/resume。来源只随真实安装回执前进，逻辑关闭或 Context 切回旧路径不能提前撤去尚在 native 的旧来源；保原身份/署名/质量并注明实际图像 UTC 时刻，真实退休后才撤去。终态清理失败不再被 metadata fetching 压成永久加载。布局、采用设计和其他业务不变。

暂停时七份源码身份仍保留在 [CLOUD-MAP-CONSUMER-PAUSE](CLOUD-MAP-CONSUMER-PAUSE-20261028.json)，仅为历史中断身份。当前校验/源码 SHA 绑定在下方新 receipt。作者检查和 Root 集成不冒额外独立终验；现行 AGENTS 已无强制逐项独审门槛，没有因此增加第二套方案。

## 本轮实际检查与普通产物

Root 在 `apps/wechat-miniapp` cwd 沿原 tsx/Node owner 运行十个受影响文件：cloud consumer、共用 raster feedback/query retirement、旧两层 presentation、installation、native session/coordinator、纯 cloud raster projection 及旧 cloud presentation，**88/88 通过**。含实际 hook/coordinator 的受控 native 回调；Map 页胶水仍沿原 AST/VM 边界，不冒真实渲染。修前失败反例覆盖取消离开等待、未准备 URL 误准入、部分支持冒 FRESH、EXPIRED 来源失义和视野暂不可读误清旧覆盖。保真实移除前的 pin/来源、快速换身份只接最新和失败后的显式恢复。

初次整体 noEmit 找到显式 undefined 的可选 retentionKey、测试 scope 类型及缺 requestId 的 envelope；已修实际调用和完整 fixture，未弱化类型。最终小程序 **noEmit exit0**；受影响两文件再跑 **21/21**，这是 88 的子集复查，不加总成 109。原地址 owner 9/9 及已有效证据复用。

完整普通 build exit0，53.933s、10 项既有 warning；**337 文件 / 5,133,303 B / SHA `2c8f26c89f7996c39a95a0e09a8560ca47ea48e60cd4c830276d9c7aa1f05e60`**。原 budget owner 核 main2,080,018/content1,068,591/spot613,133/sky1,371,561，均在既有上限；production inspect 21 routes 通过，原 compiled Sky owner 核默认 API/资源角色通过。构建环境没有 MINIAPP/TARO 覆盖，普通 loopback API、fixture/diagnostic/release/operator 关闭。

私有证据根 `E:/Dev/Starward-data/development/terrain-d1-20261028`：`cloud-map-ordinary-build-20261028.json`（含本次源码 SHA）、`cloud-map-ordinary-fingerprint-20261028.json`、`cloud-map-integration-tests-20261028.log`、`cloud-map-typecheck-final-20261028.log`、`cloud-map-final-type-fixtures-20261028.log` 与 build log。2c8f 是本阶段结果；随后地址兼容修复后的当前 ordinary 见下节。

旧 ordinary287296 已先完整复制到 `ordinary-before-cloud-20261028/weapp`，337 文件/5,121,623B/hash 与原件一致，receipt 保留。plain 手机 edc731、D2 f40 及 gen34 均未重建/覆盖，只保各自原证据范围，不能冒最新云量 Map 整包。

官方 Skill0.3.14/login 可用；只刷新精确 canonical `E:\Dev\Starward\apps\wechat-miniapp`，receipt 后另取完整 430×930 PNG 并目视实际 Map/banner/工具/原测试地点卡片，再成功读 `pages/map/index`。帧 `cloud-map-ordinary-first-frame-20261028.png` 是 desktop simulator 普通路径/同步证据，不是新 grid 图片、三层原生合成或手机证据。未新开窗口、预览或推手机。

## EOG 最终图片 HTTPS 的同 owner 兼容修复

继续核已准备成品的真实消费者发现：原 `validMapStaticRoute` 接受最终 `nightlight-contrast-v1-window-…png`，但相同路径加独立 HTTPS origin 被 `mapRasterAssetUrl` 拒绝。只在原文件 owner 复用云图的 authority 校验，窄接该原合同路径；旧相对 r6/地形路径、文件/hash/native pin 与三层共享预算不变。拒绝同业务 HTTPS origin、凭据、query/fragment、dot/转义路径、非法端口与非最终 EOG 文件，没有新的配置、BFF ready 或正式 URL。

作者修前反例失败、修后原测试9/9；Root读回原静态合同与实际调用，独立复跑同文件 **9/9**、小程序 **noEmit0**。源码 SHA `0b0bb910aa66ddf2b9e6881d23064f70714ae7d2d6aff7421f479dd36628a569`，测试 SHA `2f12cf335894eae104703245292cad38c537bf6b5c30aa5bdd447974293efa0f`。没有真实传输或图片生产。

这两文件使当前 ordinary 更新为 **337 文件 / 5,133,461B / SHA `6bebfcab63eb35b424652154d322bd34e235b9a0a204864097d662b0a9b12434`**。完整 build44.879s/exit0/10既有warning，main2,080,176、其余三包与2c8f相同；原 budget、production inspect21 routes及compiled Sky角色通过。当前receipt为私有根 `eog-final-url-ordinary-build-20261028.json` / `ordinary-weapp-build.json`，完整指纹、测试、类型和build日志同前缀。2c8f原receipt/帧保其历史范围。

canonical再次官方refresh后取得完整430×930 Map帧 `eog-final-url-ordinary-first-frame-20261028.png` 并成功读取同一路由，目视原Map/banner/工具/卡片可见。仍只证明 desktop 同步与普通路径，未证明EOG独立HTTPS真实传输、新grid合成、手机或完整目标。Context显式入口结构校验通过，不冒普通链接或内容事实审核。

## 仍保留的资格

源组 UNKNOWN/formalReady=false、新云量 Map BFF 仍 not-ready/503、无正式 imageUrl 或 runtime activation；没有用九张 pilot 冒全国产品。三层最多六个固定 slot（含未知操作）不等于已验解码/native总容量或物理释放；实际合成/资源回落、全国规格/质量、全部消费者切换/回滚、OSS/CDN、持续批次、容量及 OOM 仍未完成。未动原件、旧 r6/URL、DB、worker、FW、VPN/TUN 或手机；本机 IDE 仅做上述普通产物同步。
