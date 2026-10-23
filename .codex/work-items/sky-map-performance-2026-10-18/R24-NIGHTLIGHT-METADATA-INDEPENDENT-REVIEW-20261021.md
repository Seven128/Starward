# 夜光首次发布证明读取独立审阅

2026-10-21，独立审阅者 `review_nightlight_metadata_batch`。结论：未发现本轮改动的 P1/P2 阻断项；支持保留这个本机服务首读优化，尚不认证手机呈现收益、完整叠层资源回落或无泄漏。没有修改生产代码、既有测试、冻结候选、服务、数据库、设备、IDE 或远端状态。

## 审阅范围与结论

直接比较当前 `workers/miniapp-api/src/night-light-service.ts` 与本轮私有 `overlay/night-light-service.before.ts`。生产差异仅为 `release()` 内原串行 proof 循环改为两个读者；`ComputationCache`、`SharedReadPool`、`binaryRead`、窗口缓存、发布/图像验证和真实调用方语义没有变化。

- 两个读者共用同步递增的索引，各自等待当前 proof 完成再领下一项；按原 inventory 索引写入结果，因此完成顺序不同不会改变证明数组顺序。所有 509 份证明仍沿原 `readFixedNightLightProof` 完整验证，不跳过 hash、来源、数值、质量或配准检查。
- 任一读者失败即中止共用 proof signal，另一读者下一次派新前检查该 signal；`allSettled` 等待两者退出，然后重新抛出 signal 的错误。半份 release 不会进入完成缓存，同一 key 的失败 promise 在排空后才退休，后续真实恢复可重新读取。
- 服务关闭沿原 shutdown signal 传入 proof reader，并保留 `ComputationCache.clear()` 的 generation 防晚写机制；`release()` 完成后也再次检查关闭和调用者取消。单个消费者取消仍不撤销其他消费者共用的 release 读取，这是原有语义，不是本轮新增的取消机制。上述关闭/单消费者 release 边界经过代码核对；本轮未另造原生关闭或内存压力证据。
- **两路是每个 release 的 metadata 读取上限。** `ComputationCache(8)` 限制已完成值和被共享的在途 identity 保留，超额独立计算仍可不保留地执行；它不是整个服务 metadata admission 限额。正常当前版本消费者共享该版本/清单身份，旧 immutable URL 仍可引用其他已发布版本。现有 binary/window 两活跃和 8 项/16 MiB 图像界保持不变；本轮不能据此宣布整个服务的总资源验收已完成。

## 独立执行

在 API 工作目录执行：

```text
node ../../tools/run-node.cjs --import tsx --test --test-name-pattern 'release proof reads|cancellation after actual prepared|DB inventory remains' src/night-light-prepared-window.test.ts
```

退出 0，3/3 通过：数据库发布清单权威、实际 prepared read 后取消不安装、两个 proof 读者的重叠上限/损坏停止派新/在途排空/四消费者同失败/原服务恢复。新 gated 文件用例实际调用原 proof 校验并损坏一份返回字节，未用空结果替代有效图层。

另外执行一次**不计时**的真实 r6 owner 比较：分别加载本轮原生产类和当前类，使用同一锁定清单、同一 sealed prepared window，经 `layer()` 与 `asset()` 取得结果；`assert.deepEqual` 检查完整图层对象和完整 asset 对象。两项均通过。输入清单为 509 proofs，输出 PNG 4,276 B，SHA-256 为 `b6f09db480cb146e50acdb7a16e4d9567fb2751727136cbb6d6aa0288047be7a`。仓库返回值使用实际公共发布材料的投影，没有访问 PG，因此这不是数据库激活或 HTTP/手机验证。

## 性能证据复核及限制

只读本轮私有 `r24-independent-20261021/overlay` 的对照驱动和四份 ABBA 回执，没有重复性能样本。四份绑定同一 dataset、inventory、seal、bounds/window 和图像 SHA；当前回执源哈希与实际生产文件一致。两个 baseline 的 release/选窗阶段为 304.93/295.84 ms，两个 candidate 为 152.83/151.40 ms；四消费者总 layer 等待为 321.67/311.84 ms 对 168.30/167.17 ms。每个进程只发生一次 prepared read，回访 layer 为 0.15–0.19 ms。

它们支持同一本机首次 metadata 调度成本缩短。OS 文件缓存没有清除，起点不是物理冷盘；使用投影发布记录并绕过数据库/HTTP，未观测手机 decode/native installation/最终覆盖。图像 hash 和本轮完整对象比较证明此窗口内容保持，不能外推任意窗口、多版本高并发、目标设备持续资源回落或无泄漏。现有真实连续缩放/移动与三层最终结果义务继续保留。

审阅时生产文件 SHA-256：`b1be19128557997607582128f22dfdd1371b0f77811f766d85105d7187920334`。私有基线 SHA-256：`6c1beb6394da567047a21697b08450851f3044d8ce4535e15a7b8b51f757c5ae`。必要原件仍在本机私有目录，不在此复制坐标、完整材料或凭据。
