# 静态成品、历史库存与既有发布接入

本记录为源码与本地开发机制证据；不认证真实生产候选、云部署、200 DAU容量、微信原生或整体画质。Goal active、无预算、未完成。分支/HEAD不变，六项设置/outbox修改与既有影像保持；没有提交、推送、云发布、手机或DevTools重启。

## 单一责任与来源

`workers/miniapp-api/src/sky-public-asset-export.ts` 继续只遍历既有获准 publication owners。API/export 的头归原 `sky-public-asset-headers.ts`；canonical路由、严格index/文件SHA/非符号链接、Caddy fragment、完整写入readback及历史合并统一归 `tools/deployment/sky-static-bundle.mjs`。结构/完整性检查不代表素材许可准入。新的准入边界是既有发布流程指定的 exact immutable OCI image；不接受运营人员手填磁盘bundle/hash来声称获准。

Dockerfile构建阶段在编译和Gaia包排除后，由 compiled approved exporter 生成成品，封存revision、publication/index/fragment SHA；runtime携带固定 `/app/sky-public/publication`。当前源码编译链通过，两个显式astronomy catalog子路径不依赖被剔除的Gaia包；未执行完整新生产Dockerfile/干净CI候选认证。worker正常API启动不为每位用户执行导出。

`sky-static-release.mjs` 是镜像提取、持久store、历史/操作租约及HTTP验真的共同owner。指定image digest检查与OCI revision label一致；只create自己的带随机owner label的停止容器，固定路径cp，整包验证，不启动它；按exact name+owner label发现并rm自己的ID，丢失create结果也尝试退役。不能确认发现/清理时明确失败，保原操作与清理cause，不能冒称已清。既有镜像、容器及服务不动。

历史union必须恰好等于已绑定source publications的路由集合；每条旧URL的字节/SHA/headers一致，同URL冲突拒绝。每个操作持有store lease直至验证、收据/指针或失败退出；prepare/load失败自行释放。fresh stage保留失败、不覆写既有publication。prepared-inventory指针代表保留的获准库存，可能含失败发布尚未采用的获准新资源，**不是成功发布指针**；后续API回退仍保留这些新URL。known immutable image重试/回退复核现有文件后只inspect revision，不再次cp或增无用source；nondeploy load不运行Docker/更新库存。v1布局/生成规则为持久契约，未来变更须显式兼容/迁移，不能直接让旧source失效。

## 既有消费者

[部署消费者接入](experience-sky-static-deployment-integration-2026-10-02.md)及[资格compose修复](experience-sky-static-staging-compose-qualification-2026-10-02.md)记录实际改变和修前反例。

- 可选BASE `STARWARD_SKY_STATIC_DIRECTORY` 为独立绝对持久目录；拒根目录/私有env、备份、receipt重叠和手填静态identity。未配置保原API路径、request/receipt v1。
- 已配置release在image pull后、migration/converge前准备；preview在停服务前准备。generated readonly overlay置于preview overlay之后，正常站点及preview授权handle内部各有exact静态handle与同层API fallback；默认只mount空fragment。
- 配置时成功receipt/pointer v2记录实际image publication与delivery union两种身份；普通生产入口与promote均要求真实staging v2及全部原步骤、static preparation/compose/verification。跨环境只比较当前image成品，union可因各自历史库存而不同；严格request v1和既有workflow传播保持。
- 实际HTTP verifier全量GET字节/SHA/原published headers及代表HEAD headers/body0；必须有只由静态handle发出的 `x-starward-sky-delivery: static`，否则同字节API回退不能认证静态。preview另要求未授权404。实际public-IP传输沿既有public roots/IP SAN，未为本地测试弱化它。

## 实际产物与HTTP

compiled `--conditions=production` exporter 在 `output/sky-static-sealed-artifact-1002-r1/publication` 输出136文件、22,954,411B；record publication hash仍为 `4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a`。index和旧获准payload保持，fragment加static marker/log为23,833B SHA `3656bcd169917933a604a59eb625bbefe6f57ac8b5ae88def5085c8d6f43ca06`；image-artifact383B SHA `d5c43751ffba4ac8fbd472df721664e558bb74d4d91ddd384520246cb3e2aaec`。revision `111…` 是明确测试值，不是HEAD源码完整身份。12,377,473B原地景zip属于可按需取的服务端来源文件，不是客户端启动下载或32MiB bitmap库存。

