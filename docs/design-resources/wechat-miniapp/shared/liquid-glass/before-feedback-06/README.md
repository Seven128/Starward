# 公共液态玻璃材质（待审设计资源）

当前消费者：My 候选的观星计划卡、Sky 候选的天体说明弹窗。二者加载同一 `material.css` 与 `material.mjs`，只传明暗主题；内容、字级、布局、圆角、焦点、关闭、滚动和业务状态仍归各自 owner。不是生产公共组件已实现或 ADOPTED 更新。

[材质测试](review.html)提供相同几何的透光＋折射、仅透光及不透明对照，可移动背景查看。测试网格/色彩不进入产品天空，也不代表科学影像。

## 调研与决定

- [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) 与 [custom views](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) 强调可见背后内容、环境色与光反射。透明度、模糊、折射和前景可读性是不同维度；大模糊＋深色底不能仅因命名就被认为实现了液态玻璃。Apple 原生实现不等于 Web/WEAPP 可用。
- [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) 提供可调折射/模糊/边缘效果，MIT；其 README 明确 Safari/Firefox 位移效果受限。React 运行时和动态交互并非本次静态 HTML 资源的必要依赖，未安装到生产。
- [LeonardSEO 技术示例](https://github.com/LeonardSEO/liquid-glass-react) 展示圆角边缘位移图与 SVG `feDisplacementMap`。本资源参考这种标准机制做有界原生 DOM 适配：中部位移中性，边缘依圆角距离与法线弯折；不是噪声扭曲整个面板。该小型示例不是成熟跨平台保证，其“无额外成本/自动降级”等表述未经本项目验证，不作为事实继承。

选用薄透明主体（浅色7%、暗色6%底色）、0.35px轻模糊、边缘位移与高光；无全屏截图、无复制星场或假星系背景。位移图只在可见尺寸变化时重建，关闭/不可见时不按帧重算；多个实例拥有独立唯一 filter ID。同一模块完成挂载、ResizeObserver 和销毁。当前增强分支限已检查的 Chromium 预览，其余是明确的透光降级，不称为折射已支持。

这是一种浏览器中的光学近似，不声称复刻 Apple 的完整动态材质。生产前需在实际 WEAPP 验证背景采样、native 合成、SVG/WASM/WebGL可用路径与性能，再确定适配器；没有证据时不能宣称支持真实折射。减少透明度/不支持背景过滤时使用不透明可读版本。暖红主题不引入蓝白光效。

## 验证

已在 Chromium 本地预览实际查看同一网格在折射/无折射下的边缘差异及移动后的内容穿透；主体保留背景，前景文本不被滤镜扭曲。My 与 Sky 同时使用公共文件。仍需窄屏、长文、字体、主题、控件行为回归；最终记录随任务更新。CSS 语法支持检查本身不证明效果。

最终本地检查：四宽度消费者及长文/重开/暖红/不透明降级通过；实际查看真实页及网格折射对照。Stitch公共材质原稿见 [第五轮Sky原稿](../../../sky/candidates/context-audit-2026-09-09/stitch-feedback-05/README.md)。SVG折射是本地研究适配，不能把生成稿的阴影描述当成已实现折射。
