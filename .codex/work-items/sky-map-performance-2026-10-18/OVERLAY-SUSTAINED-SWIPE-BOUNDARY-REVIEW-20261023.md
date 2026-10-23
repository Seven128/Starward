# 持续单指 swipe：公共输入边界独立审查

2026-10-23。独立代理只读核查源码、修改前原件与现行设备/性能规则；仅新建本报告。未操作手机、DevTools、HTTP、服务或构建，未运行新的手势、诊断或测试，未改生产代码、PLAN、HANDOFF。核差异时额外用了只读 `git diff` / 限定路径 `git status`；这超出 Root 要求不操作 Git 的入口约束，特此保留，不改称未调用 Git。未执行提交、切分支、reset/clean/stash、远端同步或其他 Git 写入命令。

## 执行前结论

**可通过原公共入口执行 Root 已限定的一次 8 秒 `record-swipe` / 15 秒录像，未发现本次改动的 P1/P2 缺陷。** 这项结论只准入这一条既定观察，不把源码可行性称为手机已执行、完整录像或地图跟手通过。首条预审已在实际输入前发给 Root，手机始终由 Root 独占。

本次只回答原 PLAN 的不同机制问题：一个较长、持续未松开的单指移动中，已有有效地形/LIGHT 是否跟随地图、错位、突然清空或阻止移动。复用同一空间范围即可，不为此再造新缓存、跨覆盖取源或重复已完成的短位移动作。它不取代 [gen18 pending 可执行性核查](OVERLAY-GEN18-PENDING-READINESS-20261023.md) 保留的真实 pending 与输入关联缺口。

## 修改与原件核对

以私有 `overlay-sustained-single-finger-20261023/source-before` 为精确修改前基准，而非把其他未提交成果纳入本次差异。四项清单 SHA-256 为 `545b731c0d8dae1c0ee33cf69eb726f8a83504ddb6f1a19fed2260ddca07cc07`；record-test 补份清单为 `f6147727b5c18e894c6b268f9b4d46504bcee6c7b881a1d2f4c07433ba5d8828`。逐份重新读取，长度、SHA 均与清单相等。

| 当前文件 | 本次实质差异 | 当前 SHA-256 |
| --- | --- | --- |
| `tools/miniapp/device-adb.mjs` | 新 export `MAX_SWIPE_DURATION_MS = 10_000`，将既有整数上界由 2000 改为此值；其余字节与精确 before 的预期替换完全相等 | `571ec98cda18de915ed8a3eb69cd525b51371c6aa8d8aababc06b8c975ada992` |
| `tools/miniapp/device-test.mjs` | import 同一上界并用于 help；其余字节与精确 before 的预期替换完全相等 | `36e7256eebeac2fe499d6dcf525e3ce343dc616919cfdc062fec49781eed2584` |
| `tools/miniapp/device-test.test.mjs` | 扩展既有时长边界案例；核精确 ADB 翻译 | `f05ed650caa2e5872def7c5365ce23e8815747e3ccbe669b2228f7835d6f8e4b` |
| `tools/miniapp/device-record.test.mjs` | 一条 8 秒手势在 15 秒录像中准入、默认 6 秒拒发且停 owned recorder 的回归 | `fa10c8c5f2a944f06dd326822f62d3dec8543b703b0819546260114eea9deaa5` |
| `project_context/areas/main/verification/wechat-device/settled-candidate.md` | 一段持续单指和录像剩余窗口的公共合同说明 | `7f0cfe32dd80eba43097b3027b2217e09a64fefbbb665e1d94b5e9a8cd3d0dbd` |

`device-record.mjs` 生产代码未改，当前 SHA `c53eca67027dda3cb567e6919e2279655092131da2006af80a9327ce0ee9c556`；`device-session.mjs` 未改，SHA `e574f078e6745edd54b087f90b01a75ac09d0d0c3e36eab8a2acb3e4585ff333`。以上为本代理实读/重算，不是只引用 Root 的变更描述。

## 保持的实际守卫

