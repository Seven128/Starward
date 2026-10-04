# D/C：M51 定点光学发布镜像与边缘出口分类（2026-09-25）

## 责任与修前差异

商业 Mini 已只向 M51 选择 `/v2/sky/sdss-optical/*` 固定出版物。正式与操作员预览 Caddy 共用的 `sky-resource-logging.caddy` 原来只分类 `/v2/sky/optical/*` 试验路径；M51 正式图片的边缘响应体没有 `sky_resource_class`，会使按类统计漏计。部署合同回归先失败，实际缺少 `optical_published`。现于同一只读导入文件按固定路径追加此类别，不记录 URL、查询、哈希、地点、身份或请求/响应头；`optical_trial` 保留且与正式光学分开。Dockerfile runtime 阶段另核 M51 manifest 与三张 JPEG 存在，避免漏打包仍生成镜像。

## 实际本机发布链

从当前源码用现有 pinned Dockerfile 构建专属镜像 `starward-miniapp-api:cloudsky-sdss-local-20260925`，成功通过原有 Gaia DR3 成品不入运行时检查和新增 M51 四文件检查。两份正式 Caddy 配置用 pinned 2.11.4 镜像 `caddy adapt --validate` 成功；部署合同/镜像合同 11/11。随后 [专属探针](../d-sdss-egress-probe.mjs)在随机本机 loopback 端口、独立 Docker network 内运行此发布镜像和仅把 HTTPS 入口改成 HTTP 的 [测试 Caddy 配置](../d-sdss-egress-probe.caddy)。测试配置导入**同一生产分类文件**并沿用 `request delete` 与 `resp_headers delete`；没有占用共享 8787、微信开发者工具或手机。API 仅用 `LOCAL/MEMORY_TEST`，不是商业远端。

| 实际经边缘请求 | 状态 | 类别 | `size` 字节 |
| --- | ---: | --- | ---: |
| M51 当前清单 | 200 | optical_published | 2,544 |
| 哈希绑定清单 | 200 | optical_published | 2,544 |
| overview/medium/detail 原 JPEG | 200/200/200 | optical_published | 20,492/24,076/19,784 |
| 错哈希 M51 图 | 404 | optical_published | 166 |
| 仍关闭的试验光学清单 | 404 | optical_trial | 166 |
| 普通健康检查 | 200 | 无 | 141 |

三图的真实边缘字节总数 64,352 B，逐张 SHA 与清单一致。探针用 `Accept-Encoding: identity`，因而当次 Caddy `size` 与响应体字节相等；微信实际压缩协商、CDN 缓存、请求频率、TLS 报文和账单另计。测试查询/请求头置入合成哨兵后，Caddy 日志中没有哨兵或完整 `request`、`resp_headers`、`uri`、`url`；只提取类别/状态/size。所有专属容器和 network 已停止/移除并用 Docker 列表核空；构建镜像本地保留供复核。

这补齐 M51 本机正式发布镜像的存在/HTTP/边缘分类，不证明远端已部署、小程序实际收到新出版物、手机解码/配准/署名或生产用量。P1、P3/P4 成本、P5 独立审查及 iOS 继续开放。
