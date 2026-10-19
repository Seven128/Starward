# 服务恢复：发布引用的下一条观察边界

2026-10-19。独立只读核对现有owner后形成的边界及选择理由；后续已按此完成[固定mode实现与本地检查](RELEASE-REFERENCE-OBSERVATION.md)，实际远端结果由该证据owner持有。本文件不再拥有执行状态或另列下一方案，不构成删除镜像或服务恢复结果。既有[停止API实读](STOPPED-API-IDENTITY-REMOTE-20261019.json)已闭合唯一停止对象的创建引用，不能替代下面的current/receipt/恢复引用。

既有main-only固定SSH owner已经实际可用，Console登录MFA不是所有只读观察的必然前提。`deployment-connection.mjs`提供的四个受保护路径中，第四个是`REMOTE_BASE_DEPLOY_ENV`，另有release/candidate根；可在原diagnostic owner增加有界固定观察，保持原identity不读文件的契约。没有现成更小命令直接完成这条链：preview check写锁/receipt并触服务，backup dispatcher执行维护，Sky retention的读取范围更大，不能冒充固定只读替代。

待解决问题是：当前成功deploy指针及其receipt/candidate身份是什么，原失败发布是否留下必要恢复引用；继而判断quota恢复还缺哪些已知引用或精确OCI保全条件。只在该观察能改变下一动作时实现，不为字段齐全增加遥测。

可复用的窄链为：受保护base的staging/固定Compose project及receiptDirectory → 固定`operator-preview-current.json` → 同目录固定UUID命名的成功deploy receipt → 受保护candidate根内的deploy env。核pointer、receipt、candidate的revision/digest、环境/project、批准镜像仓库与base一致；sourceRoot须精确对应既有`REMOTE_RELEASE_ROOT/control/<revision>`，仅核位置，不执行旧代码。pointer没有schemaVersion，v2额外静态字段不等于成品已验。

base/candidate复用既有环境文本解析语义，只在进程内提取所需字段，不shell source/eval，不追读五份lane secrets。输入路径仅来自上述受保护连接和已验证的固定链，不新增任意command/path/selector输入。控制文件须有明确诊断大小界、普通文件/链接/权限/归属检查，避免lstat后无约束读的竞态；现成plain-file helper没有足够的大小/原子读取保证，不能直接宣称已有这些能力。末端核原字节与集合变化；缺失、超限、格式/权限失败或变化保unknown，不折成无引用，也不退到另一个prepared状态。诊断与发布并非原子快照，锁文件本身不能证明进程仍活着。

只输出合法revision/digest、固定枚举、匹配布尔值和必要内容绑定，不输出路径、仓库名、operator、连接、token、描述符/receipt原文或解析错误原文。现有SSH总时限/输出界和Docker子调用界继续保持；不调用release、容器exec、DB、供应或任何清理操作。实现与真实观察需各自相称验证及独立审查，不能借本建议当已实现/已运行。

current只由成功deploy发布，之后失败可能保留旧指针，因此成功读取也只证明历史文件身份链。worker/migrate/其他停止对象、保留历史、回滚、备份、其他实际消费者和精确OCI恢复应按已知责任分别核对；本链不提供全局无引用证明、删tag授权或生产资格。不循环重扫32条旧成功发布史；已核单revision旧发布与停止元数据直接复用。
