# 精确星点绘制准备：实现与检查

2026-10-21。沿同一 PLAN 和 [r20 成本结论](R20-DRAW-COST-RESULT.md)完成当前 Canvas 的单份准备复用，**本地检查通过，待独审及匹配手机观察**。没有减星、量化时间或相机、加节流/定时器、恢复 gen24；不宣称新时刻首算或 B 内存问题已解决。完整绑定见 [JSON](EXACT-STAR-DRAW-PREPARATION-IMPLEMENTATION-20261021.json)。

`sky-star-draw-preparation.ts` 由原 Page/Canvas 生命周期持有。它只保留当前精确视图的 BSC 与 SAO 两个独立列表，旧 view/key 在新准备前释放。键涵盖真实 renderer、Context 及其版本字段、准确时间、九个 basis 分量、尺寸/FOV/有效中心、模式及太阳高度。原投影、appearance 和完整星表循环仍在 Scene；命中只省去这段准备。每帧仍执行 transition point/exits、opacity 下的点选/名称、后续天体/地景遮挡、vertices/GL 与原成功 copy 后接受。

复用只对已准入且不可变的源成立：BSC 原 transport admission、SAO 原 index/tile admission；新添弱成员标记不强保留历史源。原时间 presentation 在创建当前 exact geometry 时冻结自己的新对象，未冻结旧报告。mutable/legacy 输入继续原 build，不保留新的绘制列表。现有 exact-frame memo 同时核对实际 catalog/publication/geometry 和 observer 值，且 transform 闭包捕获当前局部源，避免同时间换源沿用旧 frame。

原 `suspended`、`invalidated`、`releaseContext` 和缺失 data/basis 路径都清除准备。源撤销只撤销对应层；构造/消费异常清空准备。准备不建立 accepted、像素或来源 credit，未提交和迟到帧仍由原 transition/Canvas 栅栏处理。缓存会增加当前星点工作集；单份列表和 reset 后无自身引用不能作为无泄漏证据。

检查共覆盖 **102 个不同的相关用例**（批次 16、64、27，最后一批包含 5 个重跑），包括完整 8,404 行 BSC 和实际选中 100 多个 SAO tiles 的非空完整 Scene、同值续帧、精确相机/center/FOV/尺寸/太阳/mode/Context/时间 A→B→A、独立源到达/撤销及同时间源几何更换、legacy、构造失败、copy 失败和实际 page 清理回调。名称、completed-frame、地景/天体过滤和 GL submission 原测试均通过。最后变化的用例另跑 23/23；Miniapp 全量 typecheck 和 diff check 为 0。

另用**冻结 r20 完整 `drawSkyScene`**作为旧侧，只将任务观测 wrappers 设为无副作用，当前生产候选为另一侧，复用真实准入输入；5 组检查逐帧的完整 Scene surface commands、pick/name 和动画状态全等。该检查没有测新性能数字，没有声称 GPU/物理像素同值。临时检查副本、结果原文已仅在本机私有目录保存并核验 SHA（位置/哈希见 JSON），测试目录内临时入口已删除。

任务观测适配须把 BSC span 放在 `buildCatalogStars` 定义至实际 `starDrawing.catalog`/fallback 完成，SAO span 放在 `buildSupplementStars` 至原 exits 完成。只包 builder 会漏掉缓存命中后的逐帧 replay。原 `paintStar`、`sceneFinished` 提交计数锚点未改。稳定源码已交给 root 与 r21 观测适配代理；未操作手机/IDE/服务，未构建推送、提交或上传。

下一步是独审、同源构建后用现有观察比较匹配全天空夜间长按与普通 Play。收益预期仅为同 exact-input 续帧；全新时刻无命中时的成本、整个六字段/播放体验及 B 的强保留根/native failure/内存 drain 仍未完成。
