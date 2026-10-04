# 完整场景资源测量：只读准备

2026-10-02，`/root/sphere_grid`。本记录只提出唯一 PLAN 既有完整组合责任的一个有界入口，不建立另一执行计划。未运行浏览器、Hook、GPU、微信运行时、HTTP、IDE/watch或设备；未改生产、预算、来源、资产或 governing docs。实际执行需 root 放行并重新冻结届时生产。

## 已有证据不再重放

- [首条 full Hook 资源旅程](experience-full-hook-resource-journey-2026-10-02.md)：旧 page/纹理政策，W3 off 的45→85→139→dome→45，实际整图与文件/解码引用/纹理峰。139°暖帧重新上传是 GPU 工作，不能称新的文件传输。
- [W3/Moon 扩展](experience-full-hook-resource-expanded-2026-10-02.md)：13条件，包括 W3 on 和 Moon2.4→85→2.4。r5本身仅2 source bindings，后续完整 AST/原r4源码对照只能作补证，不能倒填其运行前 inventory。
- [active-used 采用责任审计](experience-active-retention-adoption-owner-audit-2026-10-02.md)：当前16MiB是 upload-time pressure target；当前帧使用/pin 纹理可超过它持续驻留。不能再用旧 frame-end cap 推当前暖上传。
- [固定 browser references 的十二态旅程](experience-continuous-camera-resource-journey-2026-10-02.md)：当前成功路径、地下/侧倾/ground0/.5/1、W3/返回/退出；每态先就绪再两提交，SDSS/selected/LOCAL不 active，也没有完整冷加载过程或同旅程细图失败恢复。
- [正常 selected/SDSS 修复旅程](experience-selected-full-hook-repair-2026-10-02.md)：M51粗细和M31 W3、hide/newCanvas，正常绘制来源与全幅恢复；这是独立的六条件路径，不能补成十二态所有源/失败已经测过。
- [完整球面合成](experience-full-sphere-composition-2026-10-02.md)：41/48条件预解码实际软件绘制，多个时刻/相机的地下 Sun/Moon/Saturn/M51。它没有 full Hook 冷加载/持续工作集，旧源码证据不升级当前 Scene。

这些结果已揭示并修复一个真实压力责任，下一次不用重复139°暖帧成功矩阵或已经闭合的 pair/FBO矩阵。

## 实际只读预检

入口：[experience-complete-resource-scope-preparation-2026-10-02.mts](../scripts/experience-complete-resource-scope-preparation-2026-10-02.mts)，SHA `083f8f616ea8f8df5d4af7f7551c6719bf634c53279f6e491e74e98e86c8644a`。

实际输出 `output/complete-resource-scope-preparation-1002-r2/result.json`，46,184B，SHA `61a3684d4135c462df76144a16bab304602a13d5cda64232ee324c6f03eef087`。108个显式源码/输入绑定读前后保持；27个实际已出版图片7,272,694B与既有库存 hash/bytes一致，29块被选择的实际SAO输入397,322B逐文件bytes/hash+合同准入。它们是跨状态输入 union，绝非同时驻留或客户端总内存。图片尺寸沿既有 inventory绑定，本次未再解码图片；下一实际运行仍需HTMLImage完整decode并核尺寸。

seed复用 `output/playwright/cloud-sky-continuous-camera-resource-1002-r1/prepared-browser-context.json`：3,424,355B，SHA `a78316990142e27254262863557558bfead0ad3f42c8460ccb2e36f3c0a50779`；实际时刻 `2026-09-30T13:50:33Z`、原BSC v3/固定report/figures/观察旋转。此脚本只执行当前纯投影与 selectors、真实本地文件读取和合同校验，没有绘制。

| 固定候选状态 | 同一个实际Scene的合法输入资格（不是已绘结果） |
| --- | --- |
| Moon45 | az69.1739209563°/alt14.4089546748°，Moon radius5.0046833357px满足纹理>=4；9星座图片、246个BSC投影/appearance候选、银河strength1、17块SAO98,820B；两个有效地景mask均与视图相交，viewOpacity .9988508457 |
| 同方向85 | Moon radius2.5599070578px不再 wanted；16星座图、685个BSC候选、W3合法faces0/4/5，银河不wanted；7块SAO50,755B |
| M51 .2 | az327.676259584°/alt−6.559261763°；legacy SDSS OVERVIEW、selected W3 DETAIL元数据/文件资格；无星座图/银河/W3广角，无BSC投影候选；8块SAO265,184B输入完整，实际SAO绘制数量尚未测；ground viewOpacity .1929409948 |
| 同M51 .05 | SDSS wanted DETAIL+MEDIUM，保实际OVERVIEW回退机会；selected W3仍可独立 decode，但来源由实际 SDSS/W3优先规则决定，不能由ready当painted；同一个有效地下/部分淡出地景 |
| 回Moon45 | 原合法姿态/视野/时刻；观察实际回程cold/ready、纹理重新上传与全RGBA变化，不预设传输0、解码0或像素exact |

Sun/photosphere不在这五态视野内，只有真实solarLight环境shader；唯一当前可投影行星为极小Uranus，radius不到.01px，不请求OPAL纹理。其余太阳系照片/球面与环不能由构建Hook、存在文件或这条路径称为验证，保已有各自球面证据及新完整组合未覆盖边界。

W3广角与银河是实际page互斥，切图所需FOV又使艺术图/银河退出，不能把“全部图像家族同时on”当正常页。此入口使每一个实际提交仍是一套完整 Scene（独立星点/太阳光环境/当前天体/星座/合法实际图层/地景/nav），五状态 union覆盖主要照片家族；它不把全family同时驻留作为产品前提。

