# E1：真实非Messier与区域的最小合同及消费者

本轮完成的是条件注册下的开发边界：完整矩形/旋转原TAN、独立影像身份、实际编码/尺寸、来源有效性，经离线出版、HTTP/file、原缓存/Hook/Scene、已绘来源页及返回消费。普通Prepared registry仍空；两小样未采用、未部署、未发布。图质、绝对配准、真实DevTools、Android/iOS、生产出口/兼容保留/容量与修后独审均未关闭。唯一执行顺序由[PLAN](../PLAN.md)维护；原33项及FAILED/UNKNOWN/MISSING保留。

## 输入、含义与兼容

- 原ESO `eso0902c` NGC253全源8285×7510 JPEG/原XMP及Legacy DR10 `.8arcsec/pixel`小区域JPEG/g FITS均复用[Q1冻结输入](q1-real-candidate-decision-2026-10-05.md)，未重复下载、重新投影、裁框、抠黑、生成细节或逐图PSF。
- `prepared-native-optical-v1`/`prepared-native-optical-publication-v1`独立于旧正北方形版本。合同保原源尺寸、FITS一基准CRPIX、CRVAL和完整CD、top-first行序、ICRS/J2000/TAN、全幅UV、真实width/height及PNG/JPEG/hash/decoded RGB身份。512/1024是小样配置，准入没有这个需求上限。
- nominalTan只表示明确约定下的名义几何。ESO仍为近似publisher AVM；Legacy companion FITS没有显式RADESYS/EQUINOX，假定ICRS仍UNKNOWN。完整不透明成品矩形/几何alpha不是科学曝光或质量mask；有效黑、科学availability与有效清晰度分别保UNKNOWN。
- NGC:253为真实天体；`REGION:virgo-center-dr10-0p8`为独立影像，不进入天体资料/位置/拾取。目录中心RA11.888°与照片参考点RA11.8902020999°/Dec−25.2849846151°分开；实际目录中心落在照片UV `[.5018486094,.5085326910]`，没有以参考点冒天体中心。
- 纯浏览器共享入口 `@starward/astronomy-core/tan-optical-geometry`保原外沿像素中心与齐次仿射方向，复用原`registerSkyArtworkPlane`/相机/采样/Scene；没有平行投影或缓存。资产必须属于同一manifest，同一publication/Canvas/时刻有效性继续由原owner准入。
- 固定OpenNGC源commit `36cb178a0f69dba8bfc03a99c10512831edf1c6b`只取得一次，缓存CSV SHA `840fe0c9ee1332e551b2e722a0e92726cd7b157914a3d2177602832aadd3aa9e`。显式扩展版本52行包含真实NGC0253，非Messier行messier=null；缺值/中文介绍不编造。旧默认51行和SHA `f54b6225799d57a7fb73571cde2d38bbcb34651983ac71f3a176c2399aa8d8c5`原样保留，扩展SHA `d57828454c7dfd2d1e2a6fe7570aa52b1366ab79374c4b2c461de768e361c849`。
- 检索/资料/定位/scene/缓存明确消费同一所选目录版本；未知版本拒绝，M别名不复制成另一对象，区域不借NGC/M资料。标准source summary完整披露具体ESO/Legacy credit、source/license/policy链接、历史波段、全幅降采样改动与UNKNOWN。

关键owner：`packages/miniapp-contracts/src/prepared-native-optical-publication.ts`、`celestial-identity.ts`；`packages/astronomy-core/src/tan-optical-geometry.ts`及`deep-sky-catalog{,-data}.ts`；`data-pipelines/deep-sky/publish_prepared_native.py`及原共享writer/packer；`workers/miniapp-api/src/prepared-optical-imagery.ts`/`target-optical-image-file.ts`/controller；原`use-sky-target-optical`/registration/visibility/frame/Scene、`sky-public-image-runtime`及source page。旧v1/display/v2合同、老M82路径/hash/manifest文件名保持兼容。

## 冻结出版与执行身份

