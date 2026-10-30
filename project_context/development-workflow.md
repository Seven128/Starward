# WeChat Miniapp Development, Test, And Acceptance Environment Context

This root-owned, on-demand verification Context is the single durable owner for the WeChat Mini Program environment topology, owned paths, isolation boundaries, evidence-promotion rules, bootstrap decisions, and stable routing to its selected visual target. Product/screen responsibilities live in `project_context/areas/main/product-surface-contract.md` and `screen-contracts/wechat-miniapp.md`; exact visual values live in `DESIGN.md`. This file never treats planned code, a generated bundle or a historical run as proof that a runtime exists or passed.

当前前端仍使用Taro/React开发链；已确定的[原生迁移方向](architecture.md#wechat-native-stack-decision)尚未实施。迁移方案须同步本owner及其开发/验证/发布消费者，按实际切换更新入口，不能仅替换“Taro”字样或停用仍在使用的检查。公共优化复用、按不同机制选择最小回归和真实WEAPP结果的要求继续有效。

## Context Routing

This stable root remains the single owner of the Mini Program development/test/acceptance environment. Follow every linked node implicated by the task: feedback observations cannot promote themselves, path/lifecycle rules apply to every lane, and deployment remains separately owned by `project_context/deployment.md`.

- [Reservation scope, selected-design routing and dependency direction](development-workflow/authority-and-scope.md)
- [Three-tier feedback structure, native-first invariant and development lane](development-workflow/development-feedback.md)
- [Deterministic test, WeChat DevTools, representative-device acceptance and candidate promotion](development-workflow/candidate-acceptance.md)
- [Reserved paths, isolation, process/resource lifecycle and failure recovery](development-workflow/paths-and-lifecycle.md)
- [Resource storage, commit-bound backend data/LFS/Drive preparation and bounded task artifacts](development-workflow/resources-and-artifacts.md)
- [Open decisions, environment-change admission, rationale and repository verification](development-workflow/change-admission.md)
