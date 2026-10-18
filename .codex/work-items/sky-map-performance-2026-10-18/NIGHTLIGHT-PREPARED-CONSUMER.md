# 已封存夜光窗口 API consumer

## 已实现范围

`NightLightService` 现在可显式读取现有 sealed Map artifact 的离线窗口。数据库 `getPublishedDarkSkyDataset` 仍先决定是否 PUBLISHED；原 `fixedNightLightDataset`、数值 inventory SHA/publicationVersion 和原 proof 准入保持权威。磁盘上存在 sealed 数据不会自行启用版本。地点数值读取仍由原 TIFF/pixel owner 处理，不从 PNG 或 window proof 推断数值。

配置默认关闭，必须成对指定绝对目录和完整封存 hash：

```text
MINIAPP_MAP_STATIC_PUBLICATION_ROOT=E:/Dev/Starward-data/publications/map-static-hotspots-20261018/publication
MINIAPP_MAP_STATIC_PUBLICATION_HASH=89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0
```

`loadRuntimeConfig` 投影为 `mapStaticPublication: { directory, publicationHash } | null`；缺一项、相对路径或非法 hash 立即拒绝。`MiniappService` 将该选项交给原 `NightLightService` 第三个可选参数，没有 SDK、operator、第二 runtime 服务或手工窗口索引依赖。原 `MINIAPP_NIGHT_LIGHT_PUBLICATION_ROOT` 继续持有完整科学发布文件。

## 共享责任与读入规则

- `workers/miniapp-api/src/map-static-manifest.ts` 接管原 `map-static-bundle.mjs` 的纯 manifest/route/record/source-id 格式准入；adapter 通过现有 `tsImport` 复用。封存格式、排序、hash 输入、路径和 headers 不变；operator 仍独立负责完整源验证、封存和交付准入，runtime 不导入 deployment tools。
- `night-light-window.ts::nightLightWindowView` 持有原 window identity/grid/质量汇总构造责任，原 composer 和 prepared reader 共用。各像元计数、有效零值、未发布空白、最大面积余量、方法/样式和 statistic 都从已准入的原 cells 取得。
- `night-light-prepared-window.ts` 只消费现 sealed manifest。先验证配置的 publicationHash，再以 DB 的 datasetVersion、publicationVersion 和 inventory SHA 选择 source，最后按 `displayRasterWindowKey` 查原 metadata 声明。任务 `tmp/map-static-prepared-windows.json` 只供诊断核对，从未成为 runtime 输入。
- 声明的 proof 必须逐字段等于原 window owner 基于 DB 准入 cells 构造的 view；图片 file/bytes/SHA、原公开 route 与 publication header 必须同时匹配。图片按封存 SHA 完整读取，再核对 PNG signature/IHDR 尺寸，不在命中路径解码、复制、重采样或重新编码像素。所选封存 hash 固定其 image-only bytes；自洽重哈希一个不同目录不能自行授权替换图片。
- 所有磁盘路径来自已验证声明，逐组件拒绝 symlink/junction 与路径逃逸。index 和单 PNG 沿现有 16 MiB 读上限，单 metadata 沿原 2 MiB 上限；index 只保留一个已验证声明。窗口仍共用原两个活动 binary reads、相同在途任务逐消费者取消、8 项/16 MiB 完成缓存和 close 清理。
- 未声明区域或不同 DB inventory 不采用旧 prepared window，继续原有 bounded composition。已声明文件缺失、损坏、proof 不符或 seal 不符会使本次读取失败，不偷偷重组替换；失败不安装完成窗口，文件恢复后可重试。共享任务在最后消费者取消后不得将已读 bytes 装入完成缓存。
- 原 fixed PNG URL、composed window URL、publication identity、质量/数值语义不变。configured prepared 路径也可供原 fixed asset URL 使用；未配置行为保持原路径。composed URL 中的旧 inventory SHA 不得被当前另一个 inventory 接管。

## 已完成检查

当前受影响集合 **27/27 pass，零 skip**：

```text
node ../../tools/run-node.cjs --import tsx --test \
  src/night-light-prepared-window.test.ts src/night-light-window.test.ts \
  src/runtime-config.test.ts src/map-night-light-http.test.ts
  # cwd workers/miniapp-api；25/25

node --test tools/deployment/map-static-bundle.test.mjs
  # cwd repo；2/2

npm run typecheck --workspace @starward/miniapp-api
  # pass
```

有区分力的正向检查先通过原 live composer 取得期望，然后关闭原 cell 图片，并让 PNG encoder 调用直接失败。新的 consumer、MiniappService public Map 入口和旧固定/组合 URL 仍返回逐字段相同的 metadata 与完整相同的 PNG，encoder 调用 **0**。未声明的相邻窗口则实际调用原 composer，并能通过旧 URL 在新实例恢复。原 missing-cell/粗 LOD/跨 cell/不可变 URL 检查继续通过。

负向检查覆盖：DB 同版本但不同真实 inventory SHA、错误 URL image/inventory hash、配置 hash 与自洽重哈希目录不符、即使显式选择 seal 也不能更改原 cell 质量计数、声明 PNG 损坏/缺失及同实例恢复、实际 prepared bytes 已读取后取消且不得污染完成缓存。MiniappService consumer 检查确认无 weather 读取；既有 HTTP dependency-isolation 检查确认静态层不等待 Scene。

首轮 typecheck 发现新测试 mock 的 rest tuple/`this` 未显式标注，已修复后通过；不是产品失败，也未削弱行为断言。原 Map adapter **55/55** 是变更前较宽集合的历史证据，不改写为本次重跑。此次纯格式 owner 提取后的实际重跑为其直接 shared adapter 2 项，另由新的 runtime consumer/原 window/config/HTTP owner 集合覆盖差异；OSS SDK、Sky uploader、远端 release 状态机未改动，不为重复保证而重跑。

## 真实 sealed bytes 读回

`tmp/nightlight-prepared-consumer-readback.mts` 通过真实新 reader 读取现有 artifact，而非另写 fixture 图片：先使用任务原公开 PUBLISHED record export 准入原 inventory 和 **509** 个 proof，再读取 **2** 个 composed window / **16,834 B**。两项 proof 与原 sealed 诊断导出逐字段完全相同，图片长度和 SHA 完全相同：

- `11-1672-890-2-3`：12,558 B，SHA `2f68e40a1924c6d09a3ab7fad0759a9e90c119d974298492d5b9bf29128017de`。
- `11-1672-891-2-1`：4,276 B，SHA `b6f09db480cb146e50acdb7a16e4d9567fb2751727136cbb6d6aa0288047be7a`。

完整公开结果、原 inventory SHA 和相关源码 SHA 在 `NIGHTLIGHT-PREPARED-CONSUMER-READBACK.json`。此次没有读取原 cell 图片或科学 TIFF，没有调用 composer，没有连接/修改 DB，没有修改任何既有 artifact、current.lock、服务或远端对象。

## 保留边界

本记录证明共享 consumer 实现、原兼容路径和当前本地 sealed 文件读入；真实 DB 当前资格仍由运行 API 每次查询保证，本地 probe 的公开 DB export 不能替代实际运行态。root 持有 8796 新 API 的启动/配置与 HTTP 验证，以及新的独立审查、当前 Context/HANDOFF/INDEX/PLAN 对齐。静态服务的完整 HTTP 读回、OSS/ESA/TLS/缓存/回滚、native 可见结果与容量/性能验收仍各归原 owner；本次未启用任何正式 prod 目录，也未把本地读回耗时当作手机/CDN 性能。
