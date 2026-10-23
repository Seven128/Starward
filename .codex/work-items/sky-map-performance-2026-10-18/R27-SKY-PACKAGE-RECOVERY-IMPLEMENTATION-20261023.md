# R27 Sky 包边界恢复实施

2026-10-23。Task-only 合批恢复已完成源码与本机检查，**尚未 prepare、build、inspect、预览或发送 gen33**。Root 独占真实构建、双包/maps、官方准入、手机与服务；本报告不宣布包体收益、可推送、目标关联或产品内存问题已解决。

## 1. 恢复问题与范围

[实际打包边界](R27-ACTUAL-PACKAGING-BOUNDARY-20261023.md)已确认旧 gen32 同调用终态因官方 main source size 2081KB > 2048KB 拒包，及共享 hook 反向依赖完整 Sky adapter 的实际编译图。本批只恢复该任务接线，并在同一 R27 问题、原 8 个样本的新固定恢复代中排除无关 Map 任务观察。没有提高预算、改压缩、关闭产品功能、减少星/SAO/场景/样本或重试旧包。

## 2. 编辑前原件保护

编辑前，实际将改的 5 个既有脚本逐件以 create-new 复制至私有 owner `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-packaging-recovery-20261023/source-before`，大小/hash 读回一致；原 `manifest.private.json` SHA `b9cf29a39449401e8feff35ca329f024d1be587339dd7f3fd775bc86bf144a88`。新 ports 文件此前不存在。没有覆盖任何原件。

