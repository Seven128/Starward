# 共享整场资源：当前只读边界与下一测量入口

本次只读当前生产源码、既有出版与历史证据，不运行 Hook/GPU/IDE，不安装、下载或改变预算。`output/shared-resource-reading-1002-r1/result.json`（95,538 B，SHA256 `f654a0161b272ebb6330fafe1c59c307f519309b1b4336cb49fc4a8202fa97f4`）冻结29份 owner 源码，读取所有278张当前准入图的完整真实字节/尺寸/声明SHA，全数一致，编码总量仍为14,234,205 B。它是库存绑定，绝非同帧加载集或实际 native 内存。

## 实际 owner 与资格

正常11个图像 Hook 是星座、广角W3、月面、Mars、Mercury、Jupiter、Saturn、Uranus、Neptune、银河及地景。另有正常SDSS注册切图、显式 LOCAL-only optical HiPS，以及页面独立 selected W3 文件/解码 owner；不能只核11个便声称全页已覆盖。OPAL四行星委托同一 `useSkyOpalBands`，固定日月/银河委托 `useSkyFixedImage`，正常公共图均经 `useSkyNativeImages` → request/file lease → 公共压缩文件 owner，只有未采用LOCAL光学保session路径。selected W3现在另走预先discovery与相同compressed owner；其metadata/Canvas恢复仍独立。

| 消费者 | 当前图的源RGBA模型 | 实际wanted/保留条件 |
|---|---:|---|
| 星座 | 85张库存43MiB；单张128²/256²/512² | 页面开启且0<FOV<140，10°以下无art需求，实际注册图相交；移出视口转冷文件 |
| 广角W3 | 每面1MiB，十二面库存12MiB | user开、普通模式、FOV≥60、真实Sun≤−12°、exact frame、基础面实际mesh相交；移出面转冷 |
| Moon coverage-v2 | 2048×1024=8MiB | 实际disc在视口、surfaceOrientation合法、逻辑radius≥4 |
| Mars/Mercury | 各1024×512=2MiB | 同实际disc/surface/radius条件 |
| 四OPAL bands | 各8×512=16KiB | 合法surfaceOrientation/oblate主半径≥4；不因大库存一律请求 |
| 银河2MASS | 2048×1024=8MiB | exact frame、Sun<−12°、FOV>12；页面在广角W3开启且FOV≥60时关闭银河 |
| 地景 | overview2MiB/detail8MiB | 开启；有alpha及真实相交/非零camera-opacity才wanted；一张已成功返回fallback，另档可转冷 |
| SDSS | 每档512²=1MiB | 当前已准入目标的尺度/fov选择；wanted细档和最近parent，2MiB retention；保实际coarse/fine恢复 |
| selected W3 | OV256²=.25MiB、MED/DETAIL512²=1MiB | 选中实际条目且FOV≤15；保请求图及旧成功coarse恢复，SDSS成功绘制优先时W3可仍有decoded fallback但不会获得绘制来源 |

所有日月行星都须真实方向/尺寸，不能假设“七张同时开”是物理同场；宽场偏心投影的局部放大也不能仅按中心FOV推无需求。普通/红光、真实时刻、完整球面和地景mask会改变请求/实际提交资格。

`spot-sky-page.tsx`的真实银河互斥条件意味着旧cache-audit纯选择器表“全天14张=银河+十二W3+地景”不能直接用作当前生产页面同时wanted证据。该旧计算及软件prepared-input组合仍保其原输入；新全场测量须从实际页面资格和Hook结果导出，不把各层独立选择器或库存相加。SDSS/selected同时wanted与真正GPU绘制也须分别记录。

## 三种预算和真实峰值责任

- 公共文件 singleton 为32MiB encoded payload政策，单图≤8MiB，所有实际transfer/FS jobs共2槽，native abort未实际settle不释放槽。文件/保留租约/写入reservation/垃圾及索引分别有真实owner，索引另受256KiB限制；地景alpha/manifest/SAO/业务缓存不属于这个图片预算。
- 每 native loader默认16MiB是decoded/cold的**source-equivalent非活动retention**政策，SDSS显式2MiB。`trim`只淘汰activeKeys之外资源，wanted/fallback被保护，故不是有效wanted集的硬上限，更不是整个页面native总量上限。各loader最多2 pending；warm public file完成后多个loader可各自解码，不存在已证“全页只有2个native decode”的保证。编码相同可共享file，仍可由不同Canvas/file owner独立解码；源RGBA不是decoder surfaces/GC的物理测量。
- GPU共用16MiB仅`finish()`后retention。`getWindow`上传完整native source；FBO/copy成功期间完整源与裁后窗口共存。上一帧源和同步pair pins在prepare时受保护，因此可越预算；frame-end淘汰可能导致稳定下一帧重新整图上传。窗口保留降低resident却不降低完整native decode。copy失败保完整图、context loss恢复、退休source在begin/getWindow同步fence各是不同成本。

地景当前选择器按page传入的`otherImages`完整源RGBA预算保独立天体，pending保overview。它不是完整提交集的总内存测量：page只传`sdssOptical.image`而未传其`coarser.image`，正常scene可先绘coarser再fine；返回fallback、旧frame、暂存解码/FBO也不在该选择集合中。需测其真实相交/提交与峰值再决定是否改共同责任，不能凭这一静态差异宣称已超过目标或直接加新预算。

## 既有证据与最小真实瓶颈路径

既有整场入口是 `scripts/experience-wide-resource-composition-2026-10-02.mts`及其冻结JSON/真实published bytes；银河17条件/11步见 `experience-galactic-production-2026-10-01.md`。已知宽场warm重传和25,751,552B扩窗临时峰值是实际软件GL逻辑记录，不是native内存。full-sphere41/48及landscape-retry49完整PNG/RGBA保原bundle/hash，它们的预解码harness排除下载/decode峰值，不是当前全部Hook交互旅程。`experience-wide-resource-2026-10-02.md`有旧原生208→85→208/来源Back/公开Map重入，但普通WXML合成FAILED_DEVTOOLS，不能升级新版持久cache或selected W3。当前public-hook cold/warm/restart/hide与retirement r3是实际owner、受控native callback的机制证据，也不是完整native page/frame/GC量测。

下一最小测量应复用这些冻结report/资源与已有common GPU trace和完整Hook executor，先建立一条**真实page资格→全部Hook wanted/ready/cold→同一已提交scene**的绑定路径：普通45→85→139→全天→原45，在W3关闭/显式开启两段记录实际银河互斥；穿过地下/偏心侧倾和地景opacity0/partial/1，保同条件完整RGBA/身份回程。追加一个真实Moon局部→宽→局部，以及M42/M51选择细化/失败粗图fallback→clear→显式retry→hide/新Canvas；无需大矩阵或新资料。

每阶段共同记录：全部层wanted及来源身份、HTTP/encoded bytes和metadata单独计数、file/reserved/leases/实际IO槽、native decode开始/成功/退休与引用模型、所有`texImage2D/copyTexImage2D/deleteTexture`真实逻辑分配峰值及稳定warm重传、帧CPU与software完成时间、绘制来源/完整RGBA。优先找“帧后≤16MiB但warm仍重传”及冷/暖跨loader解码重叠，避免只优化某一层LRU或以编码cache命中当全部工作消失。host process RSS/working set若测须与软件逻辑模型分列；目标WX/native total memory、最低SDK、真实FS/driver/GC、官方包、完整WXML/交互与200DAU混合业务容量继续未验。暂不改生产、容量或预算，唯一PLAN保持。
