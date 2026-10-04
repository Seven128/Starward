# Global Codex Notes

## Browser / Chrome

- 需要打开、检查、点击、输入、截图或验证网页时，优先使用 Browser / Chrome 插件；除非用户明确要求，不要先用本地 Playwright、`npx playwright`、CLI 截图或 Computer Use。
- Playwright 不是禁用；当任务需要可复现脚本、E2E 测试、trace/录制、跨浏览器/多 viewport 验证、CI 集成，或用户明确要求 Playwright 时，应使用 Playwright。
- Browser 用 `control-in-app-browser` skill 和插件缓存里的 `scripts/browser-client.mjs`，连接 `agent.browsers.get("iab")`。
- Chrome 用 `control-chrome` skill 和同一 browser-client runtime，连接 `agent.browsers.get("extension")`；只在需要真实 Chrome 登录态、Cookie、扩展或用户已有标签页时使用。
- 没有直接暴露 Browser/Chrome MCP 工具不代表插件不可用；先用 `tool_search` 找相关 skill / `node_repl js` 并尝试 browser-client。只有 bootstrap 或 runtime 实际失败后，才说明原因并 fallback。
- Computer Use 不用于自动化 Codex 自身。终端、安全/隐私设置、登录或授权相关事项可以处理，但必须按当前工具和安全策略执行；优先使用 CLI/API/设置路径。已授权的本地账号、浏览器会话、凭证、敏感字段和系统设置可以由 agent 直接使用来完成任务，不因“敏感”本身暂停；但不得把 secret/token/cookie/密码/完整敏感字段明文写入回复、日志、Context、代码或长期文件。

## Terminal / Permissions

- 日常开发优先面向 Windows Terminal + PowerShell 7 (`pwsh`)；旧版 Windows PowerShell 5.1 只用于系统兼容或遗留脚本。
- 搜索文件和内容优先用 `rg` / `fd`，查看结构化数据优先用 `jq`，Git diff 优先用 `delta`。
- 权限预期是尽量放开。普通开发命令直接执行；需要管理员 token 时直接用 `sudo`/`gsudo`，例如 HKLM 注册表、服务、Defender、安全设置、网络适配器、电源计划、`C:\Program Files`、`C:\Windows`、驱动和系统级安装。
- `sudo` 当前来自 gsudo，并已配置为全局 `CacheMode=Auto`、`CacheDuration=Infinite`；首次提权或缓存失效后仍可能出现一次 UAC，之后应复用缓存，避免反复询问。
- 已授权的 `sudo`/`gsudo`/administrator elevation 不视为用户阻塞；遇到需要管理员 token 的操作时先自行使用提权执行。账号、凭证、浏览器登录态、敏感字段和本地安全/隐私设置本身也不视为用户阻塞，agent 可在本机直接读取、填入、调用或配置来推进任务。只有提权不可用、失败、缓存未挂载且需要用户完成系统授权，或缺少外部 MFA/人工审批/付款/远端权限，或将执行明显不可逆的 destructive 操作时，才暂停并给用户最小执行清单。
- Developer Mode 可以减少开发限制和允许普通用户创建符号链接，但不会取消 UAC。Windows 没有“除关键系统文件外都不弹 UAC”的精细模型；不要关闭 `EnableLUA`，除非用户明确要求并接受可能影响 MSIX/Codex/Store 应用和整机安全。
- PowerShell profile 会在本机 `127.0.0.1:7890` 可连通时，给当前终端进程设置 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` 和 `NO_PROXY`；VPN 或本机代理不可用时不要写死全局代理。

## File Deletion

- Windows 上的文件和目录删除默认移入回收站，使操作可恢复；优先使用支持回收站的 Windows API 或工具，不使用 `rm`、`Remove-Item`、`del`、`rmdir` 或其他永久删除方式。
- 只有明确可重新生成的临时文件、构建缓存，或受 Git 版本控制且可可靠恢复的文件，才可以直接永久删除。即使属于这些例外，递归删除前也必须解析并核验绝对目标路径，确认目标位于用户授权的具体范围内。
- 如果回收站操作不可用、目标过大而无法进入回收站，或目标路径和范围不明确，应停止删除并说明原因；不要静默降级为永久删除。
- 移入回收站后，应简要告知用户移动了什么以及可以从回收站恢复。平台级安全限制仍然适用；本规则不授权删除工作区根目录、用户目录、磁盘根目录或其他宽泛目标。

## Local Development

- Git 开发默认直接在仓库的 `main` 分支进行；不要为普通任务自动创建、切换或保留 feature branch / Codex branch / 独立 worktree。只有用户明确要求分支隔离，或仓库内显式启用且自身必须使用临时 owned branches/worktrees 的编排流程时才例外；例外流程完成后仍应把结果收敛回 `main`。
- 所有新建或移动的活跃代码仓库统一使用 `E:\Dev\<repo>`；永久或手工 worktree 统一放在 `E:\Dev\worktrees\<repo>\<purpose>`，Codex 自动管理的临时 worktree 统一放在 `E:\Dev\worktrees\codex-managed`。目录和分支优先按任务用途命名，不再把活跃仓库或 worktree 分散到其他位置。
- `C:\Users\777\Documents\Codex`、`C:\Users\777\AppData\Local\OpenAI\Codex`、`C:\Users\777\.codex`、`C:\Users\777\.cache\codex-runtimes` 已按本机开发用途处理过索引/安全扫描优化；`E:\Dev` 作为统一开发根目录，后续应保持适合高频开发的索引和安全扫描配置，除非用户明确要求变更。
- Realtek 有线网卡的节能相关项 `*EEE`、`EnableGreenEthernet`、`GigaLite`、`AdvancedEEE`、`PowerSavingMode`、`AutoDisableGigabit` 已关闭；不要为了省电反向开启，除非用户明确要求。
- Git 全局性能项已开启：`core.longpaths`、`core.fsmonitor`、`core.untrackedcache`、`core.preloadindex`、`core.fscache`、`feature.manyfiles`。

## File Visibility

- 重要 workflow / SDLC / harness 配置目录（如 `.codex`、`.docs`、`.github`、`.harness`、`.cursor`、`.vscode`、`.tools`）是项目事实源；即使 Desktop 文件面板隐藏点目录，agent 仍应主动读取真实点目录。
- 全局白名单、别名和索引在 `C:\Users\777\.codex\file-visibility-allowlist.toml`、`C:\Users\777\.codex\file-visibility-aliases.toml`、`C:\Users\777\.codex\INDEX.md`。
- 如果新 workspace 的右侧文件树看不到点目录，可以运行 `C:\Users\777\.codex\scripts\sync-file-visibility-aliases.ps1 -WorkspaceRoot <workspace>` 创建 `_codex -> .codex` 等 UI-only junction / symlink，并把别名写入 `.git/info/exclude`。
- 读取、引用和写项目文档时优先使用真实点目录；`_codex/` 等可见别名只用于 Desktop UI 浏览，不应作为源码路径提交。
