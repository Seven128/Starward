# 选中 W3：下载前身份、共享文件与完整退休责任

本轮延续唯一 PLAN 第3项，将已选 W3 从可变 query URL/独立 session 写文件迁到正常公共压缩文件 owner。没有更新素材、恢复排除来源、迁移分支、部署或操作手机。影像质量、目标运行时、整场性能和200 DAU容量均未以本模块通过替代。

## 当前实现

服务端 `DeepSkyImageryService` 提供 bare `GET /v2/sky/deep-sky/selected/{reference}?imageVersion=source-finite-v3`，返回当前条目的预先 publication/source、三档 exact file/hash/bytes/format/dimensions/角范围及独立缺测、displaySupport。`assertDeepSkyImageDiscovery` 是共用合同校验；metadata 请求不读取图像。下载改为 publication-bound immutable route，四个历史 raw publications 按自身 displaySupport snapshot保留，旧query/JPEG端点继续兼容。未知覆盖不转成科学完整，图像hash与目录source、publication hash不混用。服务端作者与实际独审见[server publication](experience-selected-w3-server-publication-2026-10-02.md)、[client/header独审](experience-selected-w3-client-header-independent-review-2026-10-02.md)。

客户端 bare resource/生成operation复用既有请求边界。`startDeepSkyImageRequest` 先发现并冻结合同，再以 actual content identity 进入 `acquirePublishedSkyImage`；共享32MiB encoded owner校验实际完整字节、去重、持久文件、租约和版本环境。selected的来源/coverage/displaySupport与独立file lease保留，两份publication可共享同路径字节而持有不同元数据；页面按lease release身份释放，不能按tempFilePath认作同一owner。

清理跨越“清单请求→字节获取→解码→已绘来源→GPU”全部阶段。runtime的 demand capsule绑定公共owner epoch，在metadata pending及已经resolve但尚未acquire时仍可同步退休；normal handoff交给真实file lease后退出capsule。页面的requested/recovery、迟到onload、同Canvas代次和实际解码尺寸、draw input及presented provenance均检查当前owner；退休后保持显式retry，清理不会自动补回刚删掉的图。公共request/loader保留ready/cold退休订阅，WeakMap记录native image资格，共用GPU owner在begin/getWindow拒绝旧resident及新上传。源引用撤回和下一帧纹理释放不冒称即时清空framebuffer或driver/GC完成。

取消先失去发布资格再abort。metadata abort抛错不能阻止其他demand清理；image native abort未真正settle时公共owner仍保持实际I/O槽和reservation，消费方的取消立即生效。清理、账户/天气缓存与公共文件职责保持原边界，legacy session仅供明确LOCAL optical试验。

## 冻结源码与开发检查

| owner | SHA256 |
|---|---|
| deep-sky-image-request.ts | `43f3bd1d611e287078c3961f3c9a66d64e6061191d3d4a26624121b467849c9f` |
| deep-sky-image-client.ts | `d5c441bf3eefbd1c96573e87b1fef32098d602d135803e992bf7fea134efada0` |
| sky-public-image-runtime.ts | `d2dbc0894bf4abecfd5f466d72ebfa55914ed7a98d58520db549c4a76381380b` |
| spot-sky-page.tsx | `a7138124b4bf0d712951792a8306f7d93d4da32430b38b508496475f19c4f172` |
| bare-sky-resource.ts | `f28023d24f4579d6e01c254b51dbfa59a3b85ca0f8ca7eef203aef0a1b089f10` |
| sky-artwork-request.ts | `e5780d42acbb3a9be3800968eca84143420d582afd8ad022a8752f3d55e272d2` |
| sky-artwork-loader.ts | `8160d556e166465ff3bf1a43445019a59bd915b2a0385b35952375a855bba4b0` |
| sky-gpu-textures.ts | `cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e` |
| sky-public-image-cache.ts（本轮未改） | `221e1979747c12bc8edcc6c7f2d592dc80a039740d107658c03a106c709874fe` |

root在miniapp目录运行actual TSX的client、request、lifecycle、retry、GPU、native-owner、public-native-consumer、api-cache-clear八组受影响检查，63项通过；随后 `tsc --noEmit -p tsconfig.json` exit0（exec88949）。这些覆盖实际公共文件core、真实M31/M42编码字节及受控Taro/Canvas/GL边界，不是完整页面微信执行。server合同/真实Nest HTTP和SDK生成一致性已在各自记录验证；root `build:miniapp:release` exit0为library/worker emission，不是Taro/native构建或干净正式image。

