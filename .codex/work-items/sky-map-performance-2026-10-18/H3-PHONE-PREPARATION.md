# H3 手机 revision 构建准备

2026-10-19。**完整revision、类型检查、独立复核和同源HTTP准备已完成；此包已选为gen26并调用过一次官方预览，原官方终态仍UNKNOWN，手机送达未验证。** 不凭旧包装completed重发、绑定或刷新。最新现场以HANDOFF为准。继续沿 [原组件 fixture](H3-COMPONENT-FIXTURE.md) 和 [独立复核](H3-COMPONENT-FIXTURE-INDEPENDENT-REVIEW.md) 的边界：MAP_POINT／DATA_INSUFFICIENT 组件输入，不是 FORMAL_SPOT、已发布数据或完整 H3 通过。

原 sealed source、`a282341a408821832d65284ab651e0431113092cce59f5b3e5754cc8f9ed2e66` 包、fixture 输入和原 build／behavior／typecheck 回执保留。原 `prepare.mts`、`build.mjs` 增加手机分支；它们先前的逐字版本位于 `tmp/h3-component-fixture/phone-owner-before/`，哈希与原机器化证据一致。因此原报告中这两个当前脚本路径的历史哈希应从该档案恢复读取，不能称所有原 artifact 路径仍逐字未变。没有编辑生产 src、原组件、照片、PLAN、HANDOFF、INDEX 或 Goal。

## 固定入口与输入边界

原 prepare／build 命令继续拥有旧 loopback fixture。新增 `--phone-revision --api-origin-file <绝对路径>` 只使用外部 JSON 的唯一 `apiOrigin` 字段，写入固定独立目录 `tmp/h3-component-fixture/phone-revision/`。源目录或目标输入已存在时拒绝覆盖；手机模式拒绝 `--refresh-owned-fixture`。生成失败应诊断该次失败并保留其目录，不能把旧 sealed 包或生成 JS 拼进新包，也不能盲目重发。

文件上限 2048 B；拒绝额外字段、凭证、非 HTTP(S)、路径／query／fragment、已知 loopback、unspecified、link-local 和 multicast 地址。URL 检查只证明配置结构可用于非 loopback 目标；不做 DNS 或接口查询，**不证明 hostname 实际解析、物理网卡归属、手机连通、TLS 或合法域名配置**。root 必须从已有网络 owner 选定实际物理 HTTP(S) origin，不能把结构准入当成连通成功。origin 和静态 Context 只进入 ignored task 产物；回执只打印 origin 哈希，不打印私有配置或坐标。

prepare 复用原 `createH3IsolatedInput` 的真实正式拒绝、MAP_POINT Context、真实照片声明和 READ_FAILED。原 adapter 的本地 HTTP 准入没有放宽；窄 `phone-binding.mts` 只把同一已审照片路径改接到所选 origin。builder 再从**当前仓库完整源码**复制后应用四份哈希仍匹配独立复核的 fixture overlay，保留全部页面／分包。API 与 Sky-resource 编译 origin 使用同一个值，并检查 emitted JS 中的新 origin 与无旧 fixture loopback。未手改生成 JS。

## 已完成准备的固定入口（保留方法，不重跑）

下列命令保留原准备方法；对应目录和实际origin早已生成，不能再次执行到现有不可覆盖目录，也不能用于重发gen26。origin文件仅含`apiOrigin`，不放账号、密钥或其他配置；实际值继续留在外部私有owner：

~~~powershell
$h3OriginFile = 'E:/Dev/Starward-data/development/h3-phone/api-origin.private.json'
node tools/run-node.cjs --import tsx .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/prepare.mts --phone-revision --api-origin-file $h3OriginFile
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/build.mjs --phone-revision --api-origin-file $h3OriginFile
node tools/run-node.cjs apps/wechat-miniapp/node_modules/typescript/lib/tsc.js --noEmit --pretty false --project .codex/work-items/sky-map-performance-2026-10-18/tmp/h3-component-fixture/phone-revision/source/apps/wechat-miniapp/tsconfig.component.json
~~~

目标项目是 `tmp/h3-component-fixture/phone-revision/source/apps/wechat-miniapp`，入口 `pages/h3-component/index`；以新 `build-receipt.json` 的完整 bundle 指纹作为接下来的候选身份。origin 在 prepare 前确定，同源 handler 和真实 terrain 接线在手机运行前准备；修改 origin 需要新准备／完整构建，不能替换当前包中的 URL。

handler 的 root 接口为：

~~~typescript
import { readPhoneApiOriginFile } from './phone-target.mjs';
import { createH3PhoneBinding } from './phone-binding.mts';
const apiOrigin = await readPhoneApiOriginFile(absoluteOriginFile);
const binding = await createH3PhoneBinding({ apiOrigin });
// root 的既有服务将外部 origin／method／headers 构成 Request；这里不启动监听。
const response = await binding.handleMedia(request);
// response 非 null 时由原服务回送；其他路由继续由原有明确 allowlist 管理。
// owned 服务收尾时 await binding.close()。
~~~

`binding.transport` 提供 `mediaPath`／`mediaUrl`、`terrainPath`／`terrainUrl` 和 origin 哈希供 root 内存接线；不要把包含坐标的完整 URL 输出到一般日志。`handleMedia` 只接收同 origin 的 `/__development_h3_input/media/east-dam-minibus-20250502.jpg`，原 adapter 负责安全 JPEG 的精确身份、GET／HEAD 与 query 约束；窄入口额外拒绝账号、cookie、operator、reauth、idempotency headers。错 origin、山体和账号路由返回 null，不承担普通业务路由或账号保护；root 的外层 allowlist 仍要保留。

