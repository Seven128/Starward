# Source Back阶段已拆清；暖索引写回需有界比较

上一轮是实质进展：fixture-only immutable encoded复用消除了12个重复body，并以同43身份/实际page验证。此轮沿当前唯一依赖取一次新的完整消费者时序，不改产品源码、预算、wanted、原照片或来源；没有上游取图/新出版/WEAPP构建/服务重启。任务observer只读记录原Hook、Canvas及原cache/request执行节点，真实当前源码另外完整绑定。

## 实际阶段

output/playwright/hips-source-back-timing-native-page-1006-r1：frontend521/backend174前后绑定、117 Scene/152请求、Map marker→Sky空props、HR687搜索定位与pan、8→45→.15→45、来源精确notice/复制URL/Back、Map退休和app clear沿原consumer。1963条阶段记录含来源hide、Back及最终退休；回程显示期间40个warm job全部SHA/尺寸验证成功，无file failure。原43个本地tile成功body保持，Source Back body0；同相机终态RGBA差0。完整图质仍FAILED。

以Sky show为0：新Canvas revision3在34.3ms创建；第一空帧34.3→60.9ms。首两瓦片在74.0/74.2ms acquire，第一原文件读回/尺寸校验至100.5ms，hash100.5→114.1ms，等待原串行persist后127.1ms取得lease并createImage（第二144.3ms）。首native onload339.8ms/qualify339.9ms，第三瓦片才从native loader发起。第二空帧304.3→313.5ms；第一有实际合资格HiPS来源的Scene419.2→595.8ms，已绘来源2项。稳定名义完整在997.2ms。当前7个Source Back完成帧中2null/5partial（partial含null），首完成至名义完整936.3ms。前轮3null和本轮2null是同源码的不同软件运行，不能称修复或速度A/B；没有像素或已绘资格时仍未连续。

首图createImage→onload212.7ms内有19个其它job/19次完整索引persist、252个FS开始操作和一帧Scene。回程40个warm job各写整个101项索引，共40次完整persist/496 FS操作，persist阶段时间合计322.1ms，包含调度及其他工作，不能加到其他MAX或当磁盘/CPU独占耗时。当前FS是queueMicrotask的MapFS，Image是实际browser解码；该callback间隔不证明native解码CPU开销，更不证明真实DevTools/手机瓶颈。原函数逻辑确实在返回有效warm lease前await整索引persist，这一因果边界可由代码及时序共同证明。精确结果、每瓦片阶段、每次persist和metadata更正在output/hips-source-back-stage-analysis-1006-r1/result.json。

仍保持原sourceRGBA等价峰38,338,560B/GPU纹理模型17,485,976B/buffer31,284B/handles32，文件逻辑峰7,978,866B、encoded7,899,760B，两transfer槽/32MiB和20MiB不变。decode/GPU/请求及清后encoded全退休，非全FS清空/物理GC。软件端口和task API/browser都已关闭，原BFF/watch/IDE保持。

## 下一比较与证据边界

候选只合并warm last-access带来的重复索引写回；membership新增/移除及原hash校验必须仍耐久、安全。先查并覆盖clear/epoch/取消、写失败、旧索引启动与回滚消费者，再比较真实整页首图及整场资源；不直接绕过验证/lease，不把旧Canvas图片复用为新代已绘来源，不扩大缓存或队列。冗余写回存在不等于候选已证明收益，现不采用新产品策略。

observer生成时cache及page两条observed-boundaries.originalSha256字段记录的是加observer后的文本，标签错误；原raw完整graph绑定正确。分析用当前原文件重新施加完全同observer，SHA精确匹配该旧字段，并另列actualOriginal及reconstructionMatches。原记录未回填，执行代码没有改变；request及其余记录不受影响。源代码/软件开发/真实DevTools/最终验收边界保持。

唯一下一依赖：R1暖命中索引写回有界比较：当前实际Source Back阶段已拆清，show后34.3ms新Canvas、74ms首瓦片acquire、127.1ms有效lease、339.8ms首onload、595.8ms首合资格完成帧；40个暖job分别完整persist101项索引，40次/496文件操作，首图callback等待内有19个其它job/19次索引写回及一帧绘制。下一沿原sky-public-image-cache做一次合并冗余暖last-access索引写回的最简单有界候选比较；保完整字节校验/租约/取消/epoch与membership耐久提交，先核clear/写失败/回滚恢复/最终退休，不放大槽或预算、不建新cache。用现output/playwright/hips-source-back-timing-native-page-1006-r1完整消费者比较首图/整场驻留-临时峰-退休；有实证收益才采用，当前二null仍FAILED连续显示、callback间隔不冒native解码CPU或物理设备时长。Q1合格广角/区域及P1仍独立，SkyServer503/SDK无新根因不循环；普通Prepared空/HiPS关、TRIAL图质FAILED、科学UNKNOWN、全图质/Android-iOS/新版月面/容量/公开合规/独审及33项不缩减。Mellinger只守银河DISPLAY，旧粗Legacy/ESO直接UV/受保护Risinger及排除源不重开。Goal active无预算，不提交推送采购部署外联。

普通Prepared空/HiPS关，原56图/root/rights及全部历史成功和失败保留。33验收行原字节未变；科学/绝对配准、合格广角区域、全图质、DevTools/Android-iOS/新版月面、全应用物理容量/200DAU、公开合规与独审未完。Goal active无预算；无提交推送采购部署外联。
