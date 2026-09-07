# 当前代码适配

研究 HEAD `424c971…` → 执行 HEAD `d0c77b6…`，295 文件改变。本任务不回退、不覆盖初始未跟踪工作。附件三份原文保存，以下是本次采用的适配而非篡改原文。

| 原方案假设 | 当前事实 | 本轮执行调整 |
| --- | --- | --- |
| 旧小字号、88rpx需提出扩大候选 | DESIGN 已增加唯一 JSON tokens：body15/22、action14/20、search16/23、spot-title20/28；target-min44logical-px | 起步直接使用当前值；候选只记录相对当前 JSON 的局部差异，不重新投射旧10–12px；Taro750与Px编译另由运行器验证 |
| Open Design 是当前编辑上游，绑定检查仍在 | Context/Screen Contract 已移除原型/资源门禁；selected-design-bindings文件和命令已删除 | Figma只是本次明确要求的候选媒介，不复活旧工作流。根 DESIGN仍唯一视觉值 owner |
| 200% 文本为必测 | 现行 DESIGN、shared-state owner 明确暂停大字适配 | 320长中文/长值标准字号必测；200% 单列资源探索，生产不恢复大字工作 |
| 旧面板组织可参考 | 当前身份下左对齐吸顶概览/天文定位，一份文档；天文中无星图/推荐窗口/出发结论 | 候选完整保留这些职责；客观值与来源/风险按当前顺序 |
| 我的代码可能滞后 | 当前仍为账户卡+双列计划贡献+设置列表行，与合同紧凑头部单一gear有视觉偏差；新增按日期选择计划及鉴权/缓存/刷新/导航恢复 | 记录实现与应有职责差异，候选按合同组织；真实计划标题源于 plan-entry.ts；不制造0或成功状态 |
| 原生App Source Plan可借鉴 | docs/source-plan.md开头明确原生App；小程序独立 | 只读小程序Screen Contract及其子节点，不恢复App三主入口、旧详情、收藏夹 |

已读取相关 source owner、小程序 tokens、map/spot-panel/time-ruler/my/plan-entry、当前图标/主题/导航入口与验证Context。当前真实 WEAPP 截图尚未取得；代码不是渲染证据。新Figma探针是资源工具测试，不是页面生产验收。
