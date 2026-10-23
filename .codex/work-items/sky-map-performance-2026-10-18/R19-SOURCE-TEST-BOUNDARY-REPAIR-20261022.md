# R19 来源检查边界修复（2026-10-22）

## 结果与范围

修复 H7/gen8 完整小程序检查中的两项来源迁移失败；未发现这两项失败对应的产品缺陷。仅修改 `services/galactic-image-client.test.ts`、`services/prepared-optical-information.test.ts` 和它们实际共用的 `sky/sources/source-recovery-test-support.ts`。生产、构建、手机候选、服务、PLAN 与 HANDOFF 均未改。

完整原始失败仍保存在本机 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/ui-gen8-miniapp-suite.log` 与同目录 `ui-gen8-miniapp-failures.private.json`；没有上传。独立复现这两个文件时为 11 项中的 9 项通过、2 项失败，与原日志相同。

## 原因与修复

- 银河原检查强制 `spot-sky-page.tsx` 直接调用一次 `galacticImageManifestUrl`，但来源文档已经由 `sky-source-documents.ts` 负责；旧 AST 找不到调用不证明产品丢失版次。现执行生产 Sky 的 `openGalacticSources` 小适配函数，再执行真实 `skyGalacticSourceDocument`、`SourcePage`、`SourceDocumentContent` 与原共享按钮。光学及保留红外两种出版均使用仓库真实 manifest，检查完整署名、processing、所有限制、实际正文中的固定版本 URL，以及 native 复制端口收到的精确 URL；当前画帧以外的出版、已退休 native image 都不能打开，且不走 discovery 或图片请求。
- Prepared 原检查只提取 `CelestialObjectSourcesPage` 函数，没有加载新增 `SourcePage`，故抛 `SourcePage is not defined`。现加载真实来源 route、`SourcePage`、`Provenance`、`SourceAttribution`、`SoftButton`/`SharedButton`、查询 hook、client 与出版校验。检查输入中的完整原始署名、URL、statement、许可、精度、限制确实渲染；Query 保留同一被准入来源记录，复制下载保留 Prepared family/hash。
- 公共组合适配器沿用已有 React 18/Taro renderer 和现有生产 transport/cache 测试适配器，并使用真实 `createAuthenticatedOperationRequester` 投影生成 endpoint。仅提供 native component/I/O、页面 lifecycle 和测试账号输入快照；不会以成功的 query、伪造的 `SourceDocument` 或字符串替换代替生产来源规则。public fixture 明确拒绝需要账号的 operation。资料请求从真实 `useCelestialInformation` → `useResourceQuery` → client/response validator → 生成 endpoint → transport 发出。
- Prepared 部分资料由真实 native request callback 提供，经过同一校验；正文保留“光学影像来源暂不可用”及实际“重试资料”操作。隐藏后的排队 retry、替换版次后的旧 retry 不发新请求；再次打开后重试仍用原 reference/hash，恢复后原署名重新出现。新版本未解决时不显示旧信用，旧 hash 回复不能改标签冒充新版；无效绑定不请求 fallback。
- 原 `sourceRecoveryTestScope` 不改语义。object、prepared、body、HiPS/rights、target 的版次、缺失、同版 stale、迟到/排队回调、hide、unmount 和原文保留义务通过原有实际消费者检查继续保留。

## 已执行检查

1. 两个原失败文件修复后 11/11 通过。最后增加 public auth-policy 边界断言后仍 11/11 通过。
2. 共用 support 的全部实际测试消费者，以及当前 Sky 文档 owner：8 个文件、32/32 通过：`galactic-image-client`、`prepared-optical-information`、`sky-body-image-publication`、`source-partial-recovery`、`source-metadata-recovery`、`hips-sources`、`target-sources`、`sky-source-documents`。
3. 实际来源/署名/文档职责的既有检查：`provenance`、`source-attribution`、`source-document-content`、`source-document`，12/12 通过。此组与上组文件不同，末次 11 项是上组子集，不重复累加。
4. 这三个测试文件 `git diff --check` 通过。
5. 小程序 TypeScript 首次检查同时暴露本 adapter 的既有 transport fixture 窄返回类型转换问题和分派外 `source-navigation.test.ts:21/22` 的 `sections.kind` 推断问题。adapter 转换已明确经 `unknown` 连接原 native 回包与真实 client 校验；第二次 TypeScript 仅余分派外两处错误，无本次三个文件错误。主代理已接手该类型声明修复与最终统一 TypeScript/完整集成，本报告不将整仓 TypeScript 记为通过。

适配器开发期曾因根 workspace 的另一 React 版本使 Zustand 出现 invalid hook call；改为执行安装的 Zustand 实现并绑定本 Taro renderer 同一 React，没有替换 Zustand 或生产 hook。另一次 QueryCache 查找使用默认 exact 匹配而未找到带版本的 key，已显式使用其真实 partial-key 查询参数 `exact:false`。这些是夹具边界失败，没有通过改产品、改来源文本或放宽版次校验处理。

## 证据限度

这是来源内容、不可变版次、复制参数与恢复规则的开发检查。普通 Portable Prepared fixture 保持其测试声明；若设置已有 `CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH`，仍读取该 trace 原 fresh response，没有更改来源。未新增数据、采集、设备或上线操作，不认证真实微信页面外观、原生导航/合成、系统剪贴板、真实资源取得、性能或完整 Goal 通过。
