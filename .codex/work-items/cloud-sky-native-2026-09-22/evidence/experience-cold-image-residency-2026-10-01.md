# 共享图片文件／解码引用与实际返回（2026-10-01）

本次在同一分支、普通 watch／官方开发者工具会话和60065任务服务内推进原Goal。共享request／loader现把不再消费的解码图片转为有界文件缓存；星座插画和未选地景细档使用该能力。返回重新解码既有文件，不重复获取这些图片。科学／光学粗层消费者继续保留其回退图片。没有改出版、科学有效性、原图尺寸、预算、时间、相机或页面布局，没有重新选型、下载月面、推手机或提交。

[本代绑定](experience-cold-image-residency-binding-2026-10-01.json)冻结380条追加事件、最新watch、当前普通输出、生产输入、源文件、原图、回放和相关检查。此前277事件前缀逐字节保持；此前84份源输入未变，本次4份生产输入另行加入。6项保留设置／outbox修改和v53／v52／v51候选逐文件保持。普通输出仍包含这6项既存修改，是开发会话，不能作为干净交付。

## 源与成本边界

[源绑定](experience-resource-source-binding-2026-10-01.json)用原生文件SHA1／字节与本地既有SHA256出版对应：当前10份为8插画、地景overview和2MASS银河。10份编码总1,789,615B，声明尺寸对应15.75MiB源RGBA。SHA1仅是原生回读的身份核对，生产完整性仍由既有SHA256出版／服务合同负责。

历史13份header／尺寸唯一匹配10插画、粗细地景和M42 W3 MEDIUM，是退休文件的候选对应，不能补称历史原生摘要。MEDIUM时编码4,580,054B与此前DETAIL峰4,600,432B不是同一时刻。M42没有当前SDSS光学出版；其W3为历史12µm红外，不能冒称DSS／可见光实测。有限暗色与非有限透明仍分开，源条带／饱和／覆盖和M82未知保持。

[修前回放](experience-decoded-retention-replay-2026-10-01.json)使用原生产loader和上述真实素材元数据。局部原保留18.75MiB源RGBA引用；直接销毁不用插画虽释放7.75MiB，却在模型回程增加8请求／231,276B，因此未采用。原生离屏WebGL小路径已证明同一现存文件可连续两次解码，尺寸2048×1024且文件／场景未变；回调1／0ms不是解码、帧时或GC性能指标。页面selector无回调的尝试按失败记录，没有为此重启。

## 已接入的共享责任

- `sky-artwork-request`拥有单个不可变文件与解码代次。转交缓存使旧bitmap释放句柄失效；新解码逐次核原生尺寸，迟到回调／取消不能破坏新图片或文件。缓存关闭才无条件退休其文件。缓存解码失败锁定等待公开重试，重试重新获取，不形成损坏文件循环。
- `sky-artwork-loader`把文件缓存重新解码接入原有双并发队列。不用的pending缓存解码取消后保冷文件；初次未完成请求仍退休。trim继续把冷文件按原声明RGBA尺寸计入既有本地保留额度，没有扩大额度或宣称总内存硬上限。hide／Canvas代次／出版变化退休pending、warm、cold全部所有权。
- `useSkyArtwork`只消费wanted图片，清除不用的decoded／retained map引用。`useSkyLandscape`始终保护overview及当前选档；未选detail无法被其panorama selector使用，故可以转冷。粗档遮挡／alpha、detail失败／恢复保持。其余native-image消费者不调用该能力，光学粗层回退语义保留。

[当前实际request／loader回放](experience-cold-image-replay-2026-10-01.json)用现存PNG／JPEG完整字节，并检查编码／原生尺寸和文件所有权：

| 条件 | 修前decoded源RGBA引用 | 当前引用 | 本次额外编码返回请求 |
| --- | ---: | ---: | ---: |
| 历史13源角色的局部模型 | 18.75MiB | 11MiB | 0B |
| 45°消费者返回模型 | 25.75MiB | 15.75MiB | 0B |

