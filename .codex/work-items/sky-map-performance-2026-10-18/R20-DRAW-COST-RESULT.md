# r20 全天空跨日长按：星点绘制成本与下一修复

2026-10-21，独立只读分析。**现在可以进入一项局部实现：在当前 Sky Canvas 生命周期内，保留一份精确输入的星点绘制准备，供相同时刻／视图的续帧复用；渐变、点选、名称、实际提交和 accepted owner 继续逐帧执行。** 不再补录同层级的原因／总体成本，不重开 gen24，不通过节流、删星或减少渐变帧掩盖问题。它尚未进入生产代码，也没有手机收益或无泄漏结论。

本次只读生产源码、冻结输入和已有手机原件，执行了一个 task-only 局部比较；没有操作手机、IDE、服务、数据库，没有修改 PLAN/HANDOFF、推送、提交或上传。完整数值、源码绑定及恢复位置见 [JSON](R20-DRAW-COST-RESULT.json)。

## 本次手机数据能决定什么

正常 r20，source `85fe0ba21c869c109581015a77fea4b641fc316de6ace548781ff0fdfb921bd2`，本地完整 bundle `d0e1a4500635629d1bfb631fd48fa089f50a66dded829ae065ba127b380a767e`。264.355°、384×796.800 CSS px，夜间星点及地景实际非空。日减箭头保持两秒，2026-10-21 → 10-06，20:18:38。显示模式字段 `DAY` 不是太阳在地平线上方的证据。该运行与 r18/r19 的旧日期并非严格缓存／天象匹配对照。

- 15 个 intent，9 个不同 instant 首次 accepted，其中 4 个已经晚于后续 intent。首次 accepted 的 wall elapsed 118–203 ms，p50 151 ms；不能只报其余 5 个未被取代样本。
- 15 次实际 geometry 调用，4 个 abort／reject，11 个 validated，9 个 current hook assignment。24 次已保留 preparation 中 9 个消费、15 个未消费；未消费的**已知**成本只有 1 ms，14 个低于分辨率。仍没有理由搬迁 preparation owner。
- 45 次实际 paint／native ready copy，实际提交 BSC 255,855 星点、SAO 3,988 星点；accepted pick 对象分别 212,756／1,910。不是空负载，未见 failed frame／invalidation。
- 原 draw 45 次均有有效 wall elapsed，23–55 ms，p50 30、p95 40，已知 subtotal 1,397 ms。新的 drawCosts 边界合计 1,396 ms；两个独立计时边界的 1 ms 差不被修正或合并。

|实际 paint 分类|paint|draw 已知 ms|starTraversal 有效／观测，已知 ms|submit 有效／观测，已知 ms|
|---|---:|---:|---:|---:|
|包含输入／资源 effect|22|719|40／44，404|64／1,017，202|
|只有 continuation|23|677|45／46，355|57／1,060，195|

没有 unbound、nested paint 或 unknown 分类。遍历的 5 个 unknown 都是低于分辨率；submit 有 **1,956 个低于分辨率调用**，不能当作免费。三个阶段是 inclusive wall elapsed；submit 可在第一颗星 flush 前一图元时嵌入遍历，全部位于 draw 内，**不能相加、相减成精确互斥 CPU 分解，或换算 GPU／物理 FPS**。这些读数已足以选择实际星点遍历作为修复责任，并不证明 submit 不重要。

paint 原因分别为 effect 9、stars 11、effect+stars 9、stars+names 6、effect+stars+names 4、images 6。最后一份 preparation 被实际绘制 14 次，原因环中有相同 intent/preparation 的 star/name/image 续帧及 effect。它证明有可调查的重复输入，并不直接给出完整精确视图／源身份的缓存命中率。

原片实际 10.022878 秒。复用现有离线 Edge 解码脚本，查看前后全幅及五个有用视频样本：media 2.473611／2.922500／3.464122／3.987789／4.987467 秒分别见请求日期 10/19、10/15、10/11、10/07、10/06，星图有中间位置变化，最后为 10/06 预览。跨日期时下方反馈只显示时分秒，不能从它读出正在显示哪一天；稀疏抽帧不认证整体流畅或全部会话无退出。视频媒体时间没有硬配到 collector 时钟。

## 已有复用在哪里停止

`sky-stellar-transform.ts` 已在精确时刻内惰性保留方向、水平角和高度透射；`sky-stellar-scene.ts` 每 Scene 一个当前 frame，SAO 每真实 tile 一个当前 transform。`sky-scene-render.ts` 每次 draw 仍重新做屏幕投影、appearance、构造原始星点、transition 快照、点选／名称和顶点。相同 exact-time 的名称／图片／星点续帧仍走这些步骤。45° 正常 CPU 的 `forEachProjected` 子树已有真实归因；不能把旧比例直接套到这次 264°，但不需要重新验证这个责任是否真实执行。

`sky-star-transition.ts` 已按当前 Context/mode、层 publication 及 accepted state 保存 live opacity，160 ms 过程中有真实中间值。新时刻使用新坐标，旧时刻退出星点不能残留；失败的 copy 不推进状态。因此不能删 continuation，也不应把已接受 point 改成可就地覆盖的跨帧池。`sky-gpu-renderer.ts` 已复用颜色表和固定 quad；动态 Float32 打包／GL submission 保持真实执行。当前没有证据支持另加 typed-array 池或跳过提交。

