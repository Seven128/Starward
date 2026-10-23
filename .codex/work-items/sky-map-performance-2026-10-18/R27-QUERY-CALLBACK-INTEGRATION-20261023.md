# R27 Query 回调关联的当前集成

2026-10-23。沿同一 PLAN 的独立准备工作；UI 的 gen8 扫码及 My 导航取舍仍待实际答复，不改变 UI → 叠层 → Sky 的顺序。**已完成任务用观察、完整编译与本机保全；没有新的手机样本，没有找到 aggregate 最终持有根，也没有修复或关闭真实 V8 OOM。**

## 目的与实现

复用 [R27 已核时序及决策分支](R27-CALLBACK-OWNER-REVIEW-20261023.md)，只关联原先选中的 8 个 aggregate 与创建 render 的 fine-target page queryFn、共享 hook 原 wrapper、实际 Query 对象。三个对象只以 WeakRef 保存，样本沿原 owner 的 ID，不新编号，不存 key、Context、payload 或产品强历史。具体核心合同见 [观测器](R27-QUERY-CALLBACK-OBSERVER-20261023.md)。

- `r27-query-callback-instrumentation.mjs` 对当前页面与 hook 做有限 AST 变换。页面函数起点登记 begin，loading/recovery/normal 三个真实返回表达式经 end 原样返回；两个回调登记函数原样返回原函数，不新增包装闭包、函数调用或页面词法块。剥离这些标记可还原完整当前生产文件字节。
- `r27-query-callback-links.ts` 在共享 hook 先按原 page 回调身份 gating；只有固定站点及同一全局 provider 才用真实 `defaultQueryOptions({queryKey}).queryHash` → `cache.get` 登记。snapshot 通过 own descriptor 与精确对象身份读取实际 options 占位，不调产品 getter，不枚举 QueryCache。
- 沿原 Play receipt start、Pause 停止新增关联、原 90 秒 seal/release。只在原 active-5 与首个 drain-10 读取，后续包保留原观察时间；R26 框架扫描仍为两次，原请求、GC、accepted setter、正常 Play 与产品调度未改。
- 严格 R27 checkpoint schema 只扩展固定标量与原 ID，继续 32 KiB、不可变序号文件、单 flight、每包最多两次自动尝试与历史版本兼容。R26/R27 通过同一完整 adapter/transport fixture 检查；collector 增加新 schema 分支，没有替换旧 validator。

`apps/**` 本批没有生产编辑。现有 UI、原正常 Sky 数学/数据/工作量与 gen24 scene-memo 暂停决定保持。新增文件是 task-only 模块，不进入普通生产编译。

## 发现、修正与检查

[独审](R27-QUERY-CALLBACK-INTEGRATION-REVIEW-20261023.md) 初审确认一项 P2：原 `cache.find({queryKey,exact:true})` 实际先 `getAll`，会物化全 Cache。根代理增加 owner 级回归，将 find/getAll 设为抛错，原代码实际失败 `query_cache_enumeration_is_forbidden`。修正为上述精确 hash/get 后通过，并以真实 provider 自定义 hash、三个无关 Query 和同 hash 新实例验证 owner 不误认。检查建 Query 的入口也改为真实 useQuery 同一 defaultQueryOptions 处理；首次直接 build 的合成 fixture 未继承默认 hash，不能据它修改产品。独审只局部重跑这一条并通过，当前范围无剩余已确认 P1/P2。

初次广义 collector 检查为 88 通过、2 个导入失败、1 跳过。两项失败归旧 fixture：CRLF 模板读取边界，以及已退役 R5 页面变换误套当前 R6+ 单 writer。已在测试 owner 合修，历史 V1 recorder/validator/collector 保留，当前页面走既有 V2；12 条 ruler 检查未删除或跳过。完整依据见 [fixture 修复](R27-HISTORICAL-COLLECTOR-FIXTURE-REPAIR-20261023.md)。

最终当前检查：

| 范围 | 结果 |
| --- | --- |
| R27 core、R27/R26 checkpoint | 17/17 通过，0 失败 |
| collector 的 10 份实际消费者与 R27 core | 108 项，107 通过、0 失败、1 既有条件跳过；53,040.7547 ms |
| 上述条件跳过 | R25 real weak witnesses 需启用 `--expose-gc`；本轮没有冒称已执行实际 GC 或手机寿命验证 |
| 完整正常基线行为 fixture | 原 30 项事实全部 true，保原 setter/identity/null 退休、真实 accepted copy、15 秒 metrics/20 秒同 run Pause、hide/unmount/重试 |
| 当前生产与完整变换源码的严格类型检查 | 两者诊断均 0，新增诊断 0 |
| 完整 WEAPP 编译 | 成功；webpack 32.762 秒，10 项构建 warning；全部包预算及静态检查通过 |
| 两份编译整包及包外 maps 读回 | bundle 完全一致，31 maps 全部按 manifest hash 通过；手机包内 source maps 为 0 |

