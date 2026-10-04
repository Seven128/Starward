# 整体旅程基线与模拟环境纵向候选

本记录是较早JOURNEY候选的基线；其后新增[组合交互开发观察](experience-combined-interactions-2026-09-28.md)及[夜间地平可读性修订](experience-horizon-comparison-2026-09-28.md)。后两记录按各自候选字节和实际画面解释，不以本文件旧“下一依赖”覆盖唯一PLAN。

## 当前范围和代次

当前Goal回读active、无预算。用户全量覆盖后的正文已逐字节保存为`../GOAL-OBJECTIVE-CORRECTED-2026-09-28.md`，SHA256 `c7a4ba8a3222ab9c51e9bd24a2809779703aa2fee8d10741f8c6e82426163088`。旧Goal、全部商业排除理由、有效要求及唯一PLAN仍保留。

本轮没有手机推送、绑定或抓屏，没有提交/推送/云部署。原Android D代证据只证明其当时版本。新本地候选`apps/wechat-miniapp/dist/weapp-check-sky-journey-0928`有JOURNEY0928开发标记，包含coverage-v2月面与模拟地景；API为loopback，禁止据此直接推手机，不能称干净settled候选。

## 恢复与工具限制

- 原feedback源项目与generation4均存在；旧索引缺project字段不代表目录缺失。最初MCP打开虽成功，但截图仍为欢迎页、automation挂起，没有记作产品入口通过。仅关闭本任务打开的窗口后，按项目Skill用官方CLI auto恢复9420；实际Map→搜索→Sky页面已读回。
- CLI auto窗口的MCP screenshot不能定位窗口，故使用官方miniprogram-automator SDK、受限协议等待、当前页面前后检查和配置字节检查保存PNG。这是已明确打开的任务候选开发观察，配置检查本身不证明项目绑定，另由CLI exact-project打开和官方runtime共同确认；不冒称手机receipt。
- SDK图片197×423，原生Canvas逻辑尺寸390.4×844。该DevTools WebGL合成覆盖了普通WXML标签/按钮，属于已知模拟器差异；动作和语义读回可用，但截图不证明手机控件合成、标签可见或手势物理质量。
- 首次单/双指发送到外层`.sky-orientation-canvas`无效果；真实处理器在`#spot-night-sky-scene`，改用真实Canvas后缩放/拖动生效。旧`experience-dome-devtools-2026-09-28.png`仍是45°无效果观察，不能作为全天通过。

## 条件与参考视场纠正

采用公共fixture `spot:test-published`，坐标来自目录首个公开天文台示例（22.4826799 N、114.5557147 E），不是用户私有位置。时区Asia/Shanghai；主比较时刻2026-09-28 21:00，即13:00Z。日/暮环境另外使用12:00/18:00，同一地点与同一个公共时间owner。

