# P2 真实夜光发布、消费者与状态资格

2026-10-25。沿唯一PLAN的P2继续，仅微信小程序。复用当前r6、完整源码和原数据owner；没有重下载EOG、重产r6、重做Horizon主机API、修改App或后置性能。

## 已取得的真实供给证据

- 当前源码隔离API/PG副本的 `backend:data:check-db -- --config <existing-private-config>` 退出0：r6公开文件1544件/234,624,578B逐字节核对，当前副本26条migration、夜光publication资格通过，mutation=false。原服务/原库未改。
- 沿既有MapStatic公开窗口读取 `/v2/map/night-light`，实际200/FRESH，返回r6栅格而非fallback。dataset=`eog-vnl-v22-2025-gba-fixed-20261017-r6`，publication=`nightlight-window:895d306362425eb6e060e19d3567ba39e9e4b3f24ed43fd5ff92ba0d5512ba6f`；有效像素131072/131072，所有缺测/未发布/质量不足计数为0。此样本不证明零值/缺测场景。
- 栅格方法 `starward-eog-fixed-radiance-v1`、样式 `starward-vnl-fixed-bands-v1`、坐标网格 `gcj02-mercator-pixel-centres-v1`，单位nW/cm²/sr，先有效面积加权均值再着色。来源为EOG年度2025估算，validFrom=`2025-01-01T00:00:00.000Z`，不能冒实时天气或SQM。
- 实际跟随imageUrl取得PNG，200/4276B，字节数和SHA256均与响应声明匹配；SHA=`b6f09db480cb146e50acdb7a16e4d9567fb2751727136cbb6d6aa0288047be7a`。实际查看512×256原图，131072像素非透明、3种RGBA颜色，非空。这只是主机图片证据，未证明微信安装/配准。
- 首次实际WEAPP的过滤Network同样200/FRESH，publication、像素数、4276B及SHA与上述样本一致。刷新后另一实际窗口200/PARTIAL、有效76032像素、无failureCode；不能把不同窗口覆盖或缓存日志冒同一React状态。

## 实际消费者的首个未通过边界

Root在当前正式Map项目实际点击图层→光污染。初图底图可读，未见可辨认的夜光覆盖；sheet显示“光污染资料更新失败，暂时保留上次结果。重新加载地图”，没有年度/单位图例。

这没有建立原生安装或配准通过。`layerProjectionProbe`只来自polygon，不证明raster；READY文案和credit缺失本身也不能证明presentedData为空，因为STALE分支不呈现READY图例，credit可因无强制声明而为空。当前完整heading读回1997字符，地形关闭、无source-button/来源id/标签，仍保运行状态/加载身份疑点。

当前请求→认证operation→query→nightLayer没有裁剪raster；实际编译Map JS也已含下述新表达式。网络日志没有可与当前React状态绑定的请求身份，不能由网络200倒推已安装。普通刷新、精确关闭后同路径重开未消除此差异；没有继续点“重新加载地图”或猜改z-index、相机/图层实现。

最后针对源码/完整产物与运行结果不一致，仅对同项目调用一次官方 `cleanCompileCache` 后刷新，未清账号、草稿、业务storage或session。沿正常图层按钮再次选择LIGHT后，先实际读到LOADING，再在结算后读到ERROR：“暂时无法获取数据／光污染资料暂时无法获取。重新加载地图”；原图已实际查看。`p2-light-settled-target-20261025T082035685Z.png`为484×1047，实际失败状态不再冒旧结果。此前几次带fixed/refreshed命名的原图仍是STALE，不算修后通过；此处的通过仅指失败含义和可见状态，未关闭原生叠加。

## 已完成的窄修与检查

源码反例独立成立：旧 `lightLayerContentState.hasData` 仅凭nightLayer元数据就赋予STALE资格，即使首次栅格尚未呈现。现只接受真实presentedData，或无failureCode且无需安装的合法无raster/无覆盖结果。保真实旧安装的STALE、合法zero-valid/no-raster的EMPTY和provider failure的ERROR；请求、安装、退休与恢复owner不变，未改设计外观或重生成资源。

- 现有presentation状态旅程先加反例：修前4pass/1fail，metadata-only首次失败实际STALE≠应有ERROR；窄修后相关presentation/selection/installation共19/19、0skip。
- 新独立只读审阅未发现must-fix；另一次责任追踪确认没有客户端丢raster转换。审阅未替代Root实际目标验证。
- Root微信workspace类型检查退出0；canonical与隔离完整构建均退出0，保既有10项webpack/CSS警告。完整产物仅 `pages/map/index.js` 改变，未反写源码。
- 新canonical SHA=`0acc0719b1629f6772822d6c8896d35ddd9a6754171aa01a61d375e02e6d7f91`，339件/5,037,266B，主包2,025,904B。
- 新隔离SHA=`5e4145399b7e413eea8b6839d40a0c9d0243eaa0535d8ec0a173793e166c0a90`，339件/5,037,246B，主包2,025,884B。20B来自API origin差异；两份包体预算及编译Sky地址owner均通过，preview credential不存在。
- 旧413a/2d68完整产物在私有owner内复制保全，首尾fingerprint一致；s5关闭前又核5e414539与最新源码同步。原手机58dc及此前szzwZq/413a候选原件保留，均不冒本次0acc新源码候选。

