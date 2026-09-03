# I21 选定依据与资源 QA

- 选择：用户明确授权本轮候选通过严格审计后由 DRA 直接选择并跑完整流程；当前 I21 候选满足 13 项需求及组件库复用补充，前五轮候选仅保留为 rejected evidence。
- 分类：微信小程序 implementation constraint；不是 pixel-exact production target，也不是生产验收。
- 资源：Open Design 0.21.1，同一 current project；material run b9459565-55ac-47c9-8876-296af2a2ce7e，mechanical conformance run e2607c5d-52fa-4bea-b6c3-d3fa966432a6。
- 静态闭包：5/5 Product Surfaces、9/9 current routes、62/62 material Controls；retired/prohibited/unresolved 均为 0；Provider/repository/HTTP review bytes 一致。
- Browser：Search 原子 focus/blur 与无图 full-width、panel handle/body/media/rail、layer互斥、时间尺拖动、三态 direct/drag、Contribution validation/upload/terminal submit、9-route 320–430px/100–200% text、三主题、reduced motion/transparency、hidden scrollbars及 clean console 均已独立复验。
- 复用边界：@taroify/core@1.0.6 为 research-qualified preferred generic substrate；未在本 DRA 安装。生产 package/license/lock/tree-shaking/bundle/WEAPP/IME/safe-area/a11y/gesture 仍须独立证明。
- Preflight 只证明所选 Source、Fact universe 与技术可行性输入的闭包；不证明生产一致性。
