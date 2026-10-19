# Native ruler visibility boundary — r7

2026-10-19；只读边界调查，不是整体方案复审、源码修复或手机验收。设备、IDE、服务和候选仍由 root 独占。

**结论：r7 已证明“当前 surface endpoint 后定位/readback 成功”仍不足以保证首次可见尺正确；尚未证明微信因 `visibility` 重挂载。** 下一候选应稳定原生滚动节点，把刻度的呈现准入与它的布局/位置寿命分开；不再增加延时或第二滚动 writer。

## 已证事实与实际物化路径

- 候选 app `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1`，buildSource `528b3d8a99ca4c87958e10b01ac7af7040b031e5270e601e61bcf2b3949cf755`。冻结源/编译物在 `tmp/r17-normal-a1-review-r7`；[source-map-bindings.json](tmp/r17-normal-a1-review-r7/source-map-bindings.json) 绑定实际 bundle，不把微信重打包坐标当作 Taro 坐标。
- [r7 独立结果](R17-A1-R7-ENTRY-RESULT.md)及其外部原始归档确认：v2 ring 严格校验 98/98、零丢失，compact 15,846B。1032ms endpoint ready；1257ms fresh geometry 实测 offset0 / step17 / zero.5；1401ms 唯一 owner 调用 `scrollTo({left:561.5,animated:false})`；1527ms current offset561.422241，准入；1554ms JS props 的 ticksVisible=1；1596ms 另一 current read 仍561.422241，但 pending 已清；1597ms 非拖动 scroll 事件报0，之后至15011ms停止没有新定位/复核。row version1、48 rows、active=committed index33未变。
- 视频第21帧 PTS6.485833 才首次清楚出现刻度，已是12/14/16点；最后帧与独立终图仍错，而字段为04:30。**PTS 与 Date.now 未校准；1554ms 不是物理显现时间，1597ms 的事件值也不是其后 fresh offset。** 目前不能把实际回零的准确时刻、native instance 重建或内部 compositor 行为写成事实。
- 冻结 JSX 的 `OrientationTimeRuler` 将 `visibility:hidden/visible` **直接写在 enhanced ScrollView 本体**；同一 `ticksVisible` 翻转还删除后面的 `__position-state` Button。唯一 `__track` 为 flex / min-width:max-content，48个稳定 `${row.at}:${index}` key；当前 76Px viewport/track、34rpx tick cadence及 padding 经过当前 native 几何读取。ScrollView 没有 `scrollLeft` / `scrollIntoView` / `scrollWithAnimation` JSX prop。见[冻结源码](tmp/r17-normal-a1-review-r7/source/apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx)、[实际 JS/WXSS](tmp/r17-normal-a1-review-r7/project/weapp/sky/detail/index.js)。
- 物化 [base.wxml](tmp/r17-normal-a1-review-r7/project/weapp/base.wxml:89) 仍统一输出 `scroll-left="{{i.p31}}"`、`scroll-with-animation="{{xs.b(i.p33,!1)}}"`、`style="{{i.st}}"`；循环为 `wx:key="sid"`。因此“JSX 不传 scrollLeft”不等于模板完全没有该属性，但也**不能据此说 Taro 发送了0**。

## Taro / 公开平台约束

本机 `@tarojs/react`、runtime、shared、platform-weapp 均4.2.1。按实际安装源读取并对照同版本主源：

