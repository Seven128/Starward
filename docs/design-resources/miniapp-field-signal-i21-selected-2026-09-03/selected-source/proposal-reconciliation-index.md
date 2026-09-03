# I21 需求与所选资源对账

本文件一次性对账用户本轮 11 项、Contribution 表单补充与成熟组件库 reuse-first 补充。全部接受项已经先进入 owning Context / DESIGN，再进入同一 current Open Design project；没有新的 visible decision。

1. spot panel 三档保留同一 objective document，仅 extent 裁剪；合法媒体是 medium→large 的唯一 presentation 例外。
2. action rail 缩短；普通缺失值统一为“暂无数据”。
3. section rail 两项与容器上下贴紧、无阴影、垂直居中且不占内容宽度。
4. Curved Time Ruler 上移、无箭头/外框并真实可拖；滚动物理由 Taro enhanced ScrollView 复用。
5. Search 文字/框架静止，suggestion/filter/partition 节奏紧凑且密而不挤。
6. medium→large 先拉出媒体，接近顶端再淡出 Search/Location/Layer。
7. 只有 104×40rpx handle rectangle 启动拖动；无媒体保留 40rpx band，有媒体时连续收起。
8. spot panel 与 layer sheet 共用单一 bottomPresentation enum，任何时刻只呈现一个。
9. active 采用极浅 sky-soft，几何不跳。
10. Settings 使用一个 day/night/observation 三站可点/可拖/可访问控件。
11. My 只丰富既有职责，使用统一彩色 SemanticIcon tile 与紧凑行节奏。
12. Contribution 重新组织为单一紧凑表单文档，覆盖双入口 context、条件位置、媒体、权利、校验、恢复、幂等提交与待审核终态。
13. 通用组件按成熟开源组件 reuse-first：优先 Taroify；每项显式记录 library / component / Starward adaptation；不复制品牌、不并行两套 suite、不让组件库接管业务状态。

可编辑上游仍是 current Open Design project + owning Context/DESIGN。后续修改必须发布新的 immutable selected version，不能覆盖本目录。
