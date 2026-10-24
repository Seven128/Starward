# 正式主包缺口的有界判别（2026-10-24）

**发现一条与已拒 facade 移位不同的实际成本路径，建议 root 作一次实现／完整构建判定。尚未修复正式预算。** 本次只读当前源与普通输出，只新增本文；没有 build、prepare、refresh、IDE、手机、服务、网络、Git 写入或生产修改。唯一 PLAN、UI→叠层→Sky结果顺序和完整 Goal 未变；手机拓扑仍归 HANDOFF 的唯一下一步。

## 直接编译证据

当前普通 `apps/wechat-miniapp/dist/weapp` 为339文件／5,028,121B，按现有三个子包根分界，main文件和2,033,036B；`common.js` 492,746B，SHA-256 `a479dff1c3566974b34cc663be71b57ad7fc698a3411b3405fbda70e04a0b8d1`。这是本地输出口径，不能覆盖官方原2051KB>2048KB或保证下一代准入。

独立解析这个真实 `common.js` 的 JS AST，webpack module **570** 包含完整134项操作对象，实际对象文本 **10,144B**，每项method/path均与当前声明逐字相同。其中 **46项 `responseEnvelope:false` 的属性文本及逗号合计3,845B**。其余88项是通用 envelope 请求器支持的操作。46项包括裸manifest/discovery和二进制资源，不能把它们统称为二进制。

用本地 TypeScript checker 解析现生成合同的真实 `MiniappApiJsonOperationId`，得到88个字符串成员，与声明中非false的88项集合完全一致；46项raw操作中被该类型允许者为 **0**。这不是只按文件名或一两个端点猜测裁剪。

原facade候选假设的factory正文已被编译剔除，只有key前缀留下；本次则直接找到了仍在输出中的完整46项元数据及其唯一主包动态读取者。不要再实施已拒候选或重复PNG压缩／六项Tab资源退休。

## 生成与真实消费者

- 唯一声明为 `packages/miniapp-contracts/api/miniapp.operations.json`（134项）。现成生成器 `tools/miniapp/generate-miniapp-sdk.mjs:48` 生成所有method/path，并按同一 `responseEnvelope` 规则生成响应类型；已有校验拒绝非法responseEnvelope/method/path。生成物为 `src/generated/miniapp-api.generated.ts`，不应手改。
- `services/authenticated-operation.ts` **全部运行时import只有 `MINIAPP_API_BASE_PATH`、`MINIAPP_API_OPERATIONS`**；其它导入均为type，依赖通过原有注入保留。`operationPath` 的参数和 `requestOperation<K>` 都限制为 `MiniappApiJsonOperationId`，但第25/69行动态索引完整表，因此main把不可能正常派发的46项也带入。认证、重认证、owner fence、取消、缓存和请求本身不需要改变。
- `services/api-client.ts:21` 还有一个未使用的完整表import；它不是新的已证factory成本。实施时可以移除该无用绑定，不能只移动它就声称节省。
- 完整表其它真实运行时读取者是 `services/deep-sky-image-client.ts:8` 的 `deepSkyImageDiscoveryGet.path`，及 `packages/miniapp-contracts/src/prepared-optical-discovery.ts:19` 的 `preparedOpticalDiscoveryGet.path`。前者由Sky图像hook消费；后者的原 `PREPARED_OPTICAL_DISCOVERY_PATH` 被 `bare-sky-resource`／`prepared-optical-client`、Sky hook消费。裸资源的传输、校验、来源和URL语义必须保留。
- 真实生成物的module570引用：`common.js` 一处（通用API职责），以及 `sky/detail/index.js`／`sky/sub-vendors.js` 内的Sky资源职责。其它 `MINIAPP_API_BASE_PATH` 生产使用者也均为Sky资源/source消费者。根 `src/index.ts` 是纯转发entry。

## 建议的最小职责变更与陷阱

让同一生成器按既有响应合同输出一个**独立叶模块**的88项envelope操作表，通用请求器改读该表；原完整134项表、旧公开名字、响应类型和raw客户端继续可用。BASE_PATH应由窄叶模块拥有／直接转发，避免主请求器仅为了读取base又依赖含完整表的模块。根entry继续纯re-export；旧生成入口如需转发BASE_PATH，应保持兼容。

不能只在原混合文件追加一个JSON表export：Taro按模块分包，原全表仍被Sky使用，同模块若同时有main使用者，完整表仍可能留在main。也不能在运行时从全表filter/fromEntries得到子集，那仍要携带全表。生成时选取88项、明确叶模块和当前base依赖才有机会把46项成本移出main。原表仍是同一声明生成，不引入手写端点、路由白名单或新的请求框架；不改现有134项method/path/公共合同。

现有成熟能力已经足够：生成器、合同纯转发优化、Taro普通子包和生产优化。无需新增依赖、改全局minifier、改采用UI、减星／降图质／删原图、引入CDN或改变编辑入口。子集可能增加整体重复声明字节；root须同时读取main/Sky/总包实际代价，不能只报预期3,845B收益。

## 相称的实施资格

1. 生成一致性 `npm run check:miniapp:sdk` 必须覆盖全部新输出；现 `--check` 只核一文件，需要随同扩展。对完整134项和新88项逐项比较原method/path，验证46项不入JSON表而完整表不丢项；不得改声明缩小功能。
2. 复用 `packages/miniapp-contracts/src/contracts.test.ts` 已有raw排除合同，以及 `tools/miniapp/contracts-reexports.test.mjs` 的真实webpack隔离／初始化保护。`config/contracts-reexports.cjs` 只给根纯转发entry purity hint，并递归核初始化；新生成叶模块应是惯有字面声明／转发，不扩泛化sideEffects:false范围。
3. 请求器已有真实消费者测试包括 `account-reauthentication`、`session-retry`、`contribution-operation-dispatch`、`profile-operation-dispatch`、`plan-mutation-scope`、`share-creation-scope`、`sky-report-auth`、`stellar-catalog-client`。修改实际取值owner时调整共享加载适配，保留原行为断言；资源侧复用 `deep-sky-image-client.test.ts`、`prepared-optical-discovery.test.ts` 和合同同名测试，核原URL／来源／校验不变。
4. root一次普通完整build后检查真实模块：main只需88项、46项原raw路径仍由相应资源子包提供，合法生成资源／页面不丢；读取main／Sky／总包和必要类型／受影响行为结果。再沿原官方正常预算入口核实际准入。只通过源码／checker／局部测试不能关闭正式2MiB义务。

本次没有新候选、官方体积、目标画面或性能结果；3,845B是现真实对象内的可分离属性成本，不是净构建收益或官方余量。若一次实际构建没有有效收益，保留反证并停止该机制，不继续相邻facade扫描。
