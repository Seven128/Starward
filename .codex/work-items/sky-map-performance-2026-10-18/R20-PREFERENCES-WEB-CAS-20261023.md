# R20 偏好 Web 跨标签页原子存储核验

2026-10-23 首轮实际运行结果：**失败，发现已确认保存丢失**。以下保留原始失败证据，修复与复验结果见末节。这份记录只覆盖真实浏览器中的偏好 storage/domain 边界，不是 Expo 原生 SQLite、完整 App UI、手机或完整 Goal 验收。

## 实际输入与方法

- 复用已安装的 Chrome 155 和 Playwright CLI 0.1.19，没有下载浏览器、改变依赖锁或连接现有浏览器会话。
- [可复现入口](../../../tests/acceptance/structured/preferences-web-cas-probe.mjs) 使用 esbuild 打包当前 `apps/mobile/src/state/preferences-storage.web.ts`、domain runtime 及已安装的 `@react-native-async-storage/async-storage@2.2.0/lib/module/AsyncStorage.js`。bundle metafile 与各输入 SHA-256 保留在本次临时证据目录。
- 新建内存隔离的浏览器 context、随机 `127.0.0.1` 端口及同源两页面。保留生产 `starward-preferences-runtime-web-v1:preferences-runtime-state` key；用户 origin、登录态、存储和共享服务均未使用。
- 两页面各自创建 runtime 并准备完整的 alpha/beta profile，均为 `baseRevision=0`。测试先持有真实浏览器同名 Web Lock，待 `navigator.locks.query()` 观察两个不同 clientId 的 exclusive CAS 请求均已排队，再释放锁。没有替换、包装或模拟 `navigator.locks`、AsyncStorage 或 localStorage。

```powershell
node tools/run-node.cjs tests/acceptance/structured/preferences-web-cas-probe.mjs --cli 'C:/Users/777/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js' --chrome 'C:/Program Files/Google/Chrome/Application/chrome.exe'
```

## 修复前证据

完整结构化原件为 [result.json](tmp/r20-preferences-web-cas-3pc31s/result.json)，同目录保留 bundle、metafile、CLI 输出和生成的浏览器脚本。

| 观察 | 实际结果 |
| --- | --- |
| 两个准备版本 | `[0, 0]` |
| 同名原生 exclusive lock 等待者 | 两个不同 browser clientId |
| alpha 保存回执 | `succeeded`，`stateVersion=1`，一个 committed side effect |
| beta 保存回执 | `succeeded`，`stateVersion=1`，一个 committed side effect |
| 两页面之后的 projection | 都只有 beta，revision 1 |
| 两页面 reload 后新 runtime | 都只有 beta，revision 1；alpha 已丢失 |
| 锁和会话清理 | held/pending 均空；本次 browser 与 server 均已关闭 |

锁确实协调了两个浏览器 client，但这版 Web Locks + AsyncStorage/localStorage 组合仍未实现产品要求的跨页面原子比较写。localStorage 在跨 renderer 的可见性是待修复机制，不能仅靠本测试确定其内部原因。生产缺陷已经由“双成功回执 + 刷新后单实体”建立，不是仅靠 API 或源码推断。

首轮显式新prepare、同key并发及成功恢复被真实CAS失败阻止，未执行；该首轮只新增probe和证据。后续实现及完整复验见下一节，不将这些历史未执行状态当作当前结论。

## IndexedDB 修复与真实复验（2026-10-23）

当前实现已从 Web Locks + AsyncStorage 比较写改为浏览器 IndexedDB 原生事务，无新增依赖。实际已安装 `@react-native-async-storage/async-storage@2.2.0/lib/module/AsyncStorage.js` 的 Web 后端是 localStorage；它现在只用于读取旧数据。原有 `kind: web-key-value` 对外合同不变。