| 条件小样 | 全幅三级 | 实际JPEG总body | canonical publication hash |
| --- | --- | --- | --- |
| NGC253 | 256×232 / 512×464 / 1024×928 | 163,333B | a1fc40f3c89c17c4ae09b1c2daf13b1b2b61d62dc3ddbbffe7061d91f5d71059 |
| Legacy小区域 | 128² / 256² / 512² | 62,194B | 93b90fed9530432b17e3be8ec1feb9071b1207973ff3dd5aad1b591b258565b0 |

产物为 `output/prepared-native-ngc253-1005-e1/` 与 `output/prepared-native-region-1005-e1/`；对应`-generation/producer-receipt.json`、固定recipe及writer receipt保源码、库、原文件、完整decode和输出身份。仅全幅LANCZOS降采样、published encoded RGB、JPEG q92/4:4:4与原ICC；两DETAIL复用既有相同输入产物的精确字节，不再次生成。PNG949,252B与JPEG112,411B已有Q1比较，但字节优势尚不决定采用。

执行过的17个owner精确字节快照保在 `output/prepared-native-executed-owners-1005-e1/receipt.json`。原native合同执行字节SHA `59bf2d2318d9cd44ed52fd47021cb00ed6c611acb0544d778516050bb55f3807`经长度/hash核对后归档；此后仅共享身份guard合并、未来receipt增加其owner绑定及已有generation提前拒绝，未改变已产图、原receipt或重新加工。不能拿当前源文件冒原执行字节。

固定源兼容核验为 `output/opengc-extension-validation-1005-e1/result.json`：默认51行/扩展52行、旧行精确相同、别名重复/非法及缺源身份拒绝。该核验不下载、不重生成目录，样本52行不是产品覆盖上限。

## 真实HTTP/file及原标准静态导出

`output/prepared-native-transport-1005-e1-r1/`绑定执行脚本、实际当前API依赖及输入前后身份：

- 两新native＋旧M82共9图实际GET/HEAD 200；byte/hash/Content-Type/Content-Length/immutable/nosniff/source headers相符，HEAD body为0。源图、recipe、receipt未进入发布枚举。
- 旧M82仍沿旧PNG、旧canonical hash/URL与原manifest下载名。新native以publicationId命名，独立ref通过same service/registry显式消费。
- 同一文件owner准入已有1024×928 RGB PNG；新hash绑定但实际JPEG尺寸不符的反例被拒绝。没有通过fixture bypass尺寸验证。
- 标准sealed static exporter消费这9图，文件身份、index/fragment/header与HTTP owner一致；没有重做出口分类/retention owner。

这不是实际Caddy/TLS/conditionals/production mount/rollback/backup/旧新保留/容量证据。当前API二进制没有ETag合同，不能将GET/HEAD结果写成条件响应通过。

## 实际原page、缓存缺陷与修复

两条完整Taro/React/Query逻辑JSX路径复用原Map marker→云观星→手动→检索/定位→原Canvas手势→已绘来源caption→独立来源route→Back→退出；使用真实当前HTTP与资产、原缓存/Hook/Scene/GPU owner，没有直接设置相机或伪造region天体。

早期NGC r3实际取得metadata，却没有JPEG下载：`sky-public-image-runtime`仍只接受旧M PNG路由。已在同一owner补新native hash/publicationId/tier PNG/JPEG精确白名单，保原origin/hash/目录逃逸/私有receipt拒绝。`prepared-native-cache-route.test.ts`在真实cache acquisition边界证明新路径有调用；有界恢复旧白名单的mutation再次阻断此路径。这个逃逸缺陷及原失败目录保留，没有用单元fixture成功覆盖实际无效果。

| 当前完成的独立epoch | 原始记录 | HTTP / 全部成功body | Scene / browser errors | 暖回完成来源 / 严格DETAIL像素 |
| --- | --- | --- | --- | --- |
| NGC253 r5 | `output/playwright/cloud-sky-native-ngc253-1005-e1-r5/` | 97 / 5,611,578B | 54 / 0 | 5帧、null0 / 差0 |
| 区域 r3 | `output/playwright/cloud-sky-native-region-1005-e1-r3/` | 98 / 4,450,474B | 57 / 0 | 5帧、null0 / 差0 |