照片 handler 和恢复 API 必须由**同一个所选 origin** 提供。恢复仍由原 `getTerrainHorizon` 生成 `/v2/terrain/horizon?centerLat=<同点 GCJ02，7 位>&centerLng=<同点 GCJ02，7 位>`，请求字节规则与原 client／fixture interceptor 一致。root 只能把该 GET 交给现有真实 terrain owner；照片 handler 不拦截它，也不提供成功高程、零角曲线、假 AVAILABLE 或正式站位。真实 terrain 数据缺失时继续保留失败，不能仅凭恢复按钮或派发回执关闭 H3。静态 Context 只属于本组件 props，不装入普通 app-store 或正式选择链。

上述代理准备阶段没有调用现有 API、DB、DevTools、feedback、firewall 或设备；没有改变 R17 当前候选／服务、8791 账号、N05、R6、配对或 VPN。root 等当前 R17 工作的依赖允许后，再沿现有完整候选／feedback owner 决定交付；不能使用旧 session 的截图或输入授权。

## 本次软件证据及剩余 native 证据

独立 `--phone-validation` 固定目录使用 RFC 5737 documentation 地址的 dummy HTTPS origin；**从未联系该地址，不能交付手机**。六组新边界检查通过，包括 origin／文件准入、输出隔离、同一照片与同站位、精确照片 handler／凭证拒绝／不劫持 terrain、关闭拒读、原 sealed source／包／回执保留。完整 WEAPP 构建通过：1560 原输入、16 overlays、341 输出文件、4,979,216 B，bundle `0d4738a6cf54e2549b79e544b2b94eae4699867d0c87af927675b98b18594ead`；主包 2,030,836 B、余量 66,316 B，两个 emitted JS 含所选 dummy origin。Mini Program TypeScript 5.9.3 的 fixture 完整导入依赖图检查退出码 0。本次没有重复原组件 behavior 矩阵或全仓检查。

后续仍须实际验证 Android WEAPP 挂载与照片可达／下载／native decode，原生 Map 在山体失败期间持续可用，图库／文档／来源返回位置，真实同点山体成功响应和恢复重绘，以及原正式资格／普通业务消费者和 iOS 等完整 H3 原有义务。软件处理的失败、元数据与派发规则不能替代这些证据。机器化结果与有限 artifact 位置见 [H3-PHONE-PREPARATION.json](H3-PHONE-PREPARATION.json)。

## root实际接线结果

当前phone-revision完整包 `1ee545f004155d693e0d7384240da558b1de20a4a22cb67c300d2f9368d77941`，341文件/4979225B，主包余量66308B；origin SHA与当前8798 lane一致，当前源/overlay/产物独立回读通过。严格组件导入图类型检查退出0。dummy包仅保历史软件检查，不能与本包混用。

同点真实terrain HTTP200/FRESH，原前端checkedTerrainHorizon按fixture请求站位校验通过：AVAILABLE、真北顺时针360个一度扇区、20km、360已知方向，未填缺测为零。首次7068ms；[预检](H3-PHONE-TERRAIN-PREFLIGHT.json)仅为实际HTTP/数据，不认证手机重绘。安全照片handler已挂到8798，GET/HEAD精确3,038,007B及SHA一致，query/POST/私有headers/错路由均拒绝，9项HTTP已核；见[素材就绪](H3-PHONE-MEDIA-READINESS.json)。当时仅重启root桥接session17528，8799和原R17 Context保留。该session现已被后续桥45300取代，当前API为94448；旧MemoryCache Context在API重启时丢失，公共lane后来重新准备，不能继续沿用旧Context活性声明。实际H3送达、原生图片解码/地图合成/返回位置和恢复重绘仍欠。

## 清理前的源材料保全

原ignored tmp中的H3 helper、isolated adapter、已准备照片、回执、1560份phone-revision源输入和16份overlay，以及341文件完整包，已复制到既有外部owner的`h3-gen26-pre-delivery/h3-source-preservation-20261019`。共1937文件、18,989,409B，逐文件校验原件及副本SHA；原包复制前、复制后和归档读回均为`1ee545f004155d693e0d7384240da558b1de20a4a22cb67c300d2f9368d77941`。未复制node_modules或设备session，未删改原件，未重新构建或预览。

私有manifest SHA为`cb9b5ac33dfe909d75517cc79b22c3f070b0a39b5bd667a30c4188f42d1ddc62`；精确位置、范围和计数见同名JSON的`sourcePreservation`。Git只保存定位与完整性摘要，私有origin、生成物和照片原件仍在外部；新clone本身不提供这些材料。此保全解除必要phone-revision源只存tmp的风险，不升级原官方UNKNOWN或任何产品验收。

2026-10-19接手后的实际依赖核对发现，上述1937文件未含`h3-isolated-input/prepare.mts`引用的兄弟目录`h3-photo-input`。现已把该目录的原始JPEG、`product-input-candidate.json`和`public-source-readback.json`精确保全到同一外部owner下的`h3-photo-input-completion-20261019`：3文件/3,057,739B，源→副本→源再读SHA全部相等；新manifest SHA `4000b37c69b6ecc99bc457a8c7d0d070faf9782926e9300eceb790466e3ef0fa`。旧manifest和全部原件保持不变。恢复时将新归档的`h3-photo-input`与旧归档`h3-isolated-input`、`h3-component-fixture`放在同一新私有目录下；此次未运行prepare、重产照片、恢复服务或发送gen26，重建与目标运行验收仍未由归档完成。
