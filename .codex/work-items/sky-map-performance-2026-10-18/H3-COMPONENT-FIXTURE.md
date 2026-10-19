# H3 组件隔离输入与完整源码构建

2026-10-19。**已准备完整 source copy、WEAPP 构建及有界软件组件证据；保持未激活。范围仅 MAP_POINT／组件，不是 FORMAL_SPOT、PUBLISHED、真实手机或完整 H3 通过。**

复用 [H3-SAME-SITE-ISOLATED-INPUT](H3-SAME-SITE-ISOLATED-INPUT.md) 的真实同点原图声明、安全 JPEG 和窄 adapter。未重新联网、下载、加工照片、注册正式点、接入现有服务、操作数据库、账号、DevTools、手机、feedback、VPN 或配对；未编辑生产代码、PLAN、HANDOFF、INDEX。原图及保护中的服务/手机均未触碰。

## 输入与真实边界

继续调用真实 ObservationContextService：DATA_INSUFFICIENT→FORMAL_SPOT 实际拒绝 formal_spot_not_found，隔离 Context 仍为 MAP_POINT，不安装到全局 app-store。地点当前开放、合法进入、夜间安全、设施、光污染、路线、近物和全向无遮挡仍未知；不借历史照片补资格。

真实照片字段保留为拍摄时间 **2025-05-02T16:57:53+08:00**、**274.2285766826039°（真北；原EXIF）**，作者 **LN9267**、**CC BY-SA 4.0**。既有 [Commons 出处](https://commons.wikimedia.org/wiki/File:East_Dam_of_High_Island_Reservoir_minibus_terminus_02-05-2025.jpg) 和 [许可链接](https://creativecommons.org/licenses/by-sa/4.0/) 仍由原 Provenance／SourceAttribution 负责。照片为历史记录，不证明当前现场资格。

## 当前可审阅工程

- 完整源码项目：tmp/h3-component-fixture/source/apps/wechat-miniapp，入口 pages/h3-component/index；未导入或打开开发工具。
- 复制 1560 个文件、9914688 B，覆盖完整 Mini Program src/config/runtime-assets/许可、三个依赖 package 源码与现有构建依赖；保留全部原页面/分包，不拼接旧生成包。安装的 node_modules 仅以任务内 junction 复用。
- 原 SpotInformationPanel、图库/viewer、位置 owner、Provenance、SourceAttribution、SpotTerrainOverview/Horizon、useResourceQuery、checkedTerrainHorizon 与媒体 helper 保持逐字哈希一致。
- 仅在任务副本增 fixture App/入口/输入/宿主样式、隔离存储命名空间，及原 useTerrainHorizon 的输入 import 导向窄 wrapper。一般 development fixture mode 仍为 false。App 不启动生产缓存清理；只允许同源同站位原山体 GET 恢复，拒绝账号、其他请求、凭证和写操作。原生产文件没有变化。
- 全量重新编译最终 bundle：**a282341a408821832d65284ab651e0431113092cce59f5b3e5754cc8f9ed2e66**，341 文件、4979044 B；主包 2030725 B，余量 66427 B。不是手机候选或长期容量结论。
- 真实安全 JPEG 3038007 B，sha256 cc96b87d972a558bf7543fd1263cb7001cc81af83e3d75e1a507fb0a0e987a39；未塞进主包。仍使用既有未激活 H3 handler 的绝对同源 URL。当前构建 origin 为无监听的 loopback，**不能用于手机**；没有图片下载成功声明。

默认只注入原 terrainHorizonData 产生的 READ_FAILED；真实 useTerrainHorizon 仍执行 checkedTerrainHorizon 和现有有界重试，不提供零角曲线。恢复动作只切回原 getTerrainHorizon 的同点请求，未编造任何成功高程或曲线。恢复成功与真实重绘仍待后续真实 owner 响应。

## 实际检查与限制

1. 完整 WEAPP 构建通过，构建前后原源码哈希一致；组件依赖图使用 Mini Program 已安装 TypeScript 5.9.3 类型检查通过。初次类型检查捕获缺失 Map onError，已修 fixture host 并完整重建。全 copied-app 测试的 backend fixture 相对引用不属于本隔离项目，未宣称全仓类型通过。
2. 全部原组件模块经 transpile 执行，没有截取组件函数；受控 React hooks、原生设施和非本项子组件，配合真实 TanStack QueryObserver。实际图库点击产出原 SpotImageViewer；真实时间/方向/署名/许可文字进入原查看器；解码失败仍保元数据，原重试/关闭和文档位置137保留，原生 owner 计数释放。Provenance／SourceAttribution 的真实来源/许可链接与复制回调通过，内部 TEST_FIXTURE 仍被排除。
3. 真实山体 hook 将失败 envelope 转错误，实得2次有界尝试后停止；原山体错误状态给出“重新获取”，不创建 Canvas；独立照片仍能再次打开。wrapper 拒错站位；恢复只证明同点请求交回原 owner，未请求现有服务。

上述为 **有界软件组件证据**；受控 hooks/native边界、未展开的无关子组件及分开挂载的组件不能认证真实目标组合。原 JPEG 实解码证据复用前一 owner，不冒本次 native decode。原生地图持续存在、目标端图片可达/解码、图库/来源实际阅读位置、真实同点山体恢复、普通正式点发布与业务消费者、Android/iOS 均未验证，完整 H3 继续开放。

## 后续与复现

构建和源副本保留在任务 tmp。root 在 R17 手机工作完成、确认可用同源 origin 后，才按已有服务/window owner 选择是否接入未激活 H3 handler 和此隔离页。不得向旧 session 发送输入，或让本 fixture 替代正式发布链。若原源码变化，现有 refresh 会拒绝，须重新完整捕获当前源码；不可只替换生成 JS。

当前原源码未变化时可复现：

~~~powershell
node tools/run-node.cjs --import tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/prepare.mts
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/build.mjs --refresh-owned-fixture
node tools/run-node.cjs apps/wechat-miniapp/node_modules/typescript/lib/tsc.js --noEmit --pretty false --project .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/source/apps/wechat-miniapp/tsconfig.component.json
node tools/run-node.cjs --import tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/verify.mts
~~~

首次无副本时 build 不带 --refresh-owned-fixture。prepare/build/verify 不打开服务或设备；H3_FIXTURE_ORIGIN 的变更只生成输入，不启动监听。机器化结论、文件哈希见 [H3-COMPONENT-FIXTURE.json](H3-COMPONENT-FIXTURE.json)；详细原回执为同目录 tmp 下 build-receipt、behavior-receipt、typecheck-receipt 与 source-snapshot。没有提交，也没有删除文件。
