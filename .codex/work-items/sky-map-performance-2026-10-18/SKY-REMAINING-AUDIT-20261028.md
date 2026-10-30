# Sky 剩余性能核查与精确时刻 Query reader 退休

本轮沿唯一 PLAN D0–D2 继续，不重新实施候选13–18、Query 图像/搜索/HiPS/共享包装或 vector 退休。完整 Goal、当前要求、PLAN、HANDOFF、两轮采集分析、D0–D2 修复记录、候选18及 Query/vector 证据已复核。没有设备/DevTools/服务/构建、Git 写操作或新采集；原件和冻结代未动。

## 新确认的有限引用寿命问题

`sky-time-target-query.ts` 的精确时刻 Query 仍保留原一分钟复用政策。其实际请求回调通过 `current → latest.current.readCurrent` 持有调用方回调；`spot-sky-page.tsx` 的该回调属于当前 Page render，读取 observation-time 和页面当前性。前批纯元数据 Query 的 bind 修复没有覆盖这项需要活读资格的责任。

完整生产模块加真实 QueryClient/QueryObserver 的隔离反例确认：卸载后查询仍在缓存、observer=0、gcTime=60000，合成 Page owner 及其 readCurrent 回调仍强存活；清理 Query 缓存的控制后两者释放。这是可持续到既有复用期限的页面责任保留，不是无限增长结论；也不直接证明历史手机 OOM 由它引起。反例不改变产品 GC，仅在 Node 子进程显式 GC 观察强所有权。

## 窄修与行为边界

缓存的 enabled/queryFn 由模块级函数创建，只持请求 binding/key 和可退休 reader ref。可见有效读者仍通过原回调活读资格；隐藏/无效时在 render 立即清掉 reader，卸载清理也退休它。effect 设置可在开发期 setup/cleanup 重放后恢复该次合格 reader；旧 cleanup 不清掉更新的 reader。

保原一分钟 staleTime/gcTime、queryKey、同 Signal/服务调用、A→B→A 禁止旧调度恢复、明确 retry 和精确目标语义。已实际开始的请求继续由共享 Query Signal 管理，Page 退休不自行取消仍被 Sources 需要的请求；最后一个读者离开后仍由 Query 取消，迟到返回不进入有效缓存。没有调整播放、时间窗口、星数/图像、资源预算或原生生命周期。

## 实际检查

- 新增两个完整模块的引用回归：隐藏和卸载后仍保留数值响应缓存、原60秒政策和零 observer，Page callback/owner可回收；退休回调不能另起请求。
- 同一两个回归读取保存的修前完整源码时，均在 Page owner 仍被持有的断言失败；修后通过。未用清缓存作为产品修复。
- 共14项聚焦检查通过：上述引用回归、原六字段/held输入、精确结果及 Sources 复用、原生先行资格与 ABA、共享在途/最后读者取消、实际 Sources consumer，以及新增卸载共享等待者和effect重放。
- 保全日志：`tmp/sky-time-query-retention-20261028/focused-tests.log`、`before-countercheck.log`；修前源码 `tmp/sky-time-query-retention-before-20261028.ts`，初探 `tmp/sky-time-query-retention-20261028.cjs`。Root需在集成后承担类型/构建及独立审阅；本报告不冒这些通过。

## 保留的目标缺口

Root集成补充：新独立审阅无阻塞发现并另跑11项通过；小程序typecheck及完整2974项（2973pass/1既有skip）通过。当前普通WEAPP已经重建，337文件、5,097,708B、SHA256 `29c5a6cf45ff8b4ad2ddb2bf271332d7664ab8203dea752c20e44b1101f489c4`；包体及production检查通过、10条既有建议。未推手机/操作DevTools，冻结候选保持；这些结果不改变下述目标缺口。

历史 Heap 的工具 `_profileFrames`/Network 大保留仍与业务引用分开；原候选12的文件索引、已修页面/图像 Query、向量临时分配和星座/顶点打包不再次列为待开发。当前核查没有从旧分配权重推出新的 CPU 热点或手机收益。

仍须在准备好的当前普通候选核完整 BSC/实际加载 SAO/图像的分钟连续呈现、全天跨字段后再次步进、持续正常 Play→Pause排空→退出、实际页面/Query/native/GPU持有和资源回落。候选19遮挡回归及真实暗星/图像失败恢复仍未验。沿既有主用Profiler与已有批次，只为能改变判断的修后残余路径补最小数据；不重录此前已收齐资料。14项本地通过不关闭 D2 或 OOM。
