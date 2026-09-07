# 覆盖图原节点修复

已查看真实430地图、320长文地图、风险页PNG并读取同轮JSON。只修改以下覆盖root，核心A/B与其他覆盖图不动。脚本不自动运行、不调用buildDesign、不替换root，不删除节点。

| 真实root | 原节点与问题 | 最小修改 |
| --- | --- | --- |
| 1:8613，430 medium | 外部地图1:8616只有390×480，x20，两侧白边；viewport1:8615为430×666，实际可见地图为y88–330 | 以当前可见430×242区域计算等比例cover，scale430/390；保持原图IMAGE paint不变，以源(195,209)为焦点裁切，marker1:8617随同一映射，屏上锚点不漂移。非等比拉伸和调色均不发生 |
| 1:8002，320 long-text | 文档viewport1:8055屏上y368/h324；操作行1:8082从y684开始，露出顶部8px | viewport高324→316，结束于完整操作行之前；同文档与操作行保留，字号不变，medium仍NONE滚动 |
| 1:7330，risk | Freshness在y721，超出首屏；气温/风速却在y634–679可见 | 修改原风险说明1:7401为“暂不能进入。天气为20:40缓存，请核实。”；1:7442/1:7445分别为“气温 · 缓存”“风速 · 缓存”。预期维持原行高；大档VERTICAL滚动与天气重试不动 |

## 执行保护与输出

调用方加载公共helper并根据本次实际浏览器URL执行新鲜attestation，再从原始 `sizes/boards.json`、`map/boards.json`、`themes/boards.json`、`components/boards.json` 取本脚本列出的七个id的**完整fingerprint字符串**，构造 `expectedFingerprints[id] = board.fingerprint`。调用 `fixCoverageReadback({fileKey,expectedFingerprints,revision:'coverage-readback-r1'})`。不能把当前读到的live fingerprint回填作为原始期望；漂移时脚本拒绝修改，必须先调查。

脚本先核对全部rootId、owner、完整原始fingerprint、节点归属和预期scroll，再载入实际文字字体，重新核对后才修改。未把主任务现有手工改动当可覆盖内容。普通Plugin API不提供事务：异常可能留下部分已修改节点，须检查返回/当前节点，不可直接覆盖或盲重跑。

默认 exportChanged=false，仅返回各root的新fingerprint、变更审计、metadata以及实际读回的overflowDirection和clipsContent，供主任务把原24root统一补导到 evidence-r1。传 exportChanged=true 时也可返回真实PNG bytes和同轮snapshot。保留所有原图。metadata控件裁切结果重新计算；它仍不代替兄弟遮挡和视觉回看。脚本未运行，当前仅 `node --check` 通过。

## 同批独立检查补正

- themes观测我的 root1:6434，向量1:6469在Contribution heading/Icon/images内仍为#282b29；只把该原向量fill改为当前观测text-primary #ff6b58。已扫描真实三张观测主题/组件JSON，仅这一向量命中原灰色；没有改照片或OSM，也没有扩大其他配色重做。
- 实际查看三张组件状态PNG，已选星仍空心。day root1:8918的selected专用master1:8966/Vector1:8968与instance1:8970；night对应1:9000/1:9048/1:9050/1:9052；observation对应1:9082/1:9130/1:9132/1:9134。只给selected专用master与其实例星填充当前DESIGN favorite-fill/favorite-stroke：day #f2c94c/#6f5500，night #f6d56f/#ffe5a0，observation #d84a3c/#ff6b58。不是把所有star一起染色。
- 补丁在修改前保存非selected的default/pressed/disabled/loading组件及实例指纹，修改后逐一核对不变，避免跨状态影响。selected实例绑定必须仍指向该专用master，任何漂移均停止。

## 图片与返回语义

large-photo root1:6928保持原fingerprint与IMAGE，首次图片白由主任务补导相同画布排查，不在此脚本改图或重建。

当前map-and-finder.md明确：大档左边缘向右Back手势为large→medium；把手的键盘/辅助increment/decrement提供非手势替代；把手tap/sub-threshold release是no-op。正文不启动拖档，回到medium保留正式点、章节与有效scroll状态。spot-and-sky.md明确章节激活在small/medium先展开large，再在同一文档定位。不存在必须新增可见“返回中档”按钮或另一条产品路由的授权。

现有Figma覆盖稿只有静态状态与节点，不证明上述键盘、辅助操作、系统/边缘Back、连续拖动、中断与焦点恢复已经演示。此项应标**规格已补，真实原型/运行未验证**。本次不把tap把手绑定成切档，也不制造新路径。后续真实实现应给把手可调角色、当前档位及明确增减名称，decrement从large提交medium；取消维持原档位；reduced motion保留同一状态结果。
