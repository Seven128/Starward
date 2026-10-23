# R27 在当前采用 UI 上的独立准备

后续状态：gen32冻结后，LIGHT与handle两项UI合修已在普通gen15/16实际复核及独审；gen32不含这些改动，下文“当前UI”指冻结时源码。后续[限定Sky适用性独审](R27-GEN32-APPLICABILITY-REVIEW-20261023.md)通过，但[实际官方预览拒包](R27-GEN32-PREVIEW-FAILURE-RESULT-20261023.md)为2081KB>2048KB，未绑定/Play。静态构建就绪不建立平台准入；不重发、修改或重建这一冻结代，原件继续保留，恢复工作只见HANDOFF。

## 结论与范围

2026-10-23。沿同一 Goal，仅把已独审的同一 R27 Query 回调观察重新接到当前生产源码，保留 UI → 叠层 → Sky 的顺序。**gen32 已完成准备、严格类型、Root完整构建/inspect与最终独审，当前为未激活的冻结准备。** 没有预览、发送或激活；普通 gen14 手机、服务、collector、账号、DB、缓存及 VPN 均未操作。Root inspect 后 `R17-NORMAL-A1-PREPARATION.json` 已指向gen32未激活准备；旧gen31记录及全部冻结原件先保全并继续保留。

此前 [R27 集成](R27-QUERY-CALLBACK-INTEGRATION-20261023.md)及[独审](R27-QUERY-CALLBACK-INTEGRATION-REVIEW-20261023.md)的正常语义、有限观察和能力边界继续适用；没有重做 107 项资格、扩大样本或改变正常 Play。当前 [SAO 供给就绪核查](SAO-CURRENT-SUPPLY-READINESS-20261023.md)和[gen14普通Sky往返](R19-GEN14-SAO-NORMAL-RECOVERY-PHONE-20261023.md)独立保留其有限结果；历史暗星失败原因、完整 SAO、六字段、持有根及真实 OOM 仍未关闭。

## 有限入口与实际变更

仅编辑两个既有 task owner：

- `scripts/build-r17-normal-baseline-v3.mjs` 新增 `--current-ui`，只允许与 `--review-r27 --observe-a1 --usb-reverse` 同用。新目录固定为 `tmp/r17-normal-a1-review-r27-usb-current-ui`，generation 为32，单独短slot为`r17-a1-r27-ui-usb`，现有控制文案增加“当前UI”，binding 明示 `uiSource: current-production-source`。未带标志时的目录、generation、slot与选择语义不变，没有通用 output override 或新诊断模式。
- `scripts/inject-terrain-wait-observer.mjs` 的 `temporal_marker` 插入锚点迁移到当前 Map 的 `{pageVisible && !eventModalPresent ? <FloatingNotificationHost /> : null}`。保留这个完整前台条件及 `<TerrainWaitMarker visible={pageVisible} />`；`pageVisible` 继续来自当前 primary-navigation 的 Map foreground show/hide owner。没有恢复旧产品结构、改变 marker 的可见资格或编辑 `apps/**`。

R27 observer、links、schema、collector、采样、弱见证、Query 调用、原 20 秒同 run Pause、15 秒 metrics、90 秒 seal、两个原观察阶段及正常产品路径不变。59 份模板与旧 gen31 比较，仅上述 terrain task 插入锚点的 hash 改变；原测试文件未编辑。

## 准备身份与本机保全

新准备目录此前不存在；首次marker失败在目录写入之前，修正后prepare成功。Root首次build又在slot长度入口失败，随后沿原refresh-unbuilt保全未构建attempt并修短slot；同一gen32第二次build/inspect已成功。当前最终完整读回：

