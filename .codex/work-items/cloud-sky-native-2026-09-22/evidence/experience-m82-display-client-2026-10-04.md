# M82 显式显示客户端消费（r98）

本代只修改云观星客户端及必要的共享 publication resource；没有改其他业务逻辑。工作区、分支与 HEAD 保持用户指定状态，Goal active、无预算、未完成。完整页面和目标运行时仍未验收。

## 实现与责任

- `sdss-optical-client` 共用原 pinned HTTP 边界，新 calibrated getter 严格分派 science-v2/v3 与 display-v1。旧 science getter 仍拒 display，默认 JPEG getter 保持。
- `sdss-science-optical-resource` 的新 calibrated 入口复用 `sky-publication-resource` 原冻结 snapshot、metadata epoch、取消与退休；共享 owner 只增加相应取消错误身份。
- 原 target-optical Hook 增加 calibrated 家族，显式 hash 的 SDSS wrapper 使用它。原 query、两 image 需求、视野资格、同出版父档、失败保粗、retry、取消迟到与退休责任继续共用。普通 page 仍未提供候选 hash。
- frame/identity/completion/source-credit 增加独立 display 判别和 `displayPublication`，真实 asset/父档及当前 native lifetime 必须相符。显示估计不装入 science 字段；含多个 publication 判别、伪版号或 foreign asset 拒绝。来源来自实际完成且仍有效的 paint receipt。
- display 复用原 TAN 注册与 joint-area-alpha Scene 责任。新增显式 calibrated Scene port；旧 science-only port 仍拒 display。普通 page 当前未提供新 port，不能把 owner 消费通过称为 page 接通或默认采用。

原 16 个代码/测试文件与 4 个云观星文档/记录脚本的修改前字节见 [before-bindings](../../../../output/sdss-m82-display-client-development-1004-r1/before-bindings.json) 和 [additional-before-bindings](../../../../output/sdss-m82-display-client-development-1004-r1/additional-before-bindings.json)，原 bytes 位于同目录 `before/`。新增 display 消费测试和三项 task 脚本；没有第二套缓存、队列或绘制框架。

绑定范围补充：其中八个既有实现没有列入 r97 的 currentSources：`sdss-optical-client`、`sdss-science-optical-resource`、`sky-publication-resource`、`sky-sdss-optical-completion`、`sky-optical-source-credit`、`sky-target-optical-scene`、`sky-sdss-science-scene`、`sky-scene-render`。本代编辑前已逐一保存实际字节，本代 current inventory 补列；不把该归档冒称为旧 checkpoint 已有的 pin，旧 checkpoint 保原。

## 当前开发证据

| 检查 | 实际结果与边界 |
| --- | --- |
| 九组受影响消费者 | [r1 日志](m82-display-client-affected-r1-2026-10-04.txt)：61 pass / 1 skip；未提供旧 science page 实际输入的 skip 不升级。 |
| 新入口及受影响 Hook/resource | [r1 日志](m82-display-client-new-path-r1-2026-10-04.txt)：20 pass；受控 transport/native handles/paint ports，不是 GPU 或微信运行时。 |
| 实际 M82 manifest 消费 | [最终 r2 日志](m82-display-client-actual-consumers-r2-2026-10-04.txt)：四项选择检查通过，真实 descriptor/出版身份、细档失败保父与恢复、metadata 退休 effect gap、完整 `drawSkyScene` 的显示判别/完成与来源 packet。影像 handle/query/paint port 受控；不是 full SpotSkyPage。 |
| Miniapp 类型 | [最终 r3](m82-display-client-types-r3-2026-10-04.txt) exit0。r1 早期通过；r2 新测试数组边界 TS2532 两处失败保留，增加实际存在断言后修复。 |
| 原 owner 缺口 | [实际 reader](../../../../output/sdss-m82-display-client-readback-1004-r1/result.json)：归档旧 frame 对真实 M82 display 返回 null；当前 frame 保 displayPublication/DETAIL/MEDIUM 实际 descriptor，foreign descriptor 拒绝，输入前后原字节精确。只证明 handoff。 |
| 实际三个 encoded 文件 | [cache r7](../../../../output/sdss-m82-display-client-cache-1004-r7/result.json)：原已存 M82 manifest/hash/三 PNG 原字节经现有实际 runtime/cache owner，在原测试 Taro callbacks/MapFS 下完成准入。不是 HTTP/decode/GPU/page/原生证据。 |

