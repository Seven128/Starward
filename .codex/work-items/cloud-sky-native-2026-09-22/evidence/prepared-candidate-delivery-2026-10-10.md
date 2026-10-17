# 三份显示合格候选的交付读回

沿PLAN A/B支撑C/D，复用ESO NGC7009原图、ESO378背景恢复版及Stellarium NGC2022的精确manifest和九张LOD。三者FILE/软件Scene/显示位置已通过；本次只补标准出口、保留旧URL及实际HTTP，普通采用与原生权益呈现仍未通过。没有新增下载、编码、模型或PS调用。

输入、结果和固定文件绑定在 `output/prepared-delivery-candidate-2026-10-10-r1/`。一个批次调用原`PreparedOpticalImageryService`及`exportSkyPublicAssets`；真实Nest/Fastify controller逐条读回三份裸清单与九图，200、bytes/hash及既有headers一致，三清单再过当前客户端合同。来源字段沿公共SourceSummary映射批量核credit、许可链接与加工说明。未知hash404；未创建第二注册表或改变默认空registry。

当前标准出口1750条、96,079,593B；与原封存1752条合并后1774条、103,657,727B，union hash `741430082c09395524cd1280a9e1a096bd7d0e3dc3b6bf48146d15871aec442d`。原1752条URL、正文hash和headers全部精确保留。新增22条中，12条/14,490,598B属于这三份候选；另外10条/19,464B是当前默认月球/行星/银河owner已实现的版次清单，不能算成新增图片或天体覆盖。

复用本机缓存Caddy v2.11.4，独占临时容器只读挂载原writer产物，端口只绑定127.0.0.1。实际GET读回31条：本批12条、旧Prepared九条support/metadata和当前默认新增十条metadata；完整正文hash、来源/附件头及static标记一致。三新manifest的HEAD返回原附件头和空正文；一张细档Range返回精确64B/206；未知hash404。运行镜像与三个实际只读挂载已核，自己创建的容器按随机owner标签核实后退出并移除，未触碰共享服务或公开部署。具体回执`export-result.json`、`http-result.json`。

旧HEAD reader在这个更完整union上接受1752条、拒绝22条：历史九条Prepared support、本批三份manifest、当前默认十份body/Galactic manifest。历史“旧包拒九条”仍成立且保留；此次不能把新增十条漏记或归因于附件头。当前reader接受原包与新union，现有release/backup/restore继续共用该reader。部署操作说明补清：回滚应用镜像不等于回滚静态控制工具；必须保留能读完整保留集的控制包，不能删清单/头或改旧URL以迁就旧reader。没有声称真实旧应用、受信OCI、live/current/rollback/off-host兼容已通过。

导出/API/合并helper wall18,848ms、CPU19,437ms；是本机限定文件工作，不是图片吞吐、Linux物理峰或全机容量。完整输出及旧包均保留。默认registry仍空，公共Canvas控件呈现FAILED、权益呈现UNVERIFIED、科学UNKNOWN、手机与独审MISSING。

当前只读库存为`output/eso-image-supply-current-inventory-2026-10-10-r14.json`，输入`current-inventory-v5-input.json`（SHA `ba584712928839a75f21443a8b0bec5c6e6530dbc6752a6d6071b0f90aac077e`）。三份候选的密封本地交付为COMPLETE，exceptions空；权益及普通采用分别未闭，因此distributable仍0。该COMPLETE不表示已公开发布或已普通采用。