选择依据为 [W3C IndexedDB 事务调度规范](https://www.w3.org/TR/IndexedDB-3/#transaction-scheduling)：同一 object store 的重叠读写事务互斥，后续事务观察此前成功提交的数据；[事务生命周期](https://www.w3.org/TR/IndexedDB-3/#transaction-lifecycle) 规定完成与中止事件，以及请求回调内的活动期。实现把 get、比较、put 放在同一 `readwrite` 事务内，事务中不等待外部 Promise，只在 `oncomplete` 确认保存，并请求 `strict` durability。该 hint 与实际刷新回读不等同于断电恢复验证。

存储迁移保持原 domain `preferences-runtime-state` key。首次访问一个 key 时，先在事务外读取旧命名空间的原始字节，再在 IndexedDB 读写事务里重查并只初始化一次；`null` 也写显式初始化记录。已有 IndexedDB 行不再读取旧值。旧 archive key 按相同规则首次访问时原样导入，未访问的 archive 仍保留在原 localStorage。v1 JSON 的 schema 升级与精确字节 archive 继续由原 domain owner 完成；旧 Web Locks 版本写出的 v2 JSON 可直接原样导入。新实现不写、不删除原 localStorage，IndexedDB 是唯一当前态。已初始化后，旧版本页面继续写 localStorage 不会被新版本合并为当前态；原旧存储数据仍保留，这是跨版本共存的边界。

新 [result.json](tmp/r20-preferences-web-cas-DKYwBL/result.json) 为 **PASS**。同目录保留实际生产 bundle、输入 hash、metafile、CLI 输出和可复现脚本，原失败目录未修改。仍使用已安装的 Chrome 155、随机 loopback 端口、本次自有隔离 browser/context；成功并发路径没有包装或替换 IndexedDB、AsyncStorage、localStorage 或 Web Locks，也不再持有已退休的 Web Lock。所有自有 browser/context/server 均关闭。

| 观察 | 修复后的实际结果 |
| --- | --- |
| 独立 key 的生产 storage CAS 跨页直调 | 初次写、同 expected 字节更新均恰一个 true；两页回读同一胜出值。这项不受 domain 先报 stale 的调度路径影响 |
| 两个不同命令各自 prepare 后并发 execute | 两个 base 都是 0；一个 `succeeded`/revision 1，一个 `preference_runtime_conflict` |
| 显式重新 prepare 失败方 | revision 2，完整保留 beta、alpha 两个 profile |
| 两 tab 同一命令并发执行 | `succeeded` + `replayed`，revision 3，合计一个 side effect |
| 两 tab reload、逐 receipt readback、相同命令重试 | beta/alpha/gamma 与 active gamma 完整保留，原始字节不变，重试均 replay |
| 新 origin 的旧 localStorage 当前态 key | 始终为 null，新写入没有创建第二当前态 |
| 实际 put 成功事件后注入 transaction.abort | domain 报 `preference_runtime_commit_unknown`，IDB 字节不变；恢复原生 put 后同命令重试一次提交，另一 tab replay |
| 实际 CAS 提交后仅丢弃端口回执 | domain 从同一个真实 IDB 回读恢复为 replay，CAS 调用仅一次、revision 5 |
| 两 tab 并发读取旧 v1 localStorage | 完整 profile 保留，domain 在同一个 key 迁移 v2，原始字节 archive 精确一致 |
| 旧 archive、空值与刷新 | 旧 archive 原样导入；首次 null 初始化后，旧 localStorage 后写及刷新均不能复活旧值 |
| 旧 Web Locks 写出的 v2 localStorage | 原字节导入，继续保存后刷新保留新 revision 4，原 localStorage 恢复副本不变 |

故障注入仅用于中止和回执丢失两项，和无替换原生 API 的成功并发证据分别标记。`preferences-storage.test.ts` 现有原生 SQLite 检查及 Web 打开失败、不可用、阻塞连接回收、仅事务完成后确认等检查共 **6/6** 通过；`npm run typecheck --workspace @starward/mobile` 通过。原模拟锁队列断言已退役，不再用作跨标签页原子性证据。

复验过程曾遇到 Playwright CLI `run-code` 环境没有 Node 全局 `URL` 的 harness 错误，保留于 `tmp/r20-preferences-web-cas-JQ6226/result.json`；改用本次已知 origin 拼接后完成上述实测。`B3lysJ` 是增加旧 v2 导入场景前的通过结果；`cNFOhh` 增加该场景后通过，独立审查进一步建议固定原子端口直调，避免未来 domain stale 调度绕过 CAS 回归；补齐后得到当前 `DKYwBL` 完整通过结果。本节不改变 Expo 原生、完整 UI 或设备接受范围；独立 review 由接力主代理记录。
