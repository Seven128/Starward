# 公共影像 App / clear / full hook 独立审查

2026-10-02。审查者 `/root/hst_registration_review` 未参与 cache core/runtime、App/API clear 或 consumer production 实现。本轮只写 task probe、独立输出和本 note；没有 production、PLAN/Context、六项保留修改、201 deep-sky 旧资产或历史输出编辑，没有 HTTP、IDE、手机、服务、部署、提交或 push。Goal 仍 active、无预算、未完成。

结论：当前已迁移的正常公共图消费者在桌面受控边界内通过独立实际模块集成审查。真实发现的 core fence 与 runtime 占用释放缺陷已分别由 root 修复，request disposal 缺陷由 sphere 修复；修前实际反例保持。此结论可以支持继续后续依赖，不能验收微信原生 FS / abort callback / 图像 decode、应用容量、GPU、性能或完整星空体验。

## 读取、方法与资格边界

完整读 implementation 记录 `experience-public-image-launch-clear-integration-2026-10-02.md`、`experience-public-image-consumer-integration-2026-10-02.md` 和前一步 `experience-public-image-cache-independent-review-2026-10-02.md`；逐读实际 App、API clear、test support、launch/cache tests、cache core/runtime、byte qualification、legacy session、request adapter、loader、shared hook 与调用消费者。确认 actual import 路径和控制流，没有把 child 的49/109 PASS或 note 当运行 oracle。

独立脚本 `.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-public-image-launch-clear-independent-2026-10-02.mts` 在独立 VM 执行当前实际 core、runtime、bytes、legacy session、request、loader、shared hook、request registry、response cache，并使用实际 TanStack QueryClient。App launch 与 public clear 由实际源码 AST 提取执行，import wiring 另直接读源码核对。没有复制 production owner 算法来替代实际 owner，没有导入作者的 test fixture 或 tests。

Taro FS / transport、React hook 调度及 native image callback 是受控依赖。FS 保存真实 bytes、readback/hash、路径和索引事件；transport callback 可以 held / abort throw / 逐一放行；native onload 由脚本控制。因此“实际模块调用链”与“真实微信 native 平台”严格区分。cleanup grace 注入10ms，production 为2s，不能据此声称微信等待时延。native request 的源码 timeout15s仍在，没有以假 timeout或手工 rejection冒充 native 请求结束。

独立输入复用现有 constellation 实物 PNG，而非下载新图：TrA 3201B SHA `c283ccbe27b730d65a0ba0092c45668fba9d17452eaf4ffa19d43366fb94d7fd`；Tel 3637B SHA `0a5410aebe16156f68ff6fe547abed74753301a0c3bbf9502078e93aa07e6ab7`，均128×128。实际 catalog 元数据与实际 byte/hash相符。受控同源 `controlled.invalid` 和64个 f 的 publication 是合成路由身份，仅验证 namespace与权限约束，不是当前服务已发布这些合成 URL 的证据，不认证星图质量、天文位置、许可或 M51 成像。作者 r1 使用真实 M51/publication 的证据仍保留其自身旧 core/runtime绑定。

最终 generation 为 `output/sky-public-image-launch-clear-independent-1002-r11/`：

| 文件 | Bytes | SHA256 |
| --- | ---: | --- |
| review.json | 94889 | `17aedc17845868814bfb8c3166e1d8307a0659d40f5e50264b2d848581c86784` |
| binding.json | 89869 | `dabd805d046fa1090c225ccfdf02c70c9b8e442639f4f9116c96000edab95026` |
| executed-script.mts.txt | 31384 | `e1e9106f7ad1bf7c9046d21f06b4b398a7ac726b26ee377f329ad33325553091` |

review 内逐项保存实际状态/路径/索引/bytes/callback trace。binding 核228个输入运行前后完全一致：16 actual source module、一个catalog、一个旧 adapter 实际快照、一个记录六项SHA的baseline JSON、两张PNG、201 deep-sky 文件及六项保留修改。r10 已完成相同机制，后查其 before/after漏纳 catalog与旧 adapter snapshot；r11仅补这两个及 baseline输入的显式绑定并保存其快照，没有改变 production或覆盖 r10。其余模块源码副本及每项结果保存在同 generation。

## 实际结果及解释

