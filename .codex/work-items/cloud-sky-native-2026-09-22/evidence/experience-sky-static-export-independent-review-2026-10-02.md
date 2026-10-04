# 静态公共影像出口：独立前置审查，2026-10-02

审查现有 publication owners、新 `sky-public-asset-export.ts` / `sky-public-asset-headers.ts`、14 个 API asset handler 的迁移、旧月面 alias 和真实离线出版成品。仅新增本任务脚本、独占 output 和本记录；没有修改生产代码、PLAN、Context、任何旧输出或资产，没有启动服务、IDE、手机或发 HTTP。审查发现由 root 修复，作者与审查职责分开。

## 实际范围与字节

独立脚本 `scripts/experience-sky-static-export-independent-2026-10-02.mts` 从现有 publication owners 枚举允许的身份和实际字节，没有调用 exporter 的枚举器作为预期 oracle；逐个对照 `output/sky-static-approved-export-1002-r2/publication` 的物理文件、index 长度/SHA 和精确路由。**136 个公开 payload、22,954,411 B 全部一致**，publication identity 为 `4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a`。它包括 90 个星座 asset、18 个获准 SDSS JPEG、13 个宽场 properties/瓦片、5 个地景 asset，以及固定天体/银河、月面 coverage 和旧月面 alias；不是客户端一次进入的下载清单。

其中地景原始 ZIP 是 12,377,473 B，已通过原 landscape owner 的来源/字节出版资格，不能把整包计入普通客户端冷取预算。星座四个定义/通知文本中三份磁盘有 CRLF；实际出口保原 LF 字节，分别归一化 90、85、6 对 CRLF，其原始 SHA 与获准来源一致。第四份原本就是 LF。没有拷贝磁盘 CRLF 后借相同 URL 冒称同内容。

范围由现有获准 owners 控制，不是扫描 repo/assets。没有未采用 optical HiPS trial、selected 可变 W3、raw FITS/科学数组、任务候选、账户/媒体或私有业务路径。source ZIP 与定义/几何的公开边界沿原 owners，source discovery/科学显示语义仍属 API/manifest。出口的通用 route 正则只用于格式/路径防线，本身不是授权白名单；现阶段不能把外部任意 index 交给 fragment 后宣称获准。

独立冻结 Git HEAD 的旧 controller，并实际调用旧/新 14 handler（136 个对应 asset 调用）。全部 headers 和 body bytes 一致：Content-Type、immutable、nosniff、各实际 source label 和 SDSS field-degrees 保留；没有把 current discovery/selected W3 混入统一缓存头。两条月面 JPEG URL 对应相同 `e071f796…` / 372,399 B；旧 hash `ccdcceac…` 来自旧源码并与现 owner 实际 alias 闭合，不是重新下载或新图套旧 identity。

## 真实反例、修复及暂存

旧 exporter SHA `a5492c33f925b76986b22c814d45c8cfb556db2a4e9cc6f7ec383757df6c7283` 实际接受 `constellations/<64hex>/assets/.` 和 `…/assets/..`。它们会被路径归一化到目录/上级；真实 136 文件不包含此类名字，也没有外部 index 消费者，因此不能声称已证远端利用，但公开 fragment/export 的 canonical 边界有缺口。修前证据保存于 `output/sky-static-export-independent-1002-r2/canonical-route-controls.json`（SHA `858a416999040a63439bf2f20146759800f780e73ea9a75d80340755c7c237b4`），其余 12 项编码、双斜线、中间穿越、反斜线、query/CRLF、trial/raw/private 路径被拒。

Root 将共用 `validRoute` 接入 fragment 与 export：正则之外拒绝双斜线以及 `.` / `..` component。当前 exporter SHA `a2c766936819f741ce27b8b4cb44a78e28929835c056ec45eca691c319eb6781`。相同 14 项独立控制现在全部拒绝；新出版 r3 与原 r2 的 index、fragment、全部 136 文件逐 byte/hash 相同。只补受影响边界，没有再跑 136 HTTP 矩阵；旧缺口保原适用版本。

