# M82 原页面解码中 hide、迟到回调与辅助故障重试（2026-10-04，r100）

本代沿唯一PLAN验证尚未闭合的实际page恢复边界；仅六个Sky生产/测试文件、task与对应Context/进度变化。普通publication registry空/未采用，无其他业务逻辑或六项保护修改，无提交推送/部署发布/采购/新天文获取/science重加工/原BFF-watch重启。沿原Taro/Query/Map-Sky生命周期、calibrated group、原encoded-cache/decode/完整性校验/租约；不建新缓存或重构框架。

## 实际解码中退休与迟到

`output/playwright/cloud-sky-m82-display-page-late-1004-r1/`使用当前完整508前端输入和原真实隔离controller，原正式Map入口/公开M82定位与pinch。先取得实际OV作为保粗；仅在task native端口一次持有真实MED PNG的浏览器Image解码启动，非合成图/假onload成功。MED已通过encoded字节验证写入，pending native decode=1、原page仍画OV。原onHide时活动image/GPU/lease全0，native decode仍1；随后实际Image解码至decoded，再显式调用已捕获旧onload，即使当前image.onload/onerror已detach。SceneCalls46及13登记、GL库存、owner缓存/lease保持前后精确，pending归0，隐藏Hook image仍null；暖show使用当前代新image并真实完成MED，两个PNG总1122957B不重传。

这只证明受控native回调端口/真实浏览器PNG解码/当前page epoch；不冒微信decoder终止或物理GC。该lane后续因task预断言辅助故障optical必须null而超时exit1，没有after/final绑定；本段保存事实不倒填完整epoch退出。后面只推进未闭合辅助段，没有重跑这一取消边界。

## 复现与最小修复

辅助r2误击普通纹理cropped-copy framebuffer，任务同时错误选了非命名Canvas，READY读成undefined而失败。该次不能支持辅助故障或产品恢复结论。r3限定到实际完整drawingBuffer RGBA8-null目标的framebuffer attachment，一次返回INCOMPLETE_ATTACHMENT；其余真实GL保持。原页面仍READY、MED/OV当前图可绘，完成光学来源UNKNOWN且实际public retry列表空。原hide/show新Canvas可恢复来源；缺少页面原地重试是已复现consumer缺口。

生产只做这些必要变化：既有`createSkyGpuArtworkContributions`暴露enabled/current/latched故障查询，`SkyArtworkContributionSurface`与GPU renderer交付该方法；普通关闭、policy预拒绝或语义UNKNOWN不误报GL故障，原begin不自动重试、reset不扩大预算。`SpotSkyPage`只在accepted paint发布该状态，提供“影像来源暂不可确认 · 重试”；当前Canvas的ref调用原reset并请求绘制，releaseContext清ref，旧Canvas不能重试。其余有效影像和文件租约不动，未触发默认budget/采用或canvas重建。

r4当前final-byte完整page执行exit0，真实限定故障后原控件重试，MED imageId15/OV16前后完全保持、登记集合保持、仅两个PNG1122957B/无新传；实际完成来源恢复同hash/当前MED SHA，故障前与重试后完整390×844 RGBA严格精确。原Map/最终clear全活动registration/RGBA/GL/encoded/lease/queue0。与r3 before的真实缺口构成回归，而不是“按钮存在”的空效果检查。辅助失败与恢复画面已看，原暖核、颗粒和绿色结构仍未通过图质。没有SourceBack/九体/W3/校准/旧whole矩阵重复。

## 证据与资源边界

根reader只读原保存PNG/raw两侧、packet、HTTP、来源字节、原输入及前后运行绑定，无HTTP/浏览器/加工重放。11组GL-PNG-GL严格；r3/r4完整前后508front/164backend/465原baseline与六保护保持各自执行输入（r4正式允许page byte变化，其他新增旧owner以当前build图绑定）。r4 88HTTP5766929B、933观察；独立MAX texture含copy11800576B/buffer26112B、8handles/13369344B源RGBA等价、FS logical含staging2989307B、encoded54项2947613B/leases13/reserve1122957B/running2/pending6/native requests4。各层峰不同刻，不相加成物理总峰；保原同瞬间peak sample，非CPU/RSS/native/driver/all小程序200DAU容量。

六个本代Windows目录（development、四runtime、readback）254files61466112logical/61841760reported allocation、links最大1/前后稳定，包括失败、复用bundle与executed脚本；不含随后allocation/文档/log/checkpoint/continuity、旧输入/依赖，非Linux180GB磁盘保留、容量或收费结论。

原r99 currentSources漏列五个现有Sky owner/support：`sky-artwork-level-composition.ts`、`sky-gpu-artwork-contributions.ts`、其test、`sky-gpu-renderer.ts`、`sky-optical-page-test-support.ts`。它们编辑前完整byte archive在development/before和additional-before-bindings，其中运行时实现另有既有frontend图绑定，fixture以本代编辑前archive为准，但不冒原465 currentSources历史pin；本代补实时current绑定。初始“必须在旧清单”断言失败且无编辑，真实档案及纠正记录保。原465已绑定源中授权十路径之外、8863旧证据/六保护精确；实际旧bound变化仅page和四对应文档/capture。

首轮新增unit误把预算预拒绝也当fault的断言失败，旧抽取page fixture未提供新setter/context的两项失败保。纠正为disabled/policy UNKNOWN与latched fault明确区别，controlled fixture补实际依赖；最终四组17pass/1skip（原science fixture未提供）与最终miniapp TS exit0。不升级跳过项或仅fixture为native。task首次worker cwd修脚本路径及生成字符串parse失败在程序执行前，无runtime/restart；原档保留。

当前实例same-size onResize与显式retry已验证；较大actual drawingBuffer下固定caller预算/UNKNOWN界面及原page恢复仍待核，不能以既有owner尺寸测试替代整页。普通registry空/图质未过；M51矩形、W3覆盖/旧strictBack像素1/2/9/4、WXMLFAILED、SCSS/native组合、Android/iOS新版Moon、真实retention/200DAU混合容量和独审MISSING及原33义务保持。自读回不是独审，Goal active无预算。
