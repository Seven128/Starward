# 本轮实施恢复索引

**新对话从[继续开发说明](CONTINUE.md)开始：先实际跑通人工卡点，继承无人值守操作授权，再恢复完整产品修复。** 本次交接未重跑设备预检。

**当前结论已更正：原“完整完成”撤回。** 用户真机反馈及源码复查发现新旧图标叠加和地图工具active方形背景；产品修复按用户要求暂停，当前仅处理交付质量治理。恢复时先读`progress.md`和`coverage.md`顶部更正，不能沿用历史Goal complete作为产品验收。治理修改与实证见[治理续修](../../../.codex/work-items/development-quality-drift-2026-09-12/follow-up-2026-09-13.md)。

Goal：完整实施 `docs/requirements/miniapp-uiux-alignment-2026-09-13.md`。用户明确要求实际修复、真实 WEAPP 验证、记录未验证边界，不运行长程任务工作流自举。直接在 main 工作，保留已有修改。不自动发布、购买或改 Native/运营后台。

## 压缩后恢复顺序

1. 本文件与 `progress.md`（当前工作、检查和下一步）。
2. 原始完整需求 `../../requirements/miniapp-uiux-alignment-2026-09-13.md`，本目录 `requirements-snapshot.md` 是启动时逐字快照，**相对链接仍按原说明目录解析**。
3. `coverage.md` 全量要求、跨页面核对与证据清单；不得把待查视为已完成。
4. 按当前工作读取权威 owner、采用资源与实际代码。源码和运行结果才证明实现。

## 权威入口（全部相对仓库根）

- AGENTS.md、project_context/global.md、project_context/context.toml（schema 5，仅 global 为默认正文）、DESIGN.md 的 WeChat Mini Program 章节。
- project_context/areas/main/screen-contracts/wechat-miniapp.md 及同名目录的 information-design.md、surfaces-and-controls.md、map-and-finder.md、spot-and-sky.md、shared-state-and-recovery.md。
- project_context/architecture.md、architecture/runtime-and-domain.md、architecture/maintenance-boundaries.md。
- project_context/development-workflow.md 及同名目录的 authority-and-scope、development-feedback、candidate-acceptance、paths-and-lifecycle、change-admission。
- project_context/areas/main/implementation-index.md、verification.md、verification/wechat-device.md 及其所需子 owner。
- project_context/context-maintenance.md（采用资源、共享职责、生命周期）、product-profile.md。
- docs/design-resources/wechat-miniapp/{map,plan,events,search,my,sky,feedback}/ADOPTED.md；shared/icons/ADOPTED.md 与 application-review.md；shared/tabs/README.md；shared/astronomical-event-modal/README.md、review.html、modal.mjs；map/revisions/three-requirements-2026-09-13/README.md、plan/revisions/three-requirements-2026-09-13/README.md。
- 本轮资源源值/依赖/manifest 是实际实施输入；review 服务：node .codex/work-items/three-requirements-2026-09-13/serve.mjs，http://127.0.0.1:4178/shared/astronomical-event-modal/review.html。浏览器原型不证明 WEAPP。

## 执行次序

1. 读 owner 和采用源，视觉查看；建立生产消费者与状态/服务边界差异。
2. 先完成共享职责的代表性真实 WEAPP 结果，再迁移消费者：SemanticAsset B 图标、公共 Tab、共享事件 Modal。高影响共享复用/大交付遵守项目独立审查要求。
3. 在原管道/契约/BFF/客户端接入真实地形及地图叠加；验证数据样本、坐标、缺测、请求/缓存和许可预算。延续 GLO30/SRTM/VIIRS 决策，解决当前实证缺口。
4. 逐页面核对并实际修复遗漏：Map/点位/图层/Search/My/计划/贡献反馈/Sky/设置账户权限与恢复。
5. 有针对性的类型/编译/契约/服务回归；真实 WEAPP 同候选视觉交互、手机/平板布局与异常状态；必要物理设备反馈。外部条件缺失记录到具体功能，继续独立工作。
6. 将已发生的持久事实更新到原 Context owner；总结修改、证据和剩余差异。未完成不能关闭 goal。

## 工作区与工具

- 启动已有修改见 initial-git-status.txt。设计/Context 未提交为用户先前工作，不回退或覆盖。
- 已读取技能：.codex/skills/uiux_design/SKILL.md、C:/Users/777/.codex/skills/wechatide-skill/SKILL.md。需按场景再读相应 wechatide 技能与环境规范。
- Browser 插件 runtime 已定位 C:/Users/777/.codex/plugins/cache/openai-bundled/browser/26.908.40834/scripts/browser-client.mjs；node_repl 工具可调用 tools.mcp__node_repl__js。尚未 bootstrap；先读 control-in-app-browser SKILL。
- 初始需求读取完成；大文件联合读取曾发生输出截断，**不视为已完整读完**。下次按章节/小批读取，记录实际读完范围。
