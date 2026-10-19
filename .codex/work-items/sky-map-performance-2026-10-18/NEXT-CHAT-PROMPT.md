# Starward 新对话接手提示词

此文件是用户将在新对话明确采用的接手文本。仅保存或读取文件不激活实施；用户在新对话要求“按此提示词继续Goal”即构成继续指令，取代原对话“改完方案先停下”的边界。原对话仍保持paused。

请接手Starward，按最新方案继续实施并继续完整Goal。可以多开新agent，必要人类动作尽量后置。复用已完成成果，不重新做前期研究或再停在同一轮方案审查。

工作区：E:/dev/worktrees/Starward/remote-main-20260908
保留当前分支codex/remote-main-20260908及全部成果；HEAD与提交/推送状态先按HANDOFF和实际Git核对，不能回退到旧944a1d6c基线。不切main、不reset/clean、不另建worktree。

先get_goal。新对话无Goal时，以GOAL-OBJECTIVE.md中“Goal 正文”下的完整正文创建，绝不使用摘要缩减目标，也不设token预算；已有同目标则续用并核实际状态，不制造重复Goal或声称自动继承原对话状态。原对话Goal paused只是交接前状态，不是本次继续指令之后仍需等待的授权。若工具不能改变已有暂停状态，如实说明具体工具边界，不假称已恢复。

完整读取以下最新内容，当前事实由HANDOFF拥有：
1. .codex/work-items/sky-map-performance-2026-10-18/INDEX.md
2. 同目录GOAL-OBJECTIVE.md、REQUIREMENTS.md、INHERITED-REQUIREMENTS.md、PLAN.md、HANDOFF.md
3. 项目最新AGENTS.md、project_context/global.md、相关Context owner
4. .codex/skills/starward-miniapp-development/SKILL.md及references/performance-investigation.md
设备操作时再组合starward-wechat-device-verification及同步后的官方wechatide场景；沿原正常会话/完整构建owner，优先恢复首个未通过边界。

最新方法已经定案：
- 每轮从待决问题、竞争解释、最小有效观察和结果分支出发，不按相邻模块连续disable或派生实现形状变体。
- Sky A为输入到首个accepted的响应性。已有真实正常Sky CPU证据可复用；只补能区分准备、等待/合并和数据更新责任的关联/映射缺口，不重录同样CPU，也不凭热点排名直接改状态所有权。
- Sky B为完整正常Play的持续内存/退出/恢复。正常Sky分配采样是当前首选，需正确目标、正常负载和可解释窗口；更便宜的观察只有能区分同一问题时才替代。存活分配、总churn、保留链与PSS/RSS/Swap分别解释。gen22/23阴性复用；gen24 scene-memo仍暂停。独立工作不关闭B，不为缺自动化而断言运行时不支持，不重试资格未变的重型heap/native路线。
- 地形先在明确候选/缓存条件下关联相关响应/数据就绪与首个有效覆盖，区分请求等待和响应后等待，再沿证据细分。全链路指标是可选证据；分块、预取、cloud anchors和worker都是条件分支。复用稳定窗口、共享源读取与有限细档成品；HTTP/local metadata快不代表手机缺口改善。

现场接手要点（只作最后记录，先按需核对实际状态）：
- 当前feedback保存的是H3 gen26，已选中完整包并调用过一次auto_preview，但官方返回结果/可能的taskId被两层包装丢失。保存的completed不证明终态，实际UNKNOWN；手机最后仍显示旧Sky，deviceSession=null，H3未绑定。先读H3-PREVIEW-BOUNDARY-REVIEW，尝试从原调用已有结果恢复原taskId；没有则保留UNKNOWN，不能盲重发或bind。未来新预览前应修复结果保留/分类，但不以该修复冒充这次送达已解决。
- 正常Sky gen25已有有效CPU/完整Play证据；刷新26后旧输入session失效。既有结果可复用，旧session/截图不可直接输入。H3包不能当正常Sky基线。
- 无线ADB在暂停前已恢复并精确匹配旧目标，之后可用性未重新确认；不要再沿用“无线永久断开”的旧摘要。每次输入前按设备owner fresh capture并view返回的唯一图片路径，守60秒/一次输入边界。
- 8798→8799是恢复PG/r6和已有SAMPLE_DATA天气的隔离公共服务，不是8791账号恢复或真实天气通过。服务/候选/外部证据/精确防火墙清理owner见HANDOFF；PID或端口不是身份凭证。
- 8791最后无监听/账号检查点，N05仍UNKNOWN；不得reseed或清存储来制造恢复。R6提醒已送达，绝不重发。保原配对、VPN、账号与权限；不得扫描聊天/相册/存储。敏感原始资料留外部私有owner。
- EOG精确原始数据、私有Drive读回和fresh receiver恢复已有完成证据，不再重哈希17GB或重产r6。既有源码合批、数据流程和CI结果按证据复用；不要把它们当作未完成的真机验收。

root独占手机/ADB/DevTools/feedback/服务；新agent只承担不冲突的工作，用完结束、不复用旧agent。不向其他聊天或外部人发送消息。H1–H8/R1–R18/A01–A15/N01–N09全部未撤销义务保留，正常目标设备性能、真实天气、真实分享/文件接收、必要独审、授权Git/main收口和精确清理仍按各自证据完成。未完成必需结果不得标complete。

这是新对话接到用户明确采用时的继续实施指令。先核候选/在途操作与受影响观察入口，然后按PLAN中当前能推进的责任持续执行；不要把工具准备、文档或局部样本当成Goal完成。
