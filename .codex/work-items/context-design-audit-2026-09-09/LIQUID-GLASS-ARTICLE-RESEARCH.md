# 液态玻璃文章调研（2026-09-09）

用户要求研究已有较好的实现。本轮仅查阅文章与仓库说明，未运行外部演示、未评测性能、未修改候选视觉或生产代码。以下作者复现不等于 Apple 内部实现说明。

## 主要参考

- https://kube.io/blog/liquid-glass-css-svg/ ：曲面剖面、法线、折射位移图、定向高光，附搜索框/滑块/音乐面板交互例。适合当前 HTML 候选的技术参考。作者明确 DOM 背景 SVG 滤镜演示限 Chrome，尺寸变化重建成本高，仍属实验，不能视为生产库。
- https://www.sorrell.info/blog/liquid-glass-lens-effect ：组合折射、色散、轻模糊和高光；重要限制是 Web 示例在 shader 内生成背景，不能直接过滤任意 DOM。Expo/Skia/CanvasKit 路线，不因跨平台标题就认定支持 WEAPP。
- https://www.aghajari.com/publications/liquid-glass/ ：GLSL 教程从背景纹理、SDF 圆角面板逐步搭建效果。可作纹理输入机制参考；GPU 必然高效之类概括不能替代真机测量。
- https://github.com/ybouane/liquidglass ：MIT，WebGL 方案，html-to-image 捕获 DOM 后合成；支持折射/色散/Fresnel/高光参数。README 明示捕获开销、动态内容每帧重捕获、Canvas 像素更新需 markChanged、跨域纹理限制。不能当作 WEAPP 即插即用依赖。
- https://github.com/sohumsuthar/liquid-glass ：作者声称根据 macOS 26 控制中心截图测量亮度映射、边缘高光，并做射线折射。可借鉴同背景同尺寸对照和明暗采样方法；其校准结果本轮未复算，macOS 样本不自动代表所有 iOS 材质。

## 对本项目的判断

现候选的透明主体、距离平方边缘位移及固定高光只达到简单光学近似；缺少经过选择的曲面剖面、更自然的定向高光与明暗适应。通过网格弯折测试并不等于达到用户所说的 iOS 质感。

下一轮设计资源建议以 kube 的曲面折射机制为主要参考、以实景明暗对照为验收方法；继续让 My/Sky 共用材质，文字保持独立清晰。避免靠继续降低背景 alpha 或增大扭曲来替代质感。具体候选仍走 design-resource，并交用户审查。

生产路线仍待 WEAPP 背景采样/合成能力验证。WebGL 算法能实现不代表已有 DOM 捕获库能直接运行在小程序；云观星若能提供场景纹理，才有条件评估共享纹理的 shader 路径，这是待验证推断而非已采用架构。本轮不安装依赖、不认定兼容或性能、不改变已有采用状态。
