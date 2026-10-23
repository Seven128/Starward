# R19 来源页返回：面板滚动独立诊断

2026-10-22。独立只读审核；未参与修复实现。读取普通来源导航、Map 生命周期/选点/底部呈现、正式点与私有提案面板、共享正文/照片位置 owner 和现有回归，并实际查看主代理提供的三张手机原图。仅维护本报告，未操作设备、IDE、服务、Git、生产代码、PLAN、HANDOFF 或 durable Context。

## 已确认结果与边界

本次采用真实页面的用户要求继续适用。真实来源页能打开，不能据此认定返回阅读位置已经保留。gen4 同一来源往返仍有失败：从正式点大档正文的近期天气区域打开来源，系统 Back 后返回照片开头。档位仍大、选点仍为“隔离测试·星河平台”；这组静态图不能测量 native scrollTop、证明组件是否曾重建，也不能确定原生事件发生顺序。

原图均位于本机私有 session `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/starward-device-test-3eDXqh/`，本报告未复制或上传图片。

| 阶段 | 文件 | 实看结果 | SHA-256 |
| --- | --- | --- | --- |
| 打开前 | `screen-c950be89-2329-49c9-84d8-3864b5feb971.png` | 正文停在设施资料末尾、近期天气与地形标题附近；近期天气失败提示及来源按钮可见 | `31ecd637baec14bffab0cc5cfb07eb563c14cbea46f43de20c1a03f80116df14` |
| 来源页 | `screen-b6b9dedb-78f5-433e-97ef-047c8ad00887.png` | 独立“说明近期天气数据范围”页，完整来源/时间/精度/限制及说明正文 | `6d5512cc8aab14a911b48845dbec5cd4d9dd96dfd1ca094a0519901e6ca93926` |
| 返回后 | `screen-cf868d7e-3e71-4bc7-807c-f77ca7e60ee1.png` | 同一点的大档面板回到照片与地点资料开头；底部有天气/AQ异常通知 | `64769ff81b1aad0a6a0b27f00697ea22f64cb6bd7f3e8f2272170764e3184457` |

依据为 Screen Contract 的“返回同一有用父位置”、最新用户统一来源真实页修订，以及既有 `usePanelReturnPosition` / `spot-media-gallery-position` 责任。此失败不要求新 router、全局阅读缓存或第二份 Map。

## 代码可确认的责任与缺口

- `services/source-navigation.ts` 只向受限的来源 route 发一次 `Taro.navigateTo`，普通文档用该次原生 EventChannel 交接；不改 Map 选点、档位、图层或时间。`SourceButton` 自己的 hide 仅停止入口资格。
- `pages/map/index.tsx` 的 `useDidHide` 停止交互、取消 focus/定位、递增导航 epoch，并置 `pageVisible=false`。正式点面板的 React render 条件是 `bottomPresentation === "spot-panel" && (selected || selectedProposal)`；没有按 `pageVisible` 卸载、visibility key 或对普通来源执行 redirectTo 的路径。原生 Map 的 key 仅为 Map recovery generation。现有代码不支持把“普通来源导航必然卸载面板”当作已证原因。
- 对仍有效的正式点，hide 不清 selectedSpotId、selectedFallback、panelExtent 或 bottomPresentation。无有效选点、账号/私有提案变化等清理分支有各自资格，不能为修复来源返回而绕开。
- 修复前的 `usePanelReturnPosition` 只消费初次 mount 的 `restorePosition`；它没有 retained-panel hide/show 的快照冻结、ready 准入或恢复确认责任。正文/照片 `record` 可接纳任意同身份有效数值，ready 只影响初次 restore。
- 修复前 SpotPanel 本地 effect 在 hide 撤去 `scrollIntoView` 与 optional `scrollTop`，show 后用固定 200ms 发恢复值。`onScroll` 的 visible 判断来自该次 render 的闭包；共享 owner 自己不拒绝 hidden/旧 render 的回调。显示首帧、placeholder/布局重置等 0 值可能在有效恢复前成为新位置。源码可以证明这个保护缺口存在，不能证明上述某个原生事件就是本次唯一触发者。
- 原章节 anchor 与数值 return command 是两个互斥的原生定位命令。普通来源返回不应重新提交旧章节 anchor；有效的新章节选择则必须能主动接管恢复，不能被返回保护永久吞掉。照片横向裁切属于同一返回位置责任，但媒体集合变化应归零，不能把旧照片偏移移植到新集合。

## 现有测试为什么未覆盖该失败

原 `use-panel-return-position.test.ts` 覆盖重新 mount 等待内容、双轴恢复、身份/媒体更换和旧身份回调，没有 retained hide/show。