这些检查范围相交，不相加。Mini Program 当前生产 2757 通过/1 条原输入条件跳过的既有结果仍归 [R19 当前集成](R19-CURRENT-MINIAPP-INTEGRATION-20261022.md)，本批未变生产，不为安心重跑全 UI 套件，也不冒远端 CI 结果。

## 唯一当前 R27 准备稿

初始未构建 source `f8a1d7376b59981d346761f7f62fd679b0e90e65db706eae225d743d5078bd63` 早于 P2 修正。沿已有 `refresh-unbuilt` 保留其 manifest/类型结果于 `preparation-attempt-1` 后，只更新这一份未构建准备；没有重建 R26 或新建 disable 变体。当前已编译后不得再次 refresh/rebuild 此冻结代。

| 身份 | 当前值 |
| --- | --- |
| 目录 | `tmp/r17-normal-a1-review-r27-usb`，gen31，1621 源文件 |
| buildSourceSha256 | `920c9e0292fae9bdd331291a9b50d0dc357f3efb15d6b073bfbe686ca573c3b3` |
| manifest SHA-256 | `34c003743125b49a507f8d935543fd82c87662be1de27e4ed14feba8344a63d5` |
| source snapshot SHA-256 | `3232f5c5783202f9e543df815e1d7383f0bbccbd9fe6b9aed0c6ce45d8ffdec3` |
| bundle SHA-256 | `81bf528367576dcc99bbf3610cc683a1222c8411d51c354398c167cf7a09cf3e` |
| 整包 | 349 件 / 5,124,385 B |
| main / content / spot / sky | 2,071,587 / 1,041,518 / 612,069 / 1,399,211 B；main 余量 25,565 B |
| 包外 maps | 31 件 / 7,589,267 B |
| 准备状态 | `BUILD_READY_NORMAL_A1_UNACTIVATED_PHONE_UNVERIFIED` |

执行了原 builder 的 prepare、一次有依据的 refresh-unbuilt、build、inspect；build 内完成最终 delta TypeScript。当前 [准备记录](R17-NORMAL-A1-PREPARATION.json) 明确 gen31 未激活；之前 gen30 记录先私有保全为 `r27-query-callback-20261023/R17-NORMAL-A1-PREPARATION.before-gen31.json`。R26 冻结 manifest 本轮前后均为 `36cd6c0fbd14451ad07fba4e63c7231990e3c9d40119a4e2ed9f1b150b395fbe`；旧 source/project/maps 未改。原 R26 builder 已另保全，SHA 与其冻结 binding 一致。

## 本机原件与恢复边界

私有根为 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r27-query-callback-20261023`。`frozen-gen31-originals` 已逐件读回 **500 件 / 15,530,294 B**：完整 project、31 maps、59 份精确模板原字节、45 份变换/新增源码、builder、当前/旧准备元数据及失败/通过日志。私有 manifest SHA-256 为 `bb4251037eca6da64155de8936c17d20e1ceeed6875a79c6d71ec78410fad44b`。它保全本批编译与观察输入，不冒独立完整 checkout/所有私人数据的跨机恢复包；未上传。

归档准备曾有两个本机工具错误：误把模板 binding 当 LF-normalized hash，及误把没有生成的可选 `affected-contract-checks.log` 当必需文件。分别停在首错核对真实 builder/文件清单后修正；模板 binding 实际是 checkout 原字节。对已复制文件先比大小/hash，仅补不存在项，没有覆盖或删除，最终全部清单再读回通过。这些归档错误不是产品失败、采集失败或新的重试依据。

构建后只读 `assertGenerationCurrent` 再核 UI gen8 仍为 `7772cb07c7b2e65d3df6832c6bbd81d64ffb3206cc23faaa9329ae089e1eee71` /350 件/5,018,782 B。没有官方预览、bind、手机输入、录制、服务/collector reload、网络配置或 Git 写操作。PLAN SHA 仍为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`。

## 尚缺与停止条件

R27 当前**未激活、未发送手机**；live API 仍加载旧 collector，不能因当前源的单元检查通过便声称 R27 网络落盘已准入。后续必要观察节点先按当时 UI 进度、生产差异、服务及目标身份恢复真实准入；不得用本冻结包覆盖后来的生产，也不得重跑旧失败采集清单。

实际 WEAPP 的 callback/WeakRef、有效非空原样本、安装/替换时序和观察成本仍未验证。同 render 不等于 React commit 或 callback→aggregate 强边。只有合格样本中旧 aggregate 仍活而对应具体 page 回调已收集，才可排除该链；options 阳性仅缩小函数 owner。未支持/未关联/不完整保持 unknown；必要关联拿不到则停止这一项，不扩大框架扫描、样本或改 Query GC。已有真实 OOM、完整正常 Play/Pause/drain/退出、UI、叠层及完整 Goal 的全部义务继续保留。
