# 实际 Query 消费者与清理返回恢复

Goal active、无预算、未完成；工作区、分支和 HEAD 保持。生产增量只有云观星两处：`cache-policy.ts` 的临时查询集合增加 `sao-index`，`use-sky-stellar-supplement.ts` 按实际交付的 publication 对象重建 loader、拒绝旧对象的图层状态。没有修改其他业务逻辑、账户/天气策略或 Settings/outbox 六保护文件；没有提交、推送、发布、部署、依赖更新或共享 BFF/watch 重启。

## 已复现的问题与修复

实际 `QueryClient/QueryObserver`、API clear 函数和公共文件 owner 的回归先取得[两项修前失败](../../../../output/sky-clear-query-recovery-1003-r1/failed-before.json)：清理文件后 Query 缓存仍持有已退休的 SAO 索引能力；同 publicationHash 的新交付不能替换旧 loader。仅清文件、仅比较出版 hash 均不足以恢复。

新临时根只移除这一 Sky 索引。它保留原用户库、草稿及其他缓存政策；同一科学出版重新交付后获得新的文件代次，旧索引继续拒绝、不能被新交付复活。Hook 按新对象退休原 loader，render→effect 间不暴露旧 tiles，迟到旧请求不能写入新 owner。图像/JSON 的完整性、32MiB encoded 预算、租约、取消迟到、科学 admission 与独立粗层回退保持。

[源 JSON 回归读回](../../../../output/sky-clear-query-recovery-1003-r1/clear-query-trace.json)实际索引请求两次、文件获取两次；原 `00-00-10-0` 文件 19433B/133 rows，源 SHA 与 publication 一致，旧能力拒绝/新对象身份成立，plan/draft 保留。40 项受影响检查通过；新测试的 optional signal/defaulted optimistic options 类型问题修正后，4 项 clear/owner 检查与 App TypeScript 再通过。类型失败保留，不当生产运行失败；未重跑无变化全量测试。

## 当前 page/Scene、HTTP 与真实 Query 端口

[r16 实际结果](../../../../output/playwright/cloud-sky-live-mixed-1003-r16/result.json)只执行受影响的冷宽场和 hide→实际 `clearTemporaryApiCache()`→返回宽场两项。使用完整当前 API、实际 `useResourceQuery` 源码、同一 `miniappQueryClient` 与已安装的 `QueryObserver`；控制 React 端口遵循 `defaultQueryOptions/getOptimisticResult/subscribe/setOptions` 的生命周期，没有用 task Map 供应查询数据。当前 page176/API150，去重272源已按实际 before/after 精确核验。

清理前隐藏页面的 SAO Query 有数据，encoded owner 23项/1407985B；[实际 clear](../../../../output/playwright/cloud-sky-live-mixed-1003-r16/actual-api-clear.json)后查询 store 中该项消失、文件缓存归零/epoch1，只剩26B空 inventory。其他不携带该能力的影像 metadata 保留。被禁用的 observer 可能仍持有其最后一次结果；返回时实际 optimistic/options 路径重新绑定，不能把 store 移除说成所有 observer 立即置空。

两次就绪均解析324个 SAO 点，稳定帧有正向实际绘制身份；Query 对象身份59→114，同出版 hash。旧 loader 已退休，返回用新 loader/new native image 身份及同源字节。8个软件提交的 PNG/RGBA、已提交 snapshot 与 frameAt 逐一核对；两稳定结果 RGBA SHA 都为 `07a489ff741a94322272210db174c73c08d94716494083087c7588b829008830`。返回实际图已查看，但像素保持不认证完整图质。

独立层模型峰值：owner/registered RGBA14680064B、pending RGBA2097152B、MapFS1425598B、leases16；GL handle texture13500416B/buffer60348B。它们不是物理峰值，也不可相加。最终 hide 没有当前 native image/已呈现帧；clear 后所有数据/队列/租约、SAO loader pending/loaded 和 GL活句柄归零，epoch2，仅26B空 inventory。

63个请求中62完成，成功接收编码正文3971662B；Caddy日志3980540B。成功 status/size multiset 完全匹配，另有一取消请求的200/8878B输出日志，其实际客户端接收未知。清理后的三个基础暖请求为200/304/304，report225858B因本轮明确清理而重新获取，BSC/星座仍304零正文；这不是此前无清理压力测试的暖200问题，不能混 epoch 或要求全304。

## 失败、证据范围与下一依赖

r15 首轮从仓库根取得 QueryObserver5.101.4，与 App QueryClient5.90.20 core 不匹配，构造发生 `query.isFetched is not a function`，保存[失败](../../../../output/playwright/cloud-sky-live-mixed-1003-r15/live-failure.json)。只修任务导出为 App 已安装的 react-query5.90.21/core5.90.20并重编API；page bundle原样复用，没有安装/更新项目依赖或重放旧五段/太阳系/静态合同矩阵。最初任务检查点拒绝授权前后源变化亦保存。根读回r1误把归档的额外 `archive` 字段纳入 pin 比较，失败保存；r2按真实 path/bytes/hash核验，未改数据或重执行HTTP。

[根保存读回r2](../../../../output/playwright/cloud-sky-real-query-clear-readback-1003-r2/result.json)核272实际源、六保护项、修前失败、两个精确生产差异、8帧、Query新代次、真实文件源和取消/清理。它是自审，独立审查仍 MISSING。旧失败保持，不升级 r13 Moon无ready image、r14日志数量失败或已知 WXML FAILED_DEVTOOLS。

React通知/effect、Taro/native I/O、MapFS、clock和软件GL受控；没有完整执行 React `useQuery`/provider/JSX、report Hook、Settings UI、真实微信手势/公开时间/校准/原生 Back。手机新版月面、Android/iOS、物理总资源、完整质量与200DAU容量均未验。

唯一后续按 PLAN D 检查旧 image-only 二进制与现有 v2 JSON inventory 的真实回退/再升级/清理，复用封存旧源，先复现保留和预算影响再作 Sky 范围必要修复。完整引用、全小程序200MB、端云成本/容量及 B 图质/来源/批量发布义务继续保留；普通 Prepared/science registry 空，不采用候选，不下载或无变化重加工。
