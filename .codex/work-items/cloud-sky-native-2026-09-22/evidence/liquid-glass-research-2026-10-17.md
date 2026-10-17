# 底部时间面板与玻璃材质选择

2026-10-17用户要求时间面板置底，以便边调时间边看星图，并优先高性能液态玻璃，条件不合适时采用相似的半透明玻璃。目标是现有Taro/WEAPP小程序菜单资源；原生App、星图视觉、素材处理、外部Map代码和生产迁移不在本轮范围。

## 已核资料与适用边界

| 路线 | 核实结果 | 本次适用性 |
| --- | --- | --- |
| Apple系统Liquid Glass | [Apple Design](https://developer.apple.com/design/)直接列出[Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)；[Materials](https://developer.apple.com/design/human-interface-guidelines/materials)说明功能层、可读性及避免玻璃层叠。[SwiftUI接口](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)与[UIKit UIGlassEffect](https://developer.apple.com/documentation/uikit/uiglasseffect)提供原生效果；SwiftUI建议把多个效果合入GlassEffectContainer并限制同时出现的效果数量。 | 原生Apple平台的优先成熟实现；不等于WXSS中可调用的能力，也不是免费GPU成本。只借其功能分层、克制材质与触摸反馈原则。 |
| 平台GPU着色器 | [Android AGSL](https://developer.android.com/develop/ui/views/graphics/agsl/agsl-quick-reference)是Android侧着色语言，与GLSL兼容性并不意味着小程序可以调用Android原生API。真实折射还需受支持的背景纹理与合成输入。 | 当前共享材质owner已经保留条件shader路线；没有证据证明现WEAPP合成可直接提供所需输入。不为展示另增Skia/CanvasKit、第二Canvas或截图采集链。 |
| CSS背景模糊 | [Chrome团队说明](https://web.dev/articles/backdrop-filter)提供半透明填充加backdrop-filter的毛玻璃路径，也要求部署前检查成本。微信官方[Skyline WXSS](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/wxss.html)列出不支持多函数、url和drop-shadow，以及opacity/blur的表现限制。 | 现App/页面配置未选择Skyline，不能把Skyline表当作本项目WebView的通过证据；Android/iOS微信内核及WebGL同层背景采样仍须实际验证。现共享类的6px blur+saturate组合也不能据此认证。 |
| RGBA半透明近似 | 一个半透明深色填充配静态薄高光、细边、短阴影，按压/出入场仅用有限transform与opacity；没有背景采样、位移图或持续JS材质更新。 | 本次候选采用的基础材质。减少所需处理步骤是结构判断，不是手机性能测量；明确缺少实时折射和自适应光学效果。 |

Apple两个文档页面的Markdown由其页面公开链接取得；网页检索器不接受text/markdown，改用直接HTTP读取。微信两个官方页面由HTTP实际取得200及对应文档标题，未以转载代替一手资料；canvas文档确认新接口的同层渲染说明，但该说明本身不证明背景滤镜可以采样当前WebGL星图。

## 当前资源选择

- 时间沿同一披露owner增加底部位置变体，不移动天空或改变投影视口。390×844比较视口采用示例底部安全区34px，再留12px；实际实现沿原安全区owner取值。上方不加全屏遮罩，露出的天空保持可操作，时间面板内的操作由面板接收。预览操作出现不增加整块高度，保原取消/使用此刻、日期和正常1×语义。
- 菜单圆面、标签及弹窗外壳共用一个轻量玻璃材质责任，内部内容和次级动作保单层填充。文字仍不透明以保持清楚；红光高光、边缘、按压与hover全部限定原黑/暖红令牌，不把天空照片或白色高光透回红光UI。
- 本稿默认没有filter/backdrop-filter、SVG位移、复制天空/DOM、额外Canvas、逐帧readback或循环高光。保留现有按压和有限披露动效。原来的六项几何、菜单三横/X和整页黑色过桥不变。
- 生产材质继续由`apps/wechat-miniapp/src/components/liquid-glass-surface.scss`及[Shared material rendering boundary](../../../../../../project_context/architecture/runtime-and-domain.md#shared-material-rendering-boundary)拥有；后续若迁移，应在同一owner加入适用于持续天空的无滤镜变体，复用真实消费者，不把资源CSS另立为生产材质系统。本次没有改生产类、其它页面或设置。

## 真实模糊/折射的重新评估条件

只有目标微信运行时实际支持相同WebGL背景的合成且成本合适，才考虑局部、单层、小半径模糊增强。按现性能owner，在同一设备/基础库/视口/背景/内容下与无滤镜版本比较帧时分布、掉帧、内存及持续开关/前后台恢复；覆盖拖动缩放、随手机、连续时间、菜单披露和持续使用。沿已有基线与预算，不以桌面浏览器FPS或属性语法支持代替目标验收。失败时保可读半透明基础材质；不以“液态玻璃”命名掩盖光学差异。

本轮只形成设计资源与技术选择依据，不取得原生性能、全局设置同步、传感器或完整Goal验收。候选仍待审，原33项与FAILED/UNKNOWN/MISSING不因本稿改变。
