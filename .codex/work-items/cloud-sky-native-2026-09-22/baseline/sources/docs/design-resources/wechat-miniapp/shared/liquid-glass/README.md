# 公共液态玻璃材质（当前设计资源）

当前消费者：My 当前资源的观星计划卡、Sky 当前资源的天体说明弹窗。二者加载同一 `material.css` 与 `material.mjs`，只传明暗主题；内容、字级、布局、圆角、焦点、关闭、滚动和业务状态仍归各自 owner。本资源已通过共享Context与两页ADOPTED入口收敛为设计依据；不表示生产公共组件已实现。

[材质测试](review.html)提供相同几何的透光＋折射、仅透光及不透明对照，可移动背景查看。测试网格/色彩不进入产品天空，也不代表科学影像。

## 调研与决定

- [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) 与 [custom views](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) 强调可见背后内容、环境色与光反射。透明度、模糊、折射和前景可读性是不同维度；大模糊＋深色底不能仅因命名就被认为实现了液态玻璃。Apple 原生实现不等于 Web/WEAPP 可用。
- [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) 提供可调折射/模糊/边缘效果，MIT；其 README 明确 Safari/Firefox 位移效果受限。React 运行时和动态交互并非本次静态 HTML 资源的必要依赖，未安装到生产。
- [LeonardSEO 技术示例](https://github.com/LeonardSEO/liquid-glass-react) 展示圆角边缘位移图与 SVG `feDisplacementMap`。本资源参考这种标准机制做有界原生 DOM 适配：中部位移中性，边缘依圆角距离与法线弯折；不是噪声扭曲整个面板。该小型示例不是成熟跨平台保证，其“无额外成本/自动降级”等表述未经本项目验证，不作为事实继承。

第六轮候选改为凸面剖面导出的位移：以四阶曲面截面、法线与 Snell 弯折角近似投射到背景面，折射限制在边缘，中心位移中性；定向细高光使用同一几何法线，较弱的反向反射与暗边表达厚度。文字层不参与滤镜。低 alpha 的主体保留真实背景，暗色表面轻微提亮；浅/暗/暖红使用同一模块的参数。具体值以 material.css/material.mjs 为准。无页面截图、无复制星场；图只在可见尺寸变化时重建，唯一 filter ID 与销毁仍属材质职责。当前增强路径仅在本地 Chromium 预览检查，其余是明确透光降级，不称为折射已支持。

这是一种浏览器中的光学近似，不声称复刻 Apple 的完整动态材质。生产前需在实际 WEAPP 验证背景采样、native 合成、SVG/WASM/WebGL可用路径与性能，再确定适配器；没有证据时不能宣称支持真实折射。减少透明度/不支持背景过滤时使用不透明可读版本。暖红主题不引入蓝白光效。

## 验证

已在 Chromium 本地预览实际查看同一网格在折射/无折射下的边缘差异及移动后的内容穿透；主体保留背景，前景文本不被滤镜扭曲。My 与 Sky 同时使用公共文件。仍需窄屏、长文、字体、主题、控件行为回归；最终记录随任务更新。CSS 语法支持检查本身不证明效果。

最终本地检查：四宽度消费者及长文/重开/暖红/不透明降级通过；实际查看真实页及网格折射对照。Stitch公共材质原稿见 [第五轮Sky原稿](../../sky/candidates/context-audit-2026-09-09/stitch-feedback-05/README.md)。SVG折射是本地研究适配，不能把生成稿的阴影描述当成已实现折射。


## 第六轮来源、路线与实际验证

共享组件标识：`LiquidGlassSurface`。当前消费者为 My `plan-card` 与 Sky `details`，两者实际引用同一份 material.css/material.mjs；这属于可复用设计原型模块。主题为 light/dark/red，状态为 refractive/translucent/solid；材质负责透光、边缘、主题和降级，消费者保留内容、布局、点击/弹窗状态与焦点。业务合同见[共享 owner](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/surfaces-and-controls.md#shared-liquid-glass-material)。生产源码映射尚未实现，不把这个模块当作 WEAPP 组件；视觉仍待审。

- [Kube 曲面折射文章](https://kube.io/blog/liquid-glass-css-svg/)作为曲面/定向高光机制参考；本地适配不是复制生产库，也不声称复刻 Apple 完整材料。没有色散、完整多界面光线追踪或自动背景亮度采样。
- [Stitch 原稿和输入](../../sky/candidates/context-audit-2026-09-09/stitch-feedback-06/README.md)仅提供视觉修订；Codex 本地适配实现实际 SVG 位移。原稿的跨端低开销声称不继承。
- [上一版完整材质](before-feedback-06/review.html)保留；[当前对照](review.html)可切换位移、透光与不透明，并移动测试背景。测试网格与文字不属于产品。
- 生产路线和前置小范围真机比较由[架构 owner](../../../../../project_context/architecture/runtime-and-domain.md#shared-material-rendering-boundary)维护：目前未选定 WEAPP renderer；HTML SVG 是设计实验，shader 仅在真实场景纹理可用时成为候选，DOM 捕获库不是当前直接接入方案。
- 第六轮实际查看 Stitch、网格折射/无折射/移动背景及 My/Sky 真实候选截图；检查320/390/430宽度、长文滚动、关闭重开、暖红、不透明与缩放窗口后降级保持。没有执行 WEAPP 真机或性能测试，设计待用户审查。


## 第七轮与当前状态

用户要求带毛玻璃般的背景模糊：颜色和大轮廓透过，细节柔化，前景文字清晰。共享模糊从0.5px调为6px，低alpha与曲面折射/高光保留；My/Sky同时更新。Stitch第七轮原稿使用更强20px与更厚底色，原样归档，本地保留适度6px以避免遮蔽背景。

[第七轮Stitch源](../../sky/candidates/context-audit-2026-09-09/stitch-feedback-07/README.md) · [模糊前对照](before-feedback-07/review.html)。本对话当前材质依本入口及material.css/material.mjs，已归入共享Context与两页当前资源；历史“待审”记录不表示仍有竞争版本。正式WEAPP renderer未选定，不据本次收敛宣称已实现。
