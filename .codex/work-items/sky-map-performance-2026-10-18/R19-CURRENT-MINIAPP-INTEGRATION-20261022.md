# R19 当前 Mini Program 集成检查（2026-10-22）

## 当前结论

2026-10-23后续My导航/有效前台整合已变更生产源码。**当前结果以[本批整合](R19-MAP-MY-INTEGRATION-20261023.md)为准：2783项/2782通过/0失败/1原输入条件skip，正式类型与完整隔离WEAPP构建通过，目标手机未验。** 下文保留原gen8/Picker各阶段的真实失败和修复，不当作当前导航候选结果。

gen8 构建后运行了一次现有完整入口 `npm run test --workspace @starward/wechat-miniapp`，结果为 2,757 项、2,739 通过、17 失败、1 跳过、0 取消，耗时 86,335.8812 ms。私有原始日志为 `r19-ui-20261022/ui-gen8-miniapp-suite.log`，完整失败块保留在同处 `ui-gen8-miniapp-failures.private.json`。这次全量不是通过；失败须按实际 owner 处理，不把 17 项直接等同产品缺陷。

2026-10-23 合批完成：同一完整入口 exit 0，2,757 项中 **2,756 通过、0 失败、1 跳过、0 取消**，耗时 82,983.3404 ms；小程序 TypeScript exit 0。以下修复仅改变测试边界，不改变 gen8 生产源码或已生成的手机候选。原 17 项失败均为本批迁移后未跟随的测试边界，没有据此另改生产。

## 已完成的责任修复

- [共享按钮测试边界](R19-BUTTON-TEST-BOUNDARY-REPAIR-20261022.md)：5 个旧测试文件共 9 项失败，原因是未接入真实 SharedButton。共享 adapter 执行实际按钮 facade、保留各原生端口及所有原业务断言，相关检查 14/14 通过。
- 空气质量 effect：原夹具为所有 effect 共用一个依赖槽，新增布局通知 effect 后误触发重复通知。改为按 hook 顺序保存依赖，保留失败/部分有效值、通知去重、重试和隐藏恢复断言。
- 地平线 Canvas：新增 passive effect 未在旧夹具声明。按实际 effect 顺序分别排入 layout 与 passive 阶段，并保留 cleanup；旧点迟到、隐藏释放位图、返回重绘及有限重新显示检查原样保留。
- 默认区域返回：Auth 已经改用公共 primary dispatcher；夹具只传 native switchTab 使真实回调捕获到缺少 owner 的 ReferenceError。现以既有 `primaryPageNavigationForTest` 执行实际 dispatcher，只替换原生失败端口，继续验证先重置、再导航、失败反馈与锁释放。
- Map 资料入口：真实来源跳转已由公共 `navigateToSource` 持有。新增 `source-navigation-test-support.ts` 加载实际 owner、实际文档验证，只替换 native navigation/current identity；共享导航自身原测试及 Map 资料入口共用它。Map 入口改为等待实际 async 返回，保留同地点/Context、合法攻略和拒绝无关攻略断言。
- [来源组合检查](R19-SOURCE-TEST-BOUNDARY-REPAIR-20261022.md)：两个原失败文件改为执行当前实际文档 owner、SourcePage 和内容/署名/查询链；光学与红外的精确版次、完整原文、复制参数、部分资料重试、隐藏及换版后旧回调隔离均保留。所属消费者 32/32、正文相关 12/12 通过，不把交叠的子集重复累加。

root 对应 5 文件（含共享来源 owner 的既有测试）共 27/27 通过，0 失败/跳过/取消，约 2,135.1746 ms。未用空函数绕过来源、删除恢复检查或恢复已退休生产路径。

## 最终检查与原件

全量期间未继续修改被测源码。共享导航检查改为真实 owner 后，原先 `any` 端口隐去的文档 `sections.kind` 推断错误通过 `satisfies SourceDocument` 收紧；没有把生产类型改宽。相关命令：

```powershell
npm run test --workspace @starward/wechat-miniapp
npm run typecheck --workspace @starward/wechat-miniapp
```

私有同目录日志及 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `ui-gen8-miniapp-suite.log`（原失败） | `eeb5aa542a47b18067dacf89c5ccc859389d3c16da2dcc5eddd2f5c3f3e681f0` |
| `ui-gen8-miniapp-suite-repaired.log` | `772d3ce825e515ff692e5ca9c7d2b935a128af94899f1dc6ba72c0b34fab176c` |
| `ui-gen8-miniapp-typecheck-repaired.log` | `1e7137e434d0121bb69677a53d7a32442466d7dde41d1b63d2e7fd29cbb361e7` |

唯一跳过是既有 `sky-sdss-optical-page.test.ts` 的真实 science-publication 输入条件：当前未提供 `CLOUD_SKY_SCIENCE_PUBLICATION_PATH`。本批没有新增跳过、填造该输入或把该项记为通过。

## 证据边界

这是当前 Mini Program 本机集成通过，不关闭完整 H7 的其他环境/远端责任。目标 WEAPP 的媒体复制、Sky 正文、按压和导航验收仍各自保留，Node/DOM 受控端口不能替代手机结果。当前候选、扫码与设备资格只归 HANDOFF；PLAN 哈希仍为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`。

随后同日补入 [Picker 触发面按压](R19-PICKER-PRESS-IMPLEMENTATION-20261023.md) 生产变更，新增一个 facade 行为检查；当前最终源码全量为2,758项/2,757通过/0失败/1同一既有跳过，TypeScript和完整本机check构建通过。前文2,757项结果保留为此前测试边界合修的真实里程碑，不代替这次新源码检查；后续候选/目标未验仍保留。