`output/sky-static-release-http-1002-r2/result.json` 6,846B SHA `c604e56293a822bec8ed0e74ef74298370dbd51a3dc5ef176ab9a5cf6220182f`；binding88,285B SHA `3ea8907bcbbbc2475358dad0013e08ecc27d7b2e756c5edd96192d6e35486b51`。实际pinned本地Caddy+Nest，从生产Caddy及preview site读取actual auth/static/fallback/header/logging结构，适配本地listener/private test CA/upstream/health；采用ordinary global block，**未覆盖preview特有default SNI、h1/h2、ACME/renewal等global运行语义**。注入的fetch仍真正验证同一private test CA和完整TLS字节，不是生产public-PKI传输证据。

全136首次GET合22,954,411B且asset API调用0；暖取/HEAD、正确preview token、缺文件实际API同字节回退、metadata/未知文件/错版本/方法拒绝成立；empty实际Caddy lane保API。实际verifier又核normal+preview全136，并拒绝empty lane的同字节API假静态；当前HEAD完整头也已核。426条实际access记录无完整request/response headers，含static/api、landscape等固定分类和body size。它是本地测试响应体accounting，不是全产品流量、微信下载/OS缓存、账单或容量结论。只清理自己的新lab容器。

另已验证实际OCI提取：`output/sky-static-oci-extraction-1002-r1/result.json` 3,234B SHA `48a328cf9890d5d8edc6f55c1e392f00e856cccf4fb6f9c033bb6909ff22a8b8`；binding5,023B SHA `f90e694c38eabc9ac9529f193b7d0dab957b01dbdf4f98bffc77252337bee2c8`。新support image `starward-sky-static-support@sha256:ec6205338c845d63d3b81f79d7fdf8db9da8e3a305051c5aff21a33ec389c0e0` 仅由已缓存pinned旧API image与上述成品复制构建，pull=false/network=none，无新仓库源码或6项改动混入，synthetic revision111…；不是新的生产release image。实际调用inspect/create(no start)/cp/discovery/rm及136全文件readback、repeat只inspect、load额外Docker0成立。过程参数JSON和Dockerfile已冻结，执行为工具inline命令；独立review另读取真实image identity和自有container空list。support image保留，原镜像/服务不改。

## 独立反例与未验

本阶段的[静态owner/consumer独立审查](experience-sky-static-owner-consumer-independent-review-2026-10-02.md)已全文读取，关闭相应发布/收据/准备库存机制的开发复核。其冻结源码、实际TLS与support OCI输出保留原绑定；后续selected W3新增合同、影像出口与生命周期需自己的新代次，不能把历史136文件验证升级为新901文件或云端验收。

独立审查在旧实际模块发现并冻结：union可接受无source额外canonical URL；create实际建立后结果丢失不清自有停止容器；GET正确时HEAD坏头仍可passed。当前对应修复和实际反例复核通过，失败代次不覆盖。root也发现staging删除static-compose步骤仍可qualify，已由消费者owner保存修前失败及修后同fixture拒绝。实际独审还贯穿真实release/preview共享owner→FS收据/资格/currentpointer、坏字节失败不promote、lease释放；其process/Fetch/备份/readiness是受控边界，不能认证云端。

当前声明仅覆盖本地成品/兼容/发布源码及上述机制。早期未sealed/未绑定image或旧controlpackage的通用回滚未验；开启后无绑定须fail-before-stop，不退empty。实际干净生产image/云端权限与TLS/部署、全库增长/磁盘生命周期、端云整场冷暖及混合业务/10或20人冷入、客户端总文件/native/GPU/CPU/RSS、地域与12Mbps尾延迟/200DAU仍开放；不能由导出23MB或末尾Caddy snapshot推出容量。

后续[selected W3身份/共享缓存接入](experience-selected-w3-public-cache-integration-2026-10-02.md)已实现预先discovery、immutable route、历史publication自身displaySupport snapshot和公共cache消费者。该新代次及其独审保自己的源码/输出绑定，不升级本页旧136文件/TLS/OCI证明。当前下一测量由唯一PLAN控制，不能以缓存/静态字节验收M51/M82画质；native观察链、WXML失败、手机新版月面、完整组合和全部有效交付义务继续保留。
