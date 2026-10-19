# 地形残余等待：当前证据与下一修复决策

2026-10-19，只读源码／既有文件复核；沿当前 PLAN，不重选方案。结论为 **`REQUEST_WAIT_PROVEN__POST_READY_ORDER_PROVEN__TWO_SECOND_NATIVE_CAUSE_UNPROVEN`**。本轮仅新增本报告及 JSON，没有操作设备、IDE、HTTP、服务、feedback、构建、账号或生产源码。r9 调试已结束、旧 r8 连接不再可用是 root 提供的现场边界，本报告没有再次探测它们。

## 先纠正旧 key 的预期

**旧 `starward.task.terrain-wait.v1` 即使读回，也不能补出 A5→图片 SHA。** 实际 r8 staging 的 observer 与现模板仅绑定值不同；`snapshot()` 只复制匿名 rows，没有序列化 `refs` 或 `pathAssets`。`seal()` 还在 persist 前清空两张表。`asset=5`／`file=6` 是临时顺序号，`sourceSha256` 是构建源码身份，并非资产 hash。现有 hook 只传 `fileReady(imageKey, path)`，没有传图片 digest／bytes。

若当时能读取，该 key 可补 attempt、文件 cache、current／cleanup、时钟／overflow 及匿名事件关联；不能完成与桥 SHA 的映射。现在不为这些旧字段恢复旧连接、重开旧候选或重放旧动作。旧 r6 的实际响应身份也继续 UNKNOWN；r8 新 HTTP 身份不回填 r6。

## 已经能决定什么

| 有效证据 | 已支持的结论 | 不支持的结论 |
| --- | --- | --- |
| r6 后来合法导出的完整 task receipt：metadata_start 1735→returned 3983 ms；同 A5 file_acquire 3998→ready 4096→current ack 4130 ms；7 rows，无溢出／坏时钟。原件 SHA `653ab774ff9303ba3faee07796f6b577b6924b03c28351baa5f70fb133e2d242`。 | 同一手机 wall-elapsed 软件窗口存在 **2248 ms metadata 等待**，之后 file 98 ms、ready→ack 34 ms。请求侧有值得细分的长等待。 | 2248 ms 全是 CPU／服务端；34 ms 是物理显示；实际最终图片 SHA 已知。 |
| r8 桥真实 metadata 11 ms／asset 184 ms，声明和实际转发 314570 B／SHA `4ba6d68aa59958c2017957929a6fcc72715896a702026b4f055bcd7046478340`，归一 key／proof 一致。 | 本次已存在成品的 HTTP 身份闭合，暖条件读取很短。已验证的候选 proof 含两格发布、两格 derived cache，至少一格是较新的派生结果。 | 手机 A5 已采用此 SHA；11 ms 相对 r6 是优化收益；本次是冷源或各级 cache hit 已实证。 |
| r8 n344／345 已可读 file_ready A5，仍有右侧缺口；n346 首见新覆盖，PTS `(5.774189, 5.790578]`；n348 才拍到 ack。 | 已取得原观察合同所需的 **ready-before-observed-gap 正向顺序**，足以把一个残余呈现片段放在 file-ready 之后。 | 全部约 2 s 都在 native；相邻编码帧差等于 native 耗时；ack 才是首覆盖。 |
| r6／r8 都保留仍有效旧地形；r8 中途 medium panel 关闭、native 范围改变；phone／host／PTS 未校准。 | 旧有效范围保留成立；比较须保相同布局／缓存条件。 | 整段连续空白精确时长、两轮收益、p95／物理 FPS 或完整配准验收。 |

r6 的 2248／98／34 来自后续精确 key 原件，补充的是 [metadata owner](TERRAIN-METADATA-WAIT-OWNER.md)；[最初 r6 视频报告](TERRAIN-R6-WAIT-RESULT.md) 当时尚未取得 receipt，两者不冲突。r8 的详细画面及身份范围沿 [独立动作报告](TERRAIN-R8-IDENTITY-ACTION-RESULT.md) 复用。