原 `panel-section-sync.test.ts` 的返回测试只抽出本地 effect：先执行 show effect 捕获 620，再把 ref 改 0 后触发 timer。它验证闭包中的值不会随 ref 再变，但没有 show effect 之前的 0、未 ready 的内容、共享 record 和 gallery，也没有 native 恢复命令应用前/后的回调。该通过结果不能关闭本次真实来源返回失败。

普通 `scrollTop` 记录仍应只写 ref / Map 快照，不逐帧回发命令。已有测试和生产注释明确提醒 optional native prop 的撤去可能归零，因此“触摸接管”应解除恢复保护，不能在每次触摸时机械撤去已发的 `scrollTop`。

## 最终修复独立审核

主代理宣布生产 diff 静止后，已重新完整读取共享 hook、受影响消费者与回归改动。该局部最终代码未发现确认的未修 P1/P2；这只关闭本次代码审查，不关闭手机返回失败。

- `usePanelReturnPosition` 现在同时拥有初次重建与 retained hide/show：hide 在共享位置 owner 内保存双轴快照，hidden/尚未 ready 期间拒绝位置回写；只在可见且实际内容 ready 时发恢复命令。
- hide/show、地点或媒体身份变更递增 epoch；回调核对其所属 render epoch，避免同一身份经过隐藏/返回后旧回调重新生效。正文、照片各自保有恢复目标，在对应原生位置确认或有效接管前，恢复命令之后的错误 0 不覆盖快照。
- `takeOver` 仅退役待恢复/确认保护，不撤去当前 native prop；普通触摸不再因机械删除 optional scrollTop 而归零。章节 effect 明确接管后再按原责任切换到 scrollIntoView。普通 native scroll 仍只记录位置，没有逐帧回发 scrollTop 或新增查询/缓存。
- SpotPanel 已退休本地 200ms 返回恢复。其 onScroll 先取得共享 owner 的接受结果，被拒事件不更新章节或排定 layout 刷新。照片 strip 同样使用共享接受边界。
- 私有提案面板也由 Map 传入 visible，复用同一 hook；gallery 被拒后立即返回，不再回写 mediaWindowStart。账号/提案/照片集合 identity 与 Map 原有授权清理未被替换。
- 原 mount 恢复与身份/媒体替换回归保留；新 retained 回归包含 hide → 旧 0 → show 未 ready → 0 → ready → 0 → 当前目标确认 → 旧 callback/takeOver → 当前正常滚动。旧 callback 放到当前确认之后，可以区分 epoch 保护与仅靠目标确认过滤。触摸回归明确要求命令仍为 620，随后能接纳 650；章节原覆盖保留，并检查主动接管及被拒 0 不触发章节/layout 更新。

施工中一次只读软件序列实际执行到 hidden / 未 ready 的旧 0 回调，保留 620 / 198.3；当时 hook SHA 为 `ef3f46f0bfdb134b009fbbdde8ddcb3607550f2be21456780028c7d2cdcecd76`，该序列早于最终 ack/epoch 完整修复，不冒作最终测试。最终 26/26 局部行为及 TypeScript 退出 0 来自主代理执行报告；本独审未重复运行相同检查，也不把其结果写成审查者自己执行。

最终独审输入身份：

| 文件 | SHA-256 |
| --- | --- |
| `use-panel-return-position.ts` | `1b864457feee5584e8dbba68c7a541ca524dac6123d2f51652d0f28ab91f264b` |
| `spot-panel.tsx` | `9d96adde4d97408e0f2d71290be2517c917b7365a0fc36ebd31bcd8b38c29211` |
| `pending-proposal-panel.tsx` | `25c63c634a73d2b39573aa67bcc92dc3f31ff8c13a72ee0514fce6dd83d7c830` |
| `use-panel-return-position.test.ts` | `f2b444a774ef20aca6c6ca2c4b6903d76cf540d191eb9c97941de4b8fa6fadb1` |
| `panel-section-sync.test.ts` | `7e0bc5dce2bbcedbc59de872a29436b64b42bf48ebc604df11b88a67c1db1d39` |

## 尚未关闭的目标边界

本独审未操作新构建或手机；gen4 来源往返滚动失败仍为 FAILED。主代理应沿原官方普通预览交付修复后的完整候选，复验同一大档正文来源往返是否保位置，返回后继续滚动/再次来源往返与章节接管是否有效；有照片横向裁切时检查同一共享责任。可复用 gen4 已确认的来源正文和层叠/时间事实，不因这次修复重跑无关采集矩阵。

如果新候选仍失败，应以首次失败边界再定位，不能把本报告的代码保护或模拟序列认定为真实原生行为。历史失败与原件继续保留，不倒填通过；新的目标结果与整个 Goal 的其余 UI、性能、内存义务仍归原任务 owner。