旧冻结 exporter 的真实函数、真实已准入 owner bytes、实际 Windows 文件系统有界验证了：新独占 container 成功，第二次相同 container 拒绝且已完成成品不变；第二次写入失败/第一次读回错误均只留下 `.building-*`，没有 `publication`；新 container 恢复成功且原失败目录仍保留。相对 output 被拒。一个 task-only 删除实际 readback 判断的 mutant，在同受控错误读回条件下错误地 promote，证明读回检查有作用。文件内容没有被变造；失败在实际 I/O 边界注入，不能升级为驱动器可靠性/断电试验。

原子目录 rename 只保证本次调用结束时的 publication 命名；没有 fsync/power-loss durability 证据，没有 remote active-release swap、所有历史版本合并/保留或权限部署证据。当前 fresh exporter 不重写已存在 output，旧 Moon alias 是特定兼容，不等于全部旧版本库已经闭合。

## 实际本地 Caddy 输出审查

读取 root 已完成的 pinned `caddy:2.11.4-alpine@sha256:5f5c8640…` 本地 Caddy +实际 Nest controllers + localhost CA 验证的 r4 输出。`result.json` SHA `e8f6ef3c1a1b90233a418fb153df1873084c0233045495d70844e09fc91951dd`，binding SHA `c96146bc14db60f0eaeef8a10bc1b6e9990fa947ef13738dc1298030300c2f38`。独立复核其冻结脚本、源/136 原文件 before-after bindings、实际 Caddy adapted JSON、access log、readonly mount、公共 CA 和本地配置；没有新起服务或重新取 HTTP。

149 条真实 access log 中前 136 条普通文件请求的顺序/size/status 与每个已独核 index record 精确一致，总 payload 22,954,411 B；适配配置包含普通/预览各 136 条精确 hash 路由。两条 warm/HEAD、三条未授权/错授权/已授权预览和发现/缺文件回退/404 的后续记录与实际执行脚本相符。请求/响应头未进入日志。执行脚本实际断言每份 TLS response 的 SHA/header、静态首批 API0，配置在预览授权 handle 内才 import 静态 fragment；client 指定 CA 和 servername，没有禁用证书校验。这里是**对已执行输出的独立审查及日志/适配配置佐证**，不是我另一次 HTTP 执行，也不把无日志的 header/body 当新独立抓包。

HTTP r4 绑定旧 exporter `a549…`；新 `a2c…` 仅 canonical guard，独立补证确认生成 fragment/全部字节不变，不能把 r4 source hash 追溯更新。r4 的缺文件确实回到实际 API，额外文件/index/fragment、错误版本/穿越/错误 method 没被静态根公开。最终 stats `17.1MiB / 128MiB` 只是一次结束时快照，不是峰值、16GB/4GB容量、200DAU或混合业务性能验收。

## 回执与剩余依赖

完整前置独核：`output/sky-static-export-independent-1002-r2/review.json`，SHA `6f7f75f55b197159290d69c5644f93da361e3c7a239c9beca67de2501425ba82`；含完整实际 readback、旧/新 handler 和真实 stage 控制的输入/输出绑定。修后与 HTTP 输出补核：`output/sky-static-export-independent-1002-r4/review.json`，SHA `92919ee994d800d3d1d97e8fe8eea4d712f348c7109af8082a9b301e42f6ff77`。r1 是 VM 保留 terminal top-level-await 的 bootstrap 失败，未执行产品 probe；r3 是审查脚本错误把 34 个 logging classifier 一并计入 static route 的断言失败，已明示保存，修正只分开 classifier/精确 hash route，没有改产品或重跑 HTTP。

全部原 API 资产、其中 201 个历史 deep-sky 文件、6 个保留设置/outbox 文件 before-after unchanged。未发现其它需要阻断这条本地静态出口路径的实质偏差。生产 Caddy/Compose/release 接线、preview 环境真实装配、旧版本库存/更新与回滚规则、远端/客户端请求及日志、12Mbps并发冷进入/业务混合负载仍未验；本记录不声称已部署、服务器已实际减载或整体验收完成。