模型回程仍有原银河重新获取703,555B，本次没有改变该owner的非活跃退休规则。表内0B只表示本次没有新增返回请求。返回模型不是下面当前North45原生帧的源集合。引用值不是物理解码／GPU／OS／GC或总资源峰值；renderer、React提交与平台仍可能持有资源。

## 最新普通编译后的原生路径

仅向有效官方项目发出一次`simulator_refresh`绑定最新watch源码，没有重启IDE／watch／BFF。立即的原图不证明异步编译完成；随后runtime-info按必需的`currentPage` action读到Map，再沿原owned Context进入。一次漏action的调用及一次Context字段读取错误是harness错误，已按真实生产字段修正；不判产品／SDK失效。

最终有界路径为手动North45.0° → 4.8° → 45.0° → 再到4.8°时公开退出 → 原Context重进45°。SDK输入用现有双指stream和生产stereographic缩放比例，不碰React处理器／状态；避开旧边缘触摸和最小视场钳制。不是物理双指体验验收。

| 原生条件 | 编码文件 | 字节 | 同源文件／请求序号 |
| --- | ---: | ---: | --- |
| North45基线 | 10 | 1,789,615 | 插画8份、overview、银河 |
| 4.8°局部 | 10 | 4,402,233 | 插画8份与overview保持；detail新序号11；银河已退休 |
| 45°返回 | 11 | 5,105,788 | 插画8份与粗细地景保持；银河新序号12 |
| 在4.8°冷缓存时退出 | 0 | 0 | Sky owner文件全部退休 |
| 原Context重进 | 10 | 1,789,615 | 新Canvas正常绘制 |

三阶段8份插画SHA1／编码字节／请求序号全部相同；detail在局部／返回也相同，支撑原生文件复用。文件回读不证明物理解码释放时间或整个传输层成本。所有已绘Frame保持2026-09-30T13:50:33Z、4051 BSC对象／2目标、手动、无选中／跟踪／弹层／时间预览。最终实际HTTP读回revision1、时刻和fingerprint均未变，任务BFF累计PUT0，模块SHA保持。

已实际查看四张427×919官方原图：

- [基线](experience-current-native-cold-image-bound-before-2026-10-01.png)
- [局部](experience-current-native-cold-image-bound-local-2026-10-01.png)
- [回程](experience-current-native-cold-image-bound-return-2026-10-01.png)
- [退出重进](experience-current-native-cold-image-bound-final-restored-2026-10-01.png)

局部星座插画退场，回程／重进插画恢复；普通WXML覆盖仍缺失。比较完整原始PNG像素数组，包括模拟器chrome：基线→回程267像素／325通道不同、最大通道差8；基线→重进7像素／9通道不同、最大差1。未选局部ROI掩盖差异，没有新容差或一致性验收。这只描述当前有界画面，不解释旧全场原生差异，也不认证精确相机、全部质量／配准。

## 开发检查与未闭合项

[相关生产owner检查](experience-cold-image-tests-2026-10-01.log)通过，涵盖真实wrapper消费、旧句柄、迟到解码／取消、损坏尺寸／显式重试、两并发、冷文件原额度、hide／换Canvas、地景粗细alpha及SDSS／月面／OPAL／光学回退。仅将`suspendUnusedDecoded`有界变异为no-op的反例实际退出1、断言`1 !== 0`失败；原生产文件未改，检查不会在功能空实现时仍通过。[小程序类型检查](experience-cold-image-typecheck-2026-10-01.log)通过；Context责任段更新后validate通过，后者仅是结构／引用检查。

DevTools普通Canvas＋WXML合成仍为实际失败，根因未闭合。手机按用户指令暂不可用、新月面未推手机、Android／iOS／真实姿态／完整连续手势／校准／OS生命周期未验。源质量／合法coverage／总资源峰值／首屏与帧时／官方包体／真实云成本以及本次最终变化必要独立审查仍开放。旧v24审查不能认证这些新变化，自查不冒称独立审查。Goal active、无预算、未完成；当前后续依赖只在唯一PLAN维护。
