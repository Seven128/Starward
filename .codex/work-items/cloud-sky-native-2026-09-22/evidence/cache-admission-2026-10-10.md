# 固定大图的编码准入与在途字节

恢复实施后的B/F修复，图像获取及像素加工保持冻结。原r6的8MiB拒绝及r7临时测试结果保留；本次修改实际`sky-public-image-runtime`和原cache owner，不改图像字节、普通registry、云端服务或原生渲染架构。

现32MiB文件总额度继续包含staging、持有中的旧文件及清理失败的文件。单文件准入扩至16MiB，同时新增总计16MiB的I/O占用围栏，保原2×8MiB请求包络；最多两个工作槽仍在，较大的任务按FIFO等待，避免新的小请求持续挤占。取消队首可推进适合的后继，clear或abort失败均不能假装底层I/O完成来释放占用。下载响应与其Promise在写入后退出引用范围，再进行现有写入/提交读回；没有削弱尺寸、hash或索引读回。该范围是逻辑编码工作，不是物理RAM/GC、native decode或GPU总量证明。

两项队列回归在修前均失败；第一项明确读回两个96B响应同时开始，超过测试的128B总额度。修后验证大文件串行、已显示粗图lease保留、队首取消、抛错abort及clear后的真实回调围栏。第一次新增真实文件测试因测试粗图descriptor缺少JPEG format失败，保留`output/cloud-sky-cache-admission-2026-10-10-r1/`；修正测试输入后r2通过。最初类型检查也发现optional属性写undefined，与实现一起修正后类型通过。

`output/cloud-sky-cache-admission-2026-10-10-r2/affected-tests.log`记录61/61影响检查通过。`consumer-traces.json`中第一项通过实际生产runtime→cache→受控Taro请求/FS回调，使用冻结ESO378细图10,374,947B、3188×2950、SHA256 `4ee0dfa37124ccc7a190cfdfe68b5d517967a94a23605a57d5314bb4f4098d07`。在途仍持有20,492B独立粗图、reserved/ioBytes各10,374,947B；写入及重新创建cache后字节准确、暖读额外请求0，清空后只剩26B空v2索引。旧v1迁移、原v2暖读、同长度损坏、暂存清理、实际Hook/公开清缓存及JSON/图像共用责任在同一受影响检查范围通过。

真实文件以环境输入复用，不放进测试仓库或重编码。普通自动化另用合成编码边界，不声明其图像内容/解码真实性。以上是开发证据：没有真实网络、微信FS/Canvas解码、整页原生控件、目标手机、物理资源、10/20并发或CDN容量结论。3份候选依旧待公共呈现/采用，33项完整义务不升级为通过。当前工具没有本地独立代码审查能力，修后独审仍未取得。

随后原生验证补齐了上述编码请求/微信FS这一段。任务专用页面打包当前生产runtime/cache/字节验证，Taro端口直接委托实际wx请求和FS，仅将USER_DATA_PATH定向至任务独立子目录；没有新星空页面、mock网络/FS或修改正式缓存。官方工具在新开的s0读回`pages/cache/index`，实际截图已看，SDK3.17.4/platform=devtools。`output/cloud-sky-native-cache-admission-2026-10-10-r1/native-result.json`和服务端请求相符：679,918B概览与10,374,947B细图各GET一次，完整本地文件长度/哈希相等、粗图lease未丢，暖取同一文件且无新增HTTP，clear COMPLETE后仅index-v2.json。冷阶段1,043/1,925ms包括本机传输和读回，不是公网、手机或容量预算。最初缺页JSON导致未注册/白页，补齐测试页文件后一次刷新取得结果，未改产品代码/SDK或清正式缓存。任务服务自动关闭，自己开的s0已官方关闭。

普通WEAPP隔离编译通过，274文件/4,641,475B，原三类构建warning保持，产物`apps/wechat-miniapp/dist/weapp-check-cache-admission-1010-r1`不冒原生页面已运行。无图相关42项通过：恒星外观、解析天体fallback且不冒图片credit、深空无照片标签/类型/拾取、同帧接受、搜索和Context/SAO恢复。旧deep-page测试复用已存在的共享Scene依赖，补当前REGION输入；根目录运行遗漏App的TS路径是工具调用问题，改用实际App tsconfig后恢复检查通过。新增无图检查只断言真实类型/身份及opacity，不强加亮度排序以外的目录顺序。最终该页6/6复跑、App类型和Context结构检查通过，未重跑整个历史矩阵。

[当前绑定](cache-admission-2026-10-10-r2.json)保存源、日志、原生回执及全部构建文件pin；首份绑定的PowerShell字典汇总得到bytes=null，r2修正汇总且保原文件pin，首份保留。原生Sky控件、Canvas解码、Android/iOS、物理峰、独立审查及真实云端/10与20并发仍未通过；原生cache通过不补这些缺口。