M82 publicationHash 仍为 `74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab`，manifest 26,384B、SHA `398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a`。三个实际原 PNG：OVERVIEW 516,783B、MEDIUM 606,174B、DETAIL 546,719B；共 1,669,676B。未重新下载、加工、封包或导出静态数据，PNG 不变不作质量通过。

cache r7 每档两消费者共一次实际 adapter 二进制交付、同 filePath，各次独立 release；暖读同文件且不增加二进制传输。三档暖保留 encoded 1,669,676B、租约/metadata listeners/pending/reserved/running 为零。记录了 lease promise 完成但 transport finally 尚未结束、running=1 的中间事实，不能提前当完全空闲。

显式清理使 metadata/文件租约立即失效。等待原 I/O finally 后，清理返回 partial；仍持有的 DETAIL 文件 546,719B 与一个 retired lease 保留，其他两档回收。释放并完成原有序清理后 encoded/lease/retired/pending/running/reserved/listeners 全零。下一 metadata demand 取消后迟到成功不能交付。本任务 kernel 0.0630868 秒仅当前 adapter 序列，排除输入读取/编译/bootstrap；CPU、进程/native/decoded/GPU 峰及真实整旅程峰未测。

## 失败与恢复如实保留

所有 cache r1–r6 目录/执行源码和日志保持：r1 task 先访问请求数组导致失败；r2/r3 发现 VM 导入包装未取得原 Taro default stub；r4 仅 task namespace marker 修复后在 lease-resolution 时过早要求 running=0；r5 清理/释放后过早要求同步 bytes=0；r6 最后一次暖 lease 的 promise 早于 finally，实际返回 pending，却要求 partial。r7 在两处先记录中间状态并等原 finally，再执行原 clear/release/ordered clear。没有为任务错误修改生产缓存、扩大时限预算或覆盖旧失败；r6 pending 仍是其真实观察，不改判 partial。

## 连续性、资源与剩余范围

[close](../../../../output/sdss-m82-display-client-readback-1004-r1/allocation-and-observation.json) 核原 r97 447 个 source（本代归档授权路径外原字节不变）、8,631 旧 evidence、六项 settings/outbox 保护文件。九个本代 Windows output 目录共 45 files、1,618,570 logical B、1,705,344 reported allocation B，45 distinct identity/link max1、前后稳定。含失败目录和 executed close，排除之后 allocation/document/log/checkpoint/continuity、旧源/依赖、FS 内部、Linux 保留与端云物理容量。

最终实时状态另见 r98 checkpoint 和后续 continuity；原 BFF/watch 不重启、staging0，不提交推送/采购/部署发布。普通 registry 空、NOT_ADOPTED；独审 MISSING。完整 opt-in SpotSkyPage 三档、SourceBack、冷暖/失败/hide/退休组合与跨家族总资源/临时峰，以及科学/弱结构/星体/配准/跨级图质、真实 retention/200DAU 混合成本容量仍开放。strict Back、M51 矩形/W3、WXML 和 Android/iOS/newMoon 已知失败或缺证保原，不能升级为验收通过。唯一下一依赖只见 PLAN 顶部。

本代 Context validate 和 Git diff --check 通过，分别见 `m82-display-client-context-r1-2026-10-04.txt`、`m82-display-client-diff-check-r1-2026-10-04.txt`；它们不供应运行时或产品验收。
