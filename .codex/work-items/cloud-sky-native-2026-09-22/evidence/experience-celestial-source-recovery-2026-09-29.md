# 资料与来源的出版故障恢复：2026-09-29

沿唯一PLAN的C06/D资料来源边界继续，目标是来源不可用时保留真实目录和独立来源，重试后恢复对应出版，不显示完整成功或借用另一版本。当前Goal active、无预算；引擎、商业边界和全部有效旅程/验收义务保留。本轮不重选数据、不重取影像、不改科学像素/注册/渲染、不开新DevTools窗或操作手机。

## 已修复的用户结果

1. 原资料服务捕获SDSS出版异常后只避免缓存，却仍返回FRESH，没有缺失提示。两条修前owner/真实HTTP检查均复现。现在任一W3/SDSS来源失败均返回PARTIAL及对应限制/警告；真实目录事实、别名和其它独立来源保留，不把未准入光学对象的正常null当故障。部分结果不进入完整资料缓存，恢复后实际来源、内容revision与ETag变化。
2. 弹层与独立来源route复用celestial-information-presentation.ts，明确所选红外/光学来源缺失，保留已有资料及重试。实际Mini transport的断网回退原本改为STALE_USABLE后让缺失提示消失；修前生产component/缓存链复现。现在保留过期与已知来源缺失两种含义，联网后同一已有重试请求取回真实出版并清除缺失提示。没有增加轮询、自动重试循环、另一套资料缓存、请求或渲染owner。
3. 原已绘W3 hash仍传给资料及独立来源route；错/不存在的绑定返回独立资料与明确PARTIAL，不借当前W3署名。SDSS仍按该对象的固定已准入hash提供原清单下载链接，未把一个光学版本扩张成多版本框架。来源Back/实际观测Context及帧归属继续沿原owner，Node路由参数检查不是原生返回验收。

## 实际证据及范围

- [修前日志](experience-celestial-source-before-2026-09-29.log)保两条FRESH而非PARTIAL反例。[BFF检查](experience-celestial-source-bff-2026-09-29.log)含三种单独/共同来源失败及恢复、未准入正常缺源、真实Nest/Fastify条件响应恢复；目录/别名/有效信用和旧光学/影像兼容检查通过。仍部分时304保其明确部分含义；恢复后200新ETag，不被旧缓存吞掉。
- [跨边界消费者检查](experience-celestial-source-consumers-after-2026-09-29.json)使用当前编译MiniappController/MiniappService、真实本地出版/HTTP、实际Mini request/response-cache/authenticated-operation/response验证与两个生产component函数。六阶段覆盖两出版失败、红外独立恢复、仍失败的304、断网保过期+缺失、光学恢复、原hash返回；另核不存在的已绘hash不借当前红外来源。六次HTTP读、请求registry释放；实际源码hash留记录。Native Taro视图/React订阅由Node adapter替代，不能称微信合成、手势或完整旅程验收。
- [断网提示修前反例](experience-celestial-source-consumers-before-stale-transport-2026-09-29.json)在实际STALE_USABLE时失去部分来源提示；前两个同脚本运行缺少VM常量而失败，原before-stale/before-stale-verified记录保留，明确属于诊断adapter错误，不作为产品缺陷证据。修前异常退出亦有Node Windows UV关闭断言，最终正常路径退出0；不由诊断异常推断原生平台问题。
- 当前Mini消费者/身份/已绘hash检查、Mini与BFF类型、BFF编译通过；v21隔离构建通过，原CSS顺序及两条webpack建议共三警告保留。首个候选marker检查误用未转义中文，实际JS已Unicode转义；修正可表示性检查后通过，不重建或冒称代码缺失。具体marker读回另见记录。

只替换已核PID/命令/两listener且pass/pass、held/active0的任务8791代理；原PID31448/exec98346及内部53462退休。当前PID19616/exec15154、内部54424，epoch 2026-09-28T21:11:42.571Z；内部公开出版backend随代理退休，不是新增独立常驻BFF。模块hash在启动时固定为3ae1fcda98d31ec91469e7c2e92aa1d8d314b8e4203dadb24359c5483ce67cd9，与实际消费者检查的编译模块相同，不能把后续磁盘编译误当运行已更新。8789 PID22124原内存Context、共享8787/8788保留；新的独立示例Context仅内存持有，替换前后完整data相同、实际revision=1、PUT0，六个已准入光学对象来源/绑定W3为FRESH，held/active0。替换中不可达7次如实留存。[运行记录](experience-celestial-source-running-2026-09-29.json)不是旧native Context读回、8789全域升级或云部署。

## 候选与剩余义务

clean-v21 prepared未打开：489239656cda6c95057b9ce5b6c5311aea0eb9be6bbfe0133992b061493d97d7，257文件/4483747 rawB，main 2089538B；相对v20全包/Sky +516B，主包及其它分包字节不增。不是官方包体/压缩大小或目标性能。无diag/mock/代次/vConsole/maps，loopback8791不推手机。实际v20指纹f2447809394dcc6b45054a51114402777073255091b902d633e5402f0c3f6d9a保持；旧GPU owner源码仍相同，旧画面证据保其原条件，当前新增弹层/来源文本不从旧图认证原生合成。

独立审查仍未发生，自审/本地检查不等于独立审查。v12真实Frame/Context/4B夹具状态仍未知，本輪未重试失败原生RPC/取消提权或删夹具。手机按用户指令禁用，不推新月面/候选，旧D证据不提升本代。完整进入/连续浏览/识别/搜索点选/时间跟踪/返回恢复，整场环境与源质量/配准/合法覆盖、真实姿态/完整校准/OS后台、Android/iOS、峰值资源/帧时/首屏/官方包体/弱网与费用均保留；源条纹/饱和和已测整场变慢没有由本次资料修复解决。

本轮没有获取新源数据或源站请求，没有新增许可采购或云操作；raw新增是本地代码字节。Agent有效工时、项目方参与、云存储/流量/算力和实际现金仍分别核算，未知不记零，不折薪/叠共享主机整月。下一依赖只由PLAN决定，来源故障开发边界已闭合，不重复本轮故障/下载/既有profile作为主要进度。