## 实际缺陷、独审与未验

原独审已保存四个实际consumer失败：同路径不同lease泄漏、同Canvas迟到解码仍可绘、退休图的presented表达式仍成立、公共ready脱离退休订阅后clear未撤native引用。[公共ready/cold退休作者记录](experience-sky-artwork-public-retirement-2026-10-02.md)保原源绑定与actual controlled FS/native机制。root后来发现metadata pending clear会在新epoch启动旧需求的额外缺口并加入demand capsule。没有保存70e/8e旧源码完整不可变快照，不将独审夹具初始化失败或imprecise旧行为标签冒充生产修前证据。

root已全文读取[最终独审](experience-selected-w3-client-header-independent-review-2026-10-02.md)及其实际结果新增边界。[client r4](../../../../output/selected-w3-client-independent-1002-r4/result.json)32,460B、SHA256 `346751e5150dca11fd8d445e13896a56d154e685aef44642dab91d86902d2eda`，binding87,728B `52b15f1ffbd9d2446d071f1dc7f36514a3cdde65da39d0f192b4ed6a18fbb783`；独立执行上述冻结production owner、整个native-image Hook与实际page AST回调，11种真实机制路径通过。两个page-owned requested/recovery lease清理后实际全部释放、decoded graph撤回；另一个刻意由独审独立持有unused coarse lease的case如实返回partial直到该owner释放，不能以此代替page consumer结果或宣称任何owner未释放时仍全cache归零。ready/cold显式retry、迟到decode、同path元数据、GPU旧纹理与细图失败粗图均按本记录边界闭合。

[metadata no-op demand反例](../../../../output/selected-w3-metadata-gap-independent-1002-r5/result.json)4,410B、`c84f14047954ae872db6a28c7713d0f952f1d8a7d041f9e1906908856b01d201`，以明确bounded mutation忽略capsule后出现late新epoch transfer/ready；实际capsule的pending与validated-resolved/preacquire路径均拒绝0额外bytes。[正常handoff](../../../../output/selected-w3-demand-handoff-independent-1002-r1/result.json)4,345B、`41fc042cd9acfdefda44635616bb0563982d2afca41caa478ba700bd5c24651d`实际观察demand释放而file lease仍current，随后clear仅通知lease并实际释放。当前开发独审未见剩余 discrepancy，不由测试数量替代相应目标运行时义务。

新selected静态出口从旧136增加到901路由，真实full bytes/readback保持45,251,305B；历史相同字节可因publication路由被重复导出，不代表手机全库需求。共享header/export/bundle新增精确family与support头；真实pinned Caddy暴露JSON quote/backslash及placeholder逃逸失败后修正为raw token加双opening-brace escape。独审r5真实GET/HEAD与synthetic literal JSON、危险输入拒绝通过，见上连header独审；这是本地loopback HTTP和header语义，旧136 TLS或support OCI证据不升级为新901全部TLS、正式image或云部署。[fresh export独立全文件readback](../../../../output/selected-w3-export-readback-independent-1002-r1/result.json)341,671B、`69b897a4d47b8d61c3aad27ef89b16deb81193352deaeaeabeb20339e73a5497`实际使用当前79ca18 bundle owner检查全部901字节/fragment；765 W3 route逐一对原五raw publications/hash/file/displaySupport snapshot，原136 records全字段保持，目录/文件跨目标拒绝。该readback没有重做export/HTTP/OCI，保header r5的原whole source与current exact fragment function范围。

下一独立依赖由唯一PLAN维护：[整场资源责任审计](experience-shared-resource-measurement-audit-2026-10-02.md)之后已取[首条真实Hook同帧路径](experience-full-hook-resource-journey-2026-10-02.md)和[actual owner独审](experience-full-hook-resource-independent-review-2026-10-02.md)。当前139°暖帧星座纹理重复上传仍是待修实测瓶颈，32MiB encoded命中不代表解码/GPU工作消失。W3开启广角时银河互斥；各loader默认16MiB只非活动retention，公共2槽仅image acquisition实际settlement，GPU16MiB只帧后retention，不声称整页硬上限。完整质量、弱网/真实微信文件配额/最低SDK/native解码与GC/driver、WXML组合失败、手机新版月面、官方包/干净固定候选、地域/12Mbps尾延迟与混合业务10/20冷入/200DAU仍开放。全部33项有效义务、C08排除和商业理由继续保留，Goal active、无预算、未完成。
