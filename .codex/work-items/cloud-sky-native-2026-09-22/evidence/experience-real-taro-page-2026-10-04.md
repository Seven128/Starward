# 完整 Taro 页面 / Query / 已绘 Scene 的开发证据

2026-10-04，本轮没有修改任何生产源码、其他业务逻辑或依赖。工作区/分支/HEAD保持当前入口，六保护文件与开始基线相同，暂存为0。Goal active、无预算。原BFF/watch没有重启；其最新后端源码是否已加载仍未证。

## 当前结果及实际消费者

[r11实际执行结果](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/result.json)、[完整阶段](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/phases.json)、[35次Scene输入](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/scene-inputs.json)及[根保存输出读回](../../../../output/sky-real-taro-page-readback-1004-r2/result.json)保留各自事实。完整当前 `SpotSkyPage` JSX、实际 `useSkyForecastQuery`/`useResourceQuery`、已装App React18.3.1/Taro React4.2.1/reconciler0.29.0和Query5.90 Provider运行；官方createReactApp/createPageConfig/PageContext/page instance及useReady/useDidHide/useDidShow/useUnload负责实际组件/生命周期。WEAPP官方components-react mapping包含PageContainer；未手写React/effect/Query端口。398实际构建输入前后字节相同，开始/结束r51的274 currentSources与六保护相同；[构建诊断](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/observed-boundaries.json)只包裹原文件缓存工厂、Scene提交及原完成回调，转发原参数/返回，不替代消费。当前任务脚本见[builder](../scripts/build-real-taro-page-2026-10-04.mts)、[runner](../scripts/experience-real-taro-page-2026-10-04.mts)、[readback](../scripts/readback-real-taro-page-2026-10-04.py)。

HTTP来自现有controller/service/filter/ETag建立的独立本机Nest/Fastify实例，使用原test repository正式点、确定性天气、实际Astronomy Engine/BSC/现有出版资产。page起初无Observation Context/预装report，由真实resolve→页面context lookup→store→overview/report Query供给。当前Shanghai日期10-04、实际帧13:00 UTC。它不是实际生产数据质量或服务容量；没有启动新公共服务、配置新设施或改现有BFF。Frontend完整图398有本次执行源绑定；后端直接源码确实加载执行，但完整transitive source epoch未在本次独立冻结，不能沿用旧API150的执行代数冒认。

1. 公开“手动查看”实际Taro Button/tap进入当前manual相机，完成8404真实BSC基础目录与943 SAO补充、星座线/插画等实际软件GPU绘制。
2. 官方page hide撤活动消费者，再调用原clearTemporaryApiCache；当前encoded owner entries/leases/bytes/reserved/running/pending/retired为0、epoch1，逻辑页面withdraw已绘标签/帧事实。
3. 官方show及真实Query重新交付同hash、新publication object；只对一次返回SAO asset注入503。898补充点仍绘制，8404基础目录及READY/AVAILABLE保持，页面公开显示“重试暗星”。这是失败保粗的开发行为，不把503判成功。
4. [公开retry动作](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/retry-action.json)由实际Button/tap触发原Hook retry；补充恢复943、新identity，同frame/camera及publication hash。原index返回304，只失败tile重取6581B；其他已成功tile没有第三次重传。[70请求](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/requests.json)的phase标记在同步tap之后才切换，retry的index/tile仍标complete-page-return，不能按phase字段错算成提前重试。
5. 原Scene完成回调的同帧snapshot与真实Taro标签坐标相同；[触摸动作](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/public-pick-action.json)在Alderamin已绘核心发touchstart/end。实际重叠[列表含HR8162/SAO19309](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/public-pick-choice.json)，公开选择HR8162后，页面选中标记及资料modal显示同identity。marker/原label/paint坐标169.578305,333.983531；选中后普通Alderamin名称让位，另外两个名称保持。真实天体信息HTTP 200/7591B；关闭资料保留selection。未跳过重叠列表或直接调用页面选中closure。
6. 官方hide/unload，再清实际Query/temporary API，逻辑root0、Query0、pending native requests0；单encoded owner活动计数全部0/epoch2，记录GPU texture/buffer/program等句柄0，MapFS只剩26B空v2 inventory。进程正常exit0，browser/backend finally关闭；不沿用上一Hook lane未自然退出的结果。

