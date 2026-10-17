# 本地可执行工作与验证边界（2026-10-11）

本记录接续[菜单／AUD01–05](menu-audit-implementation-2026-10-11.md)，沿唯一PLAN的B/E/F执行。当前工作区与分支保持；图像获取、像素加工、v74译介和239未读实体均未重开。本记录中的检查在用户补充验证原则之前已经运行；补充原则后只核读既有结果、完成在途原生控制观察与文档一致性检查，没有因AGENTS修改重跑产品构建或测试。

## 实施及已取得的证据

前一轮完整Mini suite的33项失败已归因为隔离测试边界未随真实owner迁移：合同命名空间遗漏、旧私有变量名、Canvas回调的真实词法依赖和当前恢复守卫缺失。修复测试适配与共同依赖，保原有成功、拒绝陈旧结果和恢复断言；没有为夹具恢复旧生产结构，也没有将native结果改成PASS。

- `sky-optical-page-test-support.ts`共用空资源声明和受控Canvas端口，并执行实际外层paint回调取得stage/complete闭包；调用者仍负责其结果端口，空声明不代表成功绘制。
- 新`sky-report-test-support.ts`共用实际API错误类、格式器和报告恢复政策，隔离native transport；Map/Sky预报消费者按实际Hook调用读取，星表响应使用真实合同命名空间。
- `run-infrastructure-check.mjs`为原有临时媒体清理补绝对路径和runId所有权检查。任务原有mixed-load runner改为读取当前介绍index及其v74文件，并绑定实际服务依赖；没有复制一套负载框架。

证据均在[本轮输出](../../../../output/cloud-sky-local-completion-2026-10-11-r1/)；完整输入与当前文档读回见[current-binding](../../../../output/cloud-sky-local-completion-2026-10-11-r1/current-binding.json)。

| 检查 | 实际结果及范围 |
| --- | --- |
| `affected-final.log` | 134项，133通过、0失败、1条件跳过 |
| `miniapp-suite-r1.log` | 1840项，1839通过、0失败、1条件跳过；前一轮33失败日志继续保留 |
| `types-r2.log` | App类型检查通过；r1重复字段失败已修且保原日志 |
| `retained-science-consumers.log` | 复用既有SDSS出版metadata覆盖条件输入，26通过、0跳过；不产生／加工／采用新图像，不将这26项直接相加为全套1840全通过 |
| `alignment-mutation.log` | 补充原则前已有的定向反例：注入旧参考帧后2失败／1通过；这是预期反证，非当前产品失败，也不是后续例行门槛 |
| `infrastructure-result.json` | 真实本地PostgreSQL/PostGIS、Redis/BullMQ；独立数据库／key空间的HTTP、ETag、权限拒绝、幂等回执及备份恢复通过。1,187,385 B备份恢复指纹一致，失败恢复保原目标；自有DB/key空间已清理 |

首轮共享适配、直接导入native依赖、旧拾取guard与类型检查的失败均保留。既有受控软件检查、完整Taro旅程、固定资源兼容和本地CI候选继续按各自输入复用，不重跑图像矩阵或重复扩展边缘组合。独审仍MISSING。

## 当前本机混合请求

使用原测量入口、独立Chromium上下文、本机HTTPS和当前真实目录／v74正文；每轮另有2个普通业务客户端并实际重叠。以下是请求完成测量，不是画面可用时间。

| 冷客户端 | 结果目录 | 完成／失败请求 | 成功编码字节 | 冷请求完成P95 | Node采样RSS峰 |
| --- | --- | --- | --- | --- | --- |
| 1 | `output/sky-mixed-load-local-completion-1011-1-r1` | 20／0 | 877,116 B | 454 ms | 389,353,472 B |
| 10 | `output/sky-mixed-load-local-completion-1011-10-r1` | 74／0 | 8,426,059 B | 1,525.7 ms | 453,197,824 B |
| 20 | `output/sky-mixed-load-local-completion-1011-20-r1` | 134／0 | 16,813,823 B | 2,730.4 ms | 479,494,144 B |

每轮`inputs-after.json`确认301项输入未变；`result.json`较早写出的`sourceInputsUnchanged:null`不是最终输入结论，必须连同after回执读取。`retirement.json`确认请求0、浏览器/API关闭、自有Caddy容器停止且清理错误0。既有Postgres/Redis容器身份保留，其他项目服务未动。

服务运行在Windows，Caddy为本机受限容器，repository/auth/weather仍为夹具；Node RSS不含浏览器、native解码或GPU。这不证明4核16GB目标业务机、12Mbps共享出口、真实云端provider/DB混合负载、完整物理峰或200DAU容量。已有证据足够关闭本机机制问题，不追加并发档位或重复跑数。

## 原生启动的实际观察与停止点

用户补充规则之前构建了隔离目录`apps/wechat-miniapp/dist/weapp-check-local-completion-1011-r1`，marker `SKY1011LOCAL1`，284文件／4,861,173 B；主包2,096,885 B，余267 B。它只是本地诊断候选，前一CI类包及历史命名包保留；没有新的发布资格。

官方窗口动作回执成功后，Sky画面仍白；同包普通Settings页也白。全量console/network缓存空，不能据此证明没有错误／请求。WXML调用在关闭自有窗口后返回`abort`，未挂起另一次调用。目标AppID在当前账号可管理列表中，未保存账号敏感字段。

另一个最小原生App/Page控制工程使用相同AppID和`trial`基础库选择，不含Taro、React、Canvas或API。打开／编译回执成功后，[实际截图](../../../../output/cloud-sky-local-completion-2026-10-11-r1/native-startup-control-current.jpg)仍是开发者工具欢迎页，启动日志缓存为空，尚未证实App运行。该结果支持继续将当前问题留在启动／工具通道边界，不能定因Canvas或认定所有应用本身损坏。没有新的编译进展或决定性错误，按启动分流规则停止本轮，不循环换SDK、重开窗、清缓存或排队SDK读取。

诊断工程不是采用的Sky实现。自有s1、s2窗口已关闭，PID16496的临时API已结束，8796无自有监听；其他窗口未关闭。当前native合成`UNVERIFIED_CURRENT_INPUT`，更早正常Canvas控件不可见的`FAILED_UNKNOWN_PRODUCT_VS_DEVTOOLS`继续保留，二者不可互相替代。

## 新验证原则与保留义务

用户要求已合并到根AGENTS的Development execution，并同步改写Implementation Decisions第7条：验证与影响相称，按失效机制选择代表案例，必要证据足够即推进，回归反证按需使用。该文档变更只做差异和一致性检查；其他原有条款／未提交修改保留。唯一PLAN未改，历史V06／AUD04的反例记录按其原输入保留，不解读为今后所有修改无条件加变异测试。明确产品要求、必要验收、安全和实际结果义务继续有效。

全33项原行、图像冻结／延期、v8/r17与v74成果保留。未闭的是原生可见可操作及真实设备旅程、适用物理性能、实际对象存储/CDN/合法域名/部署回滚、目标容量和独立审查；文本上游既有maxlag及239未读也未被本地检查关闭。当前实现及本地证据不认证完整Goal，不能表述为“除图片外只剩真机”。后续仅在具体输入、失败或外部条件变化时恢复对应责任，不为安心感重跑已通过部分。