末次读回再次确认这 5 份原件、PLAN、gen32 manifest、当前 Map/index、两个已修 catchMove 面板及普通 use-resource-query 原生产文件保持原身份。PLAN 仍 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`，gen32 manifest 仍 `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`。该检查没有重建/inspect 冻结代，也没有读取或改变手机候选。

## 3. 共享窄端口与原生命周期

- 新 task template `r27-query-callback-ports.ts` 仅持两个固定方法引用及一次固定注册入口；无任何 import，无 Sky/Taro/QueryClient 运行时依赖，无 timer、cache、key、sample、payload 或产品对象历史。未注册时 wrapper 原样返回、owner 无操作；注册后仍原样返回同一个 wrapper，不产生额外 queryFn 包装函数。
- 仅新恢复代的共享 hook 从同目录 ports 导入。页面 begin/end/pageFn 仍从原 Sky adapter 导入；adapter 在模块内创建原 callbackLinks 后立即以其现有两个方法注册，早于页面 render 的执行。没有每次 render 注册或捕获产品对象的新闭包。
- 注册保留到模块生命周期；Pause 不解除端口，原 observer 的 tracking gating 阻止新增关联，drain 仍读实际 options/cache；最终原 release 清空弱见证，后续合法 start 复用相同固定方法并重置 run。没有另一套 start/Pause/drain/release owner。
- links 的输入类型改为 unknown；必须先与原全局 provider 做精确身份检查，随后直接通过该同一 `miniappQueryClient.defaultQueryOptions({queryKey}).queryHash` → `getQueryCache().get`。不使用 find/getAll，不改变 Query、GC、重试、调度或 provider。
- 原 page 三个 return、同 render aggregate 关联、原 8 ID、WeakRef/unsupported/unknown、active-5/首次 drain-10 及原观察时间、15 秒 metrics、20 秒同 run 产品 Pause、90 秒 seal、32KiB/单 flight/有限重送继续保留。旧未带新标志的变换仍走原 direct-adapter 接线。

## 4. 唯一新增固定代与 Map 边界

builder 新增 `--r27-sky-package`，只接受 `--review-r27 --observe-a1 --usb-reverse --current-ui` 同用，固定 trial `tmp/r17-normal-a1-review-r27-usb-sky-package`、gen33、slot `r17-a1-r27-sky-usb`（18 字符，符合原 31 字符规则）。未加新标志的目录、generation、slot、scope、正常 Play 时长与模板选择在已比较的 28 个旧入口完全一致，包含原 current-ui → gen32。

新代仍从当时完整当前生产源码生成，因此包含已有 DAY LIGHT 与两个 catchMove。仅不注入 terrain-wait/native-region task 代码、marker 及其 task 绑定；A1/正常 Sky metrics、全部 Sky 观察与正常工作量保留。当前 Map 的 6 个原 terrain 消费者在内存中的真实变换结果与输入逐字节一致，输出中无 terrain-wait/native-region 文件；没有裁剪生产 Map 的数据、相机或生命周期。

watcher 同增有限 `--review-r27 --current-ui --r27-sky-package`，路由新 trial 并严格要求其 manifest generation33；原 current-ui 仍路由 gen32。旧输出形状保持，新模式额外标明 skyPackage。未启动 watcher、修改 collector/schema/32 件限额或发送数据。

## 5. 实际检查与首错

| 范围 | 实际结果 |
| --- | --- |
| R27 core 与完整 adapter/共享 ports 消费者 | 19/19 通过；覆盖函数/返回值身份、两条接线、原 8 ID、同 provider 自定义 hash、禁止 find/getAll、两次原观察、保时间、Pause/drain/release/下一合法 run、原协议与历史 collector 兼容。 |
| 最后补齐 exact-provider 反例 | 原/新接线的 2 条 focused case 通过：无关 pageFn 不 lookup；匹配 pageFn 传入外部 provider 仍不读取它或全局 cache。与上行范围重叠，不相加。 |
| 原完整正常行为 fixture | 当前源内存中实际变换的原 30 项全部 true；包括真实 accepted copy、完整 setter/ref/三个 null 退休、20 秒同 run Pause、15 秒导出、hide/unmount/替换 run、不可变字节重试。没有删/skip 断言或恢复旧生产结构。 |
| 严格生产/准备类型 | 原 strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes 均保持；当前生产 0 诊断，实际完整变换的 virtual-host 准备源码 0 诊断。没有在磁盘创建准备代。 |
| 入口/兼容 | 28 个旧 mode 与修改前的实际声明结果完全一致；7 个非法新组合拒绝；4 次真实 CLI 均用 unsupported operation，仅核参数边界，无候选写入。 |
| 变换/源身份 | 原/新 page 与 hook 完整剥离逐字节恢复；当前 1599 production、1616 prepared、50 templates 为内存中检查数量，不冒 Root 后续真实 prepare 的 binding。 |
| 语法/保护 | 4 个 JS owner 的 node --check 通过；5 原件及 6 个保护文件读回一致；新 trial 仍不存在。 |

首次严格 virtual-host 检查保留为失败：生产诊断 0，准备 2 个 TS2339，原因是 unknown 输入经 `=== miniappQueryClient` 后只缩窄为 object。先以 create-new 保全当时 links、完整检查脚本与失败 JSON 到 `typecheck-attempt-1`，再改为身份 guard 后直接读取固定全局 provider。没有类型断言、放宽 strict 或更改 Query lookup 语义。之后严格检查及相关消费者通过。原失败 JSON SHA `088b2a9893d3360544f3d753188768ae07d9fa7cbbdb4d5a47a35495b3613ea4`，修后 JSON SHA `a0032cd0c207dab92015cd4f3269ea643dfda0859731f7cd04179c44949b5047`；不是产品/手机失败。

## 6. 精确改文件身份

以下均位于本 work item 的 `scripts/`；除本报告外，没有修改 PLAN/HANDOFF/INDEX/Context、`apps/**`、工具安装或其他人的文件。

| 文件 | 最终 SHA-256 |
| --- | --- |
| `build-r17-normal-baseline-v3.mjs` | `6ce85e3f766d67a2b52f3f54f7f36482f29866fc2a14644efdb8b8281072d07c` |
| `r27-query-callback-instrumentation.mjs` | `6e6f1996fdcb2502ad0e37ed73df6a1b87982241275ff5af676611b459831e76` |
| `r27-query-callback-links.ts` | `a5b3e2636910fa52e68acd4d2deb78c6909264b240ddc146fbfcc302427edb33` |
| `r27-memory-checkpoint.test.mjs` | `ace60e8dba76d1656ca0dff3cad4247f6987c729eeb27779591b1e13595b9dd2` |
| `r25-watch-checkpoint-arrivals.mjs` | `dc1b84f6db6667d8d52d62ad02aebc14af0cb0aeeb0eb4a34184614b7bf65959` |
| 新 `r27-query-callback-ports.ts` | `a3f69f243f1686989ec53a01c5eb20b40b15e19303a93749d0ad1ea5dfb83d58` |

所有日志、首错与检查脚本留在同一私有 owner；`implementation-final-readback.private.json` 记录最终文件和证据 hash。没有上传、提交或推送。

## 7. Root 下一入口与未验证限制

先独立审阅上述源码及原件。Root 才可在保护当前准备元数据后，使用既有公开 build-only origin 输入，对唯一新目录 prepare：

```powershell
$env:STARWARD_R17_RUNTIME_CONFIG = 'C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-current-ui-preparation-20261023/build-origin.private.json'
node .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-normal-baseline-v3.mjs prepare --review-r27 --observe-a1 --usb-reverse --current-ui --r27-sky-package
```

这是未执行的下一命令。后续 build/inspect 仅对同一 gen33 且同一组 flags，不能对旧 gen32 重建或 refresh。新包图须实际核：8 个完整观察/adapter 模块仍在 Sky、主包仅一个窄 ports 实例、同一真实 observer 的全部消费者接线、原产品工作量；再核双份 bundle、包外 maps、origin、原 budget/static guards、旧冻结与普通 gen16 不变。静态源接线不能承诺主包字节或官方准入。

只有同官方配置真正预览成功后，Root 才进入可见更新/bind和有限目标采集。手机的注册时序、有用非空 8 样本、实际关联、观察成本仍未验证；同 render 不等于 callback→aggregate 强边。本次没有新 retaining root、OOM 修复、完整 Sky/叠层/UI 或 Goal 验收结论。若新实际官方仍拒包，保全该新首错和包图再交 owner 定位，不接着串试压缩/disable 变体。