| 边界 | 源码能建立的事实 | 不支持的推论 |
| --- | --- | --- |
| React style diff | 相同值 style 不更新；变化的 visibility 交给原 element.style。没有随 style 自动 scrollTo 的分支。见本机 `apps/wechat-miniapp/node_modules/@tarojs/react/dist/react.esm.js:318,495`。 | 仅 React 再渲染就必然 remount。 |
| runtime style | 原节点 style 更新排队 `${element._path}.st`；单独这条更新没有显式改 scroll-left 或 child sid。[同版本 style.ts](https://github.com/NervJS/taro/blob/v4.2.1/packages/taro-runtime/src/dom/style.ts)。 | 原生 enhanced view 一定跨 visibility 保位。 |
| sibling 删除 | `removeChild` 会 `updateChildNodes()`，重新 hydrate 父节点完整 `cn`；页面批处理还会用 cn 更新覆盖其下独立属性更新。r7 删除位置状态 Button 恰有这个路径。[同版本 node.ts](https://github.com/NervJS/taro/blob/v4.2.1/packages/taro-runtime/src/dom/node.ts)、本机 runtime `:3675`。 | 全 cn 重发就一定换了原生 ScrollView；sid key 仍然保留。 |
| 默认属性 | shared 的 scroll-left 为 `NO_DEFAULT_VALUE=''`；weapp 没覆盖该默认值，模板不加数值 fallback；scroll-with-animation 默认 false。[shared components](https://github.com/NervJS/taro/blob/v4.2.1/packages/shared/src/components.ts)、[weapp components](https://github.com/NervJS/taro/blob/v4.2.1/packages/taro-platform-weapp/src/components.ts)。 | 证明未设置的 WXML 绑定在 native 内被忽略，或反过来证明其必定重置0。 |
| 公有 native API | enhanced + NodesRef.node 得到 ScrollViewContext；scrollTo 为 void，选项 animated/left，duration 仅iOS；没有完成/持久保位回调。NodesRef.scrollOffset 独立返回当前节点水平位置。[微信官方主源](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.api.d.ts)、本机官方 typings3.12.3 `:10250–10355`。 | setter 返回、一次 readback 或迟到 scroll 事件能认证后续物理显示。 |

微信 [ScrollView](https://developers.weixin.qq.com/miniprogram/dev/component/scroll-view.html) / [scrollTo](https://developers.weixin.qq.com/miniprogram/dev/api/ui/scroll/ScrollViewContext.scrollTo.html) 网页本次抓取失败；上表 API 事实用已读取的官方 `wechat-miniprogram/api-typings` 主源及本机官方包交叉核对，没有用第三方文章补成平台保证。[Taro 模板文档](https://docs.taro.zone/en/docs/platform-plugin/platform-mini/)也明确空字符串默认声明表示不设默认值。

当前 app/page JSON 未请求 Skyline；不能拿 H5 `taro-scroll-view-core` 的实现、另一 renderer 的表现或 Android 通用 View 的经验，解释本次 enhanced ScrollView 的内部实现。现有父 surface 的透明 unscaled preparation → 采用稿中心 `.76→1` / fade → 实际 endpoint，已由 r7 新鲜读/写/readback 覆盖；不能继续把这次失败归给 r6 已修的跨 reveal 回执复用。

## 仍可区分的解释

1. **真实位置在准入更新之后丢失**：ScrollView 本体的 visibility 变化、父 cn 重发/未设 scroll-left 绑定重物化，或 native 在祖先 transition 后继续结算，都可能参与。源码给出触发面，没有 native 内部证据确定哪一个。
2. **1597ms 是旧0事件**：1596ms read仍正确，事件无当前命令完成身份，不能仅按到达顺序排除旧事件。视频另行证明可见结果错误；可能随后才失位，也可能查询与实际合成不同。
3. **Native 对象或呈现对象被替换**：React ruler owner/rows未变，只排除了上层时间/row替换。Taro sid、公开节点/几何以及实际输出仍要关联；即便 sid 相同也不能证明底层 native instance 未重建。

## 一个最小候选与唯一下一观察

**候选只收敛同一个边界：保持原生 ScrollView 与同级结构稳定，呈现准入下移到固定 track/axis。** ScrollView 本体保持挂载、尺寸、class、style和单一 scrollTo owner；取消其 visibility 切换。用固定 track/axis 的 opacity 与交互盾表达尚未准入；恢复 Button 保留固定节点，仅改变自身呈现/命中，不通过增删 sibling 重发包含 ScrollView 的 cn。现有 surface 中心 `.76→1`、fade、真实 endpoint 重新测量、原始精确 rows、手势/inertia/取消/显式重试与六字段继续保留。这是当前 owner 内稳定 native 节点、独立绘制资格的常规写法；**不是微信承诺的修复，也不先采用一个新的滚动组件或样式变体序列**。恢复状态应限制在尺操作区域，避免继续盖住 current label；这是已见输出缺陷，不能用更久隐藏字段掩盖。

**唯一下一观察是一次 fresh 公开 selector batch：实际 offset、axis/所选 tick rect、id/dataset及 ScrollView/track/直接 surface 的 visibility/display/opacity/rect。** 若当前 r7 同候选的普通真机公开读取已可达，先在本次保留错窗读取，不增加动作/预览。如果通道仍停在既有失败边界，保留这个缺口；仅在下一次已经必要的候选中，把同一个至多一次查询放在首次准入后的第一个非手势偏离事件，不为它另造调试通道。可复用的现有有界 Page 更新观察仅记 native st / 其祖先 cn / 非空 scroll-left 与 sid变化的标志，绝不记录 payload；本次没有这些数据就仍未知。它只读不纠正、不轮询、不延时重试，不引入第二 writer；下一必要入口仍用同一录像核首次可见及终态，不重录原样 ring。

- fresh offset 和 tick 几何仍正确、事件却为0：支持迟到事件，不能据事件发起重定位；若视频仍错，调查查询对象与实际合成边界。
- fresh offset/选中刻度实际偏离：确认错误已经越过软件 readback；可见样式/rect/身份读回再决定上述稳定节点候选是否覆盖实际变化。若未来稳定候选仍偏离，且确认本体属性/包含它的 cn 未更新，就否定“本体 visibility / sibling 重发是唯一原因”，不要继续相邻样式试错。
- 未来稳定候选的首次可见和终态均正确且无偏离：支持这个完整稳定边界可作为修复方向，不能声称已拆出微信内部哪一个 primitive。一次正例仍只覆盖此入口；原跨日/取消等必要组合沿既定义义务验收，不重新扩展矩阵。

本调查未改 production、冻结候选、PLAN/HANDOFF，也未操作设备/IDE/服务；没有新增工具或Profiler。
