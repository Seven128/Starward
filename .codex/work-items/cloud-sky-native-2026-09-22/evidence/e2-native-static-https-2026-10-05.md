# E2：native 与 M82 旧新版本的实际本地 HTTPS 静态出口

复用 E1 已封包的完整标准 bundle 和原 M82 v1/v2 完整标准 bundle，经现 `mergeSkyStaticBundles`/`validateSkyStaticBundle` 合并、逐文件验证；没有重导出原库、处理天文源图、重建静态/保留 owner 或云部署。两原 bundle 完整保留，全部旧记录的 URL/字节/hash/header 在合并输出中保持。普通 registry 仍空，图质与完整商业发布未采用。

实际合并 `output/prepared-native-static-https-1005-e2-r2/combined/publication/`：1,739 文件、86,301,106 payload B，publication hash `275a1aba747367ca2696bb2b7b7b6400c3a83f2e571dde63a4496dad32d1fccb`。其中 native NGC253/region 六图加 M82 v1/v2 六图共12图、5,734,973B。这个文件算术不是物理盘占用、整个180GB主机余量、远端引用全集或删除许可。

[实际脚本](../scripts/experience-native-static-https-2026-10-05.mts)复用已缓存 Caddy 2.11.4 Alpine 精确 digest、现基础 Caddyfile 和隐私出口分类。仅本地 readonly 文件挂载、loopback 随机 HTTPS 端口和隔离真实 API/测试服务；internal CA 由请求显式验证主机名，没有安装全局信任。Caddy 128MiB/1CPU是任务边界，不是预期生产配置/容量结果；原 node24040 BFF、node18132 watch 和 IDE 会话未重启。任务容器及API已关闭，原产物/失败证据保留。

实际46请求：

| 请求 | 次数 | 读回 body B | 出口 |
| --- | ---: | ---: | --- |
| 四版本 manifest GET | 4 | 27,314 | API |
| 12图片 GET | 12 | 5,734,973 | static |
| 12图片 HEAD | 12 | 0 | static |
| 同 ETag 条件 GET / 304 | 12 | 0 | static |
| JPEG、PNG 各16B Range / 206 | 2 | 32 | static |
| 未发布 source/receipt/wrong 文件 / 404 | 4 | 664 | API拒绝 |

12实际 GET 逐一核原字节/hash和具体 headers；HEAD 核 Content-Length/零body/同 ETag；304核零body/immutable与static；Range核原16B、Content-Range和static。四种manifest保原身份/版本，M82 v1/v2 六个旧新不可变URL均实际服务。privacy-filtered Caddy46条按delivery/status分类的 body size 与实际客户端读回一一分组一致；请求和响应headers未进入Caddy日志。该body不含HTTP/TLS开销或重传/计费，未限12Mbps、未跑10/20整场混合业务。

原执行并非完整exit0：r1在服务/合并前因任务直接读旧manifest的`reference`而拒绝descriptor，改用现 `opticalPublicationReference`。r2的全部上述协议/headers断言执行通过，随后把四次未发布文件的`getByFile`拒绝尝试也计作成功图片调用，于line147出现`4 !== 0`；实际返回图片bytes=0。原r1/r2日志、executed脚本、r2 failed.json保原FAILED。

[保存数据读回脚本](../scripts/readback-native-static-https-2026-10-05.mjs)没有新HTTP/导出/服务，绑定原failed/执行位置、所有生产源码、publication字节和实际日志，再验证46请求/原bytes、两输入完整保留及readonly挂载。`output/prepared-native-static-readback-1005-e2-r1/result.json`为`SAVED_REAL_E2_HTTPS_BOUNDARIES_AND_CORRECTED_ACCOUNTING_PASS`：已发布图片经API成功返回0，未发布拒绝尝试4，API图片返回bytes0。当前任务脚本已把这两种调用分开，未重跑已闭合协议矩阵。原逐响应headers通过依据是实际执行已到后面的counter断言；成功headers未单独持久保存，读回不能宣称独立重演headers。

当前生产source/原publication与原before绑定一致，任务执行本身保在原copy；六项Settings/outbox仍原字节。dirty源码写有旧HEAD的E1 image-artifact不代表trusted OCI，合并结果也没有remote/发布资格。这里只证明本地实际静态服务和旧URL包含/兼容；current pointer/实际回滚切换、支持客户端引用全集、Sky backup/暂存、全机保留/空闲盘、端云物理峰/完整源码运行时、4核16GB或4GB测试机/200DAU、图质/DevTools/手机/修后独审仍未验，不能按年龄删除旧URL。