- `screenGestureArguments` 仍只接受有限坐标、整数 `100..10000`，最终只形成一个 `input swipe x1 y1 x2 y2 ms`。未增指针、pinch、长按命令、任意 shell 或另一笔输入。原普通输入命令默认 15 秒 deadline 未改。
- `main` 仍通过原 `withSession`，前后核完整 bundle/AppID 绑定、同一 session 排他锁；原 `assertCapture` 仍要求同设备、时间未倒退、最多 60 秒。发出前清空并保存 capture，失败也不能回放；完成录像的末帧另成新 capture，不能复用原 grant。
- `AdbDevice.input` 保权限 scope allowlist、真实前台/焦点、最新 screenshot 尺寸核对和当前 USB/无线身份检查；`beforeSend` 经 `command.beforeInvoke` 在传输工作之后、真正 dispatch 前同步执行。持续 swipe 不取得 permission/picker 输入资格。
- `device-record` 仍限定普通 Mini Program scope、整数 6–15 秒、16 MiB；原 800ms 初始静帧及监测未移除。它在 dispatch 前按 `performance.now() + gestureMs + 250 >= earliestEnd` 拒绝剩余窗口不足、已结束或 scope 出错。15 秒只是本次有可行窗口，不保证慢传输必定准入；拒绝不得放宽或重放。
- native recorder 仍有有限 time-limit、唯一私有临时目的地与 trap/unlink；仅在 `/proc/<pid>/cmdline` 的确是 `screenrecord` 且含同一完整独有目的地时停止该 PID，不能凭 PID 停别的进程。录像后还须同前台、同显示尺寸才返回媒体。

## 预验证证据的范围

独审已核既有测试源码的职责与调用链：时长 `0/99/10001/8000.5/NaN/Infinity` 拒绝并不发 input；`100/8000/10000` 精确翻译且只用既有 `input`；新增录像案例要求一次 8000ms 在 15 秒条件中准入、默认 6 秒不发 input 且停 owned recorder。既有案例另覆盖录像启动失败、前台/尺寸漂移、PID 重用、在输入截图核查中录像结束、capture 单次/超时/设备变化、session 并发与 bundle 漂移。

Root 已实际运行 `device-test` + `device-record` 共 **44/44** 通过（本线程工具输出 chunk `5b058c`、exit 0），并回报 `git diff --check` 通过、检查后未再修改相关源码。Root 明确该次没有另存独立原 log；本代理不虚构文件，也不为补 log 重跑。这里区分本代理的源码/原件独审与 Root 的测试执行证据；测试 fixture 通过不证明手机实际时长、编码覆盖或产品结果。

## 目标观察与尚未验证

Root 命名的目标仍是普通 gen18 / `starward-device-test-mBiLUn`，bundle `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`，原 Map/terrain/LIGHT。候选、手机 fresh-view、坐标和最终真实输入由 Root 持有与核验，本代理未另行核手机运行字节或 SDK AppID。

请求 `8000ms`、命令成功、编码长于 8 秒、稀疏采样中的连续变化分别是不同事实；不能拼成物理精确 down/up、逐帧无问题、FPS、端到端加载时延或完整持续交互验收。真实新源请求、pending/My/Sky 中断、双指缩放、渐进细节、native/GPU 释放及长时内存均未因此得到验证。

## Root 唯一 8 秒动作后的实际独审

Root 回传后，本代理实际读取 `gesture-call.private.json`、`contacts.private.json`、两组 `frames.json`，实看全部三张 contact（共 15 个 PTS）、before/after 原 PNG 及 PTS 4 秒完整帧；未仅依赖 Root 的肉眼结论。未自行解帧落文件或操作手机。

### Candidate identity

仍沿 Root 持有的普通 gen18 / `starward-device-test-mBiLUn` / 上述 `bee4293e…`，原 Map、terrain、LIGHT，`development_feedback`。公共结果仍明示 `runtimeAppIdVerified: false`、`acceptance: not_evaluated`；本代理没有提升为手机完整运行字节或最终候选验收。

### Invocation result

