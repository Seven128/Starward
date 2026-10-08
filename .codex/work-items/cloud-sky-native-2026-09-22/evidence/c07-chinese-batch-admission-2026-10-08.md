# 中文供给公共准入：2026-10-08

本阶段移除逐对象维护的产品准入白名单，复用原资料 owner、固定 v72 正文和已有 CC0 别名流水线。没有新增中文段落、v73、逐星版本/测试或重新获取上游。原 v72 的 247 行、643978B、SHA256 `587c4b3f7f773d352925932062716ea570485f18ddaa0a6d2c9730c29b5c204d` 保持。

`data-pipelines/star-catalog/publish_introduction_index.mts` 从已准入 publication 一次推导完整 canonical 索引，复用 `celestial-object-introductions.ts` 的固定 publication 身份与校验器。新索引3929B，SHA256 `de94f9230a564ef33bcce3a3a6eab2366f3af5701ee7eaa66702fa2fae08e7e7`。原手写247项与实际publication完整集合相等，现用索引替代；输入/output固定、零网络、原源前后绑定、重复执行相同字节直接返回、不同结果拒绝覆盖。成功staging使用同目录原子create-only link；原稿及失败staging保留。

原 API 的 lazy lookup 核索引 hash、公版身份和完整行集合，再由真实 BSC v2/v3、深空/日月行星消费者核目录身份。索引/正文失败不缓存，重试可恢复；没有正文的身份保持基本事实且不读取损坏正文；返回对象clone隔离调用者修改。旧 v2–v72、v25起英文翻译、v7起null HIP边界以原完整版本集合验证后改为严格范围解析，无前导零、未来版或宽松后缀准入。HR2061原独立固定稿不改。

验证包括全247行实际getter读回原正文/来源，BSC v2/v3及错误HD拒绝，索引破坏/错绑定/重复/乱序/非法身份拒绝，真实lazy失败重试/unknown不读正文/clone，以及真实旧版和翻译、HIP分界。`celestial-introduction-publication.test.ts`只有一份公共机制检查。受影响旧中文及四个资料/来源消费者的广检查日志原样保留：根目录运行造成两个装饰器配置文件级错误（345个实际检查通过、两个文件未执行），仅这两个文件在worker实际tsconfig目录重跑，18项通过；不能把原347报告改称全部通过。最后公共4项与worker类型检查通过。

有界mutation只在output模块中故意漏掉实际已出版HR7557。原生产getter严格返回pinned原文，变体返回null，完全相同断言按要求拒绝；产品源、publication和索引前后精确不变。首次data-URL模块导入受Node REPL限制，在执行前失败；改用工具支持的本地.mjs后完成，失败事实保留。详`output/chinese-introduction-index/membership-mutation.json`、两份模块和公共qualification；不放宽断言或修改生产数据。

此准入阶段只关闭公共准入维护缺口；当时正文批量获取、中文翻译、内容核读/异常清单和新增供给仍未实现，覆盖不足继续开放。未重启实际60066服务或改原P1候选，不能据此冒实时API/native验收；索引随既有Docker全assets复制路径进入候选包装，未构建/部署。独立审查MISSING，手机/完整来源及中文供给验收未关闭，33账原行和原FAILED/UNKNOWN/MISSING不改。

随后完成现有原文/Entity缓存的公共批量预检与异常结果，见[批量输入范围](c07-chinese-batch-inputs-2026-10-08.md)。这不倒改上方准入收据，不代表获取、翻译、内容复核或新稿出版已经完成。
