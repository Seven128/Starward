# R20 私有观察拒权增量独审

结论：**本次两文件增量在审查范围内通过，未发现新的 P1/P2。** 上轮已实证的“真实拒权后旧成功列表重新取得私有显示资格”已由当前共享 observation owner 修复；不是 Native 设备、完整私人草稿 family 或 Goal 验收。

## 范围与身份

读取适用 AGENTS、global/default manifest、架构、唯一 PLAN 的 Private command attempt authority、两份前序审查/修复报告及当前实现。按 Native React Native App 的状态与恢复合同追踪 ItineraryScreen / FieldReportsPanel；未重开设计、视觉资源或设备工作。上游要求保留拒权后的私有投影撤除、明确新读恢复及原 owner 的未知 attempt，不以成功提示或旧缓存代表当前可用资料。

新冻结清单 `tmp/private-observation-denial-repair-20261024/source-freeze.json` 的 SHA256 实读为 **8368dd6b8e9b534e862f914e5e9a53974f70f4ee52d6c5e1fc33001c382cec48**。开始与结束均逐件核对 **26/26** 长度/SHA一致；相对原811c4559…清单仅两处变化，其余24份字节相同：

- `apps/mobile/src/data/private-owner-observation.ts`
- `apps/mobile/src/data/private-draft-owner.test.ts`

## 实现判定

`deny` 保留原401/403、开始时 authority 对象及 requestedOwnerId 三项限制，只有当前拒权才递增现有 generation，再发布 denied。既有 `accept` 与 `unconfirm` 均检查该 generation，因此同时失效拒权之前的合法列表和缺资格/非法成功列表。没有新增持久状态或并行 owner；拒权之后明确新发的 list 可取得新 token 并恢复 ready。

Itinerary / Field 仍分别在实际 request 错误入口调用同一 deny；当前数据通过 `canPublishLibrary` / `canPublish` 过滤。两个实际页面都订阅该 authority，列表、详情及编辑器受当前 ready 资格控制，原恢复内容另保原 owner。此次没有更改这些消费者、原 pending/body/key、API或Rule。原A请求的限制头不匹配当前B时，deny不会递增代次或撤B资格。

## 新的独立运行证据

复用上轮报告的内联探针，直接执行当前真实 client → Fastify inject → SQLite；仅 AsyncStorage / expo-crypto 原生适配器替换，API route、service、SQL、产品响应解析和可发布判定未替换。没有TCP listener。

| 实际路径 | 独立结果 |
| --- | --- |
| Itinerary：A非空列表200 → 暂扣另一份合格200 → 实际get403 → 释放旧200 | 旧读报`itinerary_owner_changed`；仍denied A、原列表不可发布；明确新list200恢复非空ready。 |
| Field：同一交错 | 旧读报`field_report_owner_changed`；同样保拒权并允许明确新读恢复。 |
| Itinerary：上述暂扣200去掉ownerQualification后迟到 | 旧读报`itinerary_owner_unconfirmed`，未将denied改为unknown；明确新list正常恢复。 |
| Field：同一缺资格旧200交错 | 旧读报`field_report_owner_unconfirmed`；同样保拒权并允许新读恢复。 |

四条路径均实际得到HTTP状态序列 **[200,200,403,200]**，原列表非空，拒权后私有资格为false，新读后为true；全程仅GET、pending storage写入数0。相称补查共享owner：当前B已有在途读取时，原A限制的403不撤B且不使B token失效；这是直接owner检查，未冒另一条HTTP/页面实测。

新正式回归本身走真实inject/SQLite并覆盖旧合格200拒绝与新成功恢复，断言能区分原先错误的resolve。作者修前2失败、修后8/8及其它消费者26/26、类型结果仅按其原报告复用，没有重复全套或相加冒本次独审总数。未变24份的先前185refs/34实际合同检查继续限定复用，Field继承responses描述缺项仍保留。

## 资源与保留义务

四份合成DB目录后缀为 `Rm10zK`、`9lXEY2`、`gUINJb`、`AbG6Sg`，位于系统TEMP，原件保留。每份fixture均在finally释放暂扣响应并关闭Fastify / SQLite；内联Node调用已退出。没有生产源码、Context、PLAN、HANDOFF或Git写入；唯一新增本报告。未操作手机、ADB、IDE、WEAPP build、共享服务、网络或防火墙。

同版API-client配对、生产身份/混合版本、旧无原资格attempt的可证恢复、Native真实存储/重启/键盘/Back/生命周期，以及完整行程/Field/通知用户结果仍未完成。root整合、授权交付与精确head CI归主任务，不由本报告替代。
