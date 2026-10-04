# 当前帧纹理保留：开发源码采用的独立审查

2026-10-02。root 实施；本角色只读源码/实际消费者与旧冻结输入，执行 task-only VM 准入和有界 mutation，没有改生产、运行新 GPU 矩阵、下载、启动服务或重复 root 的 19 项/TSC。独立审查没有发现最终实现需修复的生产缺陷；开发采用与部署/WEAPP/最终验收仍是不同阶段。

最终 owner `sky-gpu-textures.ts` SHA `a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3`，GPU tests 最终 SHA `d30d8b0d75f791d9e61ec0436447027ae2d57c6bdd33c4a3b713e12c952dc946`。实际证据 `output/active-retention-adoption-independent-1002-r2/result.json`（15,214B，SHA `6121f6f755abbf33ccebd6450a8583eaa87798bb8e5461bf5d906bc08553f78c`），完整 source/assets/protection binding 与 executed task script 同目录保存。

## 语义与消费者闭合

与实际 GPU 试验冻结候选 `0201b42d…` 比较：只归一化 local `pressureBytes`/旧 `byteBudget` 和常量名，并移除候选中已不参与 allocation/retention 判断的 `previousFrame` 集合维护。去 comment 后**完整 AST 文本精确相等**，两边规范化 SHA `2f87565caeff3266b2f1c7b68965cf90244f41c5efcfdc5d1dbc87ca9b9d7da3`。实际 weak-lifetime owner 查询纯读；删除 obsolete bookkeeping 会少查一次旧 used 的 current 状态，不承诺任意带副作用的外部 predicate 调用次数相同。

当前帧已经 get/使用的 identities 在新源 allocation 压力中受保护，未使用但即将 paired submit 的身份由同步 pin 保护。finish 只退休本帧未使用身份，保留必要 current working set；下一 moving/empty frame 释放不再使用的旧集，不累积跨帧 cache。当前 valid failure latch、optional copy failure、same-source window replacement、native weak retirement、context-loss、source pixels/filtering/格式与原实现不变。

数字仍为 16MiB，仅改名 `SKY_GPU_TEXTURE_PRESSURE_BYTES` 明确是 allocation-pressure target，持续 working set 可以超过它。读取实际 landscape selector 后，对两处常量与本段说明注释做逆变换，**所有原 bytes**恢复冻结 `674b90768bb4ef98627f4e094625c80b9bab25bcc3e3ad71e2b46dd8cd3fa175` / 4,897B；函数选择公式、其他图的独立资格和 overview fallback 未改。renderer 只删除新增 option 注释后全 bytes 恢复 `bc0c927aa861a078c5c0e96b123ed84034db1838ba55185c5eb5db44f2e27444`。公开 option `textureByteBudget` 和原错误字符串保留兼容。

原窗口 `sky-artwork-texture-window.ts` 与 weak-lifetime loader hash 精确对应 frozen r4；正常输出 peer binding 下 281 项公共资产文件（含元数据，不称 281 张图）及 6 保留文件再次读回一致。没有 shader、source/publication、图片内容或科学质量策略变更。

## 有意义回归与 escaped test gap

实际最终 9 个 GPU owner fixture 在隔离 VM 中通过：同源 above-target stationary 不重上传、AB→BC 压力下释放未用 A/保留当前 B、empty finish 在 dispose **前**退休、full→crop/contained复用、copy fallback、失败 identity latch/replacement、context-loss、nested pins 及 exception release。使用同源纯 weak helper 定义、同 VM realm 执行，避免跨 realm prototype 成为假缺陷；这是 controlled GL bookkeeping，不是额外 GPU pixel/native 试验。

冻结旧 `cbbe3720…` owner 用这些当前 fixture 实际执行时有失败，保留 before 结果。四个只在内存改写的 mutants 被相应真实 fixture 检测：删除两个 current-used allocation guard；删除 empty/next-frame retirement；错误地移除 pin `added` 的 `filter(!pinned.has)`；删除 finally 的 pin release。每个 shadow SHA、具体失败及独立例保存，不触碰生产。

初代独审 r1 实证了一个**测试检测力**缺口：在 inner scope exit 之后，原 nested test 立即 get(coarse) 标 used，没有再挑战 outer pin；错误的 nested unpin mutant 仍能通过原 9 个测试。独立反例在两个 outer future sampler 尚未 used 前 allocation D，正确 owner 保留 A/B，mutant 真删 A。root 已在同一个 nested testcase 补 D allocation，再断两纹理存活，当前 frame size=4；最终 d30d… 测试现在确实检测此 mutant，r2 同反例正确 owner 仍通过。生产 filter 本身原本正确，没有为测试修生产。

r1 `output/active-retention-adoption-independent-1002-r1/result.json` 保留历史：测试覆盖缺口及 landscapeReverseMatches=false。后者是本审查脚本手填 CRLF 的错误，而实际 landscape 源全部 LF（0CRLF/97LF）；r2 捕获实际 newline 后逆变换严格回原 hash。r1 关于 reverse edits 的泛化文本不能用于 landscape 闭合，只有其 false 字段和这里的明确修正有效，不回写旧输出。

## 有效证据范围与剩余义务

本段采用映射到原候选的 normal GPU 证据：26 全场 PNG/RGBA、78 ledger 由另一个角色独立读回（`output/active-retention-normal-independent-1002-r1/result.json` SHA `f8d042d5c8ac60af128c45b8c5dbfc4dff01e8d3edae79e61ae882e5082134aa`），独立正常读回与该角色自行编写的 boundary probe 明确分开。原原窗口 source-plane candidate 的 45/85 单字节失败保持未采用，不因本 owner 审查覆盖而升级。

当前帧持续成本照保留：normal matrix frame-end max 16,777,216→31,981,568B，某些转场 initial peak 与首帧上传上升；净 source→GPU 上传下降不是网络流量改善或免费持续内存收益。16MiB 不是硬峰值/总容量保证。原 baseline dispose assertions 执行但 raw final 未保存的 gap 不补造；active final actual0保持可读。

本审查不认证 native/driver/GC/OS 总内存、设备释放时序、WEAPP精度/FPS、200DAU/服务器容量、W3画质或完整交互体验。不发布、不部署，不把历史 software GPU pass 与开发源码采用当目标运行时最终验收。
