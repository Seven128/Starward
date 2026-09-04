# I21 immutable implementation binding QA

- 原始视觉方向及 canonical bytes 仍是 2026-09-03 明确选定的 I21 constraint；本版本不增加 visible decision。
- 本版本仅重新冻结当前生产 substrate、route/component owners、Source digests 与 implementation feasibility。
- 生产 package inspection 发现 @taroify/core@1.0.6 的 mandatory icon dependency 与 SemanticIcon 唯一 owner 冲突，因此采用现有 bounded Taro/Starward substrate。
- 5/5 Product Surfaces、9/9 current routes、62/62 material Controls 与原选定 Fact universe 保持完整；真实 WEAPP/IME/safe-area/a11y/gesture 继续由当前候选验证。
- Bundle/preflight 只证明 Source closure 与 input integrity，不证明生产一致性或 readiness。
