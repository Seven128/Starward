# R20 私人草稿原 owner 修复 checkpoint

按用户新指令停止扩展，交 root 先记录进度并恢复电脑／手机性能通路。**当前源码已冻结待独审，未提交，不是完整 family 或 Goal 完成。** 没有开启后续历史查看／恢复功能；PLAN、HANDOFF、Context、Goal 未改。

## 已证缺口与当前实现

- 复用[行程原反例](R20-ITINERARY-OWNER-RETRY-DISCRIMINATION-20261024.md)。本作者另用真实 Field client → Fastify inject → 新 SQLite 确认同一原资格缺口：A 已提交丢回复，B 原键重试新增 B 草稿且清 A pending，正确期望 **0/1 失败**。原 POST/key 相同；`field-before.log`、`field-observed-before.json` 保留。
- 两个真实 React 消费者的拒权前后检查 **0/2 失败**：Itinerary 旧私有详情／编辑仍在；Field 详情已隐藏但编辑输入仍在。原件 `consumer-before.log`。后续旧 61953 Screen 源码控制只替换任务 tmp 的组件，其余真实 client/API/SQL 保当前：迟到 A 写入读回会覆盖 B 的 **Field** 详情；Itinerary 该条控制是阴性。`consumer-late-old-control-settled.log` 为 **1pass/1fail，另2项按 testNamePattern 未执行**，不把阴性写成缺陷。
- 新 `owner-qualified-api-command.ts` 复用既有 pending owner 的 prepare，只在新 intent 派发前取得各自实际 server owner，先存完整原输入/key/版本化资格，再派发原 wire。Rule、Itinerary、Field 迁入同一资格／strip／legacy 生命周期；Rule 原本地 schema、slot、控制读取与 wire 保持。NightReport 和 controls 的不同协议未合并，基础 pending owner 未改。
- 各 family 自己的成功 list 追加 `ownerQualification`，可选 `x-private-command-owner` 经可信 resolver 后只限制实际 actor；旧无头请求保旧行为。没有从通知 controls 或另一 family 推导 owner。缺资格的旧服务不准新派发；旧缺原资格或非法资格的本地记录保原字节 unknown，不 HTTP 重发，不用 A/B 同键回执补造归属。POST／持久版本／receipt 形状和字节责任不变。
- `private-owner-observation.ts` 统一两 client 的当前资格观察／拒权／迟到结果。两个真实页面以 owner 限定读 key、选中项、表单、pending 内容和分页游标；拒权或资格未知撤私有投影，原表单本地保留，恢复 A 后可继续。A 原 retry 能确认 A，但不能盖当前 B 或撤 B 资格；当前 revision 较高时不被较老结果覆盖。取消编辑不清未知 pending。
- 公开合同只改所属八条 v2 路径与资格／header/list schema。OpenAPI 最初展开编辑的原件保留，最终通过 JSON AST 定点编辑恢复原无关格式，语义深比较一致，最终 diff 为20行换20行。Windows 映射占用使直接写回失败，随后校验绝对范围和旧 SHA 后以同卷 File.Replace 完成，旧字节备份未删。

## 当前实际检查

原件均在本目录 `tmp/private-draft-owner-binding-20261024/`：

| 责任 | 当前结果 |
| --- | --- |
| 原 Itinerary／Field 正确结果 probes | **2/2**，`original-probes-after.log`；是保原文件的任务副本，原修前资料未覆盖。 |
| 实际 client／Fastify／SQLite owner 恢复 | 正式6项：A→B零效果／原 pending、恢复A原 body/key、确认后新key、旧或非法资格不重发、旧API不资格化；包含原 SQL body/version/receipt 读回。均包含于下行。 |
| 受影响 mobile 9文件 | **50/50、0skip**，`mobile-affected-final.log`。涵盖两个 client／两个真实消费页／原 Rule 与 Rules/Inbox 消费者；非全仓、非目标设备。 |
| Mobile 类型 | 最后已启动检查 **exit0**，`mobile-types-after-consumer-final.log`。 |
| API 受影响4文件 | **28/28**，`api-affected-first.log`：原 Itinerary／Field HTTP 持久化与 Rule owner／持久化。 |
| API 类型 | **exit0**，`api-types-first.log`；之后 API TypeScript 源未变，后续是公开元数据与 mobile 收口。 |

新消费者测试最初仅 createElement 的 TS 推断失败已保留在 `mobile-types-first.log`，改用实际 JSX 后类型通过；不是生产失败。原控制的未执行项、真实修前失败和局部中间结果不被新通过覆盖。

## 冻结、资源与未完

**26份源码／正式测试／合同／共享fixture** 的完整路径、字节与 SHA 在 `source-freeze.json`；当前 Git head 由该清单实读记录，后续独审先核这些 hash。本作者从此不再写这些源。没有 Git 写入、push、设备／IDE、WEAPP build、冻结代、网络／VPN、原 PG／API8806、用户资料／N05／提醒操作。

所有自建测试进程已退出；真实 Fastify／SQLite 句柄均在 finally 关闭，新增共享 fixture 使用 inject、没有 listener。旧 API 持久化检查自身使用的随机 loopback 监听也已随原测试关闭。合成数据库和所有原件保留；资源状态归 `resources-checkpoint.json`，本次未清理 TEMP 合成数据库目录。

**未完：** 新独审、所属公开 Schema／refs 的最终独立核对、root 整合与授权 Git／精确 CI；API/client 同版部署资格、production／多 owner／混合版本与旧无资格的可证恢复；Native AsyncStorage、键盘／系统Back／生命周期／真实设备。完整行程、Field、通知 family 和历史恢复后续模块全部保留。此次 checkpoint 不替代 root 的手机／性能通路优先工作。
