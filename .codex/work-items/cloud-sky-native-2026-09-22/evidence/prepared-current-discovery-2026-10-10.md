# 当前影像目录与普通区域消费者

范围：沿既有 PLAN A/B 支撑 C/D，把三份已有显示合格候选接到普通页面的公共消费责任。正式 owner、静态默认枚举和普通采用仍为零；本机临时 service 明确声明三份 current，仅用于条件验证。无新增下载、模型、编码、像素修改、目录身份或产品模式；未提交/推送/部署/发布。

输入与原 qualification 保持：[成品试点](image-ready-texture-pilot-2026-10-10.md)、[标准出口](prepared-candidate-delivery-2026-10-10.md)。本轮完整机器回执在 `output/prepared-discovery-current-2026-10-10-r1/`，精确文件 pins 见其中 `evidence-pins.json`。

## 共用责任

- 合同与既有 registry owner 增加 bare `GET /v2/sky/prepared-optical/manifest` 当前目录。只有明确 current 的 hash 进入目录，注册候选/保留版本不自动采用。目录带原实际 TAN 摘要以约束需求；完整 metadata、来源、加工和图片仍按精确 immutable hash 验证。默认与仅注册候选两种 owner 均返回空。
- 当前目录由一个共享 query 读取，取消、错误和重试继续用既有 request/query owner。点选天体只取同 reference 的当前版本；REGION 集合独立于点选及星表健康，依据实际观测帧、视角与同几何 owner 需求，不借天体身份或目录中心。
- 每个区域实例复用原 `useSkyTargetOptical`、file/cache/租约、Canvas 代次与两相邻 LOD。固定 Hook 顺序由无界面子消费者承担；父 scope 在 effect 前阻断旧 Canvas/版次，旧 cleanup 不能移除新 owner。失败保有效独立结果，公开 retry 不重建整 Canvas。
- 原 Scene 接受同 surface、ref/hash、当前真实图片的区域组；finish 后接受当前完成回执，再由同公共 credit/精确 Sources action 披露。区域与 IR 的整片选择只在实际几何重叠处发生，不把别处照片用作全场 IR 开关。提交、metadata、decode 仍不等于完成贡献。
- 原 GPU contribution owner 可读取当前帧政策。普通 Prepared 按实际 drawingBuffer 和图片组数使用已有 RGBA/MAX 预算计算；冷帧零组不分配，缩减释放池，原故障锁及显式固定额度不扩大。此处是逻辑分配规则，没有认证物理峰或多图设备容量。

## HTTP、Scene 与验证

`discovery-readback.json`：完整 miniapp bare client → 实际 Nest/Fastify injection，当前目录一次、三份精确 manifest 共四请求通过；目录 no-cache、版次 metadata immutable，TAN 摘要与完整 owner 一致。没有候选自动采用或 mutable 图片回退。这是 HTTP injection 开发证据。

`output/prepared-scene-batch-2026-10-09/region-current-consumer-1010-r1/result.json`：三份候选共 55 个新软件 WebGL 帧，普通区域集合端口、selectedObject=null；三 LOD、DPR1/2、整场/细节及适用光照控制。runtime PASSED，browserErrors/queued 空；实际 contribution 回执、预算、GL 失败和 dispose 读回随每帧保存。是实际照片与当前 Scene 的开发输出，不是 live 天气、原生全画质、并行三图峰值或设备验收。

已看三份整场/细节比较及 ESO378 最大缩放 DPR2/photo-off 对照：真实蓝壳、红壳和恢复核心仍在，没有新机制产生的明显缺陷；源自身颗粒和科学 UNKNOWN 保持。当前日期 2026-10-09 的 ESO378、NGC2022 在地平以下，该软件范围不冒普通地景或夜间可见性。

`pixel-parity-scope.json` 修正初次仅按文件名/LOD/DPR匹配的范围：12 个同输入 NGC7009 帧 RGBA 完全相同；其余 26 个旧 ESO378/NGC2022 帧的日期、相机等输入不同，标 INPUTS_NOT_COMPARABLE。初次 `pixel-parity.json` 原结果保留，不把不同像素冒新回归或旧验收复用。