1. **App launch与legacy范围**：真实 launch 调用 legacy owner和公共 singleton ready。旧 `sky-art-old-*`、旧 `deep-sky-*`清掉；当前 session、draft、public namespace和最终 index保持，无图片 transfer。console warnings为空。当前 launch fixture显式注入 public initializer，并保 available / legacy unavailable / public initialization failure / 两者独立失败四种意义；这些 failure fixtures读过，不能把它们说成此脚本的四次 native启动。
2. **clear的顺序与含义**：实际 public clear在同步调用点完成 epoch fence，随后两 API read cancel观察到epoch=1。live lease立即 `isCurrent=false`、retire listener恰好一次；活跃 lease未release时文件保留且 service报 `local_cache_cleanup_incomplete`，独立 API/query/response owner仍清理；release后文件归零，再clear complete。正常无held状态保原cancelled reads=2；query cancel同步throw/异步reject、response flush throw、durable incomplete分别仍attempt flush一次并报incomplete。private/weather/account/draft、非read mutation及非temporary query/response保留。当前源码对public partial/pending/rejection/同步不可用均转相同既有incomplete，未增加private/weather缓存准入。
3. **实际 abort throw clear**：旧 live entry已retired、old lease current=false、listener=1，pending waiter收到 `sky_public_image_cancelled`；running=1/reserved=3637B保留，API/query/response独立清理照常，service不伪报complete。放行旧native success后没有旧epoch发布，release后最终文件/lease/running/reserved归零。
4. **真实 native在途占用**：两actual Taro callback held，abort均throw，取消后仍running=2/reserved=6838B；提交第三个request时nativeRequests仍2、callbackDelivered=0。逐放行实际旧callback后第三个才开始，实际新文件读回hash相同，最终资源归零。此项直接核callback数与actual transfer starts，不仅看core计数。
5. **完整shared hook组合**：正常cold acquisition→byte/hash/header→受控native onload才ready；cold return、hide/show、新Canvas和重建runtime/index后均无额外transfer，仍用原同一文件。clear retire未完成decode，保存的late onload不发布；explicit retry重新获取。第一次transfer1，冷重入/重启extra0，clear/retry后总2，最终hide清Hook state graph并releaselease。
6. **双consumer共享**：两完整hook共一次transfer、同一文件、独立lease2；A hide降为1而B文件仍存在，B hide降0，后clear才回收。
7. **坏字节与回退**：第二张同长度payload实际第30字节变化，真实hash qualification拒绝其native decode；已ready旧图在retainedImages，lease保持1，不静默循环；explicit retry取正确实物，旧层保留至新层onload，再hide/clear释放。
8. **hide中的actual abort throw**：两个实际request都held时hook cleanup不throw，state graph清空，native running2/reserved6838仍保持。旧actualcallback逐放行后计数归零，没有native image创建或late图发布；再次show可取合法源。
9. **external acquisition cancel throw**：以实际旧adapter快照与当前adapter分别执行同一完整hook/realcore，fault wrapper只让acquisition.cancel抛错，promise仍来自真实core。旧adapter第一drop后throw、cancelCalls1、leased2、held graph1、attachedcallbacks2；当前adapter cancelCalls2、leased0、graph0、callback0，保存的late onload无发布，随后clear complete。旧快照SHA `2f06ad71c33a70e4da651d1415f84740fdbf196503500d5fde97bd241e58d5cf`；这是隔离旧adapter+当前其他模块的真实counterexample，不声称混合fixture曾是整棵历史部署树。
10. **唯一session变化点**：storage=session实际用 `sky-art-*`暂存，hide后unlink，无公共owner；invalid PUBLIC route零request/零decode/零owner，不能fallback到session writer。actual LOCAL optical resolver明确 `storage:"session"`、既有商业关闭边界保持。selected W3 `deep-sky-image-request.ts`没有迁到immutable cache；loader/RGBA/GPU额度也未由此改动。

这些是机制结果；11项输出包含服务failure变体，不以项目数量代替交付义务。当前已知公共manifest正常消费者共享同一文件责任，ready GPU层在clear时仍可持有旧lease，所以clear partial反馈合理；clear不是主动销毁已绘GPU纹理的认证。

## 独立发现、修复及失败保持

| Generation | 实际发现/资格 | review SHA256 |
| --- | --- | --- |
| r6 | core clear先调用native abort，throw打断all-entry退休；旧lease仍current/listener0，真实失败 | `d31551bd611bfdc15e949c1d8cd7873df4602cefec3d2cb4b494415cc585a60d` |
| r7 | root core先fence全部entry/waiter再逐safeabort；同例修后通过，仅证明fence | `7477ea7cd343d125aae9516925a3199e7c6d870d65946676606fca5107fcee96` |
| r8 | runtime tryabort/finally人工reject wrapper；callback0且底层2held时core占用0、第三native已start，真实失败 | `b702ee2d32c26db318a1a78331378231ea107616a1a645316783b0df821aab81` |
| r9 | root runtime只abort、等actual success/fail；同例修后slot保持，lateactualcallback后第三恢复 | `ece9b5134c8917ebde1190d3a34c921df1fc6decceac132fd2b431200719d1be` |
| r10 | 当前fullhook组合独立PASS，但catalog/旧adapter未入完整前后binding，保持原输出 | `bb921f1cc6db1c97ea962e888426368c859ce7310e328c4e1de0f284a1102c87` |
| r11 | 补齐额外inputbinding后当前actual完整组合PASS | `17aedc17845868814bfb8c3166e1d8307a0659d40f5e50264b2d848581c86784` |

