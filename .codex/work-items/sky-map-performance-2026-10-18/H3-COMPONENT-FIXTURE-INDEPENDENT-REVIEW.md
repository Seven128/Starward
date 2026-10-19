# H3 当前组件 fixture 独立复核

2026-10-19。独立只读复核当前任务副本、完整构建和原软件证据；未激活 fixture，未操作手机、DevTools、现有服务、数据库、账号或相册。唯一新增文件为本文。依据 [组件准备说明](H3-COMPONENT-FIXTURE.md)、[机器化证据](H3-COMPONENT-FIXTURE.json)、[同点隔离输入](H3-SAME-SITE-ISOLATED-INPUT.md) 及其 JSON，并逐项检查实际源码和产物，不以既有报告结论代替复核。

## 结论

**在“未激活的 MAP_POINT 组件输入与有界软件证据”范围内，没有发现需要先修复的实质代码阻断。** 当前 fixture 保留 DATA_INSUFFICIENT、真实照片元数据与独立山体 READ_FAILED；没有把它升级为正式点、已发布数据或完整 H3 通过。可以保留作为 root 后续目标运行准备，但当前包不能直接用于手机，下面列明的目标证据仍欠。

### 正式资格没有被绕过

本次直接调用 `createH3IsolatedInput` 和真实 `ObservationContextService`，确认 FORMAL_SPOT 解析实际拒绝 `formal_spot_not_found`；独立解析结果仍为 MAP_POINT。输入的 `spot.status=DATA_INSUFFICIENT`、`siteMediaState=UNKNOWN`、空审核 evidence、缺失 formalFacts 保持。`getSpotOverview` 的真实消费者仍要求匹配 FORMAL_SPOT 并拒绝 DATA_INSUFFICIENT；fixture 使用组件 props，没有覆盖全局 app-store，也没有替换 `/v2` 正式路由。

fixture 入口明确标注未发布，账号、分享、云观星、导航、投稿与正式业务动作交给不准入提示。它能够验证原组件的一种输入组合，不能认证普通 Map 的正式点选择、来源路由身份、审核或发布链。

### 照片与独立字段有真实原文件支撑

本次用已安装的运行时 Pillow 重新打开两份既有本地 JPEG，实际读得原图 `DateTimeOriginal=2025:05:02 16:57:53`、`OffsetTimeOriginal=+08:00`、`GPSImgDirectionRef=T`、`GPSImgDirection=274.2285766826039`。字段与 fixture 所用拍摄时间和真北方向相符，没有用上传、下载、观测时间或地物推测补值。

原图 SHA-256 `84c3ac48ee8d54541e4e24fe0232890e970f21938de766d56541513e5191fc84`、安全副本 SHA-256 `cc96b87d972a558bf7543fd1263cb7001cc81af83e3d75e1a507fb0a0e987a39` 均匹配；两图实际解码均为 4032×3024，RGB 像素完全相同，安全副本 EXIF 项数为 0。没有修改或重新加工图片，也未重新联网搜集。

LN9267、CC BY-SA 4.0、Commons 原始出处、许可链接及移除元数据的改动说明沿同一媒体/SourceSummary 声明进入既有查看器、Provenance 和 SourceAttribution。TEST_FIXTURE 来源仍被原 `isProductSource` 排除。许可与来源说明复用固定取得证据，本文不声称重新核验了远端页面。历史照片不能补当前开放、合法进入、夜间安全、设施、班次、无遮挡或正式发布资格；相机时钟和方向传感器也没有独立校准证据。

### 独立山体失败与恢复责任清楚

原 `useTerrainHorizon` 的窄 import 被导向 fixture wrapper，原 hook 的站位校验、Query 查询函数和失败意义保留。默认响应由原 `terrainHorizonData(..., null, 'READ_FAILED')` 生成，复核实得 UNAVAILABLE、HORIZON_READ_FAILED、model=null；没有零角曲线或伪造成功数据。恢复只将同一站位交回原 `getTerrainHorizon`；错站位和已取消请求被拒绝。

`fixture-app` 的请求拦截只允许精确同源、同站位的山体 GET，拒绝凭证和其他请求；独立图片走既有 `<Image>` URL。来源和图片没有依赖山体请求成功。软件证据确实检查了原查看器打开、解码失败保元数据、重试/关闭、正文位置 137 的返回命令和 native owner 释放，并在山体错误之后再次打开照片。

有界重试证据使用原 hook 产生的查询函数和真实 TanStack QueryObserver，显式 retry=1，与当前 `miniappQueryClient` 默认一致，实际为两次尝试后停止；它没有实际挂载原 `useResourceQuery` 或完整 SpotTerrainOverview/Map 组合。现有报告已披露受控 hooks/native 边界与分开挂载限制，不能从这里推断真实地图持续存在或恢复重绘已经成功。

## 本次独立读回与检查

- 两份机器化证据列出的 19 个 artifact 全部字节数和 SHA-256 匹配；没有改写原回执。
- source-snapshot 的 1560 个原输入、9,914,688 B 全部与当前仓库哈希一致；副本逐文件符合原哈希或其 16 项声明 overlay，新增 overlay 也全部匹配。原面板、查看器、位置 owner、来源、地形组件、校验与媒体 helper 未被改写；namespace 和入口的有限副本差异与 builder 一致。
- 独立遍历完整 WEAPP 产物：341 文件、4,979,044 B，bundle SHA-256 `a282341a408821832d65284ab651e0431113092cce59f5b3e5754cc8f9ed2e66`，与当前构建回执一致。主包 2,030,725 B、余量 66,427 B 是该诊断包的读回，不是长期容量保证。
- 重新运行已安装 Mini Program TypeScript 的 `--noEmit --project .../tsconfig.component.json`，退出码 0。范围为 fixture 入口和完整导入依赖图；没有声称全仓类型或产品全套测试通过。
- 直接构造隔离 adapter、调用真实正式拒绝与 MAP_POINT 解析、读取 READ_FAILED、通过内存 handler 读回 3,038,007 B JPEG；未打开端口或调用现有服务。原完整 `verify.mts`、原回执及真实生产 owner 已逐段审阅，本次没有重跑会覆盖原回执的 verifier。

系统默认 Python 没有 Pillow；随后使用已有 Codex bundled Python 成功完成上述解码/EXIF读回，没有安装依赖。没有重编译、生成新候选或改写产物。

## 仍然开放的证据与激活前准备

1. 当前构建固定为无监听 loopback origin，照片尚无目标端下载/解码证据。root 选择有效同源 handler/origin 后，需要沿已有完整源码构建 owner 重新准备输入和完整编译；不能仅替换生成 JS。静态 Context 同样应由原准备 owner 刷新，不把旧值装入正常正式点状态。
2. Android/WEAPP 的实际挂载、原生 Map 与 panel/查看器的合成、图片可达和 native decode、实际图库/正文/来源返回位置仍未验证。fixture 的隐藏面板和新来源阅读层只提供组件宿主，不能替代普通来源页面与路由恢复。
3. 尚无真实同点山体成功响应与恢复后重绘证据；“恢复”按钮、原 owner 派发和有界错误恢复入口均不等于恢复成功。真实地图持续可用也不能由分开挂载的照片检查推出。
4. DATA_INSUFFICIENT 仍不得进入普通正式点发布/选择；若需要该链证据，须由原资料/发布责任取得真实资格。iOS 和完整 H3 验收继续开放，不由当前 Android 准备或软件检查关闭。

这些缺口与现有 H3 owner 的边界一致。当前可以继续独立准备和后续目标验证，不需要重复查找照片、放宽发布规则或把未知字段改成正值。
