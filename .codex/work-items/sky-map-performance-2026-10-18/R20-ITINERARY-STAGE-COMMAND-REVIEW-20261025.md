# R20 手工阶段编辑命令与恢复独立审查

结论：**本次冻结源码的实际编辑／命令／恢复边界审查通过，未发现新的 P1/P2。** 新阶段草稿复用原 Screen、client、可信 actor／restriction、CAS、receipt 和 SQLite owner，没有第二份 pending 或提交路径。时间适配的独立判别由配对审查负责；本报告不认证实际 Native 存储、布局、键盘、手感、生产或完整行程 family。

## 范围与输入

已读取适用 AGENTS、global/default 路由、相关架构／Native Screen Contract／验证 owner、当前 PLAN／REQUIREMENTS／HANDOFF 中对应范围、Source 的 `versioned-editing` 和 `observation-timeline-editor` 要求，以及本批实施报告。按 Native interaction Skill、mapping／wording 和 DESIGN Native profile审查；旧 page/control target 仅保语义，未把它们当当前视觉约束，也未套用 WEAPP 资源。用户后置两类性能和保留其它完整 Goal 义务的指令保持。

开始和结束逐件核对 `tmp/itinerary-manual-stage-editor-20261025/source-freeze.json`：**24/24 长度／SHA 均一致**，manifest SHA256：

`1f185853c8285f4c81c02a122eed4060770e265e88d4bbaa83f2fc348d5db4a4`

这只是所列 4 write／20 control 的冻结，不是全仓或 Native APK 身份。没有改产品源码、合同、配置、Root 文档／Context 或 Git；Root 的原生构建与本审查只读源可并行。

## 实际独立消费者旅程

自有 `tmp/review-itinerary-stage-command-20261025/command-review.test.tsx` 使用原 `privateDraftHttp`，实际 **ItineraryScreen → client → Fastify inject／parser／service → 文件 SQLite**；Native 原语、storage／crypto／shell 仅沿原测试适配边界替换，HTTP 无 TCP listener，所有输入均为合成审查数据。一次命令执行 **3/3 通过**，日志 `command-review.log`，不是把作者 26 项相加后的新验收总数。

1. **拒权／切账户时隐藏，恢复原账户才保存阶段。** 编辑 A 阶段时刻及类型后，真实无 actor 列表返回403，阶段输入与 A 私人标题均从当前 UI 撤下；再实际资格化 B／显示 B 计划，仍无 A 编辑投影且没有 POST。恢复 A 后原本地时刻重新出现，明确保存仅一份带 A restriction 的 POST200，生成 A revision 3。SQLite 读回阶段的新起点、原终点及 `return` 类型；A 原 revision 2 完整序列化内容不变，B revision 1 不变。证据 `denial-and-owner-restore.json`。
2. **未知阶段提交经过 B 与重建仍保持原请求。** 首次 POST 在真实写入 revision 3 后丢回复，取消本地编辑仍保原 pending。切 B 后 UI 不显示 A 私人标题／阶段输入；重试携原 A restriction／完整原 body／key，实际403。整个 current／version／receipt SQL 快照和 pending 原字节均不变，B 当前资格不被 A 的拒绝撤销。随后关闭 React／Query 与原 API／SQLite，从同一文件和原存储字节重建 client／API，另有 A revision 4。原请求再200确认，只清已确认 pending；重放前后完整 SQL 快照完全相同，没有新版本或旧 receipt 覆写 current。实际 POST 状态 **`[200,403,200]`**，原 body 逐字相同，A 较新标题／revision 4 与已保存阶段都保留，B 仍 revision 1。证据 `unknown-owner-reopen.json`。
3. **阶段变化使日期核对失效。** 改观星日期并明确核对后，再移除唯一阶段，保存被当前页面拦下、没有 POST，SQL 仍 revision 2。重新明确核对才发一份 `patch.stages=[]`，得到 revision 3／新日期；空数组是用户明确移除的效果，原 revision 2 的完整阶段内容仍保留。证据 `date-review-renewal.json`。

静态调用链另核对：`begin` 从当前版本建立唯一草稿和固定 base；`changeStages` 只更新该草稿并撤销日期核对；`save` 仅在实际阶段编辑或日期明确核对时带 stages。支持的增删／类型／排序经原 parser／domain 校验，一次 patch 保存；取消不提交。CAS 冲突没有自动换 base，明确“保留已存内容，重新编辑”才替换本地草稿。未知原 pending 不由取消擦除。不支持的原阶段保持只读，基本字段修改不携 stages，避免剥除旧数据。上述不重跑已闭历史恢复／旧协议矩阵；作者实际正常路径证据只作其原范围的补充输入。

## 收尾与保留项

测试进程终态 exit0；各例 `afterEach` await React unmount、Query 清理、API／SQLite close，临时读库也逐次 close。未启动 listener、provider 请求或后台服务，未操作设备／ADB／IDE／构建／网络／防火墙／VPN。首尾 pin 回执为 `source-check-start.json`／`source-check-end.json`。

实际 Native 存储重启、像素／键盘／系统 Back、直接拖拽、地点／路线与天文重算、共享／离线、部署及其余完整 family 结果仍未验；手工阶段保持“用户填写，非计算所得天文事实”的产品含义。层叠／Sky Play 性能后置，OOM 未解决。Root 可据此收口本次命令边界，再沿同一 PLAN 继续。
