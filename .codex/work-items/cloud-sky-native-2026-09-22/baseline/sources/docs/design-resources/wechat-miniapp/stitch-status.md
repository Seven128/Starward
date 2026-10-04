# Stitch 资源状态

2026-09-22，按用户“删掉或者隔离旧生成页面”的要求，采用**项目级隔离**。以下八个项目均在官方 Stitch 界面更名并读回确认。项目中既有旧生成页面，也有不同日期的静态参考，因此整体退出当前迭代入口；没有删除其中的必要来源或覆盖仓库采用资源。

| 隔离后的 Stitch 项目 | 当前仓库入口 |
| --- | --- |
| [隔离历史稿｜禁止迭代｜地图与观星点反馈](https://stitch.withgoogle.com/projects/13338420663663046308) | [地图](map/ADOPTED.md)、[反馈](feedback/ADOPTED.md)、[创建与反馈](contributions/ADOPTED.md) |
| [隔离历史稿｜禁止迭代｜观星计划与天文事件](https://stitch.withgoogle.com/projects/1643718854829580633) | [计划](plan/ADOPTED.md)、[事件](events/ADOPTED.md)、[共享事件Modal](shared/astronomical-event-modal/README.md) |
| [隔离历史稿｜禁止迭代｜云观星](https://stitch.withgoogle.com/projects/13823253487989500123) | [云观星](sky/ADOPTED.md) |
| [隔离历史稿｜禁止迭代｜搜索](https://stitch.withgoogle.com/projects/5585184579244766246) | [搜索](search/ADOPTED.md) |
| [隔离历史稿｜禁止迭代｜我的](https://stitch.withgoogle.com/projects/11944978164995734673) | [我的](my/ADOPTED.md) |
| [隔离历史稿｜禁止迭代｜新增观星点](https://stitch.withgoogle.com/projects/14368046726515999361) | [地图采用入口中的新增观星点范围](map/ADOPTED.md) |
| [隔离历史稿｜禁止迭代｜图层组件](https://stitch.withgoogle.com/projects/12200684196471900162) | [地图采用入口中的图层范围](map/ADOPTED.md) |
| [隔离历史稿｜禁止迭代｜观星点信息组件](https://stitch.withgoogle.com/projects/587088532668047776) | [地图完整增量源](map/revisions/three-requirements-2026-09-13/README.md) |

## 隔离如何生效

- Stitch 项目标题统一使用“隔离历史稿｜禁止迭代”；其内部旧“采用版”“当前参考”标题和历史对话均不再构成当前性证明。地图项目内“新增提案审核中态”另加画板级隔离标记。没有声称逐张删除或逐张改名。
- 本地旧生成导出 `raw/`、`provenance/`、`stitch-feedback-*` 只保留来源身份，由资源总入口和各页采用入口的醒目提示明确隔离，不再作为整页设计起点。源路径不搬动，以保全当前完整预览的真实依赖及引用；不新增或修改 AGENTS.md 来管理资源状态。
- 当前 `ADOPTED.md` 及其明确引用的可编辑预览、状态变体、公共组件和图标依然有效。尤其 `map/candidates/context-audit-2026-09-09` 是当前增量源的必要依赖，不能按文件夹名认定废案。
- 旧项目中的静态图片只能说明当时的画面，不能代表当前完整 HTML/CSS/JS 或最新业务交互。历史同步记录保留其日期事实，当前状态由本文件覆盖。

## 后续尺寸迭代入口

从 [资源总入口](README.md) → 页面 `ADOPTED.md` → 最新完整源及必要依赖开始，实际打开相应状态，再把当前画面与 [B批3D拟物磨砂图标](shared/icons/ADOPTED.md) 带入新的 Stitch 工作。不得直接续改隔离项目里的旧生成页面。新稿只有经核对并明确采用后才能替代当前入口；本次隔离没有采用新视觉。

观星点仍是三档抽屉，保持原 Tab、原完整内容、拖动与底部动作。本轮只授权尺寸、留白和圆润程度调整。最新完整资源重新同步到 Stitch 的工作尚未完成；隔离不能被表述为两端已完全一致。
