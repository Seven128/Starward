# Prepared 已绘版本来源与恢复（2026-10-03）

来源信息开发链及[独立 delta 审查](experience-prepared-optical-information-independent-review-2026-10-03.md)已在有界 metadata/source/cache 范围收口；不启用普通 Prepared。已绘 completion 的原 hash 可以绑定 Prepared 的完整原来源事实、独立 manifest family 和缺源/重试状态。来源页面接收 provenance 不代替星图关联的完整可见署名，默认 GPU completion 仍为空、overview 背景接缝仍为质量采用 FAILED。

## 责任与当前源码

| Owner | SHA256 |
|---|---|
| `workers/miniapp-api/src/prepared-optical-imagery.ts` | `def0f73345340ecf154a40935853997fb8f844e5ff0dcc53abd321d07d6f12ed` |
| `workers/miniapp-api/src/sdss-optical-imagery.ts` | `be2b36ceca145b3e04e59f72127ab985638c9ebc7b760631a2388dc2def8684a` |
| `workers/miniapp-api/src/celestial-object-information.ts` | `2dc8fd4ba79e6b3b585256dbfdd7576e633f82fe817abaca56c9b571693cce27` |
| `workers/miniapp-api/src/miniapp-service.ts` | `edd48f008888001873a4393dacd2287016a3c46319eeebd06ecd9476b46d3bbf` |
| `apps/wechat-miniapp/src/services/api-client.ts` | `9c93673d449508d195e8057a3fc5713e7d93cb24b054424fa43c64813dc45772` |
| `apps/wechat-miniapp/src/services/celestial-information-response.ts` | `09aa50d6ebdf505db8cb9f5b80d5facb614f4ad5a480480f4e37b005d62287c2` |
| `apps/wechat-miniapp/src/services/celestial-information-presentation.ts` | `d2a069e0511c1b645f11a644faa8bb0490b35efae1177ec2fb62f5be53564592` |

`hasRegisteredPublicationHash` 只声明 family ownership，实际 source/manifest 仍由原 owner 对固定文件内容/hash/ref/catalog center admission；不构成来源权利、可用性或普通发现/采用。明确 hash 的 Prepared 分派通过第四可选 owner，原第三 Moon 默认行为不变。跨 family 注册声明冲突 fail closed；未知 hash 保旧 SDSS 缺源行为，不借用其它 family/最新对象。无明确 optical hash 仍返回原 SDSS 来源。

资料保目录、别名及独立 W3；Prepared 缺源为 PARTIAL 和明确 warning，不服务缓存失败结果。恢复同原 hash 后内容 revision/ETag 改变，原 PARTIAL 条件回复不能遮住恢复。客户端允许一个明确 optical family/hash、核 data/envelope 一致，Prepared manifest 链只接受匹配的已绘 hash。source 的完整 credit/licence/colour/AVM 原约5″提示/修改披露保原出版文本。

实际 API `staleCandidate` 会保 warnings 并把缓存 PARTIAL 转为 STALE_USABLE。原 validator 只容 PARTIAL，使已知缺源的缓存目录资料再被客户端拒绝和清除。本轮修复该共同边界：STALE_USABLE 只在对应 optical/W3 缺源 warning 保留时允许缺源；双缺源各自需要 warning。FRESH 缺源、无对应 warning、错 pin、混 family 或不一致 envelope 仍拒。原缓存额度/TTL/存储格式不变。

## 实际开发输入与输出

[R4 result](../../../../output/prepared-optical-information-1003-r4/result.json) 3,882 B / SHA `04908cd89254301596fae7078fdb6a31ebfe34ba1de4210b949af47d095f7430`。实际工具 `7f86dc` exit0；Node24.16.0，worker/App 各自 TS5.9.3、受影响行为和完整各自 typecheck 通过。59项 selected源码/元数据/执行工具与6保留项 before/after exact；这不是完整加载模块/编译输入闭包，也不把整项目类型通过当作未执行模块的行为验收。

[真实 BFF 来源 trace](../../../../output/prepared-optical-information-1003-r4/actual-bff-source-trace.json) 36,743 B / SHA `f46816a55733a1e04bf48858c0b5d07ee14e9e6485230151b6b62284e233dfd6`：本机真实 loopback Nest/Fastify socket HTTP，原 R4 publication `8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802` 的临时受控 metadata 副本失效、200/PARTIAL→304→恢复同原字节→200/FRESH→304，Prepared 清单200、错误SDSS family404。只测试 metadata，不重新下载/解码或重投影 JPEG/PNG/FITS。临时副本在核验 tmp 绝对范围后清理，原候选及用户数据不变。

App检查消费本代真实 BFF trace，执行实际信息客户端/响应 validator/manifest链接、信息 Hook 和 Source/modal AST；native I/O/React components 为控制端口，Source页只核完整 provenance props 与 link/重试，不认证实际可见文字、WXML/完整星图区信用。原 science/legacy/W3 行为保持。

另有[修前 stale 反例](../../../../output/prepared-optical-information-stale-1003-r1/result.json)，实际 `c1f254`：既有 `transportHarness` 执行真实 request/cache/staleCandidate，再交实际信息客户端，网络回调失败后明确抛 `celestial_information_optical_source_invalid`。修后 Prepared/W3/双缺源、拒绝未标记与伪FRESH、同 pin 恢复通过；没有真实手机、用户持久缓存、凭证或下载。

执行脚本 8,450 B / SHA `7588a8f94cf9a35fee5bf909132f0c9377d59569732c71912eb1986dc29ef8c8`，执行源码副本/元数据/日志保存本代。R1仅猜错 modal 文件路径、检查前失败；R2有有效修前来源/family/链接/缺源行为反例，同时两个新 fixture 的 readonly array 操作类型错误；R3修正等价 fixture/生产路径，在其当时范围通过，随后发现未测 stale 边界。全部旧代保持实际状态，不追认最终闭合。

下一依赖见[唯一 PLAN](../PLAN.md)。独审note 8,245 B / SHA `1056ae0cb55364d0dd2b8892df6f584c55fbb1a7764022729d14293e21345978`，独立result SHA `f8bca0844ab94f96db8913b844a5fc658eac0353a1487f11e8af5b1c553e4f83`。实际独立执行 exit0：206项输入before/after/final及Root当前读回exact，六保留项/原分支HEAD保持；真实owner、缓存、AST消费者、同值旧validator反例和3个有效guard mutant无剩余本范围阻断。未重HTTP listener或图像/GPU。共同背景/有限边缘、GPU参与观测政策及资源、星图区关联完整可见credit、native/全对象质量/default/完整旅程与200DAU混合容量继续开放。