源修正确性、目标UI结果与夜光功能完成是三件事。本批尚未证明原生叠加、实际配准/零值缺测或手机结果；P2及完整Goal不关闭。

## 后续普通概览图片消费者与交付

同一正式隔离测试点的大档地形概览已取得实际正值：最终地形为Copernicus GLO-30，PARTIAL/局部缺测；年度夜光为r6 AVAILABLE栅格、262144/262144有效像素、8760B，publication=nightlight-window:a84b1896b84401eb87506abf078dcfe606891f3720c9e210c4b54d516f02adcf，SHA=6c952cb091d13a02b353c187dd04196bfc32ee52290e05a886a246a6d05e670f，GCJ02网格/nW/cm²/sr/2025-01-01年度含义保留。早先Terrarium父预览与最终Copernicus分开记录，未冒最终同一来源。

实际Image节点存在，5km外圈/1km标尺/北东西南/中心点可见；夜光关闭时绿色地势可辨，恢复开启后同位置出现年度夜光金褐色栅格和五级图例。Root已实际看两张原图：p2-spot-light-off-settled-20261025T085100858Z.png与p2-spot-light-on-boundary-20261025T085542889Z.png，概览边界/中心标记保持同位。初次纯程序滚动仍受来源返回锚点控制，位置不同比较被排除；后按公开coordinate touchstart/move/end完成接管再收图。恢复后一次offset读回失败，currentPage仍Map、原生截图和Image查询有效，没有重放开关或改源码。该失败读回不冒产品无图。

此处证明普通Image下载/解码/合成消费者可实际工作。其a84b/262144像素素材不同于原Map的895d/131072像素素材，不推出原Map同图已下载/安装或配准通过；共享下载owner的准入复用，native Map失败仍保留。

本批2源码/测试+3任务文档已提交推送为a37b3dbbe428bf7198f07bcc497115cf4f1fee23，main/origin为0/0、暂存为空。Product40176716041和Context40176715978成功：小程序release code、backend/WEAPP构建、隔离基础设施、候选和OCI实际执行，既有App/API/admin消费者步骤按affected范围skipped；实际API995pass/74skip、WEAPP2822pass/1skip，resource preparation另有既有skip。staging40177424974 qualify成功、发布前host_preflight_disk_below_10_gib失败，镜像发布和promotion均skip，未部署。未清理/重试容量，不为这些本地回执另造docs-only提交。

## 后续一次故障实例恢复

Root未把离屏extent按钮作可见动作：实读其left=-80后，改在实际可见的handle执行coordinate touchstart(195,122)/move(195,420)/end，真实大→中，class=spot-panel--medium及原图均已确认；没有关闭面板或清选择。

在已有实际Light ERROR/“重新加载地图”状态下，通过可见恢复按钮只执行一次。实际map.id由spot-map-1换成spot-map-2，前后时间文字均10/25 21:00。新实例结算后图层仍ERROR并提供相同恢复入口，随即停止重建；不据此声称native叠加恢复、面板返回位置、旧资源物理释放或OOM已解决。

此前真实点击已就绪Sky按钮后仍停Map，Console仅确认sky_entry_navigation_failed有一条、timeout无；日志刻意没有任意native错误文本，仍不能区分cleanup.ready=false与redirect失败。之后按现有session边界刷新当前小程序运行，未清账号/storage/session或动原服务；指纹仍5e414539。未打开图层的新运行从Search选择同一点后，正常Sky按钮实际进入sky/detail/index，见P3续记。这是独立入口恢复，不冒F04旧资源退休完成，也没有再次请求Map fault successor。

原件归当前private run的p2-before/after-recovery-map-id.private.log、p2-before/after-native-recovery-*.png及对应有限日志；09:15大→中手柄原图亦保留。

## 原件归属

全部原始Network、截图、PNG、db/check/build/readback/保全和实际状态回执均在既有私有entry的 `sky-current-4086cb4f36b44324` 下：`p2-night-light-*`、`p2-light-*`、`p2-*-built.private.json`、`p2-prebuild-preservation.private.json`。没有上传私有原件或打印headers/账户/实际私有坐标。当前状态和唯一下一步只归HANDOFF，本文不是第二计划。
