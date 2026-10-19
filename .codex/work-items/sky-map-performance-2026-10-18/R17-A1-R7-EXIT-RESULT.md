# r7 实际退出：已返回 Map，资源退休仍未验

这次一次真实产品 door 点击后，手机确实离开 Sky，返回非空 Map 和同一隔离测试地点面板。8 行同 owner 的内存 watch 有效，但它包含退出前、导航和 Map 加载阶段；后段回落不能独立证明 Sky 的 JS/native/GPU 资源已退休。完整 B 和正常使用验收继续未完成。机器结果见 [R17-A1-R7-EXIT-RESULT.json](R17-A1-R7-EXIT-RESULT.json)。

候选固定为 r7 app `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1`、source `528b3d8a99ca4c87958e10b01ac7af7040b031e5270e601e61bcf2b3949cf755`，337 files / 4,995,907 B，Y554SA，development feedback。冻结的 feedback 和 session 均绑定此 app；实际 r7 标签也已查看并复用原 Play 证据。后续候选未混入。runtime AppID 与手机整包字节仍未核验。

## 实际动作与画面

全部 10 张新截图及其 sidecar 已实际查看并逐字核对。08:56:02 / 08:58:39 仍是04:30:20预览配12/14/16点尺；09:00:49 真实 Cancel 后 label 恢复04:30:00，尺回早晨范围。这只是有限恢复；该图仍有大字段字形裁切，r7 入场 FAILED 保留。

09:01:42 已打开菜单，native 调试浮层挡住 door。root 记录只有一次下缘 .90,.220 点击实际送出并无效果；另两次 guard_recent_capture 拒绝没有输入。09:04 两张图都还在 Sky，甚至两张 PNG 字节相同，绝不能把这段当作退出。09:06:31 展开浮层后，root 真实拖动其顶部 .60,.19→.60,.32 / 1000ms；09:07:03 原图明确显示浮层下移、door 露出。

root 随后约09:07:49只点击一次真实产品 door .90,.198。09:07:53.501 的25fdd8ea…图是非空 Map、同隔离地点中面板，计划仍在读取；09:09:37.543 的fdec73ff…图仍为 Map/该地点，显示计划暂不可用。root 记录公共隔离桥403为原因；本次只独审可见结果，未另审HTTP回执、未访问8791账号，不能据此通过计划旅程。调试浮层中的连接和错误文字也不建立资源退休或错误因果。

## 内存窗口和含义

| 原始 watch | 实际覆盖 | 行数 / host span |
| --- | --- | ---: |
| r7-cancel-exit-drain-1792400275347 | Play后闲置；结束在真实 Cancel 前，没有退出 | 12 / 131.373s |
| r7-product-exit-drain-1792400565429 | Cancel后仍在 Sky；只含无效下缘点击，没有退出 | 12 / 131.853s |
| r7-actual-exit-drain-1792400856559 | 跨真实 Sky→Map 导航并覆盖随后 Map 加载/闲置 | 8 / 85.898s |

三个 watch 内每行均 foregroundOwnerVerified=true、一个绑定进程、无 owner_changed；跨文件的 slot0 不证明同一PID。时间为 host.performance.now 的顺序 ADB 观察 bracket，非手机单一瞬时读数。实际退出 watch 的文件名 Date.now 锚约09:07:36.559，早于约09:07:49的door输入；第一行在导航前，第二行接近输入，不能称85.898s纯退出后drain。锚和截图时钟没有严格校准，缺少精确原生生命周期时点。

| meminfo项目（KiB） | 首行 | 峰值 | 末行 | 末−首 |
| --- | ---: | ---: | ---: | ---: |
| TOTAL PSS | 1,226,834 | 1,502,952 | 1,263,833 | +36,999 |
| Native Heap PSS | 230,392 | 237,172 | 210,468 | −19,924 |
| Unknown PSS | 457,000 | 654,512 | 488,436 | +31,436 |

Map 加载期间进程占用上升，随后 PSS 从峰值减少239,119 KiB，末行仍比首行高36,999 KiB；Native Heap下降、Unknown仍高。新增 Map 资源、宿主/调试开销都在同一进程内。Unknown不定位JS/GPU allocator；类别不能相加，不可减去约16MiB allocation profile来命名剩余泄漏，也不能用不同watch作匹配的优化收益比较。

冻结 r7 源码的 lifecycle.dispose 会 reset/清理 latest，surface.retire 会标记 r17NormalSurfaceRetired、退休selection、尝试loseContext并把backing尺寸归零。这里没有退出后的 retired 布尔量或生命周期执行回执；源码路径与进程回落都不是其运行时执行证明。因此本报告只关闭“真实产品退出是否发生”的疑问；资源退休、精确drain和持续正常使用缺口继续保留。无需重复已有 CPU 或 allocation 资格采集。

原件冻结在 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r7-exit-native-passive-20261019`：56件 / 9,999,046 B，manifest SHA `5084ec6acefcacd06b871cdcc2c564fc7bd7218e4ed6b32571f90fe9dbe02343`。所有 original-before/copy/original-after SHA一致；报告前再次核完56份copy。复用原 r7 的43件 source/protocol/identity归档和 allocation manifest，无大型API/source重复复制。原件不入Git。未操作设备、IDE、ADB、服务、feedback、预览或账号，未改产品源码、PLAN、HANDOFF、preparation或allocation报告，未commit。
