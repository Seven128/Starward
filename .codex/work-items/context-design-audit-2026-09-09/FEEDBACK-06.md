# 第六轮：研究落地与设计公共组件

已完成 Context/设计资源范围的修订，待用户审查，未改生产代码、未采用候选。

- Stitch 项目13823253487989500123，屏幕95aab983615345e899e22f5aab1961f7；实际输入与原稿在 sky 候选 stitch-feedback-06。已渲染查看，未继承原稿的低开销/兼容保证或额外业务字段。
- 公共 material.css/mjs 改为四阶凸面剖面、Snell 单界面近似位移和几何法线定向高光，保留清晰中心、独立前景与低alpha表面。不是 Apple 完整模拟，没有色散或实时自适应亮度。My/Sky 同消费者，真实内容和字级未改。before-feedback-06 保留前版材料。
- 架构 owner 已记录已定视觉/共享职责、未选生产renderer、SVG设计路线、shader条件候选和DOM捕获不适配边界；生产大范围接入前比较小范围WEAPP两端两消费者，测动态/帧时间/内存/生命周期/可读性。当前无真机测试。
- 用户追加：UIUX资源阶段开始公共组件，跨阶段共用逻辑。已写AGENTS独立跨阶段章节；设计方法和SKILL入口给设计侧操作；context-maintenance规定事实归属。实现是公共职责覆盖的超集，可增技术组件或组合拆分，不是节点一一对应。当前LiquidGlassSurface已记录消费者、状态变体、职责边界与未实现源码映射。
- 本地check-glass-06.js已完成：320/390/430，长文、关闭重开、红光、降级与resize保持、移动背景/位移对照。最终截图已查看。修正了红光saturate(0)导致背景红星变灰的问题；保留红色采样。
- 当前原稿独立预览有Tailwind/CDN和Stitch宿主postMessage警告，保留原样；实际候选仍只有favicon403。Context验证、18个修改MD的109本地链接、32候选文件152链接、diff检查通过（未涵盖远端内容或真机）。
- package-glass-06.mjs已执行一次，不重复运行（会重复追加说明）。旧构建/修订脚本同样不要重跑。研究原始入口见LIQUID-GLASS-ARTICLE-RESEARCH.md。