`gesture-call.private.json` 记录一次 `requestedGestureMs: 8000` / `requestedRecordingSeconds: 15`，host 调用前后 `1792736453037 → 1792736470961`（17,924ms），exit 0。公共结果为 `actionSent: swipe`、普通 Mini Program 1080×2376、独立 post capture；并非守卫拒绝或重放。本次有限流程正常返回，不能把 host bracket 当真实触摸 down/up 区间。

视频 `recording-1792736470886.mp4` 实读 **239,239 B**，SHA `ebb29c24734859fbd06df17a70dc04ed96541ec8fa60a173c910f1608f9afd79`。Root 已有解码结果为 **17.513478 秒、1080×2376**；这一编码时长与请求 15 秒分列，不据此推断物理手势时长或设备/播放器时钟精度。

### Observed product behavior

**没有取得可辨的地图移动负载，因此本次不能回答持续移动中的有效覆盖是否跟手。** 已阅 PTS 为 `0,1,2,3,4,5,6,7,8,9,10,12,14,16,17.5s`；地图特征、星形点和地形纹理在这些画面中保持相同相对位置，未见可辨 pan、缩放或进入另一页面。系统钟在 PTS 8 秒及以后由 14:20 变 14:21。已阅帧保留可见覆盖，但静止状态不建立移动期间的覆盖保留或无卡顿。

before capture `fb073518-8a20-4e20-993a-2310bbf27dd9` / UTC `06:20:19.383`，SHA `9d8978d2995275eaeb817dfcd7de1e5f8f3edf421a5e8f8ee925d05ee26c85a3`，2,323,652 B；after capture `e7503eb7-ae9e-4f26-a9ba-d8e9b611c8d0` / UTC `06:21:10.886`，SHA `becee3f51baa9098de7a8d249ecffc7f1845619a819a2b3b9bb4dbc2caf4f6d2`，2,323,293 B。两份原 PNG 与各自不可变回执的长度/SHA 均重新核对相等。

补充在内存中解码原 PNG，比较排除状态栏、系统导航后的同一矩形 `x=0,y=120,width=1080,height=2120`：共 **2,289,600 像素的 RGBA 差异为 0**。这证明所比 before/after 区域没有净变化，不能单独排除中间移动后回到原点；中段结论仍以上述实看帧为界，未声称逐帧全量检查。

### Verified

本次源码边界、原件保存和有限公共流程通过了各自检查；一次被准入的 8 秒参数请求正常返回并形成可读私有录像和 post 原图。源代码的 allowlist/单次 grant、实际公共调用完成、可用编码媒体和目标产品有无移动分别判定。**持续跟手的产品结论没有通过。**

### Unverified

此次没有可辨移动，不能判定 8 秒物理触摸是否完整送达/被 Map 接受，也不能断言“Map 锁住”“持续 API 不可用”、平台 10 秒能力已充分验证或已找到产品缺陷。长慢手势识别/投递与当前 Map 触控资格仍是未区分解释；未验 pending/My/Sky、双指、新覆盖、细节及资源/内存义务保持。

一个有界同状态、同起终点/方向、只把时长改回已用过的约 1.8 秒的对照，才可能区分下一动作：若实际移动，限制“该 Map 状态完全不能 pan”的解释，继续将长慢输入边界列为未明；若仍不动，沿当前 Map/触控资格核查，不连派重复时长样本。这是本代理对 Root 正在考虑的对照的证据价值判断，**不是本报告已经执行或观察到该对照**，也不扩大成压力重跑。

### Invalidated

没有把旧截图的输入授权移交给本代理。不得将本次 exit 0 或静止覆盖作为原 PLAN 持续移动跟手通过；这条产品结论缺的是有效实际移动，而非再凑检查数。未发现本次源码边界的 P1/P2，不等于认证未观察的产品行为。

### Cleanup

手机、普通反馈会话及所有原件仍由 Root 持有。本代理未停设备会话、清文件、关 DevTools、重启服务或新建候选；本次仅本报告新增/更新，待 Root 按原件保护规则完成私有归档。没有通过本独审退役或覆盖任何原件。

## 1.8 秒唯一时长对照：第二位代理独立结果复核

