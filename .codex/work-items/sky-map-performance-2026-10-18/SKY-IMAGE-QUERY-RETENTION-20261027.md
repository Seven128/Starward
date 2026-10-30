# Sky与共享资源Query：退休渲染数据的强引用

本轮沿PLAN D2使用已接收原件及当前实现。v2分析原件确认窄视野427条、宽视野6018条原射线可退休，首次构造数量未变；与本机已实施的vector退休一致，不重新开发，也不把历史结构计数冒手机字节。

## 新问题与修复

七天体共享`use-sky-body-image`、深空红外`use-sky-deep-sky-image`和选中光学`use-sky-target-optical`的内联Query请求函数共享当次Hook调用的词法环境。仅让实际请求函数继续存活，完整生产模块的隔离Node反例仍强持有旧report/view/image；深空路径同时保留Canvas。默认Query缓存30分钟，组件卸载不保证该请求函数已退休。

三个owner现在只绑定请求需要的kind、reference和publication hash。光学用模块级分派保四个服务分支及legacy的signal-first顺序；原Promise、同一AbortSignal、queryKey、资格、重试、gcTime和图像生命周期保持。未增加缓存、削减星数/图像、改精度或产品GC；未修改既有vector/UI实现。

后续按同一捕获责任补查，确认并修复三个遗漏：

- 天体搜索的完整结果组件在真实QueryCache里保住了`onSelect`及其选择owner；改为服务bind查询文本，保60秒复用、原Promise/Signal、输入接管和滚动行为。修前新增回归失败，修后连同原行为7项通过。
- HiPS的普通fixture=false路径虽然两个query均disabled，卸载后实际缓存仍在，内联index请求会保frame/view；fixture=true另保decoded image。原async算法逐字语义不变地移到模块级，只bind publication/candidates/reference，保前后取消检查、allSettled部分失败、顺序和覆盖break、预算及试验资格。两个反例修前失败，修后连同原消费者7项通过；清缓存控制排除了probe自身持有。
- 共享`useResourceQuery`的请求诊断包装和函数型freshness包装分别通过旧result.refetch持有detached QueryObserver。跨key反例中B已被真实QueryCache按gcTime移除仍被A间接持有；该混合时效是受控支持输入，不冒某一当前Sky调用的实际策略。同key、相同30分钟策略下，卸载后缓存已换新数据，旧result数据仍被包装持有，避免仅靠改变时效条件得出结论。两个模块级函数工厂现在只持必须的request/diagnostic key或原freshness策略；不改readCurrent/refetch/live enabled和任何缓存政策。新增3项回归修前失败，修后及受影响消费者63项通过。

共享测试适配使用一个小型完整模块owner，保原业务断言；没有为了单函数提取夹具把错误作用域放回生产。完整模块及Webpack式module factory的有界Terser检查通过，最终完整产物另由独审核作用域。各probe使用实际QueryClient/Observer及完整生产函数、受控React调度和合成数据；不等于真实WEAPP/手机动态GC或保留字节。

## 检查与范围

- 新回归编译完整生产模块，保真实词法作用域；受控依赖只提供正常输入。组件结果丢弃后保实际queryFn，显式GC仅在隔离Node子进程。修前3项均因旧report仍存活而失败；修后及既有页面/恢复检查共25项通过。
- 覆盖七天体、深空和四光学分支的请求身份、服务原Promise及同一Signal；旧光学fixture跟随完整模块级函数提取，业务断言保持。
- Root补核月面/OPAL和共享native图像owner的28项既有检查全部通过，合计53项相关检查通过。首次从仓库根直接运行这3个文件因未加载小程序tsconfig的`@/`别名而未进入测试；改用既有workspace工作目录后通过，未为此改产品或测试断言。
- 初批3类图像修复完成后又补齐以上搜索/HiPS/共享包装，Root已对最终源码跑完整小程序套件：2970项，2969通过、1既有skip、0失败；typecheck通过。没有把此前定向测试数相加冒全套结果。
- 最终普通WEAPP构建成功，337文件、5,097,579B，SHA256 `0aacc0845f4de40092bb860a36621ad9888bc0dba6f9fb5a19ac06380dfb7c3d`。主包2,047,469B、content1,067,241B、spot613,062B、sky1,369,807B，分别和合计均通过原平台预算。production静态检查通过，API仍为loopback8787；保10条既有CSS顺序/webpack建议警告。此前d717输出已被本次普通构建替代，冻结19/gen34未覆盖。
- 独立实现审阅完成，无must-fix；独立复跑新增回归3/3通过，同一probe读取保存的修前完整源码时3/3均因report被持有失败。当前压缩产物静态核对确认天体仍绑定模块导入，光学/深空的请求目标仍在Hook/Page外的模块级，Terser未改回捕获render的内联请求；这不等于WEAPP动态GC观测。
- 后续搜索/HiPS/共享包装的最终独审也完成，无must-fix；独立20项通过，6个相同回归读修前源码时均在预期retainer断言失败。最终0aacc产物里搜索/HiPS保模块级绑定，共享两个工厂仍在Hook外；复用原probe执行实际common.js的9419模块及编译辅助函数，3项所有权检查通过。这补齐真实压缩代码的Node边界，不外推微信VM动态回收或手机内存。

初批结果在tmp/sky-retention-followup-20261027；后续分别在tmp/sky-query-cache-followup-20261027、tmp/optical-query-followup-20261027、tmp/resource-query-retention-20261027。最终全套日志为tmp/query-boundary-miniapp-suite-20261027.log，构建日志/摘要为tmp/query-boundary-build-20261027.log/json。此次没有Git提交/推送、官方上传、手机操作或部署。Node强所有权证据及构建不等于WEAPP动态保留、实际heap字节、native/GPU释放、持续Play峰值或OOM已解决。

## Map有界复核的取舍

新接收Map资料仍支持已实施的自有文件/准入/取消/原生pin修复，没有证成另一个新的文件生命周期缺陷。一次固定覆盖多边形纬度活动边索引原型取得19,265分类点、38,530坐标输出和9组完整renderer结果等值；暖源256格93.20→86.45ms、512格356.20→328.12ms、原冷窗对应格84.22→79.97ms。均为本机离线条件，不是手机或真实冷源端到端收益；404/503输入仍有完整有效数据，不能外推真实缺测恢复。

每格约4–28ms的局部收益尚未改变真实冷窗以源等待为主的判别，本轮不扩公共坐标owner的维护范围，不把原型当已实施优化。结果在tmp/map-projection-followup-20261027；只有后续实际瓶颈证据使该成本成为优先项时再采用，不继续相邻变体试验。目标连续拖动/My返回、实际图层覆盖与native退休仍按原计划后置。