| 身份 | 当前值 |
| --- | --- |
| trial | `tmp/r17-normal-a1-review-r27-usb-current-ui` |
| generation / mode / variant | 32 / normal / baseline |
| buildSourceSha256 | `3808382a6b7fc8dee945b1bfe42e563fa6793182d80dd6a99253c58f4aa88c3c` |
| manifest SHA-256 | `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb` |
| source snapshot SHA-256 | `2eb1a6e84853ba908741cacc188834e0bffb79d27ebc68bec1a94eeee51c7b5a` |
| production bindings SHA-256 | `39a86ab1a43381455d31ad93dfed6c06697925ff8d68cf9b0af9219e3b201659` |
| production / prepared / delta files | 1597 / 1618 / 45 |
| builder SHA-256 | `c21ce55ecd1ae14c858ba54c9fac50c74eda680d28b7b76ea16c1cb3e925600b` |
| terrain transform SHA-256 | `1521d5183e2c513e48f4f770e96c87dddf4f8ddc5cb53efa0a8d231ca8bc2010` |
| bundle / files / bytes | `3bb55a21a8845b9367d0445113620be94cea95f42bc930070806d0014d7c3aa6` /344 /5,126,615 B |
| main / content / spot / sky | 2,073,782 /1,041,536 /612,076 /1,399,221 B；main余量23,370 B |
| source maps | 包外30件/7,611,176 B；手机两包内均为0 |

全部 production/source/template bindings 已逐件读回；Map源仍是gen14的`fb5a3d70b2ade5d8017d840ce595d386e05f79ffe9b1be415946c9515a7dfe98`。Root完整构建35.520s/10项既有warnings；原预算/production静态检查、API及resource的唯一编译origin、两份完整bundle和全部包外maps逐件读回通过，正式生产/准备/新增类型诊断仍为0。这是本机构建身份，不能冒手机运行字节/已激活。

私有 owner 为 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-current-ui-preparation-20261023`。修改前已精确保全 builder、当前 R17 准备 JSON、旧 gen31/gen30 manifest，扩展授权后也保全 terrain 变换及原测试字节。修改后归档当前两个脚本、新 manifest 和 delta typecheck；完整前后 readback 与失败/通过日志留在同一 owner。

旧 gen31 全 owned tree **2357 件 / 33,263,717 B，加 2 个依赖 junction** 的相对路径、字节hash、mtime/ctime与link target前后完全一致，tree SHA为`b3949b4de30773ad112e4142a785a58ac2c478dcb0412d94d526ecea03eca6d1`。Root构建后再次逐件核验仍一致。旧manifest仍为`34c003743125b49a507f8d935543fd82c87662be1de27e4ed14feba8344a63d5`；gen30 manifest仍为`36cd6c0fbd14451ad07fba4e63c7231990e3c9d40119a4e2ed9f1b150b395fbe`。旧R17准备JSON的`6dae5a0179307a066c1e83298e75f5e16f02c5ca35d9895d972bd7507dd6d4f9`原字节已保护，当前JSON仅由Rootinspect更新为gen32未激活。没有清理或删除旧/私有成果。

新`frozen-gen32-originals`已保全**2405件/34,215,768 B、2个共享依赖junction仅记引用**，包括完整owned trial源码/双包/maps、59份精确模板、builder/当前准备元数据/日志，逐件复制hash读回通过；manifest SHA `3eeb9a5ccd19ff14c4482ea5c8eebc67620338744da9388bb9d94c5ce80df955`。普通gen14完整feedback另有497件/80,219,016 B保护于`gen14-before-r27-current-ui-originals-20261023`，manifest`7238d10cfe9522ea83360f61b2f985c0efc352a62a3b7dce1d5c55e88adb8cae`；Root构建后实际fingerprint仍为原0f76b93f…/345/5,021,505 B。没有以此清理源session或发送新包。

## 首错与修正证据

首次 prepare exit 1，精确失败为 `terrain_wait_source_boundary_changed:temporal_marker`：旧变换仍匹配未含 `pageVisible &&` 的通知 host。没有写出新 trial。原 `prepare.stdout.private.log` / `prepare.stderr.private.log` 保留，不改写为成功。

Root 随后明确扩展授权，仅允许修这个 task-only 当前源码接线。已批量核对同组真实 Map gesture、enable、notification、native update 插入点及 marker 生命周期，未发现其他同类边界变更。原有 real consumer transform 测试在修前实际同错失败（1/1）；迁移此锚点后原文件 8/8 通过。再运行同一新目录的 prepare，一次通过，未通过回改生产或弱化旧守卫适配。

Root第一次build exit1，真实首错为`miniapp_isolated_check_slot_invalid`：新长trial名直接作slot超过现有31字符规则，发生在Taro配置入口，bundle/project均未创建、manifest.result仍null。四份失败原件/元数据546,369 B已保于`build-attempt-1`后，Root仅把currentUi的slot改为上述17字符固定值；不改生产guard。原refresh-unbuilt另保preparation-attempt-1，初始source b3479a55…/manifest7313a863…保为历史；更新同一未构建准备后第二次build/inspect通过。两次失败不改写为成功，也未重建已冻结gen31/32。

## 实际检查

| 范围 | 结果与限制 |
| --- | --- |
| 有限参数入口 | 8 项检查通过：缺 R27/A1/USB、其他 revision、重复、未知参数均在候选操作前拒绝；有效新/旧 R27 均通过参数阶段。使用刻意不支持的 operation，未执行候选写入。 |
| terrain 原消费者 | 修前当前真实消费者测试确切失败；修后 8/8，含当前源码语法、既有 cache/download/install 责任及拒绝普通仓库写入。 |
| 正常基线 fixture | 原 30 项事实全部 true，包括完整 setter/ref/identity、三个 null 退休、真实 accepted copy、请求/准备身份、20 秒同 run Pause、15 秒导出、hide/unmount/替换 run 及相同字节重试。 |
| R27 当前源可逆性 | 复用 `r27-memory-checkpoint.test.mjs` 的原 current page/hook roundtrip 单条，1/1；完整当前输入字节恢复、三个真实 page return 与 query body 保持。未重跑宽资格组。 |
| 严格 delta TypeScript | 生产诊断 0，准备源码诊断 0，新增诊断 0；原 strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes 均由现入口核验。 |
| syntax / diff / binding | 两个脚本语法与 scoped diff check 通过；全 production/source/template bindings、冻结树和保护元数据读回通过。 |

这些范围不相加，也不提供手机 WeakRef/真实关联、实际新 collector 落盘、观察成本、流畅度或内存验收。PLAN 未编辑，SHA 仍为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`；HANDOFF 由 Root 统一更新。

