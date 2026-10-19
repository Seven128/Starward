# H3 / H6 离线可恢复性与接收对象准备

2026-10-19。沿当前 HANDOFF、PLAN 和 INHERITED-REQUIREMENTS，手机不可用。此轮完成了 **H3 原始输入归档缺项的识别及补保后的独立读回**，并把 H6 的实际对象、公开字段及恢复前提核到现有源码 owner。没有执行 prepare/build、服务/API/DB、账号、IDE、ADB、手机、分享或外部联系；没有改生产代码或 Git。只写本文及同名脱敏 JSON。

## H3：原始输入缺项已补保，静态恢复依赖成立

既有 [H3-PHONE-PREPARATION](H3-PHONE-PREPARATION.md#清理前的源材料保全) 的外部归档仍完整：`h3-gen26-pre-delivery/h3-source-preservation-20261019` 的 manifest SHA-256 仍为 `cb9b5ac33dfe909d75517cc79b22c3f070b0a39b5bd667a30c4188f42d1ddc62`。本轮逐条检查 manifest 的 **1,937 个路径存在、字节相符、文件非链接**，共 **18,989,409 B**；没有重做全批 SHA。安全 JPEG、已准备输入、helper、1,560 份 phone-revision 源输入、16 份 overlay 和 341 文件 gen26 整包的原保全证据继续复用。

实际发现旧归档只含 `h3-component-fixture/` 与 `h3-isolated-input/`，而 `h3-isolated-input/prepare.mts` 第 10–11 行直接读取相邻 `h3-photo-input/` 的原 JPEG 和 `product-input-candidate.json`。旧 manifest 没有这两份文件及原来源回读 `public-source-readback.json`。这不妨碍复用已生成的安全 JPEG 和完整包，但不足以保存原始照片准入与重建输入。

root 已在同一外部 owner 新建独立补保目录，原件和旧归档均保留：

`E:/Dev/Starward-data/verification/sky-map-20261018/h3-gen26-pre-delivery/h3-photo-input-completion-20261019`

本代理随后独立读取补保文件与当前原件，三件的 SHA/bytes 均与声明一致。补保 manifest 为 **1,347 B**，SHA-256 **`4000b37c69b6ecc99bc457a8c7d0d070faf9782926e9300eceb790466e3ef0fa`**；三件合计 **3,057,739 B**。

| 相对原任务 `tmp/` / 补保目录的路径 | bytes | SHA-256 |
| --- | ---: | --- |
| `h3-photo-input/high-island-east-dam-minibus-20250502.original.jpg` | 3,050,409 | `84c3ac48ee8d54541e4e24fe0232890e970f21938de766d56541513e5191fc84` |
| `h3-photo-input/product-input-candidate.json` | 4,123 | `0b829fbaa86f1e4f7ebd9a02f99f32cfdbb44bd2763d2b6d3f5aa3c4be784a51` |
| `h3-photo-input/public-source-readback.json` | 3,207 | `193f421716ec66a26d09dd65978e14c3e496e1c0c30e863f91cdb9092576ab8e` |

前两件是 prepare 的直接文件依赖；第三件保留原 primary 来源、许可和文件身份的已取得证据。未重新联网、下载、解码或加工照片，未把 EXIF、坐标或原片内容复制进 Git。既有真实时间/真北方位、作者/许可、元数据安全副本和 HTTP/组件结果沿 [H3-PHOTO-INPUT-READINESS](H3-PHOTO-INPUT-READINESS.md)、[同点输入](H3-SAME-SITE-ISOLATED-INPUT.md)、[组件 fixture](H3-COMPONENT-FIXTURE.md) 复用。

### 恢复入口与实际限制

恢复位置是仓库内原 `.codex/work-items/sky-map-performance-2026-10-18/tmp/`：旧归档的 `h3-component-fixture/`、`h3-isolated-input/` 和补保归档的 `h3-photo-input/` 必须同级。已静态核对归档 prepare 中的两个 `../h3-photo-input/...` 引用可在该布局精确解析。当前三目录仍存在，本轮没有复制覆盖或执行恢复。

- helper 通过相对路径导入仓库的 `workers/miniapp-api`、`packages/coordinate-system` 等实际 owner；`build.mjs` 还要求仓库根 cwd 及任务 tmp 路径。不能在外部归档根直接运行，也不能把 helper 和生成 JSON/包混作可从干净 clone 直接执行的公共命令。
- node_modules 按原保全合同排除，实际重建仍依赖受支持的仓库依赖与当前源码。恢复冻结源码用于查看原候选；不据此覆盖当前源码或宣称新源码已重建。
- 手机 origin 的唯一外部配置 `E:/Dev/Starward-data/development/h3-phone/api-origin.private.json` 当前存在，仅含 `apiOrigin`。本轮只核文件结构，不输出值，也不复制它进入 Git；文件存在不证明网络/服务可用。改变 origin 仍需新的完整准备与构建，不能替换旧 emitted JS。
- 原 `--phone-revision` 已存在，脚本拒绝覆盖；不能用旧复现命令重发 gen26。`fixture-input.json` 的静态 Context 也不代表旧 API MemoryCache 仍活着。

此轮结果为 **静态文件依赖恢复可用，未执行重建或目标运行**。gen26 原官方终态继续 **UNKNOWN**，没有重发、绑定或刷新。真实 Android 图片下载/native decode、独立地形失败期间地图/照片持续可用、阅读返回位置、真实山体恢复重绘、普通正式资格/消费者和 iOS 仍沿原 H3 owner 未验。DATA_INSUFFICIENT 仍不能冒充 FORMAL_SPOT；本轮没有引入新公开点或发布链。

## H6：已核到具体对象，不能从旧摘要签发新对象

已读当前 [generation9 实际海报/计划列表记录](PHONE-VERIFICATION.md#generation9-poster-package-repair-and-native-album-save)，以及恢复在 `E:/Dev/Starward-data/restores/r6-20261018/private/evidence/task-notes/non-hard-obligations-20261005/` 的 `phone-n05-native-delivery-20261016.md`、对应独审、`n06-sharing-independent-review-20261015.md`、`n06-account-independent-review-20261015.md` 和实现摘要。原私有材料留在原 owner，没有复制进 Git，也没有重做 N01–N06。

| 对象 | 可复用的准确事实 | 恢复后的最小必要条件 |
| --- | --- | --- |
| N05 / PLAN | 原 N05 是手机本机草稿，原样保留了隔离正式点与默认时间；原过程未提交服务端计划。当前 My 列表为空不证明它被删除。 | 先在原身份、原路由作用域确认原草稿；只有真实保存后的 plan + timing 和合格 spot 才能沿现有分享入口签发 PLAN。不能为获得 planId 重建账号、伪造草稿或借恢复 PG 的空列表判它丢失。 |
| SPOT 名片 | generation9 的既有 MEMORY_TEST SPOT 已真实打开、海报实际显示并原生保存 1 张；这不是生产地点/真实天气资格证据。 | 恢复后从当前可访问的同一实际地点对象进入分享并确认完整公开内容；名片身份由当前 `spotId` 响应持有，不能把 H3 的不足资格地点换入。 |
| 已保存海报 | 只有 generation9 约 11:29 本地保存的那 1 张任务 SPOT 海报有实际相册成功回执；当时未枚举精确相册文件名。 | 沿当时画面/时间识别精确那张后交接与接收端打开/保存；旅程完成后只清理该图。不能离线猜文件名或按时间范围批量清理相册。 |
| 账户导出 JSON | N06 已有真实微信身份准备、原生写入/读回、关闭清理与一次清理失败恢复的独审；原最终读回文件数为 0，未点击微信交接。 | 在原身份的实际设置入口重新准备当次文件，READY 后才显式交给微信。不能转发已清理的旧路径，也不能把另一个恢复账号的 JSON 当作原账户导出。 |

N05 的精确保护边界可从源码直接确定：`services/local-draft-keys.ts::planDraftKey` 区分账户 + planId，及账户 + null + 新建地点；列表 `content/plan/list/index.tsx:36` 只读当前账户与当前 route spot 的那一个键。原 N05 的历史可见内容不是当前草稿 key 或账户身份的读回。手机恢复前无需扩读全部 storage，更不应清库、迁移或构造替代草稿。

### 已核公开合同与文件交接条件

- `workers/miniapp-api/src/miniapp-service.ts:2231` 的公开地点仅准入 PUBLISHED / TEMPORARILY_CLOSED。PLAN 创建还要求当前账户确有 plan 与 timing；其 capability 有效 7 天，绑定 plan revision。实际读取时再次核 plan 存在、revision 与地点资格；过期、版本改变或原对象消失返回缺失。旧回执中的 token 不是本轮可用链接，未读取或重新签发 token。
- `packages/miniapp-contracts/src/api-shapes.ts:619` 与实际 service 投射只公开地点、完整起止/出发时间与时区、事件/来源和有效期；私人备注、出发地 travel、提醒、清单和账户凭据不随 PLAN 公开。SPOT 使用当前正式公开事实。`content/share/index.tsx` 的 TOKEN/SPOT 接收入口匿名，planId 创建入口才用原账户操作 owner；实际接收还需要当前小程序与 API 对该接收身份可达，源码匿名合同不证明微信体验资格或端到端访问。
- 账户导出为 `starward-account-data-export-v1`，包含当前账户结构化私人记录；`services/api-client.ts:1156` 要求原同身份再核验，设置 owner 写入本次独有 native 文件。它与公开 PLAN/SPOT 白名单是不同交接对象。会话凭据、微信身份 digest、内部对象键与原媒体字节继续排除。
- `content/settings/account-export.ts` 已持有 READY → 显式分享 → 清理责任。分享取消/失败保留同一文件供原动作重试；关闭/退休会清理，待清理状态不能另生成。`shareFileMessage` 成功仅证明微信接受交接，不证明对方打开/保存；历史 native 文件链无需重做来代替这个剩余端点。

在上述已读当前/恢复 owner 中没有确认具体授权真实接收身份。提醒 R6 的一次已送达事实不授权选择同一身份接收新的 PLAN/SPOT 或私人导出。当前无需询问或操作联系人；用户说明设备可用后，先恢复可审阅的当前对象，再集中确认**具体接收身份及其获准接收的对象种类**，随后以实际接收端内容、失效语义和文件打开/保存作为剩余证据。不得擅选联系人或把消息发送成功计为接收结果。

## 收口

离线实际修复已由 root 补保完成并经独立窄读回；详细机器摘要见 [同名 JSON](H3-H6-OFFLINE-READINESS-20261019.json)。本轮没有新产品行为改动，复用既有组件、HTTP、原生保存及独审证据，未追加重复测试或新 fixture。H3/H6 的剩余目标结果继续未验；8791 原账号、N05 UNKNOWN 草稿、已送达提醒 R6、gen26 UNKNOWN、原配对与 VPN 均保持保护。