各代路径统一为 `output/sky-public-image-launch-clear-independent-1002-rN/`，实际source snapshots/独立脚本/binding同代，不覆盖修前。r6旧core SHA `b30e1632679c0fabb26908750df4decc3e88dfcc9039a8f802e6dedaeb1c51a4`；r7 runtime仍旧，不能升级成在途占用保障。r1为task transpile默认TSX使generic错误；r2-r4为VM default-import interop错误；r5为task每次save同名exclusive文件，非production失败，failure记录保持。最终脚本分别显式TS/TSX、esModuleInterop=false和exclusive case独立文件；没有拿这些task错误充作产品缺陷。

sphere的独立原实现反例 `output/sky-public-consumer-cancel-before-1002-r1/result.json` SHA `4e97385327ff1ff5c9a016fbfab9ce4593a5420ed2ba35d6f547d5150c222ea6`及current受影响 `output/sky-public-image-consumer-integration-1002-r2/result.json` SHA `1c272e34b03cf351e955bd6aa69a8c55728ce7d25f5517ac9d44121883674dbc`也已实际读。作者r1常规组合/109checks绑定旧core/runtime，r2只补取消受影响组合/TSC，不追溯升级；本次r11另执行当前完整模块组合，没有用其PASS数认证结果。

## 当前production绑定与仍开放义务

| 责任 | 当前SHA256 |
| --- | --- |
| apps/wechat-miniapp/src/app.tsx | `a978497fb4e398c1441742ab96ce832f3d202993d35bcee45c8ec861119e7aff` |
| apps/wechat-miniapp/src/services/api-client.ts | `427095636955e0147b67a487bf5cf489f49a78f7a58966ee3433b639de590d7d` |
| apps/wechat-miniapp/src/services/api-request-test-support.ts | `d75a608cd444e5725fa0a1d8a7ebb8cc2d12be17c4c1f3c0b3b53be530024ba2` |
| apps/wechat-miniapp/src/services/sky-public-image-cache.ts | `221e1979747c12bc8edcc6c7f2d592dc80a039740d107658c03a106c709874fe` |
| apps/wechat-miniapp/src/services/sky-public-image-runtime.ts | `becf4c367fe8949e6218c5a6714b624508e4ee1c82d067ce7b78a50b14bbc5ea` |
| apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts | `8662e7522f21acfc5e65b7b7f109e95107cc47a1701966861f7b8e55de190385` |
| apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts | `bb9fa5d61d10c844560cf2c1c135bc58930238947d07bffe4c30343ee4be3a31` |
| apps/wechat-miniapp/src/features/sky/use-sky-optical-hips.ts | `90b1df1c26eb9552447fb8a6da6e5a04d8e771fc429fa04397077989a80130ba` |
| apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts | `05a9a6f6b380ec38c0674b771b9d37ef2c5917b167979d81a31bbd4f18ac7ffe` |
| apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts | `e64073f411f220a1a852f9f4b24ce6ea86c7ebf1a2b52f42a94d030129f432f8` |

全部16 module详细hash在r11 review/binding；scope未把private/weather、LOCAL trial或selected W3扩大为公共immutable准入。32MiB是encoded payload + reservation/failed garbage政策，index独立256KiB、正常峰值约两份；不是全应用≤32MiB，也不证明微信200MB剩余额度。8MiB maxFile也不是设备图像decode能力实测。

真实WEAPP startup/hide/reentry/Canvas重建/Settings partial与pending反馈、跨真正应用启动保留、native FS read/rename/unlink/配额、实际abort成功及异常后的callback、真实native decode、GPU/总内存与端云性能、旧新客户端真实兼容旅程及整体组合体验继续未验证。接口文件与一次受控路径能继续依赖开发，但不能关闭这些验收项。

关闭readback入口 `output/sky-public-image-consumer-independent-close-1002-r1/`绑定本note、脚本、r6-r11实际outputs及current protectedinputs；它仅核冻结/链接/不变，不添加runtime验收。