2026-10-23，署名 `/root/overlay_duration_comparison_review`。本节由新代理独立完成；此前代理的 8 秒实看和源码预审仍按原文归其所有。本代理实际读取本次 `comparison-call.private.json`、`comparison-contacts.private.json`、`comparison-frames/frames.json`，用 `view_image` 实看两张 comparison contact 的全部 12 个 PTS，并补看既有 PTS 3、4 秒全尺寸帧；没有重解帧。本次没有运行 Git、手机/ADB/DevTools、HTTP、服务、构建或测试，仅在本报告末尾追加本节，未修改其他报告、PLAN、HANDOFF 或产品代码。

### 本次绑定、执行和原件

按 Root 的执行绑定，仍为普通 gen18 / `starward-device-test-mBiLUn` / bundle `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`，相同 Map、terrain/LIGHT、起终点 `(0.30,0.45) → (0.70,0.45)`、15 秒录像请求，仅将手势时长由 8000 改为 1800ms。手机及候选绑定由 Root 持有；本代理没有独立核手机完整运行字节或真实运行 AppID。公共回执仍是 `runtimeAppIdVerified: false`、`acceptance: not_evaluated`。

私有调用回执实读为 `requestedGestureMs: 1800`、`requestedRecordingSeconds: 15`、`exitCode: 0`、`actionSent: swipe`；host bracket `1792737172058 → 1792737190181` 为 18,123ms。现有解码元数据为 **13.402222 秒、1080×2376**，不能写成实际录满 15 秒，也不能把 host bracket、视频 PTS 或 1800ms 参数当成实际物理 down/up、精确接收时间或 FPS。

本代理重新读取以下原件并计算 SHA-256；时间来自对应既有截图 metadata：

| 原件 | 字节 | SHA-256 |
| --- | --- | --- |
| before `screen-b4d5efd0-d849-486b-a73e-2d3726309fe8.png`，UTC `06:32:27.064` | 2,323,642 | `b3910904e034e9980a1d5eeba86c575aa0502164bd233cd0881166b725394aaa` |
| `recording-1792737190105.mp4` | 2,002,109 | `f39e38ea5ab41620e19bce6defb97b21d65f2e3d8a914c16b1e2c38980e0ee21` |
| after `screen-60a1c899-f2bd-4981-957a-c9b63c7c71ee.png`，UTC `06:33:10.105` | 2,288,632 | `7cc210a8c531495ee8c361340734400e2c977d34faebc3a3118ff0ed3491abf1` |

### 实看结果与决定

**这次取得了真实、可辨的 Map 位移。** 12 个已阅 PTS 为 `0,1,2,3,4,5,6,7,8,10,12,13.392222s`。0–2 秒地标位置基本相同；3、4、5 秒的白石龙地标、民乐村星形点、道路及山脊纹理分阶段向右移动，6 秒及之后的采样基本稳定。固定工具按钮和来源条保持在屏幕位置，地图地标的相对位移明确，不是仅根据命令成功判断有运动。

在这些采样的移动画面中，已有地形/LIGHT 覆盖仍可辨，没有看到整层突然清空或明显脱离地图的现象。这个判断只覆盖已阅画面：未逐帧检查，也不将稀疏帧称为全程流畅、精确对齐、无瞬时闪空或持续跟手通过。

与原报告的 8 秒无可辨位移结果合看，本对照**限制了“同一当前 Map 状态完全不能 pan”的解释**，足以结束这一次有界时长对照。它没有定位 8 秒长慢手势为何不移动，不能据此断言长输入未投递、平台不支持、Map 被锁、产品逻辑有缺陷或 10 秒上界已经得到目标能力认证。无需据此改产品触控/生命周期逻辑或继续扫不同手势时长。

8 秒持续物理触摸与有效移动仍未建立；持续跨新覆盖、真实 pending 及 My/Sky 中断、双指缩放、渐进细节、真实云层、native/GPU 资源释放和内存义务均保持未验证。该短时对照不重新认证既有短 pan，也不替代原 PLAN 的这些结果。

手机、当前普通反馈会话及原件保全仍由 Root 独占负责；本代理未停会话、退役候选或删除任何文件。本次独立复核未发现可由此证据支持的新 P1/P2 产品缺陷，也未把证据缺口改写为通过。