## 一次局部比较的结果与限制

[task-only 脚本](scripts/r20-star-draw-local-check.mts) 直接提取当前 Scene 的 BSC+SAO 画点块，复用生产 transform、appearance、transition 和选择契约。BSC v3 全 8,404 行及原 SAO v2 实际选中 tiles 都经原准入／字节／哈希核对；站点和日期沿用既有 R17 fixture 约定，另用本次尺寸/FOV及天顶视图、固定夜间太阳高度。**这是限定局部计算，不是同一个手机画面的重放。** 未造另一份星表或 reduced sky。

候选只保留一份当前准备列表，元素为尚未加入渐变的 star 与精确 screen projection；每帧重走原 transition、opacity 阈值、pick/name 和 Float32 emission。八组所测 view/mode/solar/center/reduced-motion/paused 情况共 48 帧逐项完全相同，包括 190,272 次星点输出、152,809 个 BSC pick、1,636 个 SAO pick 和 2,529 个 named 输出；包括未 commit 的中间帧。它不替代真实 Scene 之后的遮挡、独立 invalidation 或 Canvas 退休检查。

计时使用 Node v24.16.0，每种情形三个预热 block 后做 12 组交替先后顺序的配对，没有强制 GC。文件、准入和 job 建立在计时外，保留实际惰性初次星点计算；两侧各用独立模型／tile 对象。每组是 12 个真实时刻，不是 12 次相同缓存调用。

|局部情形|baseline block 中位|candidate block 中位|配对下降中位|配对下降范围|
|---|---:|---:|---:|---:|
|每 paint 都换精确时刻，12 paints|195.22 ms|184.88 ms|9.92%|−8.41%～18.54%|
|每新时刻再画四个同输入续帧，60 paints|606.61 ms|448.77 ms|26.04%|14.28%～34.48%|

第二行包含首次准备，不只报缓存命中；它支持进入这个局部实现。第一行无命中且配对有正有负，函数拆分形态／主机 JIT 和噪声均可能影响读数，**不声称新时刻计算也获得缓存收益**。这些是星点块及受控打包 surface 的主机 elapsed，未测整个 Scene、React、native copy 或 GL；该 surface 的 RGB 表每 draw 重建，与生产的颜色表生命周期不同，但两侧一致。不能将 26% 乘手机 subtotal 预测收益。

原计时脚本及原结果保存在私有目录；随后仅增 BSC/SAO 非空消费者计数并跑 `--equality-only`，没有为更好性能数字重跑计时。相关八份生产源码均与 r20 manifest 的 production binding 完全相同，前后 hash 未变。

## 唯一下一实现责任

在当前 `drawSkyScene` 所属的 Canvas 生命周期内增加**一份当前精确星点准备**，把现有“projection／appearance／原始星点”与后面的“transition／draw／pick”分开。先用原循环建立，命中时只省掉前半段。不要放到每个 report／tile 的 WeakMap，不建立历史时刻 Map，也不改时间、资源供给、accepted writer 或加入额外 RAF。

实施时必须保持：

1. 键覆盖当前 Context/Canvas generation、真实 admitted BSC catalog 和 exact frame、当前 SAO frame／geometry／publication／到达集合，以及**精确数值** basis、width/height、FOV、有效 center、mode 与太阳高度／缺失。不能按日期或舍入视图复用；mutable／legacy 未资格输入继续原 uncached 路径。两层的身份和独立失效仍可分别处理。
2. 渐变的 `prepare/point/exits`、成功 copy 后 commit、pick/name 的当前 opacity 阈值、body／landscape 最后过滤，以及原 vertices／GL submission 都继续逐帧执行。准备完成没有 accepted、source 或 pixel credit。
3. 输入失效／缺层撤销对应准备；miss 先放掉旧 key，构造失败不能让旧 A 在 A→B→A 路径悄悄复活。hide/suspend、Context 与 Canvas 替换、unmount 沿原清理入口释放；拒绝或迟到 copy 不推进 transition。
4. 用现有真实消费者检查独立的相机／center／FOV／mode／太阳／源／SAO arrival invalidation、时间 A→B→A、失败/隐藏/退休，并独审。整合后通过现有 r20 计量做匹配全天空夜间长按与正常 Play 观察，不再建同层级 profiler。

这个候选在局部例中额外保留最多 **6,265 条 star+projection**、一份当前列表；reset 后该候选引用为零。它确实增加当前工作集，不能隐去；该数量不是 heap 字节、弱引用可收集性或无泄漏证明。优先把它限制在唯一当前 Canvas，避免额外数组随 report 历史一同存活。正常动态每帧换时刻可能没有命中，仍需检查 miss 的额外成本。

**B 仍未解释。** 该修复不处理 r13 的强保留根／native allocation failure，不把 WeakMap 的环当成泄漏，也不替代仍需恢复的 Memory/retainer 与正常播放 drain 证据。跨日供给等待、全部六字段极限跟随、正常 Play 和三层的整体验收均保持未完成。

四份必要原件共 **2,401,071 B** 已复制到私有 `r20-draw-cost/review` 并逐份 SHA-256 读回；冻结源码复用 r20 目录，局部检查只引用已恢复的原 BSC/SAO 输入。全部仅本机保存。
