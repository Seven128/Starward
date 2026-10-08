# 静态出口核验：总时限与恢复

原 `sky-static-release.mjs` 的真实请求 owner 只设置15秒socket超时；持续小量回包可超过总时限，并延长调用者的准备租约。这是当前源码里的新边界缺口，没有重跑已闭合PG/恢复矩阵。Node官方[请求超时说明](https://nodejs.org/api/http.html#requestsettimeouttimeout-callback)将它绑定到socket。

沿原 `sky-static-release.test.mjs` 加一个机制回归，不复制runner或另造HTTP框架：保原byte/header/immutable文件核验，调用实际 `requestBytes` 而非注入fetch；仅HTTPS transport由EventEmitter和受控时钟替身提供。第0/5/10/16秒持续回包，间隔都不足15秒。修前完整核验在受控第16秒成功，新增回归因此FAILED；原输出保[修前记录](../../../../output/sky-static-http-deadline-2026-10-08/failing-before.tap)。这不是实际TLS/网络延迟测量。

修复在同一请求owner中补15秒连接/响应/完整body总时限，到期destroy并沿原错误路径返回；socket inactivity规则继续保留，成功/错误清理deadline。修后第15秒退休请求，未进入HEAD；原prepared指针字节不变，调用者dispose后锁消失。原密封数据的fresh retry完成GET/HEAD，推进时钟不触发已完成请求的迟到destroy。原release/preview消费失败并在finally释放delivery，其源码未改。

[修后回归](../../../../output/sky-static-http-deadline-2026-10-08/passing-after.tap)及[原owner整套检查](../../../../output/sky-static-http-deadline-2026-10-08/owner-suite.tap)通过，后者23项。原owner/测试Node语法与scoped diff检查通过。有限修前/修后绑定、两次Node REPL环境探针失败及范围见[读回](e2-static-delivery-deadline-2026-10-08.json)。

没有实连边缘服务、发布/回滚、采购、部署、外联或子代理；目标环境取消、完整trusted引用/实际Linux容量及独立审查仍未验。手机、P1控件FAILED/root UNKNOWN、图像FAILED/科学UNKNOWN/绝对配准UNVERIFIED、普通Prepared空/HiPS关、v72和33账保持。随后两项具体metadata已补，仍未闭合原内容/HiPS加工分发权益，未取图或扩批；见[原成熟图像owner](q1-mature-hips-batch-2026-10-08.md)。其它供给查询与当前下一动作仅按PLAN。
