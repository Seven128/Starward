# R19 手柄与正文原生移动边界

状态：普通 gen16 已沿原 Stable 自动推送、实际观察后绑定；[同一路径目标结果](R19-GEN16-HANDLE-DOCUMENT-PHONE-20261023.md)中，图库/标题不再被顺带滚出，正文可正常滚动、Back保阅读位逐级关闭。Root与[独立审阅](R19-HANDLE-DOCUMENT-BOUNDARY-REVIEW-20261023.md)已实际查看，限定旧crop关闭；不等于全UI/Goal通过。

## 已确认问题及选择

沿[大档标题边界独审](R19-GEN15-LARGE-HEADER-BOUNDARY-AUDIT-20261023.md)，Root 在原普通 gen15 做了一个有界区分：同 marker 中档 `f8f062bd` → 手柄 `(0.5,0.522)` 到 `(0.5,0.23)`、700ms → 大档 `cdc93d4b`（UTC03:13:52.326）图库/标题裁出；随后明确正文 `(0.58,0.35)` 下滑至 `(0.58,0.72)`、700ms → `d8ce47d6`（UTC03:14:30.911）。Root 和独立审阅均实看：完整三图图库、手柄与标题重新出现在原生顶栏下，大档/固定三动作不变。因此是可恢复文档 crop，不能为此更改设计或顶部安全区。

当前证据还不能区分原生触摸竞争、媒体展开的布局保持与其它 offset 机制。fresh marker 已清 saved restoration；无 saved 位置时原 hook 不主动下发滚动命令，不能归因新来源返回主动上滚。

候选只补当前合同已经要求的原生手势边界。Taro 官方说明 `View catchMove` 会使用原生 `catchtouchmove` 阻止滚动穿透，逻辑层 `stopPropagation` 不等价；项目已有同类原生能力，复用它而不新增 gesture/runtime 库。见[官方 React 说明](https://docs.taro.zone/docs/react-overall)与[View 属性](https://docs.taro.zone/docs/components/viewContainer/view)。这是候选依据，不是本设备根因已证实。

## 源码改动与保护

正式点和提案两个 retained document 的既有 `spot-panel__handle-band--document` View 同加一个 `catchMove` 属性，原 Button 的 start/move/end/cancel、Map extent owner、阈值、媒体/弹性时序、scrollY、正文触摸、章节/来源恢复及样式均保留。两者复用同一 Taro 原生能力；没有新增包装节点、另一业务状态或泛化手势系统。没有为试验触发提案/N05/账户路径。

改前整个普通 gen15 feedback **516 件 / 60,689,568 B** 已独立复制并逐文件 hash 读回；两份源、PLAN、冻结 gen32 manifest 也保原件。私有 owner 为 `device-resume/r19-ui-20261022/header-handle-boundary-repair-20261023`；`before.private.json` SHA `0b7be902dbe50e452d395a50efed6c99fe738c8d52812efc6b0f75ea0c12492c`。旧源只移除这一个新增属性即可逐字节恢复，实际检查已成立；没有 reset/clean/force/stash 或改旧冻结树。

## 本机检查与构建

正式小程序 typecheck exit0。4 个原相关检查共 **26/26** 通过，覆盖拖档取消/呈现/锚点及提案文档责任。首个命令误从仓库 cwd 启动，4 文件在解析 `@/components` alias 前失败；保留 `related-tests.log`，随后从正确 workspace cwd 执行同四文件通过，未改测试或实现来绕过失败。

普通完整 WEAPP build exit0，webpack **28.867 秒 / 10 项既有 warnings**。新 bundle `51c72f197afab132827019bc07ae36ddb556466b0a7c4c888d3581115899dae3` /345 件/5,023,816 B；main2,035,453 B、content1,041,539 B、spot612,072 B、sky1,334,752 B，maps0。两处真实编译消费均为 `catchMove:!0`，基础模板有原生 catchtouchmove；预算/production guard/physical bundle guard/实际编译地址 owner 全角色及两次完整 fingerprint 通过。

当前源 `spot-panel.tsx` SHA `67ab85d2be66561ee7f9d0804cd2e51a92f2a29705f6786eda1fcb8909dbe254`，`pending-proposal-panel.tsx` SHA `74c6a8f64a2232ad91d16ed5c3d6face664d318a9ff7887fe3896b1816dc34ee`。旧普通 gen15 prepared bundle 与冻结 gen32 bundle/manifest、PLAN 仍与改前身份完全一致。本机 `normal-manifest.private.json` 留全 file list、检查与源身份。

旧反馈退休后另从私有 `gen15-before/generation-000015-Na0iwU/project/dist/weapp` 完整读回，仍为原 `63893429b0f47be8284a944d08a34f9230ffa4b87315de1d361ff361a25087d3`；当前prepared gen16全部files与normal manifest深比较、冻结gen32及PLAN也匹配改前身份。该只读恢复核验保 `post-refresh-preservation.private.json`，SHA `ff7ccd60a6e1903fde70ec3acc766f199f90debb74a44099c9a6b2e355f73fd1`；没有重建/再推送候选。

## 目标观察与停止条件

已复用同 feedback run、原 Stable `refresh --delivery auto`，实际success/no task后先公共USB实看才bind新session；旧gen15输入资格退休。目标bundle与上节一致，当前普通gen16，五次输入/实际视频/全部原件与结果见上述手机记录。

只复验已可靠复现的同一正式点 medium→large 手柄路径，并核正常正文仍可滚。限定目标独审已完成，无新增P1/P2；不派生 `!settling`、清零 offset 或改媒体时长等相邻变体。无关主题/图片/速度矩阵和原 SDK 失败路径不重跑。提案实际原生边界、完整连续时序及整体 UI/Goal 仍未完成。
