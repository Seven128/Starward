# 成员编号准入边界、五份译介及本地v76

原8份身份拒绝中，5份在同一成员编号行完整记录目标HR/HD/HIP，只因旁边另列其他成员编号而被全信息框合并的旧校验拒绝。另3份仍把多个HD放在同一目标行，或把HR/HIP和A/B各自HD分开，不能组成无歧义的成员身份。[原逐组实际观察](../../../../output/cloud-sky-text-reviewed-recovery-2026-10-11-r1/identity-exception-audit.json)保原，末尾读取旧inspection字段的脚本错误不影响已保存8行观察，也不冒完整20项诊断。

现prepare_introduction_batch.mts保信息框编号行边界；同一信息框整组无歧义时沿原边界，或在有HR/HD/HIP三者的完整目标成员行准入。目标行的歧义/矛盾仍拒绝，不能跨部分行或不同信息框拼编号；原固定实体qualified BSC HR唯一、文章自身revision/title/entity、许可、来源pin与真正获取时间要求保持。候选记录整框或成员行的identityEvidence，后续语义复核仍须区分系统与分量。缺HIP不使用成员行fallback，不把未知变成新标识。

[实际修前/修后8源回归](../../../../output/cloud-sky-text-identity-boundary-2026-10-11-r1/actual-source-regression.mts)在修前失败，修后5候选/3拒绝。由于行边界也可能揭示原被字符串拼接掩盖的编号，本轮一次重核受影响232份固定原文，不使用“已出版所以跳过”的捷径：[重核结果](../../../../output/cloud-sky-text-identity-boundary-2026-10-11-r1/requalification-result.json)保原224资格、新增5资格、仍3歧义，source pins不变，0请求/媒体。现有preflight15项通过；首次严格类型命令未允许原有.mjs依赖，TS7016保在pipeline-typecheck.log；按这些原依赖加入allowJs后，所涉preflight/builder严格TS检查exit0，未改变生产代码来迎合命令。

5篇共59段均已完整读取，选择46段的有界信息，复核稿及限制见[一份批次声明](content-reviewed-components-2026-10-11.json)。Sheliak/Polis/Jabbah/Yaqana的具体命名层级、七公的条件性双星、ν Sco AB/CD不同HR、旁观成员和光学邻星不合并；食变数值自相矛盾、候选第三成员、七重系统不确定性及旧预报均按源保留限制/省略。没有导入测量、额外成员点或影像。

HR6812固定实体Q2482706的标签为斗宿一，自身中文文章入口却为斗宿三；其自身固定英文原文也明确列出斗宿三，目录身份为HR6812/HD166937/HIP89341。已独立出版的HR7039/人马座φ条目对应斗宿一，不能合并。[原名称失败](../../../../output/cloud-sky-text-identity-boundary-2026-10-11-r1/hr6812-alias-discrepancy.json)保原。现共享名称owner集中采用[订正声明v3](../../../../workers/miniapp-api/assets/celestial-names-reviewed-corrections.v3.json)，含本条及前两条已审订正，保旧订正v1/v2和上游标签v1–v3。名称修前行为确实失败；正文采用后两个支持基版的搜索/资料均为斗宿三，错误名不再命中HR6812，其他真实同名结果保原。

[共同构建候选](../../../../output/cloud-sky-text-components-reviewed-2026-10-11-r1/result.json)新增5/保521，稿件异常0、pending0、原3歧义保留。现本地v76为526行、1,295,789 B，SHA256 d0983485a8cd2442577eed0a386196598dbf3b75fecdcfda3dbd6e8644ece472，index 3ba0c980708872e309af17f6736fa3eb5c9ffb9eedd85449c7da578917e41ae0。[实际本地采用及支持基版读回](../../../../output/cloud-sky-text-components-reviewed-2026-10-11-r1/runtime-adoption-result.json)保v1–v75逐字节及原521正文、同一准入/索引；468颗有名星453 READY、15 BASIC_ONLY，缺稿不冒完整供给。builder不自动采用，runtime仍只有原owner。

此次相关输入/准入边界变化后，原出版、别名、资料、搜索/公开HTTP44项通过，worker类型检查exit0；新增5的正常数据/来源检查复用同一批次消费者，读取恢复仍是一个代表。必要检查完成；没有再加全量套件、WEAPP构建、mutation、负载矩阵或旧原生图形实验。15项pipeline和44项worker各自是其范围结果，不拼成目标设备验收。

原v75及旧批次证据保当时输入。唯一PLAN及33项原行未改；Context只补共同成员准入这个持久边界，当前进度只由CONTINUE持有。自审不冒独审；Canvas菜单仍FAILED，Android/iOS/物理资源/真实云端/合格CI和容量仍未验。图像获取/像素加工冻结，完整Goal未完成。
