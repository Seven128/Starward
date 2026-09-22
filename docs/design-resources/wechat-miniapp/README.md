# 微信小程序当前设计资源

> **2026-09-22：Stitch 历史项目已隔离，禁止直接作为迭代基线。** 旧生成页面与不同时期的静态索引混存，项目名曾标“已采用”不代表其中每张画板都是当前版本。当前完整源只从下面各页 `ADOPTED.md` 进入；Stitch 隔离范围和后续使用边界见 [Stitch 资源状态](stitch-status.md)。

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
