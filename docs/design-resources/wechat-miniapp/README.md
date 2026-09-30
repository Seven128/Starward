# 微信小程序当前设计资源

> **2026-09-23：本次 8 个 Stitch 旧版本项目已删除。** 当前完整采用源仍从下面各页 `ADOPTED.md` 进入；历史生成记录及残留项目 ID 只作来源身份，不能作为续改基线。删除范围和现行入口见 [Stitch 资源状态](stitch-status.md)。

当前跨页待审的其他范围从 [09-23 Stitch 项目](https://stitch.withgoogle.com/projects/7144519510537620825) 与[统一交互审阅入口](shared/comfortable-scale-2026-09-22/review.html)进入。旧 Stitch 项目或历史生成记录不作为续改入口；其他待审稿未自动替代下方各页采用源。

当前跨场景采用资源：[共享 Info 提醒与“暂无数据”](shared/notification-and-empty-2026-09-23/README.md)，对应 Stitch 第 08 画板和本地可编辑 HTML/CSS；仅控制所声明的日间视觉范围，各页其余采用内容保持有效。

2026-09-24 生产核查纠正了上一轮“整体设计补开发已完成”的表述：Map/Search、正式点位、我的、设置、计划列表/详情/编辑、共享地点资料表单和天文事件目录的阅读尺度已按确认的舒适方向局部迁移；三档边界动效和共享空态也按生产使用处修复。舒适尺度整组、成就/分享、公共动效等候选仍待逐页视觉审阅，局部生产选择不等于整包采用。官方模拟器证据只覆盖实际操作的视口和状态；云观星内部本轮按需求排除。

业务与交互语义由project_context的Screen Contract负责，视觉规则由DESIGN.md负责；下面是每页唯一采用入口。采用不证明生产代码、真实服务或真机验证完成。

- [地图、三档信息组件、图层、新增观星点](map/ADOPTED.md)
- [搜索](search/ADOPTED.md)
- [我的](my/ADOPTED.md)
- [观星点反馈与统一编辑表单](feedback/ADOPTED.md)
- [观星计划](plan/ADOPTED.md)
- [天文事件](events/ADOPTED.md)
- [观星点创建与反馈](contributions/ADOPTED.md)
- [设置](settings/ADOPTED.md)
- [云观星](sky/ADOPTED.md)

shared保留真正共用的观星点卡片和日期时间控件。采用包内raw/provenance是来源证据，不是另一份当前UI。Map仍使用的原中档外部布局参考属于明确保留范围，不按文件日期误删。旧miniapp-*导出目录已全移除，本轮清单见legacy-removal-20260909.json（仅记录相对路径/字节）。
