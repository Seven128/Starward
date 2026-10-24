# R20 私有观察拒权增量修复

状态：**唯一共用 P2 已修复并完成作者限定验证，待 root 新独审；未提交，未关闭完整 family／Goal。**

复用[上一轮26份成果](R20-PRIVATE-DRAFT-OWNER-BINDING-20261024.md)和[新独审反例](R20-PRIVATE-DRAFT-OWNER-BINDING-INDEPENDENT-REVIEW-20261024.md)，未扩展历史查看／恢复功能，未改 PLAN、HANDOFF、Context、API、合同或 Rule。

## 修复

只改 apps/mobile/src/data/private-owner-observation.ts 的实际 deny 分支：仍先验证401/403、请求开始时的当前 authority 对象和 requestedOwnerId；符合当前资格的拒权再递增现有读取 generation，并发布 denied。拒权之前开始的列表不能再 accept，也不能通过迟到非法成功响应的 unconfirm 把拒权变成 unknown。拒权之后明确开始的新 list 取得新代次，可沿真实成功响应恢复 ready。旧 A 原命令请求仍不能撤当前 B；失败／未知提交的原 body/key/pending 协议没有改动。

没有新增状态 owner、请求／取消框架或持久字段；两 family 继续使用现有同一 observation。

## 真实回归与结果

在原 private-draft-owner.test.ts 添加按 Itinerary／Field 参数化的同一回归：真实 client→Fastify inject→SQLite，seed 非空私有 A；先成功读取，再暂扣另一份服务端已完成的200列表；实际 get 403 后确认 denied 且旧列表不可发布；释放旧成功，要求该读取被拒且仍 denied；随后恢复可信 A 并明确发起新 list，确认非空 ready／可发布。还确认请求全为GET、无本地 pending 写入。只有存储／expo-crypto 原生适配器被测试替换，产品 transport、route、service、SQL、响应解析及 canPublishLibrary 均实际执行；不是设备验收。

所有本批原件在 tmp/private-observation-denial-repair-20261024/：

| 检查 | 结果／证据 |
| --- | --- |
| 新正式回归，修前同断言 | **2失败，6项按filter未执行**；regression-before.log。旧成功列表错误地resolve，故失败。 |
| 当前完整 owner 协议文件 | **8/8**；regression-final.log，涵盖原 A→B→A、legacy／非法资格、旧API和本次拒权恢复。 |
| 其它实际 client／React 消费者 | **5文件26/26**；mobile-consumers-after.log，包括原私有详情／编辑撤除及迟到 A 不盖 B。 |
| Mobile workspace完整类型 | **exit0**；mobile-typecheck-final.log。 |

首次新增测试的 union 方法签名导致4处 TypeScript推断错误，原件 mobile-typecheck-after.log 保留；最终按响应schema分支调用原真实 family canPublishLibrary，未削弱断言或替换产品函数，回归与类型重跑通过。regression-after.log 是类型整理前的运行结果，最终以 regression-final.log 为准。没有重跑未变的 API／合同检查，也不把旧619 CI冒当前WIP通过。

## 冻结与边界

新 source-freeze.json 仍列原26份当前文件：**仅2份变化、24份与旧清单字节一致**。原清单／旧字节、修前失败保留，未覆盖原26冻结。新清单 SHA256：**8368dd6b8e9b534e862f914e5e9a53974f70f4ee52d6c5e1fc33001c382cec48**。本作者首尾逐件复核26份一致，已停止写源码。

继承的 Field OpenAPI responses 描述缺项不是本次两文件变化产生的运行缺陷，本轮不改合同或冒充补齐。旧资格／未知原attempt、同版API-client、production／混合版本／多owner、Native实际存储／键盘／Back／生命周期／设备、完整行程／Field／通知用户结果继续未完成。

本批工具调用均已终态，真实注入fixture的 API／SQLite 由 finally 关闭，无新增TCP listener；合成数据库与log保留于TEMP／task tmp，未删除或上传。未碰手机／ADB／IDE／WEAPP build／共享服务／网络／防火墙／Git。资源状态见 resources-checkpoint.json。下一步由 root 对本增量新独审再整合。