## 代码没有给出可直接实施的两秒后侧修复

`onRegionChange` 在 native gesture end 即发布 camera；250 ms timer 属另一项 Observation Context 更新，静态地形 query 不等待该 timer、天气或 astronomy。action 到 metadata 的前段含真实 1400 ms 拖动，不能全叫请求排队。`useNativeMapRegion` 还要准入实际 getRegion／scale／相机与布局代；在没有实际边界计时前，不能删掉这些正确性检查。

`useRasterImage` 先取得共享文件及 stat／SHA 准入，再发布 path；新 path 未就绪时，`useMapRasterInstallation` 保旧 target。协调器串行占有两个 slot，新 add 确认后才 remove 旧图；相同目标回执可能只是复用。现有证据没有显示长队列、迟到覆盖或不必要的两秒 timer。`native_ack` 不是新 add 次数或实际呈现回执。

`TerrainService` 缺 final window 时仍可能取得缺格、合成／encode、串行 cache write／prune 后才返回 metadata；这是可定位的责任，不是已证热点。r6 真实响应未绑到该 proof，r8 已暖，现有数据不能在源 I/O、派生 CPU 与写入之间选修复。不能凭同步代码、一个 newer derivedAt 或唯一同长度候选就选择 worker／异步写入／预取／blocks。

## 下一次最小有用观察

**停止追旧 key，把下一次原本就要完成的连续 pan／zoom 或跨覆盖动作同时用于当前决定。** 不制造 cold、不清缓存；动作前记录当前源码／候选、布局和是否已有有效覆盖。现成 marker、80-row task receipt 与桥身份已够覆盖主要边界，不再建完整 stage 仪表。

若这一动作需要与具体 proof／服务测量相连，在下一次已经必要的合批候选中，仅让 `file_ready` 导出共享 owner 已返回的实际 `sha256`／`bytes` 标量；metadata 可同时给期望 SHA。`RasterImageFile` 已有这些结果，无须另读文件或计算 hash，也不导出 URL、路径、经纬度、响应或账号。该字段应随既有非逐帧事件保存、说明版本／可选值含义，并由 root 在 refresh 前读取当次精确 key。**这是新动作的最小关联补充，不是恢复旧 A5 映射的办法，也不是所有性能工作的统一前置门槛。**

按同一次有效结果选择下一动作：

1. **metadata 又长，file-ready 后很快补齐**：优先请求／成品分支。用 SHA→window proof→cell 的现成关联，复用既有 `terrain_metadata_read`、`terrain_raster_derived`／measured callback；只有取得同资产的源读／CPU／组合证据才选相应修复。没有当前 service principal 时不借8791、不放宽桥、不为 telemetry 单独重启；若下一次本就要准备服务，可在原 owner 窄导出现有字段。未有数据时保 I/O／CPU 未分清，不反复录同样暖窗。
2. **metadata 短而 file_acquire→ready 长**：现成 cache 状态、download_returned、file_ready 足够先分共享队列／传输前后；只补实际缺失的一侧，不先改 native 协调器。
3. **同一有效新资产 ready 已可见，之后仍有足以解释用户等待的持续缺口**：才向当前安装／发布边界补必要的 queue／真实 add 起点；与当前 generation／asset 绑定。r8 的相邻编码帧顺序本身尚不满足这个长等待判断。
4. **暖条件各软件边界短且覆盖及时**：推进原本欠缺的连续正确性／缩放细节／回访与资源验收；不为找慢而重复同一身份资格。它仍不替代首次、未成品区域或真实天气分支。

当前匿名图片缺口阻止的是“某精确图片／cells 造成该次成本”的强结论，**不阻止已经成立的阶段判断，也不阻止下一必要动作**。没有足够证据选择新的生产性能修复；保持原方案并执行上述有分支价值的观察，优于继续追一个无法导出 hash 的旧 key。完整连续配准／细节、同条件真实改善、年度夜光／云量、iOS 与资源回落义务均保留。
