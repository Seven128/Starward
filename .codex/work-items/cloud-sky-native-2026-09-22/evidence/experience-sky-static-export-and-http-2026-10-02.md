# 已获准影像离线导出与本地 HTTPS 出口

2026-10-02，唯一 PLAN 第3步的服务端前置实现。没有云部署、远端配置/订单/升级、下载素材或启动 IDE。生产 Caddy/Compose/release 此时尚未接入该 bundle，不能说正式 Sky 已减载；200 DAU、12Mbps和混合业务容量仍待实测。

`workers/miniapp-api/src/sky-public-asset-export.ts` 从现有固定 publication owners 枚举已采用文件，每份由原 owner 先验清单/来源/实际字节。没有遍历 assets 根目录、开放任意磁盘文件、采集上游或开启 trial。导出包括现行行星/月面 coverage、旧 Moon hash 同字节 alias、银河、地景两级图/alpha/原许可包、W3十二基础面/properties、星座图/geometry/原 notice，以及现行六个 SDSS 对象三级。selected W3 可变 URL、未采用光学来源、raw science、账户/天气/投稿继续在各自既有 owner；本实现不改变其访问边界。

`sky-public-asset-headers.ts` 是 API 和静态导出共用的不可变资源响应头 owner。当前14个 asset handlers 已迁移，保持原 Content-Type、一年 immutable、nosniff、source label 及 SDSS field degrees；current discovery、来源/业务 API 与 selected W3 一天缓存不迁移。旧 Moon alias 常量归其原 publication owner，共享读取并保原确切字节。星座 notice 仍先由实际 owner 做 CRLF→LF，再导出实际出版字节。

导出只接受明确 hash-bound canonical paths；新目录由 invocation 独占创建，逐文件写入/全字节 readback，完成 index 与 Caddy fragment 后将 building child 原子 rename 为 `publication`。既有容器/完成 bundle 不重写、不删；失败 stage 保留且未 promote。index、脚本、暂存和额外文件不在公开路径表。fragment 只匹配确切获准路径、GET/HEAD与真实存在文件；缺文件继续由 importing site 的 API fallback 处理。preview 必须在其 operator authorized handle 内 import。旧版本库存合并/与 release image 绑定、正式 readonly mount及两种现有 Caddy profile 接入仍是下一依赖，不能由这次 fresh export 完成未来全历史迁移。

独立初核发现 `constellations/.../assets/.` 与 `..` 能被旧 regexp 接受，当前真实 publication 没有这类名字，但 shared boundary 不应接受归一化改变身份的路径。旧实际接受反例已由 sphere 冻结；现 export 与 fragment 共用 validRoute 拒绝 dot components及双 slash。URI 编码/查询/片段/未获准 family同样不准入。受影响 guard/header injection regressions通过，后续独审保修前/修后记录。

当前 fresh export：`output/sky-static-approved-export-1002-r3/publication/`；136 files，22,954,411 B，publication hash `4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a`。其中包含12,377,473B原地景zip与来源/geometry文件，**不是客户端启动下载清单或32MiB bitmap缓存库存**；只按视图需求请求。r2同内容产物保持，r1在 alpha-rle filename 点号 guard 处失败的未完成 stage也保留，未覆盖。

实际本地链：原 Nest image controllers/真实 owners → pinned Caddy 2.11.4 image → localhost HTTPS，以容器内部真实 public root CA校验连接，未关闭 TLS validation/安装全局信任。Caddy publication只读 mount，128MiB/1CPU/64PID是隔离试验限制，不是生产容量结论。独占 `output/sky-static-http-1002-r4/` 保存配置、adapt/validate、实际结果、日志、原 bundle/source前后binding。

- 全136文件实际 HTTPS GET，22,954,411B与每项 publication SHA/长度/响应头完全一致，API invocation 0。
- warm Moon及HEAD仍由static完成；HEAD无正文。此项不是客户端文件cache命中或公网账单。
- preview无token/错误synthetic token为404且API0；正确synthetic本地授权内交付原字节。没有使用真实凭证。
- current coverage manifest仍经真实API、no-cache；仅在隔离副本临时移走一个已出版文件，API回退交出原合法字节，再原路径恢复。源r2 bundle从未修改。
- index/fragment、served directory内未登记marker、错误版本、路径越界与错误method均404；未把任意 root 文件公开。
- 运行结束只停止/移除这次新建的lab容器，不移除镜像/volume/任何既有服务；Nest结束，当前源/原bundle实际前后不变。

r4 result 3253B SHA `e8f6ef3c1a1b90233a418fb153df1873084c0233045495d70844e09fc91951dd`；binding 85373B SHA `c96146bc14db60f0eaeef8a10bc1b6e9990fa947ef13738dc1298030300c2f38`。它绑定 guard 修前 exporter，但所有实际获准路径原本有效；r3 guard后新bundle需逐项与r2对照，不追溯改 r4源码binding。API相关26 existing HTTP/publication checks及worker typecheck通过；之前从repo根启动tsx导致decorator配置未加载的批次失败，改用worker工作目录后原批次通过，没有为工具bootstrap改业务断言。

lab r1为测试Caddyfile同行block语法失败，r2/r3为Docker Desktop archive-copy不能读tmpfs中的public CA；所有代次保留。实际 container `test -s`确认后，r4改为容器内读取同一真实public CA，不弱化证书验证；没有继续循环启动既有DevTools。结尾17.1MiB Caddy snapshot不是RSS峰值/业务混合CPU、尾延迟或DAU容量。

共享日志仍沿现 path-only categories，不记录完整 request/response headers；现类表尚未独列 landscape，下一次出口接入应补这一真实消费类及完整 accounting，不从部分分类认证整个出口。Caddy file root本身不作权限沙箱，限定成品目录/确切route与readonly mount共同控制访问；官方说明见 [file_server](https://caddyserver.com/docs/caddyfile/directives/file_server)、[handle](https://caddyserver.com/docs/caddyfile/directives/handle)。[独立source/export/actual HTTP审查](experience-sky-static-export-independent-review-2026-10-02.md)已收口，136文件、14 handlers与失败stage/完整readback均实际核验；该证据绑定此前export代次，不追溯升级后续shared layout和日志marker。目标设备、正式版本集成、端云冷暖整场和混合业务容量仍开放。
