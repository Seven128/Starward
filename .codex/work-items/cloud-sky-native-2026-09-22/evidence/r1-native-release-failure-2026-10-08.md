# R1：Canvas 原生释放失败的开发修复

当前自查复现 `releaseContext` 抛错后跳过失效通知、退出抛错并覆盖原绘制失败。原 `sky-canvas-lifecycle` 现在先清代次/ownership，释放错误由原失败出口报告，已绘事实仍失效；普通 request 不自动重建，明确 retry 或新前台生命周期才能恢复。合并失败保 `cause` 与 `releaseError`，不宣称异常释放成功。原 page 的 decode、renderer、surface 退休分别尝试，没有新增生命周期、缓存或改变渲染规则。

同一个现有测试文件先复现 19 项中 5 失败，再与原 surface 检查一起 22 项通过：hide/resize/unmount/dispose/无效 Sources 回程、迟到完成、失败报告和最新帧恢复。原失败日志保留。首次从 root 选择了 TS6 编译器，因旧 baseUrl 报废弃失败；按实际 app package 的 TS5.9.3 入口核完整小程序类型通过，没有改配置或压低类型检查。

复用 4 个现有 Page/build/host/memory 脚本，字节均不变；必要新构建为同一 523 源的当前完整原入口。正常一次和 native-port 故障一次，各 1 个 Sky＋2 个普通消费者：首有效画面约 875.9/668.2ms，图像完成约 2284.1/1748.4ms；9 PNG 共 1,234,674B，真实同刻 839/915 方向与 123/126 已绘 SAO。均有 29 实际 HTTP 交叠，没有 SAO 异常或未捕获 Page 错误；这两次不作性能 A/B 或容量判断，SAO视角/完成顺序不同不冒逐像素等价。

故障只用一个 task-local preload 在真实 renderer.dispose 之前抛错一次，原 Page 仍完成公开 Back/onUnload。实际读回三个 Page 栈空、canvas/设备/compass/appHide owner 均零，原离屏尺寸 0×0 且 GL contextLost=true；28 个合格 encoded cache 文件保留 1,397,615B。正常与故障 host/browser/sampler 均关闭，两个 Caddy 已停止。GC、driver 或全机物理释放没有由 owner 零值推断。

本次只有两个产品文件和一个既有测试文件改变，既有未提交改动保留。Context 在原 runtime-and-domain 的同一退休责任补充。33 账、配置、v72精确不变。旧 274 文件 native 候选保原，但其 7 个源码 pins 的 spot-sky-page 已变化，不能称该候选消费了当前修复；P1合成 FAILED/root 恢复 UNKNOWN 保持，没有循环 SDK 或重建微信候选。旧 E2 2/10 通过及20诊断失败保各自源码 epoch。

[共同记录](r1-native-release-failure-2026-10-08.json)绑定 64 个实际文件，原失败、两结果、mutation读回及新构建在 `output/playwright/sky-canvas-retirement-1008/` 和 `sky-whole-page-1008-retirement-*`。这是 self-review/controlled native-port 开发修复，目标 WXML/微信控件、手机、物理容量、完整图像、真实主体/provider/远端恢复和最终独审仍开放；没有提交、推送、外联或部署发布。下一只按 PLAN。

## 2026-10-08 修后当前原生候选的一次编译资格

R1产品源码已变，因此旧原生失败候选不能代表修后代码。本轮沿既有plain isolated-check槽一次构建`dist/weapp-check-retirement-60066`，原项目root不变、没有SDK动作或DevTools消费。编译25.433s成功，保3项CSS顺序/asset-size/async-chunk warning；274文件4,600,677逻辑B、34JS经原origin验证owner全部一致60066。相对旧失败候选仅`sky/detail/index.js`字节不同，旧274 pins全部匹配；原project配置仍975B/SHA7ab530fac785c3716dcc6293837492ff2098e7698b382e47fa057800a03f8ad6。

编译JS具有原生命周期releaseError/cause及Page两层finally退休路径；此前当前Page的523列举输入在编译后仍精确相等，另12个有限native/构建输入保存读回。production输出无source map，不能冒完整native pre-build graph或sourcesContent绑定。最初预先记录误读不存在的repository-root project.config.json，未写出inputs-before，随后编译仍执行一次；首后置reader因ANSI控制序列未解析summary而失败，修正剥除控制序列只重读现有log/产物，没有重编译。两项执行失败与范围明确保在[本轮原生读回](../../../../output/native-retirement-current-2026-10-08/result.json)。原64-pin R1 JSON不改写，原失败日志完整保留。

此增量只完成修后候选编译与有限源码资格；P1控件合成FAILED、root/cache恢复UNKNOWN、Android/iOS/实际native退休/物理资源/独审及33项保持。构建不是合成或设备验收，也没有提交推送、部署发布、采购或外联。
