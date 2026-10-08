# C07 已缓存原文的正常批量预检

公共准入之后，以同一 `prepare_introduction_batch.mts` 复用现有 BSC v3、Wikidata 精确 P528/P972 规则及实际资料 publication/index guard。先验证三项真实缓存、身份/权利/损坏隔离，再扫描71份平面原文数据记录；不跟随旧交接、previousTurn/previousSeal，不复制逐星版本/脚本/测试，不重新请求原文或生成中文正文。

161条缓存记录中，当前英文原文家族有133个不同输入；27条不在本次来源家族，一条相同不可变输入去重。4项（HR5359/4932/1829/8502）从实际 pinned HTML 重新抽取原段落，保持 `TEXT_REVIEW_REQUIRED`；112个输入保原已出版正文，这不资格化新文章。16项新的原文/实体缺少或有多个合格HR，另有一项系统/分量缓存绑定冲突；保留异常，不猜HR/HD/HIP，不修改v72或别名/测量。此计数描述缓存输入，不作为完整中文覆盖、正确性或需求上限。

扩批首结果把七个请求别名与文章实际标题不相同判为失败。MediaWiki 的[固定 revision 参数](https://www.mediawiki.org/wiki/Manual:Parameters_to_index.php)说明 oldid 标识 revision；修复仅允许非空请求别名，实际配置的 revision/title/entity 与目录守卫保持。只补七个失败输入，均保原正文，首次失败收据不改。两条旧元数据未记录entityId：从 pinned HTML 配置恢复，Beta2 Sagittarii 与现缓存相符，Beta1原文为Q66477133而缓存为Q671833。官方[系统](https://www.wikidata.org/wiki/Q66477133)与[主星分量](https://www.wikidata.org/wiki/Q671833)关系支持保此异常，不能强接缓存或宣称旧独立正文失效。

上述实际异常还揭露汇总漏掉收集阶段失败。共同 wrapper 已修：支持行全部通过而收集有失败时仍 `PARTIAL_INPUTS_PREPARED`，全部输入不支持时也输出失败范围并保独立结果。原首次错误汇总收据保留。许可守卫同时验证 actual footer 的CC BY-SA 4.0链接及固定Wikimedia条款；仅标签不算许可。录入时间明确是旧检查器的文件mtime，不冒实际HTTP取得时间。

当前十项共同检查和严格TypeScript通过；包含真实系统/分量失败、空支持集合、许可链接反例、固定原文/段落、错误目录身份、损坏隔离、重复来源以及整个3149行CC0别名/原provenance精确重现。最后只重验受许可守卫影响的四项新准备输入，四项通过、没有新版出版。旧根目录装饰器错误、最初类型错误、扩批首失败与错误汇总均保原，不改成通过。212个各结果明确列出的实际source pins再次读回不变；保留正文的新文章未全部读取，不据此称全部输入已资格化。

详[共同记录](c07-chinese-batch-inputs-2026-10-08.json)、[README入口](../../../../data-pipelines/star-catalog/README.md#chinese-introduction-admission)。获取、翻译、内容复核/新稿出版和完整覆盖仍未完成；实际API/native未重载，独审MISSING，机器峰UNKNOWN。v72保持247行/643978B及原SHA，普通Prepared空、HiPS关，P1合成失败和手机/远端/33账保持。下一仅由PLAN维护，不能沿旧逐星下一步。
