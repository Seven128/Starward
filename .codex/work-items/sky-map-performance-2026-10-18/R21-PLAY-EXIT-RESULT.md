# r21 普通播放尝试后的原生退出

2026-10-21。当前普通预览的全Sky修复候选在播放尝试附近发生了原生崩溃。**B仍失败／未解释，不能宣称无泄漏；不再为了补缺失回执重复压力。** 结构化事实见 [JSON](R21-PLAY-EXIT-RESULT.json)。

- 已实看唯一r21标签并绑定新session；source `502d9d644785e33af7ce1537bc1899a738725cc752d42daefaf95d66baee3448`，bundle `5a9f4b6bc8eb3e9c4dc8c3595467476d74e4664cd4db0c959a060ee0a83f99c1`。场景为264.355°全天空夜间、地景与六字段面板，2026-10-20 20:18:38。
- 首次record-tap在输入前被过期截图守卫拒绝。之后fresh capture仍显示暂停起点，第二次record-tap运行后因小程序不再前台失败。既有录制器按隐私边界停止并清理自己的手机临时文件，没有返回视频或actionSent成功回执；不能补造实际Play开始时刻或时长。
- watch共有12行，前11行均在该watch绑定的同一前台owner，末行119.022秒为not_foreground。第10行结束98.119秒尚未见增长，第11行108.911秒报告PSS 5,518,021KiB/RSS1,780,148KiB；第一行PSS5,244,242KiB、Swap4,053,081KiB，起点已高，不是冷启动。观察前段主要为准备/等待；没有实际60秒Pause或drain，不与r20按活动率相除比较，也不合并两个watch为同一进程曲线。
- 只读WeChat退出历史的最新appbrand记录：reason5（native crash）、status6、foreground importance100。仅保存这一个块；对应限定crash/DEBUG时间范围中，精确同PID与process的唯一native块已保存。SIGABRT、libmmv8帧与allocation failure均存在。两条Scavenge为432.7→427.7MB/1.12ms和427.7→427.6MB/0.58ms；这不是此前r13的Mark-Compact数据，不能混用或推算全部保留堆。
- 退出历史、watch与屏幕共同支持这次运行仍存在严重退出风险；没有新retainer图或实际强根，不能把原因归到新星点准备缓存，也不能排除宿主／历史会话驻留等机制。GUI恢复前不以新的PSS轮次替代必要的保留链观察。
- 本轮没有15秒metrics或terminal，导出修复尚未在正常Play的手机路径得到验证；长按有效receipt独立见[R21长按结果](R21-HOLD-RESULT.md)。

10份必要原件已存本机私有`device-resume/r21-normal-play/review`并逐件哈希读回；无上传或提交。原工具遵守前台范围，没有读取聊天或全机日志，没有重开小程序、清数据、停VPN/TUN。当前手机前台不是目标小程序；不沿旧截图继续输入。独立推进已证geometry过期请求责任，Memory需要桌面控制恢复后的实际Sky目标与堆图。