商业fixture宏仍false，`useSkyOpticalHips`不发未采用LOCAL请求。合法HiPS采用实际W3广角；science-optical-v2仍无显式intent、普通页默认关闭。普通组合不能插入未采用光学tile或science probe以充层。

## 最小新增实测建议

复用连续旅程/selected正常旅程的真实React Hook executor、当前page AST initializers/selected请求与retirement/decode effects、当前共同request/cache/loader、same HTMLImage/actualGPU、实际 `drawSkyScene`。只建立一个sameCanvas、same report/figures/观察时间/browser对象的连续正常lane，准备时的 Node producer/HTTP响应文件与每块实际字节必须严格绑定；metadata与图片传输独立记录。不读取现旧compiled BFF冒充新生产。

增加 `useSkyStellarSupplement` 的真实page资格与实际Hook/loader/client：已有本地SAO publication/index/tile可供真实合同和客户端处理，不将null或自造points当完整星层。metadata可由真实本地publication owner离线产生，所有 actual bytes通过现有受控transport bridge；若适配不能保持实际客户端准入/loader请求，就明示这一层missing，停止称完整组合，不能用stub绿色补齐。

相机使用既有resolve→browsingCamera owner，输入姿态显式控制，不称触摸手势/传感器；每次实际 camera result才进入Hooks和Scene。需要冻结当前 page accepted publication/canvas lifecycle回调，绘制callback候选与真正presented/source/picking区别记录，拒绝旧executor直接发布来源。

正常顺序为上述五种相机状态。每个就绪态两次实际完整Scene提交；起点额外保一次实际冷就绪前提交与最早可用时间观测。只有M51 refinement增加一条真实失败机制：用controlled transport暂挂DETAIL callback、让MEDIUM成功，再让该DETAIL请求一次fail，实际Hook/Scene保粗层、独立星层/地景。调用实际retry（非手工setReady）后提供原绑定DETAIL字节，记录恢复。不得注入consumer-null、重画缓存相机、调整opacity或mock FBO来证明作用。

这是约5个相机状态、正常10提交加冷/held/failure/retry必要提交的一次有界运行，不做variant/cartesian矩阵。成本是同机一次软件WebGL/PNG全图/Node资源读回，不新增网络下载/付费。没有native first-usable/FPS/时延承诺。ready之前的控制transport时序不能被当成真实12Mbps或服务器性能。

## 必需的真实资源账本

1. 每个实际Hook的wanted/ready/retained/cold/failed、publication/文件SHA/descriptor、new decode/native pending、实际image object identity及owner当前资格。cold是文件+租约，不按RGBA活图计；diagnostic强引用和预提供base64字节另列，不能推GC/native。
2. 公共cache `inspect()`的encoded/garbage/reserved/leased/pending/running与真实mkdir/stat/read/write/rename/unlink/readback；metadata/API/SAO/alpha encoded与解析数组分开。公共图2IO与SAO3请求是不同owner，不把图片并发当全页总并发。脚本MapFS复制与浏览器metadata缓存保scope。
3. GL wrappers调用原方法、原this/args/返回/异常，全部create/delete texture/buffer/framebuffer/renderbuffer/program/shader都有唯一实际handleID；bufferData当前容量与峰、bufferSubData范围、纹理全源与crop共存/copy、source attachment保持。FBO不是第二份附件图片字节，避免双算；program/shader只记数量/存活，driver内存未知。
4. drawingbuffer实际尺寸/格式/alphaBits/DPR、normal framebuffer bytes模型单列；不能由宽×高×4认证swapchain/depth/driver总量。当前receipt默认disabled不分配probe，不打开science来增加aux；存在的source-window FBO与contribution FBO分开。
5. 实际surface methods/method return/实际program dispatch +draw调用顺序、source imageID与bound textureID关联；同frame三角/星点/球面/环/背景/地景/nav实际调用与GL结果。绑定纹理不是“该source实际贡献可读像素”；来源仍由正常Scene callback/completion与accepted gate负责，记录实际快照。
6. 每帧完整PNG↔底向rawRGBA、actualGL errors、failure记录先落盘；退出实际page releaseContext/Hook cleanup前后handle/cold/lease/在途槽和native-current全表。dispose后的logical0不能认证driver/OS物理释放。

测量不改原16MiB压力/16MiB loader/2MiB SDSS/32MiB文件政策。page给landscape的otherImages缺SDSS coarser是明确静态观察，但局部状态没有其它重图，漏1MiB未必改变当下resource选择。应在实际ledger记录该差，不为了制造超量强制同时wanted不合法图层，不先按猜测修预算。

## 当前绑定与执行限制

这次准备读取page `522d3ef…`、Scene `347ced8f…`、renderer `45421d09…`、textureowner `a353bc12…`、runtime `b8ebb9b6…`、cachecore `221e1979…`（完整SHA在result）。Scene/renderer是本次读到的快照，正在另一已授权geometry责任后续变化；没有实际GPU执行，也不称其稳定或把旧e11/receipt_GPU证据升级。实际运行必须用新exclusive generation，严格绑定新生产/完整实际browser+Node graph、工具链/tsconfig、虚拟executor/taps和每个原输入；无法bind不得silentcatch排除。

预检r1保留`failed-executed-preparation-script.mts.txt`与`failed.json`：task误把BSC v3 raw geometry帧当points导致TypeError。r2改为实际`resolveSkySceneFrame`纯owner后成功，未改原失败/生产。它不是项目渲染失败，不影响待授权GPU范围。

当前结论仅是本地数据可供一个合法、增加SAO/粗细失败恢复和完整buffer/FBO寿命计量的下一入口。WX/真机、全用户交互、持续动画/真实载入速度、最高所有工作集、最终图质、客户端总RAM、native/driver/GC、正式4GB/16GB服务器和200DAU容量全部仍未验。