参考是实际[Stellarium Web](https://stellarium-web.org/)。在[官方引擎projection接口](https://github.com/Stellarium/stellarium-web-engine/blob/29870744c470ddc62fa869e153178c82a7824fa4/src/projection.h)及[stereographic实现](https://github.com/Stellarium/stellarium-web-engine/blob/29870744c470ddc62fa869e153178c82a7824fa4/src/projections/proj_stereographic.c)核实其FOV为较短边；core默认使用stereographic。只借此核对定义和数学关系，未复制AGPL代码进产品。

参考viewport设置存在延迟/工具截取差异：先后读到390.4×796及390.4×892，相关图分别保留为`experience-vega-25-reference-viewport796-2026-09-28.jpg`和`experience-vega-25-reference-viewport892-2026-09-28.jpg`，不作为同视场结论。最终图`experience-vega-25-reference-2026-09-28.jpg`的截图前后DOM均读回390.4×844，匹配Mini逻辑画布；[条件/hash记录](experience-vega-25-reference-2026-09-28.json)保留读回结果。全页工具截图含黑色留白/显示缩放，没有裁剪修图，不可据此作逐像素对齐。临时viewport已恢复默认，参考tab保留供后续。

Mini使用垂直FOV，参考使用短边FOV，竖屏换算为`4 atan(tan(vertical/4) × width/height)`。因此Mini垂直25°对应参考11.600151166834817°。最初两端同写38.11的图只作功能观察，不作同视场密度/比例结论。最终图34900B，SHA256 `5723f1f25efef12afe04bbe81a55668f99b43aa4b37bf09ee9f5d92bb8e5f4e3`。

参考URL设时后时钟默认继续运行；已用实际播放按钮暂停并读回固定21:00。滑块改时有过渡，面板文字先到达不代表天文内容已经稳定；固定后另观察才保存当前画面。当前网页未暴露其已部署引擎revision，官方源码定义结合实际视口/URL及场景观察构成基线，尚不是完整逐像素/数值验收。

## 已观察的用户结果

| 用户结果 | 实际证据 | 限制/剩余差距 |
| --- | --- | --- |
| 从Map公共点进入Sky，方向未授权时可手动浏览 | `experience-sky-entry-devtools-2026-09-28.png`与`experience-manual-sky-devtools-2026-09-28.png`；恢复区实际文本/动作 | 正常手机姿态、拒绝/断流及首次跟随尚未实测 |
| 连续局部→完整全天→局部 | 实际Canvas pinch到267.8°，完整地平圆盘入画；`experience-full-dome-devtools-2026-09-28.png`；新JOURNEY红光全天`experience-landscape-full-dome-red-native-2026-09-28.png` | 是官方自动化事件，不证明手机双指手感/真实合成/性能 |
| 搜索织女星、定位、点选资料、来源页返回 | 真实中文输入匹配HR:7001；`experience-vega-located-devtools-2026-09-28.png`、`experience-vega-sources-devtools-2026-09-28.png`；Back后Vega、38.1°、13:00Z仍在 | 此段基线来自旧D源的DevTools版本；不是新月面手机验收；中文实体键盘组合仍待目标观察 |
| 跟踪并提交下一时刻 | 实际跟踪状态Vega；辅助时间动作提交21:30，已绘帧读回13:30Z且目录对象从4040变4004，资料位置变303.8°/48.5° | 取消/跨午夜、总览往返/拖动停止跟踪、校准和后台组合未闭合 |
| 同一时刻的星座识别 | 新JOURNEY中文搜索/定位后真实pinch到25°；Canvas语义天琴座，`experience-vega-25-native-2026-09-28.png`显示连线/插画；换算后的参考画面见`experience-vega-25-reference-2026-09-28.jpg`及条件JSON | 两端目录深度不同（Gaia排除）；工具图含缩放/留白，原生WXML在模拟器被Canvas盖住，不能据此宣称名称在手机可见；亮度、插画层次、图层交互与其他代表星座仍需对照，当前仅建立可继续的条件基线 |
| 模拟地景随昼暮夜/图层/模式变化 | 12:00与18:00地面/天空变化，关闭地景回原背景；红光地面只含红通道；设置route Back恢复相机/所选时刻 | 仅通用平面草地候选，缺少参考场景的景深/地平辨认层次，未证明B3质量；不追加“必须某个点的树/山”作为普遍条件 |

## 当前源码与本机服务

核旧8787监听为本workspace的tsx/main.ts任务进程及创建时间后更新该本机服务。旧进程新月面路由返回404；更新后清单及PNG均200，调用共享`assertMoonCoverageManifest`并校验下载字节：publicationHash `89423a036ef5cce0d46e503dd72a1aa075e703c5057e39dd8d13cfee223d9130`，1595187B，PNG SHA256 `ba7b9eef33d3e4d25c251f79641c39ea5526c35edb5c262eecffb3dea67b23f6`。没有重下载4.25GB源或重加工。

任务本机服务现在由exec session81594持有（启动日志进程2408）；保持LOCAL、MEMORY_TEST、LOCAL_TEST及开发fixture。此临时实例不是PG/生产/云证据。重启使旧内存Context失效，已从公开示例入口重新取得当前Context；没有将旧Context缺失归为地点丢失。

## 模拟地景实现和检查

`sky-landscape.ts`为自有GLSL模型；`SkyRenderSurface.landscape`和GPU owner复用相机逆射线、solar row、缓冲分配回滚/销毁。只绘几何地平线以下的平面，不伪造现场山体遮挡；世界坐标细节随距离衰减，有限travel不在地平附近无限增频。太阳方位/高度控制显示光照和雾化；夜间曝光底值仅为图表显示，非月光/实测亮度。红光使用独立红色输出。

页面拥有地景开关并把意图提交给现有Canvas frame；sameScene包含该开关。缺太阳精确行或GPU失败保留独立星层，通知/重试回现有report/canvas owner。没有新增时间/地点、影像加载器、纹理或外部素材；固定一pass、6顶点，实际GPU耗时/手机内存仍未测。

原生首版夜间地面过暗，调整显示底值后重新构建并实际观察。保留首版和修订图，不以某一图代替整体质量评定：

- `experience-landscape-night-ground-native-2026-09-28.png` / `experience-landscape-off-native-2026-09-28.png`：同一相机开关的实效。
- `experience-landscape-noon-native-2026-09-28.png` / `experience-landscape-dusk-native-2026-09-28.png` / `experience-landscape-red-native-2026-09-28.png`：首版机制观察。
- `experience-landscape-horizon-revised-native-2026-09-28.png` / `experience-landscape-noon-revised-native-2026-09-28.png`：当前修订夜/昼。
- 当前构建日志`experience-landscape-final-build-2026-09-28.log`退出0；保留既有样式排序与webpack体积警告，未把webpack阈值当官方包体。

Mini typecheck通过，针对地景/太阳时刻/地平网格/Canvas生命周期/星座/校准已绘帧/公共时间消费者的检查通过（日志`experience-landscape-affected-checks-2026-09-28.log`）。首次类型与VM测试夹具缺新增surface/开关，已迁移夹具并重跑；不是生产故障。一次有界变异临时关闭地景效果，真实scene-owner回归报AssertionError；finally逐字节恢复，恢复后检查通过（no-effect-mutation/restored-regression日志）。未扩大到无新风险的全仓重复测试。

收尾自审发现新增地景可用性只上报失败，会在精确太阳数据或绘制恢复后继续保留失败提示。现改为每次绘制回读可用/不可用，页面以当前结果清除旧提示；关闭图层不提交假的成功。实际scene-owner检查覆盖成功、缺数据和GPU失败通知。任务脚本`../scripts/experience-landscape-availability-regression-2026-09-28.mjs`有界恢复旧“只报失败”行为，回归AssertionError/exit1，逐字节恢复后exit0；日志stale-availability-mutation/availability-restored保留。不是未经验证的“错误提示已在手机修复”结论。

可用性修订后，受影响地景/时间/生命周期/星座/网格/太阳检查36项通过（`experience-landscape-recovery-checks-2026-09-28.log`），Mini typecheck退出0；新构建`experience-landscape-recovery-build-2026-09-28.log`退出0且同类warning仍在。仅关闭本任务候选窗口后重建，官方CLI exact-project autoPort9420已确认，runtime重新读回Map。前述地景图为同一shader/场景几何的前修订开发观察，不提升为完整组合或目标验收。对照本轮四个源码备份自审了新增差异；此自审不是独立审查。

修订候选随后沿Map→公开示例点→Sky→手动入口重新进入：读回已呈现45.0°、4040个亮星目录对象、13:00Z/21:00，地景/星座开、W3关，quick settings没有地景重试项。当前保留此页供继续，未重跑已通过的全部手势。官方SDK真图`experience-recovery-final-native-2026-09-28.png`为90814B、197×423、SHA256 `9443091e6f6863406152e285cf4a74691f9ca2f3bea8130a6a497bd08fbcf731`；仍仅DevTools观察，不证明目标设备可用性恢复/控件合成。

## 下一依赖与未关闭义务

唯一PLAN继续浏览/识别纵向链：在已修正参考条件下处理星座/图层/画面可读性与环境空间层次，再批量加入时间取消/跨午夜、跟踪/手动/总览、完整旋转校准、来源/后台恢复。地景平面候选不是需求上限或最终完成。保持独立审查、干净候选、Android/iOS、原生控件合成、真实姿态/手势、首屏/帧时/内存/包体/流量/成本义务；现场数据只限制现场承诺。旧D手机证据不得提升为JOURNEY或新月面验收。