`scene-source-continuity.json`：118 个实际 parsed 源中 117 个当前字节完全相同；另一个只改说明性注释。保留 CRLF 后重构的 9360B 旧源精确匹配捕获 pin（SHA c53d40b9…），冻结在 `source-epoch/`；当前与重构源去注释转译程序完全相同。没有重签旧回执、改变 Scene/图片或放松库存 validator。

相关 miniapp 11 文件 64 PASS / 1 既有 SKIP / 0 FAIL（`miniapp-checks.log`）；新 contracts 两项、API 三项通过；SDK generated check、miniapp/API typecheck 通过。当前单一构建通过，三项已有构建警告保留。自审/这些检查不替独立审查或完整33项验收。

全 SDK route structural check 仍 FAILED：当前反射及 operation 两边各112项，但七项差异仍在。新 Prepared discovery 两边各一次并匹配，去掉该项不改变差集。完整表见 `global-sdk-route-surface.json`，是当前差集审计，未冒历史 clean-HEAD 基线；未修其他路由或把全合同失败改成通过。

## 实际 WEAPP 条件路径

`native-build-binding.json`：普通隔离 `weapp-check-prepared-regions-1010-r1`，反馈 SKY1010RG1，API loopback8794；fixtures/acceptance/request diagnostics 关闭。274文件、4,640,574B、SHA a54b7cfb…，1149源 pins。AppID 与源项目一致；官方打开后编译文件仍完全相同。普通构建身份不证明普通正式采用。

临时 Nest module 使用真实 BSC5P v3、原 SAO/星座/controller 与同 test-service factory；观测和天气是 LOCAL MEMORY/DETERMINISTIC TEST。仅本 module 声明上述三份 current，生产/默认没有改变。官方新开 s4，SDK3.17.4、390×762 window、DPR3、平台 devtools，不能冒 iOS 手机。

当前 native 请求成功读取三份目录；初始视角不请求区域图片。当前声明目录只有58个深空条目，没有 NGC7009，所以正常检索无该项；原结果保存，没有补造对象身份。用真实邻近 HR8093 的普通搜索/定位把视角移近，独立 REGION:eso-ngc7009-field 随 footprint 才请求精确 manifest 与27171B OVERVIEW。一个20→150 CSS px双指动作达到6.08°，原 Scene 完成后 WXML 实际生成 `ESO/J. Walsh`、CC BY4.0 和处理色说明。

从该公共 credit 打开 Sources 的实际 route 精确为 REGION reference 与 `3afb1bcf…`，来源页截图可见正确许可、署名、链接、加工和 UNKNOWN 说明；Back 后回原 Context/报告 revision，caption 保同版。`native-readback.json`、各 `native-*.json/png` 记录这条实际普通消费者路径。节点 text、程序化 tap 和成功网络均不认证不可见控件。

仍然 FAILED_DEVTOOLS_OUTPUT：Canvas 绘出后 Sky 返回、控件、署名在官方截图中不可见；归因 UNKNOWN_PRODUCT_VS_DEVTOOLS。Sky caption 视觉、完整原生细图/恢复、手机与物理峰 UNVERIFIED；权益呈现 PARTIAL，普通采用/可分发仍0。Sources 可见不能替代 Sky 权益呈现。

验证后官方关闭 s4，核对脚本命令与监听 PID 后退休临时8794服务；原 s1/8793与待用户确认的画面保留，见 `native-retirement.json`。没有手机 QR、预览投递或发布。

## 保留失败与后续边界

保存最初 VM import 形状错误、原生 sky request 错用非 owner 目录 version 的400，以及旧源重构时 HEAD/LF 与实际CRLF差一字节的 harness 失败。相关 fixture/adapter 初次失败及修复不改产品预期；官方初次 runtime timeout、失效选择器/不支持的 nth/attribute 选择也保留在 native 回执中。最后使用实际 outerWXML 节点 ID，未新增产品测试模式。

最近派生库存仍 r14；本轮没有派生 r15，也不把早先库存自动冒新源码下的完整准入。显示配准、原 FILE、raw/base 科学 UNKNOWN、旧图质 FAILED、pilot四份输入限制、独审 MISSING 和全部33义务保持。下一项仍沿唯一 PLAN；不以普通消费者已接通提前新增第五份输入或30–50扩批。
