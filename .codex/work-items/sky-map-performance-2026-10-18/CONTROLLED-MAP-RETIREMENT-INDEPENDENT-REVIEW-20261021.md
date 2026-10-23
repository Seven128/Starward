# 受控 Map 退出清理独立审查

2026-10-21；审查当前未提交源码，只写本报告及相邻 JSON。未操作设备、IDE、服务、构建、上传或提交。手机仍是 r18，以下不是该手机已运行新 Map 实现的证据。

**结论：本次受控 Map → Sky 与三处显式 Map 重建整合，未发现新增 P1/P2。** 最终 hook 已包含“开始清理即撤销 installed/presented”修正。相关三个测试文件独立复跑 **47/47 通过**；可以继续同源候选的实际设备验证。该结论不关闭无条件外部销毁、原生回调始终不返回或完整无泄漏验收。

## 已核对的责任链

- `map-ground-overlay.ts:228` 的可取消 suspend 复用原队列；只有本次 generation 仍当前且所有 slot 的真实 remove 已确认，才返回 complete。它不终止 coordinator。普通失败保留 ID/文件 pin；新目标使旧清理资格失效；晚到 add/update 清理仍绑定原 File 对象，不处理已重用 ID 上的新文件。
- `use-map-raster-installation.ts:86` 同步暂停后续 effect 装入，并立刻撤销图像来源认证；取消早于 remove 完成也不会继续宣称旧图已显示。恢复读取 latest 的 target、visibility、pending、runtimeError；旧 ticket、旧 coordinator 或旧 Map generation 不会恢复新入口。实际安装回执才重新认证来源。
- `index.tsx:968` 同时开始地形、光害清理，以两者完成作为统一前置条件。`retryNativeMap` 是三个显式重建入口唯一调用点；失败保留当前节点，取消/隐藏不重建，重复点击合并，新 Sky 清理可以取代旧重建清理。
- `openSkyPage` 在清理后再次核当前入口及两个 ticket，再保存返回状态、创建 journey 和发出 redirect。Back、scope 改变、10 秒 blackout 超时后的晚到清理不能发出旧路由，也不能恢复新入口。已发出的 redirect 没有取消 API：超时仅解除遮罩，已清空节点继续暂停，新 Sky/reload 不抢占，实际失败后恢复最新目标；成功不重新装入待卸载节点。返回状态及 journey 的失败撤销有对应 ticket 身份约束。

## 对既有文件预算故障的局部反证

另以当前真实 coordinator 与 raster resource owner、合成原生/文件 adapter，复用既有 8 文件预算机制：9 轮各执行 acquire → add 成功 → reader.release → suspend/remove 失败 → 同一 owner 重试 remove 成功 → dispose。每次失败保持 nativePins=1、complete=false，成功后 nativePins=0；第 9 次 acquire 正常完成。结束前 entries=8、readyBytes=800、nativePins=0；close 后全部归零，9 个合成文件均被移除。没有读写真实文件或设备；100 B 是测试输入，不是内存测量。

该结果与页面/hook 的暂停和当前性检查共同支持受控退出不再因一次失败就抛弃可恢复 owner；它不证明真实手机的原生/GPU 资源释放时刻。

## 保留的边界

既有外部 teardown P2 仍需保留：hook effect cleanup 第 84 行仍丢弃 dispose 返回的 remainingIds；未经此受控前置条件的强制卸载，若 remove 失败且没有可信销毁确认，不能声明 pin 债务已回收。本修复用“保持旧节点、清理成功才退出”覆盖受控路径，没有提供所有平台销毁的确认事件。云层使用独立 polygons 生命周期，不能由两个 raster pin 归零替代其资源验证。

页面与 hook 检查分别使用真实声明抽取和 hook 环境模拟，不是完整 React/WEAPP 运行时。真实同 ID src/bounds 更新、双着色/空白、Map → Sky/返回、持续快速移动缩放后的资源回落，仍需当前候选。Sky 内存/native exit 的原因也未由此解释。

读取了 AGENTS、global、完整 PLAN、开发 skill/性能分析方法、两个前置叠层审查以及当前调用者、generation、blackout、返回状态和资源 owner。检查命令、结果及被审字节 SHA-256 见 [相邻 JSON](CONTROLLED-MAP-RETIREMENT-INDEPENDENT-REVIEW-20261021.json)。