## 实际像素与资源范围

[冷PNG](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/software-cold.png)与[返回PNG](../../../../output/playwright/cloud-sky-real-taro-page-1004-r11/software-return.png)已实际查看：星空及插画是真实当前Scene software WebGL像素，顶部保原生导航预留。两幅390×844/1,316,640B底向RGBA完全相同，SHA256 `732056f2c5e3bbe20796c4ea570fccdc4894b66881bbf64534e47ba25364a2ed`；根readback独立解PNG翻转后与原readPixels字节一致，完成snapshot388实际拾取对象、3个逻辑名称。相同像素只验本条件恢复，不验共享影像质量或全景。

稳定冷/恢复encoded owner26项/1,037,605B、MapFS27文件/1,047,683B含inventory；8租约。对应记录GPU8 texture/7 buffer/8 program，结束全部删除。图片PNG/JPG实际由Browser Image解码原HTTP字节，科学JSON资产由当前源descriptor/hash逐项读回。70次响应正文6,069,829B；注入503空正文单列，原HTTP header/编码出口、12Mbps性能/流量成本未知。请求包含实际context/overview/report/BSC/SAO/其他资产，不只统计SAO。

这些是encoded字节、MapFS、句柄与历史decode记录，**不是跨家族物理总峰或native image退休/GC证据**。scaffold保留历史Image诊断引用，不能用其decoded记录推活动native内存或把历史数量相加为峰；GPU分配字节/driver/native/OS等仍缺。CSS文件有源绑定但未合成，页面标签/控件来自真实逻辑DOM/setData，PNG仅Canvas；不能声称WEAPP WXML+CSS/公开手势合成或手机像素通过。selector几何、storage/MapFS/native APIs为任务控制端口。32MiB/two-transfer、完整性、科学来源、租约、取消迟到及粗回退未改；未采用Prepared/science候选。

## 失败与证据保留

- page r1构建缺SCSS loader；r2 global接入；r3 Node fetch缺JSON默认content-type；r4缺feedback常量/NativePage onReady能力；r5缺getCurrentPages。都发生在任务接入处，只修任务环境，无生产/config改动。
- r6实际Query已开始，但document.querySelectorAll返回空；r7又用click而官方WEAPP React映射为tap，并误传onLoad的prerender callback使setData未发送。已按安装源码改任务普通onLoad/官方节点树/tap，不改runtime。
- r8捕获部分SAO交付885而随后943，首次相等断言FAILED；r9改以实际owner/query/pending及同帧稳定交付判据取得开发结果。没有把第一次READY/正点数当完成，不改SAO/相机实现。
- r10实际像素/重试已保存，但任务误要求所有标签在18px内唯一，实际Alderamin与SAO19309重叠，FAILED保留；r11执行产品本就支持的重叠列表后通过，未降低产品结果。
- root readback r1把导出Hook名当文件名，FAILED保留；r2从真实metafile/页面import核use-forecast-query.ts后通过。根保存输出读回为自审，独立审查MISSING。

完整full-sphere/地景渐隐、公共拖动缩放/选中细化与失败保粗、图层/连续时间跟踪、实际Sources page/Back恢复的组合和全部资源仍须在同一真实页面链继续。Android/iOS/新版Moon、WXMLFAILED、完整图质/来源批量出版、旧新WEAPP binary/全200MB、保留引用、物理总峰、全小程序200DAU混合成本与10/20冷并发容量都开放；生产预期配置没有部署或验收。本轮是一个开发依赖推进，不完成Goal。
