# 选定依据与最终资源 QA · selected v3

## 选择结论

用户于 2026-08-22 明确结束需求变更阶段并要求继续 DRA 直至完成。本轮据此选定 Open Design project `starward-miniapp-v2-drift-correction-2026-08-20`、conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b` 的 U33 当前字节作为新的不可变约束资源。它新增版本，不覆盖 2026-08-06 v1。V3 是对 selected v2 的元数据纠偏版本：候选 HTML 与 97 项需求处置语义不变，方案版本、日期和关联关系改为一致的 V2.1.1。

## 冻结主体

- Canonical entry：`index.html`。
- SHA-256：`9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`。
- Provider：Open Design 0.16.1。
- Design system：`user:soft-instruments` / `5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`。
- Final run：`08dc6555-0032-4350-a8fc-e03b7104da1f`，`succeeded`、exit 0、`endedWithUnfinishedWork=false`。
- Provider 文件的 `candidate/unselected` 自述冻结的是生成时 lifecycle；本文件记录其后发生的人类选择。

## 需求闭包

- 97 个唯一 requirement disposition：73 covered、1 covered-active-remainder、3 partial、1 excluded、19 inactive-superseded、0 decision-required；78 active。
- U1–U33 的最终覆盖、替代与 locator 由 `selected-requirement-dispositions.json` 唯一枚举。
- 原 V2.0 中与 Map/My、formal Spot Night、Map content boundary、Finder、SourceLift、Detail actions、Notification 或 My account-center 冲突的旧投影已经在 V2.1.1 对账章和 inactive 列表中明确失效。

## 当前字节 QA

- Provider final-byte Browser QA：320×800、375×900、430×932 × day/night/observation × normal/large × normal/reduced；My 专项 36 组合通过，U24–U32 回归通过。
- JSON 与两段 inline script 可解析；97 个 locator token 均可在 canonical source 定位；无外部 runtime dependency；旧 My subtitle/tabs/Favorites 元素归零。
- Context/Harness、Design System 与 Design Target 校验通过；`design:lint` 为 0 error，保留既有未使用 token warnings。
- 外层浏览器对本地 `file://` 的独立重执行受 Browser URL policy 阻断，故不声明 U33 独立浏览器重执行通过。正式 preflight 只证明选定 Source 的闭包/完整性，不证明生产一致性。

## 非声明

本包不声明生产微信小程序、微信原生 map/canvas/sensor 运行、真实 Provider/地点/天气/光害/路线事实、生产无障碍或像素一致性已经实现。partial/excluded 项继续由实现与真实数据验证承担。
