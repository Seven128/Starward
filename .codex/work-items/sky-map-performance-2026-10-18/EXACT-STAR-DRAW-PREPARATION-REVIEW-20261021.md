# 精确星点绘制准备独立审查

2026-10-21。**本次生产改动未发现 P1/P2，可进入匹配手机观察。** 这不是性能收益或无泄漏验收。当前实现增加了一份当前视图的星点工作集；普通 Play 每个精确时刻都不命中时，仍需要观察新增分配及完整 draw 成本。不得把旧局部主机计时当作新手机结果。

本审查独立阅读实现说明、r20 成本结论、11 个绑定文件及真实调用者，核对全部 SHA-256；比对冻结 r20 源码，区分其 task probe 与生产差异。没有修改生产、观测适配、手机、IDE、服务、构建、提交或上传。具体绑定、独立执行结果和限制见 [JSON](EXACT-STAR-DRAW-PREPARATION-REVIEW-20261021.json)。作者的 102 个用例摘要没有作为独立通过证据。

## 责任与正确性

- **唯一当前所有权成立。** `SpotSkyPage` 创建一个 `starDrawing`，真实 renderer 对象进入精确视图键。对象内仅有当前 `key`、当前 BSC 列表和当前 SAO 列表；没有按时间、report 或 tile 存储新绘制列表的历史 Map。新 view 在构造前清掉两层；独立 source/frame 改变或撤销只清对应层；构造/消费异常清两层。原 `currentFrames` 和 tile transform WeakMap 是既有责任，新 WeakSet 只标记资格，不强保留源历史。
- **键覆盖实际准备依赖。** renderer、Context 对象及其版本字段、精确时间、basis 的九个分量、尺寸、FOV、有效中心、模式、太阳高度/缺失，加上每层真实 source/frame identity。投影和 appearance 依赖均覆盖，没有数值量化。Context 或源在同一时刻变化不会仅凭时间字符串命中。
- **资格不是“冻结即可信”。** BSC 必须是原 transport 准入 publication 和由其创建的 catalog，geometry 经原 observer/time/catalog 合同校验，且本体/observer/matrix 均不可变。SAO 必须由实际 index/tile 准入 owner 标记，并保持 publication/geometry 绑定。深冻结但未准入的复制品仍走原直接 build 路径。mutable/legacy 不新增绘制列表保留。
- **真实源替换修正与本改动相容。** 原单帧 memo 现在同时检查 catalog/publication/geometry 和 observer 数值；先撤旧再验证新。transform 的惰性闭包捕获当前局部源，避免后续 scene 字段变化污染旧 frame。
- **绘制/接受责任未迁移。** 复用前半段 projection/appearance/raw star 后，每次 paint 仍执行 transition `point/exits`、当前 opacity 的 pick/name、天体和地景最终过滤以及实际 surface submission。transition 的脱离输入副本及原成功 copy 后 commit 路径未改；缓存命中、构造完成都不产生 accepted/source/pixel credit。
- **生命周期清理接入真实入口。** `suspended`、`invalidated`、`releaseContext` 和缺失 data/basis 均 reset；Canvas 生命周期异常先 fence、退休，再报告失败。renderer 替换也由键拒绝旧准备。释放 native 对象失败不阻止这里先清引用，但这不证明 native/GPU 已释放。

`presentSkyTime` 只冻结刚创建的当前 geometry。独立使用真实 time fixture 核实：原 geometry、本来未冻结的 observer/matrix 均保持原值与未冻结状态；新 geometry 和两个子对象均与旧对象分离且冻结。未发现改变旧报告合同或现有 SAO 消费者依赖可变 aggregate 的情况。

## 独立执行

复用已保存的冻结 r20 **完整 `drawSkyScene`** 入口，在内存中执行，原 probe wrappers 只做无副作用透传；候选使用当前生产入口。两侧共享当前解析依赖，因此它核验完整 Scene 绘制差异，不独立证明旧解析器所有行为。真实全量 BSC 8,404 行、超过 100 个实际选中 SAO tiles 经原准入，断言非空星点/点选/名称。

选取 4 个能影响判断的已有完整入口：同输入续帧、独立来源到达/撤销和同时间换 geometry、mutable/legacy 与构造失败后的 A→B→A、实际页面清理/拒绝 copy。全部通过。输出比较覆盖完整 surface commands、pick/name 和 animating 状态；未提交帧也在比较内。

另外 3 个独立反例全部通过：

1. 保留同一 scene 并改 observer 经度，使旧 geometry 不再匹配；resolver 返回不可用。恢复原经度后产生新 frame，没有复活旧 memo。
2. 深冻结真实 SAO index/tile 的未准入复制品；其 aggregate 不取得复用资格，两次 paint 均重新 build，完整输出仍等于冻结入口。
3. 已准入 SAO → 未资格 mutable SAO → 原已准入 SAO；对应层重建，BSC 仍只构造一次，没有旧 SAO 列表跨撤销保留。

以上 7/7 通过；另独立运行 fractional-time 实际几何用例 1/1，并执行上述新 geometry 所有权反例。共 9 项本次独立检查，没有重跑作者全部矩阵，没有为更好数字重做性能试验。详细结果和当前输入身份保留在 JSON。

## 必须保留的限制

普通 Play 不命中时，生产候选会为可见星点额外建立 `Point {star, projection}` 和数组，再 replay；旧流式路径没有这些包装的跨 paint 保留。列表数量有界不代表分配免费；新的 key 数组和资格检查也有成本。BSC/SAO 当前源及原 transition/transform 另有自己的保留，不能把“两个列表”称作全页面总内存上限。

r21 的遍历 span 应覆盖 **build/cache lookup + replay**，SAO 还应包括原 exits；仅包 builder 会把命中时真实 transition/submit 从成本中漏掉。这是接口核查，本审查没有修改或认证另一个代理正在做的 task 适配。

下一步沿原 PLAN 对匹配全天空夜间长按和正常 Play 做现有手机观察，检查实际 nonempty 工作、完整成本和交互结果。r13 强保留根/native allocation failure、正常播放 drain、所有六字段极限跟随和三类叠层的整体验收仍未完成。本审查不替代必要 Memory/retainer 或真实 native/GPU 证据，也不完成 Goal。