## 下一实际边界

### Root 独立接线复核

Root 已直接比较修改前私有原字节与两个当前脚本，完整读取 marker transform、builder 参数/目录/绑定/prepare/build/inspect 责任，并读回当前生成 Map 的 marker、通知、前台事件和 Back 接线。有限标志只新增固定新目录及 generation32，其他模式不改；没有任意输出路径或新观察机制。当前 Map 的 pageVisible/primary-navigation 条件完整保留，marker 仍有其可见资格。直接逐件核当前1597份production与1618份prepared bindings、manifest身份及30项事实/严格类型输出均一致，未发现新增P1/P2。此为对代理实施的独立源码/生成结果复核，不冒目标执行或产品收益；不为相同输入重跑宽检查。

Root短slot修正后再取得[新独立最终审查](R27-CURRENT-UI-FINAL-REVIEW-20261023.md)：完整最终code/1597 production、1618 prepared、59templates与生成Map/实际config规则直接核对，无新增confirmed P1/P2；不把其结论代替Root双份包/maps读回或手机。

当前gen32已经build/inspect并冻结，**不得再prepare、refresh-unbuilt或build这一代**；旧gen31同样保留不可重建。下一次必要观察先核UI/叠层依赖、当前普通候选/服务及collector版本，再沿原owner处理明确的未激活准备；本次没有重载collector或发送手机，不把隔离编译晋升为优先级完成。

仅有 builder 所需的公开选择字段保存在私有 `build-origin.private.json`：`apiOrigin=http://127.0.0.1:8798`、`transport=usb-reverse`，文件 SHA 为 `46c8fdf375608dc0c6e3a6120a10c465f001049fed05f82f3322234db35a825c`。它是明确 build-only 输入，没有复制账号配置或凭据，不是服务/设备 readiness 证明。

Root已执行并成功的构建/读回入口如下，仅作已执行证据，**不是待执行命令**：

```powershell
$env:STARWARD_R17_RUNTIME_CONFIG = 'C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-current-ui-preparation-20261023/build-origin.private.json'
node .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-normal-baseline-v3.mjs build --review-r27 --observe-a1 --usb-reverse --current-ui
node .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-normal-baseline-v3.mjs inspect --review-r27 --observe-a1 --usb-reverse --current-ui
```

`inspect`已由Root在保护旧记录后更新当前R17准备JSON，状态仍为`BUILD_READY_NORMAL_A1_UNACTIVATED_PHONE_UNVERIFIED`。build/inspect成功不证明真实采集通过。普通gen14与全部冻结原件保持，未改变当前优先级或关闭完整Goal的任何未撤销义务。