每条514个frontend输入及backend/task/公共资产、实际执行脚本前后绑定；两epoch不拼成同一旅程。NGC使用真实检索/modal/定位到NGC253；区域先定位真实M87再以公开一指pan到名义TAN中心，当前Scene中心误差3.41e-13px，M87与region身份独立。公开暖缩放/来源Back没有新增这三图成功body，来源页精确绑定已绘hash并保完整署名/许可/修改/UNKNOWN，返回同一page及最新有效相机/时刻。

首次三档decoded-source逻辑RGBA分别为NGC 237,568→1,187,840→4,988,928B，区域65,536→327,680→1,376,256B；暖回复用/退休随实际owner记录，不把这些逻辑值或不同MAX相加冒物理峰。两退出的活动decode handle/source RGBA/GPU texture-buffer model均0。

NGC暖回double FOV差4.440892098500626e-16，原absolute EPS判定仍false；区域差5.551115123125783e-17。两条相机basis/center/frame/实际尺寸与GPU float32投影scale相同，严格framebuffer字节差独立为0。保原raw差与失败断言，不宣称exact double恢复或倒填旧严格结果。

早期NGC r1/r2诊断错误、r3真实cache缺陷、r4末位FOV断言及区域r1错误observer/r2精确fov等待失败原目录保留。诊断改为读实际当前Scene并分别记录浮点与像素，未修改产品相机或降低原framebuffer门槛。

已查看实际软件PNG：NGC保完整原矩形/斜置星系，窄视角会由viewport裁出而非加工裁框；Legacy保实际外沿/暗背景及饱和、彩色点噪声。SCSS未合成、WEAPP FS/image端口受控、浏览器GL为软件实现；这些不能冒WXML、DevTools、手机、物理性能、完整体验或最终画质通过。

## 检查与构建

- 初次contracts/core8项、native客户端24项、API31项通过；之后受影响client/contracts96项中初次95通过、1旧source-page VM缺新disabled query stub失败，修复该夹具后相应6项全通过。原FAIL log与后修复log分开保，不冒一次96项全通过。
- 新native路由/源码资料页回归、17项受影响API及固定源兼容核验通过。四package相关类型、SDK current检查、Python compile通过。准确原输出在任务`tmp/e1-*`，不相加当最终矩阵。
- 原watch于14:17:54复现新增共享TAN TypeScript未转译。`apps/wechat-miniapp/config/index.ts`只增该独立源文件的compile include及精确alias；一次plain WEAPP隔离构建 `dist/weapp-check-cloud-sky-e1/` exit0，webpack25,379ms、3告警（旧CSS顺序、asset size、performance建议）。随后Mini TS5.9.3类型检查通过。
- 构建原始log `tmp/e1-weapp-plain-build-2026-10-05-r1.log`及source/output身份readback另存；这证明当前入口实际编译，不能据此认证页面合成、官方包体、大小可接受或DevTools启动。
- 原node18132 watch仍存活，但未重载配置、最后日志仍为上述FAILED。不把历史增量成功冒当前watch成功；独立plain产物与旧watch保持分开。node24040既有loopback/官方会话保留，MCP_INIT_ERROR无新会话根因，不循环安装/启动/刷新。

## 未关闭义务

Q2：R2额外.0625°中间视角回到.05°的35像素/最大1通道严格FAILED，现有裁窗历史与uniform原因仍需有界验证；同源LOD、照片外沿/合格背景、弱结构/目录重复星、PNG/JPEG实际采样/颜色/成本未通过。NGC绝对AVM、Legacy缺曝光/质量mask仍UNKNOWN。ESO6k直接UV与粗Legacy配置否决保原，不恢复被排除源。

P1/A1：WXML FAILED_DEVTOOLS、Android/iOS及新版月面手机、完整同一旅程、真实性能和修后独审MISSING。E2：当前static/TLS条件响应、全机旧新/回滚/备份盘账、10/20冷进入＋普通混合业务及200DAU资源容量未验。

合格普通影像覆盖本轮增量仍为0；扩大的是开发消费者支持。未推采购、云部署、发布、外联或提交。机器加工只生成两固定全幅分级一次，个体图质复核未通过；批量异常率/有效清晰度、项目方参与、持续维护/许可现金/全机成本UNKNOWN，不能据两样本外推全库或最低成本。
