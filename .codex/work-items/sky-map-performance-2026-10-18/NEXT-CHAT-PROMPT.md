# Starward 新对话接手提示词

请接手Starward，沿最新PLAN/HANDOFF继续实施完整Goal。这是明确的继续指令，原“改完方案先停下”边界已解除。用户现在外出并携走测试手机：**优先持续完成不需要手机的工作，暂不操作/反复连接手机、不发预览或真机调试、不要求用户立即配合。** 手机依赖保留未验，必要人类动作集中后置，待用户明确设备重新可用再恢复。

工作区：E:/dev/worktrees/Starward/remote-main-20260908
保留codex/remote-main-20260908和所有未提交成果；不切分支、不reset/clean、不新建worktree。

先get_goal。新对话无Goal时，按同目录GOAL-OBJECTIVE.md中“Goal 正文”下的完整正文创建，不设token预算，绝不使用摘要缩减义务；已有同目标则续用，核实际状态，不制造重复Goal。原对话最后实际paused、未完成，不代表新对话自动继承或仍需重新审批方案；若工具不能恢复已有paused，如实说明该工具边界，仍按本条已授权范围处理可执行工作。

完整读取最新：
1. .codex/work-items/sky-map-performance-2026-10-18/INDEX.md
2. 同目录GOAL-OBJECTIVE.md、REQUIREMENTS.md、INHERITED-REQUIREMENTS.md、PLAN.md、HANDOFF.md
3. 项目AGENTS.md、project_context/global.md及相关Context owner
4. .codex/skills/starward-miniapp-development/SKILL.md与references/performance-investigation.md

当前事实只由HANDOFF拥有。沿同一方案，复用已完成研究、资格和有效证据，不重新做同一轮方案审查。当前HEAD69401c097572799234e6b97478a4a1ddfe06c810已push，Product39246751994/Context39246759692均success；main最后仍32ec61a4，后续同步待做。git实际状态再核，不能回退旧基线或丢弃dirty。

本轮已取得成果：
- 跨日等待从白昼错误回到旧夜景的修复已提交；133/133、TS5.9.3与生产独审通过。r10完整包/接入独审通过，真实普通预览已验证更新中保持白昼、取消回原时刻，见R17-A1-R10-CROSSDAY-RESULT；保留取消像素/字段短暂先后更新的限制，不把它升级为完整A/Apply验收。
- r10 app077d3aeb3ffd874efabf9b2907cb7ef90b446305a9f029a64bf07400581c3094，337文件/5,003,601B；source e7e558d27d1b0c1c0b748bfd7c8bf56e0b33aa8270e5bdcd15edb57b1ada480e。一次官方preview exec67914明确success，实际独有r10 label后绑定。feedback ncOpxo /generation-000001-1GLGwG/project；保存session Klvb4h仅作恢复记录，现在不能输入。runtime AppID/手机整包字节未读回，仍development_feedback。
- 普通Play第一轮已见60秒自身Pause和同run terminal；第二轮同watch有4行前台PSS后转miniapp_not_foreground，视频/metrics待离线审、第二terminal未见。原31772/92465句柄不可恢复，实际相关进程数0。不得重放或推断崩溃/OOM/完整60秒结束。R17-A1-R10-ORDINARY-PARTIAL.md准确区分此前两个错位watch，不能跨文件slot0相减计算增长。
- r10原件/完整构建等2,703件/56,451,346B已保全于E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/r10-handoff-phone-away-20261019，manifest SHA5e5f746bcebcecb7588763a2a7e5ac8b33fa45d0524034a6ec2e95a7398f3b82；未删除源码/候选。r8/r9档案和既有研究继续复用。
- r10地形file_ready已透传实际准入文件SHA/bytes，独审通过，但新pan/zoom未做；旧r8 key从未保A5→SHA映射，不再追旧连接。

接手后优先顺序：
1. 离线审已保存的r10普通Play原片、metrics/terminal和内存窗口，沿已有源码/分配/退休证据判断下一具体owner；只补能改变修复或完成决定的缺口。已有正常CPU/r7allocation、gen22/23阴性复用，gen24仍暂停，不连续派生相邻disable。
2. 完成已审源码、当前task脚本、方法与证据的责任组交付；核实际dirty/隐私/链接与必要检查，提交推当前分支，保无关成果，不force-add私有或ignored构建材料。
3. 按DELIVERY-NEXT-ACTIONS-20261019.md和release owner推进已授权main同步/真实天气服务恢复。先重核远端，普通非强推；CD=true/operator-preview，main成功会真实停启writer、备份恢复校验、迁移和供应smoke。依现有owner刷新连接镜像、核精确CI/CD，再一次identity→runtime按首个实际失败分支，不能冒充只读或绕guard。不要借本机8791/fixture来补真实QWeather。
4. 继续H3山体/照片、服务、共享/文件接收对象、数据/代码交付和精确资源收尾等独立准备。手机A/B/地形连续覆盖/原生/iOS/真实微信接收结果后置，不能因手机离开而删除这些义务。

保护边界：
- 原H3 gen26 t6aywi/generation-000026-JYgy2m仍UNKNOWN，deviceSession=null。completed不代表官方终态；不重发、不bind、不向旧session输入。后续新候选预览/必要调试用户已统一授权“这些不需要一个个单独审核，我都允许”，设备恢复后不逐候选再问，但每个在途操作仍核实际结果。
- 8791原账号/N05 UNKNOWN草稿/历史、已送达R6提醒、原配对/VPN必须保留。不reseed、不清账号/权限，不重发提醒，不扫描聊天/相册/账号存储、不擅选接收人；敏感原件只在外部私有owner。
- 8798→8799为隔离公共服务/恢复PG/r6/SAMPLE_DATA天气，旧句柄只是历史记录，按实际listener/owned health恢复，不默认重建/重启。当前旧r9 source窗口226625804尚待退役，旧debug163252880已关闭；先核实际窗口与源码同步，不重开旧快照、不杀共享IDE。
- EOG两精确原始文件、Drive远端读回/fresh receiver、r6和数据锁已有证据，不重哈希17GB、不重产r6、不扩共享或付费。

可多开新agent处理不冲突离线责任，用完结束；root独占设备/IDE/构建/feedback/服务/Git写入。不向其他聊天或外部人发送消息。全部R1–R18/H1–H8/A01–A15/N01–N09未撤销义务保留，必要独审、真实用户结果、授权Git/main交付与精确清理完成前不得标complete。直接持续推进无需手机的已授权工作，不停在确认能力、重复计划或工具准备。
