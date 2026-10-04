# D Sky 发布资源的隐私安全出口字节分类（2026-09-24）

## 责任与改动

正式与操作员预览 Caddy 都通过只读挂载导入同一 `infrastructure/deployment/sky-resource-logging.caddy`。五个固定值 `catalog`、`fixed_image`、`wide_field`、`optical_trial`、`deep_sky` 仅由请求**路径模式**选择，写入 `sky_resource_class`；原来的 `request delete`、`resp_headers delete` 同时保留在两套 access 和 default/error 编码器。没有记录实际路径、查询、路由参数、身份、地点或请求/响应头；没有把本地静态出版读取塞入外部供应方费用账本。官方 [Caddy log_append](https://caddyserver.com/docs/caddyfile/directives/log_append) 支持匹配后追加静态值，[path matcher](https://caddyserver.com/docs/caddyfile/matchers#path) 对多个路径作 OR；具体行为以下面的固定版本运行结果为准。

## 实际运行与失败/隐私边界

两份当前 Caddyfile 均经项目 pin 的 `caddy:2.11.4-alpine@sha256:5f5c8640...` 镜像 `caddy adapt --validate` 成功；正式与操作员预览的 `docker compose config --no-interpolate --no-path-resolution` 都解析出同一只读挂载。独立 Docker network 内运行当前 Mini API 发布镜像 + 同版本 Caddy，经 `127.0.0.1:18791` 发送真实 HTTP。临时 `d-sky-egress-probe.caddy` 复用生产类别文件、反代和完全相同的隐私过滤器，仅将本机入口改为 HTTP 以免触碰用户 TLS/环境。可重跑的 [探针](../d-sky-egress-probe.mjs)及[机器输出](d-sky-egress-probe-2026-09-24.json)记录：

| 请求类别 | 状态 | Caddy `size` 响应体字节 | 分类 |
| --- | ---: | ---: | --- |
| 土星清单（带合成敏感 query/header） | 200 | 1,093 | fixed_image |
| BSC v3 正式目录 | 200 | 568,362 | catalog |
| W3 清单 | 200 | 1,920 | wide_field |
| 未出版光学清单 | 404 | 166 | optical_trial |
| 错误哈希深空清单 | 404 | 166 | deep_sky |
| 健康检查 | 200 | 141 | 无 Sky 类别 |
| BSC 同 ETag 复取 | 304 | 0 | catalog |

运行探针断言输出中没有合成敏感值、`request`、`resp_headers`、`uri`、`url` 字段，并核类别、状态和 `size`。土星清单未经边缘编码的 BFF 响应体 1,938 B、Caddy 记录 1,093 B；BSC v3 先前直连 1,280,199 B、这次边缘记录 568,362 B，证明当前客户端协商下编码出口与直连字节不同。它不证明所有微信客户端接受同一编码，也不含网络报文、TLS、云计费或平台缓存命中。

`npm run test:deployment` 123/123 通过；新增回归核两套配置导入/挂载同一分类文件、类别固定且隐私过滤持续存在。`npm run context:validate` 通过，仅验证 Context 结构。专属两个 `--rm` 容器已停止并自动移除，专属 Docker network 已移除；共享 8787、用户容器、Android、微信开发者工具和活跃 WEAPP 输出均未改动。Caddy 镜像及前轮本地 API 镜像保留供复核。

该分类提供未来从受控、轮转日志按状态/资源类聚合的输入，**没有形成生产用量、云账单、用户会话或监控面板**。`size` 不含请求头/TLS/上游调用、缓存命中以外的终端重用或所有其它 API；日志轮转保留长度和生产监控导出仍按部署 owner 另定。它不能关闭 V05 设备实际下载/内存/帧耗时或 K02 真实现金费用。
