# Official skill maintenance

The installed DevTools package is upstream for this host. `tools/miniapp/wechatide-skill-sync.mjs` owns one-way synchronization through `npm run miniapp:devtools:sync`. Normal `dev:miniapp` (except `--no-open`) and `miniapp:observe --official-ide` also invoke it before their own effects. It does not install an IDE update, download a package, change login or configure MCP.

Discovery reuses the existing CLI resolver (`STARWARD_WECHAT_DEVTOOLS_CLI`, PATH and known installation locations). `--official-ide` selects an installation directly. Destination discovery prefers the existing single official copy in the Codex or `.agents` user root; `--skills-root` selects another harness. Avoid competing same-named copies. Other machines/executors independently verify discovery and reload support.

```powershell
npm run miniapp:devtools:sync -- --check
npm run miniapp:devtools:sync -- --official-ide <absolute-installation>
```

The synchronizer compares relative names and bytes as well as version. A matching package is a no-op; `agent_ahead` is reported without downgrade. Changed official bytes under the same version are detected. `versionRelation: equal` is not content integrity.

Unmanaged or unexpectedly edited copies are preserved. Review differences, migrate useful instructions into the project skill, then explicitly use `--adopt-local-changes` once. This is not a routine startup flag. The complete prior directory moves to a unique backup under the skill root's sibling `skill-sync/wechatide-skill/`, outside discovery. Staging is verified against unchanged upstream bytes before replacement. Installation files are never written. A failed destination rename restores the prior copy; interrupted locks/staging are preserved for explicit recovery, not silently deleted. Never delete an entire skills root to recover.

`current.json` contains only source/destination, version, digest, time and backup location. The shared lock prevents concurrent worktrees replacing the same global package; it is held only during synchronization. No account/credential information is saved.

After an update, consumers return `skill_reload_required` before acting on a project. Refresh discovery, reread the changed root/scene and resume the same task. OpenAI App Server exposes `skills/changed` and `skills/list(forceReload: true)` through supported client integrations; do not invent a Desktop shell command for them. If discovery refresh cannot be confirmed, retain that gap and reload the client/session before relying on newly discovered skills.

References: [Codex discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills), [App Server reload](https://learn.chatgpt.com/docs/app-server#skills). The matching installed `wechatide-skill/references/environment-readiness.md` owns WeChat version/login/token semantics; web examples may have obsolete names.
