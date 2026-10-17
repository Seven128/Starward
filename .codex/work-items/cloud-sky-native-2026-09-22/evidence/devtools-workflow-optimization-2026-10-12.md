# 小程序开发工具与流程优化

用户批准实施前序能力审计、官方 skill 同步和项目流程优化，并要求提供另一台电脑的实施提示词。工作仅在当前 worktree/`codex/remote-main-20260908`；另外按授权维护本机已导入的全局官方 skill。原产品修改、图像冻结、33 项义务及失败/未验状态保留，未提交、发布或重启既有开发服务。

## 已落实

- 新项目 `starward-miniapp-development` skill 承接问题到工具的选择、会话复用和项目启动恢复。原全局官方副本的四份文档修改已迁出，其新增启动说明在项目引用中明确标注非官方补充；完整旧目录也保留在备份中。
- `wechatide-skill-sync.mjs` 从当前安装包单向同步：版本与相对文件/字节摘要、完整替换、无变化不复制、保留原副本、保护本地修改、共享锁及真实路径边界。接入 `miniapp:devtools:sync`、普通 `dev:miniapp` 和官方观察器；包变化后在产品动作前返回重载要求。不会安装 IDE、获取网上包、修改授权或写安装目录。
- 官方观察器支持 WXML/style/size/offset 和有界串行 batch，共享一次就绪检查，操作仍验证当前页/实例；失败保已完成结果并停止后续动作。CLI/MCP 令牌规则不混用，无跨进程登录缓存。
- AGENTS 只增加最小有效观察原则；Context 修正旧令牌、旧路径和无 batch 的陈述，维护现有责任/验收边界。新增工具测试入口，并加入原 workflow 工具测试集合。
- [另一台电脑提示词](../DEVTOOLS-WORKFLOW-OTHER-COMPUTER.md)要求先适配当地 worktree、harness、安装和已有改动，不硬编码本机版本/路径或扩大验收。

## 必要验证与实际结果

1. `development-official.test.mjs` 的六项工具行为检查通过，包括新批量一次就绪、WXML/style 结果和首错停止不重放。
2. `wechatide-skill-sync.test.mjs` 的四项检查通过，包括整包更新/旧文件退出发现/完整备份、本地编辑保护、同版更正/拒绝降级，以及入口定位和 junction 禁写安装目录。
3. 复用现有 `project-skills.test.mjs`，只运行新 `starward-miniapp-development` 项：结构/界面元数据/所属引用通过；另外检查新增本地 Markdown 链接和变更差异。受改 JS 语法检查通过。
4. 已实际执行本机首次迁移，结果见 [同步回执](devtools-skill-sync-2026-10-12.json)。全局官方副本版本 0.3.11，完整包摘要 `3899fb24781c19968eff8785fe54e2eab70ae647d170f475d8a7edb20d590472`，五个相对路径差异已退回原官方内容。后续通过默认 CLI 定位执行 `--check` 返回 `current`、无差异，不再复制。备份在回执所记本机目录，未删除旧成果。
5. 现有诊断项目的两步只读 batch 实际成功，见 [请求](devtools-observer-batch-2026-10-12.json)及[结果](devtools-observer-live-2026-10-12.json)：读回 header WXML 和 `display:flex`。没有刷新、点击、截图、构建或新的产品旅程；此结果只证明观察器入口，不改变原菜单可见性失败。
6. [新的公开 Codex App Server 扫描](devtools-skills-fresh-discovery-2026-10-12.json)通过 `skills/list(forceReload:true)` 实际发现项目 skill 和全局官方 skill，均 enabled，扫描 errors 为 0。扫描进程已退出。已重新读取迁移后的官方 root/automator；不能据此证明当前 Desktop UI 缓存即时刷新。

## 独立审查及保留的失败

只读独审 `/root/devtools_workflow_review` 指出两个 P2：创建目录前未解析潜在 junction，以及假定 CLI resolver 总返回 cwd。已分别改为先解析最近存在祖先的真实路径、从实际 `.exe/.js` 入口定位安装包，并通过对应定点测试。审查其余所看范围无阻断项；审查 agent 已完成并结束，不复用。

官方 `quick_validate.py` 实际未成功运行，系统和 bundled Python 均缺 PyYAML；没有安装依赖或将失败记成通过。改用项目已有技能结构验证及引用核对完成本轮检查。界面元数据生成首次受默认编码影响，已用 Python UTF-8 模式重新生成并实际读回中文。

[当前 App Server proxy 请求](devtools-skills-discovery-2026-10-12.json)退出 1，当前 Desktop 缓存刷新仍未确认。独立公开 stdio server 的扫描成功不覆盖此失败；若当前 UI 不显示新 skill，重载客户端/会话后继续原任务。未改客户端私有状态或关闭用户窗口。

本轮没有运行产品构建、全量测试、手机/云端验证或图像获取/加工。工具维护完成不代表云观星 Goal 完成，后续产品动作继续沿 CONTINUE 和唯一 PLAN。
