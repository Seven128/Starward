# 选定依据与最终 QA

## 选择结论

选定 12 份 Open Design HTML 资源作为“今晚去观星”微信小程序 V1 设计资源套件。选择依据是：覆盖两份 V2.0 方案和全部已接受的 MAP/SPOT/NIGHT/MY 需求变更；服从 `Soft Instruments v1`；完成跨资源一致性修复；并通过独立的多视口、交互、无障碍和静态语义检查。

该套件是 `constraint` 类型的实现约束来源，不是生产微信小程序的 `exact-target`。它不声明运行时像素一致性、第三方平台接口可用性、天文计算真值、真实点位数据或生产无障碍验收。

## 冻结资源清单

| ID | 选定文件 | 字节 | SHA-256 |
|---|---|---:|---|
| APP-01 | `artifacts/app-01-flow-route-map.html` | 47,216 | `6BAE53ABB1182F7ED88402A677996EB45902331F5B8D40B9EEA1F3ECE01498EA` |
| APP-02 | `artifacts/app-02-spot-detail-prototype.html` | 665,614 | `38AD5BBAFBCEC0FB3F0FCCD70828758E3680EF50BEAA0E70C9422664634FA414` |
| APP-03 | `artifacts/app-03-spot-night-prototype.html` | 56,980 | `BA24315112FB385AD61602FE0436829F2F92C3C681B418010859519C08103CE0` |
| APP-04 | `artifacts/app-04-my-content-prototype.html` | 108,759 | `34AF973CD4ECE4AD000DA63FC456F0F6F4E57C93A0F27F6A5BCF3EB16CD2E59C` |
| APP-05 | `artifacts/app-05-shared-component-control-atlas.html` | 955,293 | `FE9674EB2A304BA0A530045F194DB1B9217171AA3EDABAB62D701BBA76FC9D44` |
| APP-06 | `artifacts/app-06-cross-app-interaction-motion-accessibility.html` | 369,691 | `C3B827B8700A21F3D04A5079E91F78187615DDF7E50AA9818517C491D1478615` |
| APP-07 | `artifacts/app-07-responsive-mode-state-matrix.html` | 305,027 | `B043C46AE6DBDE8D83D1AE1E7A12CCD80BB781F02D81AA5DC7D5B6E255108319` |
| APP-08 | `artifacts/app-08-semantic-asset-atlas.html` | 53,400 | `09FE77BC7D6F52A84FEA96FAFC8D85ADC1AB976FC5F43B58B16C50458BAD8534` |
| MAP-01 | `artifacts/map-01-page-prototype.html` | 78,167 | `F079FA7D4FF5277E89EE2FA75413CF9471D52D2BD64DA2793D9F6908293D32D2` |
| MAP-02 | `artifacts/map-02-page-anatomy.html` | 42,860 | `CA8F635966A7827CF914985132D13B52857D36E25529C70559A42E4BBDE12F9F` |
| MAP-03 | `artifacts/map-03-component-control-atlas.html` | 60,577 | `27A25286F48D8A8746F98849CB8FA602A0D18610D6AE24B1E88090C90CC14CC0` |
| MAP-04 | `artifacts/map-04-interaction-motion-accessibility.html` | 59,563 | `60263D4D398299CCDECDA8AA2E81AB2C511082D01F3AD23B6B6D51DFD95ED198` |

对应 `metadata/*.artifact.json` 保留 Open Design 生成时的 provider provenance；其中原始 `entry` 名称是生成端文件名，不是本选定包的重命名定位符。

## 生成与修复证据

- APP-01—APP-04 生成 run：`053f8cb4-43c8-4eb7-a518-26b894d06193`，成功。
- MAP-01—MAP-04 生成 run：`0f1ba422-9844-419b-aa59-f022c8b82986`，成功。
- APP-05—APP-08 生成 run：`efa214cb-d7bd-4d54-b031-28abd442d1ef`，成功。
- 最终一致性修复 run：`2039ada0-c911-4396-87a8-d2008392cba6`，`exit 0`、无未完成工作；修复 APP-02 代表媒体图库导致整机页面横向滚动的问题，并复核 APP-01—APP-06。
- 生成模型：`gpt-5.6-sol`，reasoning effort `xhigh`。
- Open Design：`0.16.1`；完整产品 conversation `92c8ae92-241e-492a-95f7-d0666ce30e3d`；地图 conversation `37c11529-9de5-4c4b-8f74-dd5152263492`。

## 独立审计结果

- 12 份资源 × 320/375/430 px，共 36 个视口检查行：无 document 横向溢出、无重复 ID、无外部运行时依赖、无坏图、无可见小于 44 px 的交互目标、无控制台错误。
- MAP-01：入口明确显示“筛选”与已应用数量；27 个选项全部分组平铺，无下拉/折叠；取消、应用、重置与草稿隔离均通过。
- APP-02：详情顺序为“概览 / 攻略 / 场地 / 夜空”；概览最前是带来源/授权的真实星空代表媒体；攻略有图片位；夜空绑定 `spot_id` 并包含今晚推荐目标。
- APP-03：不存在全局夜空入口；必须有正式观星点上下文；示例与计算/时区边界明确。
- APP-04：四个标签等宽且无原生滚动条；大字号 320 px 下为 2×2；移除首页观测计划摘要卡和官方示例文章；个人主页链接、复制回退、能力门禁、手工导入、可编辑草稿、点位关联/提案与审核分离均通过。
- APP-05/06：五个今晚目标的组件/状态与选中、焦点恢复、live-region 播报通过。
- 静态语义扫描确认 4 份地图资源都包含 27 个精确显示标签，且没有 accordion/dropdown/`aria-expanded`；跨资源不存在独立夜空路由残留。

## 媒体来源边界

代表媒体使用资源内嵌的真实星空照片并保留来源、作者和许可：Wikimedia `Orion constellation.jpg`（Taavi Niittee，CC0）、`Milky Way Night Sky (Unsplash).jpg`（Guillaume guillaume，CC0）、`Star trails (33247004142).jpg`（hannahisabelnic，CC0）。这些图片是代表媒体，不冒充某个观星点的现场实拍。
