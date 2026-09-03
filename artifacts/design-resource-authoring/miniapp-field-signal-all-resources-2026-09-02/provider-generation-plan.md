# Open Design 全量候选生成计划

> 状态：task-local / 非权威 / no-template Design-mode run 生成中。
> 范围：全部六个微信小程序 Product Surfaces 与完整 material Control inventory；Map/Finder 不是独立交付。
> 停点：生成、机械/Source/设计系统适用性/真实渲染检查后，必须停在 Design Resource Review & Selection Stop。

## 1. Locked inputs

- Project：`starward-miniapp-field-signal-all-resources`；显示名 `Starward 微信小程序全量交互原型`。
- Project type：prototype；无 scenario/plugin/template snapshot。
- Functional skill：`frontend-design`。
- Exact design-system binding：`user:starward-mini-program-sky-canvas-field-signal-revision`。
- Current design-system body：section-only `6ac7bf…`；provider/linked/structured complete Markdown `4c86d52c…`。
- Commission project file：`COMMISSION.md`，SHA-256 `52279d72cd814c8651a5b73d9827eca536104ac05cda8c4ab2ae6bd26ed2494e`。
- Required outputs：`index.html`、`assets/styles.css`、`assets/app.js`、`coverage.json`、`README.md`；只有真实冲突才生成 `DECISION_REQUIRED.md`。

## 2. Live capability decision

- Provider：Open Design `0.21.1`；agent `codex` available，Codex CLI `0.144.5`，auth `ok`。
- Live agent surface exposes ordered reasoning `default, none, minimal, low, medium, high, xhigh`；highest legal explicit effort=`xhigh`。
- Eligible documented current models include Sol/Terra/Luna and older listed models。Provider/OpenAI capability guidance identifies `gpt-5.6-sol` as the flagship complex-reasoning/coding choice; select it. `gpt-reserve` is an undocumented reserve alias with no capability/eligibility contract and is not an eligible formal target; model-name/list order is not used as ranking evidence。
- Service tier is separate from capability and will not be explicitly selected；effective/default value must be reported if the run exposes it。

## 3. Exact invocation

- Rejected auto-template run used `4200bf83-576a-4486-9990-f9d250d5cf7b` and must never be retried。The first no-template run used `0371f233-0875-4563-b67d-c49e55471d3f`; it proved exact provenance but was canceled by an over-eager local check before output。The next no-template run used `038c4fdf-d863-45a5-bf2d-71d26303a6a4`; it read the complete commission but treated `chat` as Ask mode and returned no artifact。The current Design-mode continuation uses `clientRequestId=289a1ae6-5884-4b4f-9684-777c70cde6ff`；an uncertain transport retry must reuse this exact current id。
- `agentId=codex`、`model=gpt-5.6-sol`、`reasoning=xhigh`。
- Current continuation uses `sessionMode=design` because Codex requires Design mode for project writes。Scenario isolation comes from the project's unrecognized provider-routing kind `design-resource`, not from Ask/chat mode；the explicit `frontend-design` skill and bound design system remain active。
- `projectId` and live `conversationId` must match the created project；workspace headers are discovered live and never persisted。
- Prompt：先完整读取 `COMMISSION.md`，再生成 all-resources candidate；明确禁止单页缩减、旧视觉、可见 version labels、产品逻辑变化和下游自选。
- No template/plugin, no external media/CDN/network dependency, no product source mutation, no real user data。

首次提交虽使用 `sessionMode=chat`，Open Design 仍根据 `metadata.kind=prototype` 在 run resolution 阶段绑定 `example-web-prototype`。该 run 在只存在 `COMMISSION.md`、尚未生成文件时取消，不能重试或作为候选；事实见 `provider-run-rejected-report.json`。Corrected project 已使用无 provider default-scenario mapping 的 task-local kind `design-resource`，其 entry 仍为 `index.html`；provider 保留的 canceled run record 仅为历史且未 pin 到当前 project。

## 4. Completion and failure handling

1. POST one formal run；persist returned run id/status/provenance but no personal workspace identifier。
2. Poll boundedly；do not submit blind duplicate runs。If the run requests input, answer only when the commission already determines the answer；a genuine UI/UX choice returns to the user。
3. Completion requires provider status succeeded and effective `agent/model/reasoning` exactly equal requested values。Missing or mismatched provenance keeps `highest_performance_unverified` and blocks promotion。
4. Retrieve the complete current project file set and inspect actual bytes/rendered entry。Provider success alone is not acceptance。
5. Repair only concrete Source/mechanical/suitability defects through the smallest provider revision；any UI/UX decision is asked first。
6. Once a complete suitable candidate is runnable, open it for the user and stop before selection/snapshot/handoff/Authority Delta/downstream implementation。

Readiness correction：Open Design writes a run state before asynchronously filling model/reasoning/skill/design-system fields。Wait until all required provenance fields are non-empty or the run becomes terminal before exact comparison；state-file existence alone is not readiness。The zero-output premature cancellation is preserved in `provider-run-premature-cancel-report.json`。

Current formal run：`f0a7f04b-8b55-4330-9d72-d69f5b1d6497`。Submission evidence `provider-formal-run-submission.json` confirms Codex / `gpt-5.6-sol` / `xhigh` / `frontend-design` / requested current design system and null plugin/snapshot provenance before generation proceeds。

That run finished with `deliverableValid=false/no_artifact` because chat was Ask mode；it is diagnostic only (`provider-run-ask-mode-report.json`)。The Design-mode continuation must reverify null plugin/snapshot immediately after creation, then allow project writes。

Current Design-mode run：`2954b326-6ae5-477a-8f3e-1765aff4bcbb`。`provider-design-run-submission.json` verifies stable Sol/xhigh/frontend-design/current-design-system provenance and null run/project plugin snapshots。
