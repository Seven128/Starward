# C07：放大行星按实际绘制范围点选（2026-09-24）

本轮只使用电脑、现有代码和官方微信开发者工具；没有占用 Android、ADB、扫码或预览，也没有修改共享 8787 服务。旧云观星设计稿继续失效，商业数据边界不变。

## 反例和修复

`sky-object-picking.ts` 原来仅在天体中心 18 个逻辑像素内接受点选。`sky-planet-disc.test.ts` 新增真实 `skyPlanetDiscsAt` → `drawSkyScene` → `SkyPickSnapshot` → `pickPaintedSkyObjects` 同帧贯通用例：0.25° 垂直视场的土星椭圆圆面边缘在中心 18 像素外已绘制，原实现返回空，定向测试 7 通过/1 失败，失败断言为 `pick(globeX,globeY)` 不含 `PLANET:SATURN`。此为实际几何和绘制调用的失败反例，不是人工构造单独的点选对象。

修复后，已成功绘制的可分辨行星发布圆形或土星同极轴扁椭圆的命中轮廓。土星只发布经远侧球面遮挡和真实地平线裁剪后提交给 Canvas 的主环线段；环可见而中心已落下时仍可点选。点击处逆投影至地下则拒绝。其它恒星/深空点保持原中心距离规则，保留 18 像素有界容差、精确帧/目录身份和确定性重叠排序。失败的 GPU 圆面调用不会发布该行星或环的命中区域。

## 检查和证据边界

- 定向命令（`apps/wechat-miniapp`）：`node ../../tools/run-node.cjs --import tsx --test src/features/sky/sky-planet-disc.test.ts src/features/sky/sky-object-picking.test.ts`，10/10；包括实际环尖点选、露出环点选及地平线下原线段拒绝。
- `npm run typecheck`：退出 0。`npm test`：816/816。`npm run build:weapp`：退出 0，仍有原有 CSS 顺序、资源建议体积与异步块警告。
- 修改 owner：`sky-object-picking.ts`、`sky-scene-render.ts`、`sky-planet-disc.test.ts`；持久规则位于 `project_context/architecture/runtime-and-domain.md` 的 Celestial object selection and lazy information / Picking 段。
- 正式 DevTools 先前对当前土星画面发过 canvas 合成 `touchstart/touchend`，环尖与中心对照均未出现资料弹层。构建后重进示例点 Sky，手动视角、18:00、土星检索→定位、四次合成双指到0.15°；此时Canvas逻辑尺寸390.4×844、定位标记在约(195.2,422)，列表和资料卡已关闭。再次对Canvas在(195.2,422)分别发单指`touchstart/touchend`和`tap`仍无资料或重叠候选。**对照**：同页点击`.sky-located-object`定位按钮确实出现`.sky-object-modal`，随后已关闭。双指事件能改视场，但现有单指合成输入仍未证明触摸事件字段、快照和React页面handler的完整路由；不得把空弹层归因于本次几何修复或宣称UI点选通过。本轮代码+构建证明命中计算链，不证明Canvas触摸到弹层的组合；Canvas遮挡WXML与Android来源返回Canvas的旧故障仍开放。正式目标手机/iOS、点选交互与性能还需验证。

随后用`automation_evaluate`在**运行时**短暂包装当前页`eh`，只记录Canvas事件字段，证实工具生成的`touchstart.touches[0]`为(195.2,422)，而相同输入的`touchend.changedTouches[0]`实际变成(0,0)。因此页面判定移动距离约465px、拒绝单指点选；原跟踪包装已恢复。再用另一个仅针对Canvas触摸结束且工具送来(0,0)的可逆包装，把结束点替换为本次真实开始点，令现有页面handler处理原来的时间/目录/绘制快照。在**同一正式源码和0.15°画面**上：(195.2,422)圆面中心打开资料；(206,390)可见主环上端、距中心约34px，打开标题“土星”的资料；(270,390)空白天区未出现资料或重叠候选。原始427×920画面在ignored `artifacts/miniapp/cloud-sky-native/c07-painted-pick-trial-2026-09-24.png`（SHA-256 `29AA1FFE76BA7D177328E8665FFBFE85111419EE3008D31CA280F4311E84CE58`），环和圆面位置已目视确认。包装累计只修正3个工具事件，最后恢复页原始`eh`并删除临时字段；源码、构建包及共享服务未变。

这个受控试验补上了**校正合成事件后的Canvas→React点选→资料状态**，但并非未经干预的微信触摸输入。开发者工具本身仍可能让Canvas覆盖资料WXML，结构化弹层出现不等于视觉合成通过；Android/iOS实际手势、Canvas/控件层级和帧性能仍开放。下一次不应把工具错误的(0,0)事件再当产品点选失败。
