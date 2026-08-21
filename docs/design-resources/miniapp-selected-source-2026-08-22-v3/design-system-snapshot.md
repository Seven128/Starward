# 微信小程序设计系统绑定快照 · selected v3

## 权威与范围

- 项目视觉权威：`C:/Dev/Starward/DESIGN.md`。
- 采用目标：`target.system.wechat-miniapp-soft-instruments-2026-08-05`。
- 采用章节：`DESIGN.md#wechat-mini-program--soft-instruments-v1`。
- Open Design 设计系统 ID：`user:soft-instruments`。
- 当前资源绑定摘要：`5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`。
- `DESIGN.md` SHA-256：`45DDFECF8AD3C9DA7EDC94312F15D3684D513603B5F317A91ADE1DE264E4CEB0`。
- `DESIGN.md` 记录的 provider body SHA-256：`ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`。

## 解释优先级

1. 两份 V2.1.1.1 最终对账方案拥有产品、业务、数据、路由、状态与能力边界。
2. `DESIGN.md` 的微信小程序章节拥有视觉语言、精确 token、组件外观、状态、动效与无障碍姿态。
3. 本 selected v3 资源把前两者投影为可审查、可实现的页面、组件与交互约束。
4. 资源是 `constraint`，不是生产像素 exact target；生产仍需独立验证。
5. 后续变更必须修订可编辑 Open Design 上游并发布新的不可变 selected 版本，不得覆盖本目录。

## 可编辑上游

- Open Design project：`starward-miniapp-v2-drift-correction-2026-08-20`。
- Conversation：`61006884-d0d8-48d2-bc4c-f0136e8ade3b`。
- 最终候选 run：`08dc6555-0032-4350-a8fc-e03b7104da1f`。
- 变更路线：修订 accepted requirement → 在相同 binding 下生成新候选 → 重新 QA → 显式选择 → 发布新 immutable selected package。
