# Prepared 标准静态导出开发增量

`PreparedOpticalImageryService.publishedAssets()` 只枚举当前显式登记 descriptor：逐代 pin manifest/hash，逐级经既有 PNG/字节/SHA/视场校验读同一实际返回 buffer。标准 `approvedSkyPublicAssets`/`exportSkyPublicAssets` 复用此 owner 与共同 API headers/静态封装 owner；默认构造仍为空 registry，CLI 未传候选，也没有普通默认采用、目录扫描、远端获取或导出 source/master/receipt。

开发回归使用明确的 synthetic transport fixture 两代，走完整标准 exporter 生成 sealed index、PNG、delivery.caddy、revision/哈希 artifact 并读回；六个 Prepared immutable URL 与 HTTP owner 的字节和 headers 一致，篡改 PNG 拒绝且恢复可重试。synthetic 黑色既不提供真实源/母图/producer receipt，也不证明画质、科学有效性或采用。输出仅在核验过的自有临时目录生成/清理，生产旧目录未删。静态标准历史 union、冲突拒绝、失败暂存/readback 与安全路径回归保持。

`sky-resource-logging.caddy` 将 `/v2/sky/prepared-optical/*` 纳入既有 `optical_published` 常量类别；两种 edge profile 继续共享配置，不记录 URL/query/header/身份/地点。路径声明检查通过；没有运行云上 Caddy、切换挂载或做 live 流量核算。

当前完整 registry→默认 discovery→真实质量→标准 OCI 出版→同机静态 GET/HEAD/304→日志真实出口→目标设备/已绘来源与 Back 链尚未验收。旧 publication/rollback/stage 的磁盘保留仍需按引用 inventory dry-run，不能按年龄删 immutable URL；200DAU 混合容量与预期 16GB 配置仍未验。本模块开发、类型检查通过不升级这些结果；本轮独立审查仍缺。
