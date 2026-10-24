# R20 通知评估与收件箱 App 消费者独立审查

审阅者 `review_notification_app`。范围为当前 Native App 的 Tools/Rules/Inbox、controls client 与既有 pending owner；API/domain 的独立审查由另一个 reviewer 持有。**Root修复后，本次四项P2均已通过原独立行为复验，限定源码范围未发现未关闭P1/P2。** 10份新冻结文件首尾匹配。此结论不关闭完整通知family、production/多owner或目标Native设备义务。

## 权威与证据边界

读取当前 UIUX Skill、其 React Native/文字层级参考、DESIGN Native App profile、默认 Context、Mobile Screen Contract/notifications owner、Source Plan `OUT notifications-and-toolbox` 相关要求/风险/验收及已批准的默认值。当前用户已取消无障碍/大字专项，不将历史 Skill 矩阵重新扩成门槛。

保持全部类别显式 opt-in，配置保存/immutable marker 与实际评估、内部 Inbox、OS/外部通道分别判断；原触发与后续资料、反转/过期/未知和读取失败不可混为当前成功。物理 Native App 触摸、键盘、Back、生命周期、三模式实际渲染、AsyncStorage 跨进程以及 OS/推送通道未由本次 DOM/RN primitive mocks 证明。完整 family/F14/Goal 仍未完成。

Root已明确本批共享Inbox client只负责当前权威观察及Rules的实际展示/发布消费者，不为旧rule pending/POST补造历史owner授权。其跨不同owner亲和性、缺原资格历史恢复及production/多owner义务没有据此解决；原receipt保持。下述controls/私有投影反例和复验不能外推关闭该边界。

## 四项 P2 的修前证据

1. **顶部设置绕过编辑保护，丢未保存表单。** 真实 Tools → 新建规则 → 总云量/阈值31 → 顶部通知设置 → 行前提醒，编辑器已卸载，阈值输入消失。内部 Inbox 子入口虽然禁用，顶部切换仍可绕过它。独立正确结果断言失败于输入为null，未写任何规则。合法修复可守住编辑器或访问后返回保输入，不强迫另建router/保活结构；取消后仍须可离开。
2. **未取得 owner 资格却声明空 Inbox。** 先用真实 HTTP/SQLite/source产生1条非空历史，再使 actor 资格失效；开关读取403且 Inbox 未取得读取资格，界面同时显示“通知开关读取失败”和“收件箱尚无通知”。独立“不把未知当空”断言实际失败。
3. **明确 owner 拒绝仍显示旧私有历史。** 先实际显示A的1条历史，切服务端 actor B后点击重新读取，真实HTTP403 `notification_controls_owner_mismatch`；旧A消息按钮与“最近资料仍满足条件”仍显示。不能把权威资格拒绝按普通503保旧处理。该修复不得清掉原controls pending，普通临时失败仍应保独立有效历史。
4. **迟到 A 读回覆盖新 B 权威观察。** A控制提交后，真实A GET读回已经取得但在fetch端延迟；随后foreground实际读到B controls。释放旧A结果后 mutation.onSuccess 无条件setQueryData把当前owner从B改回A。独立断言实际Query当前owner仍为B失败。A原提交可能已被有效确认，问题是旧异步结果不能恢复A的当前界面权限。

原件统一在 `tmp/notification-app-independent-20261024/`：`prepare-probe.mjs`/`review.test.tsx`/`vitest.config.mjs`，首两条 `before-fix.log` 为0/2正确断言通过；第三条 `owner-denial-before.log` 为0/1（2例按名称过滤），第四条 `late-owner-before.log` 为0/1（3例过滤）。过滤不算验收，没有把它们相加冒一次全套。测试执行实际 Tools、React、client、Fastify、SQLite 与生产 ForecastQueryService，受控端口是RN primitives、上游fixture/Date、actor和传输时序；没有复制生产handler或用空内容冒实际效果。

Root确认后调整第一条probe的控制流，允许合法的编辑中禁用：核心“阈值31/完整未存输入不丢”断言保持，追加取消后可正常打开设置。第二条仅等真实controls Query error，不限定旧错误文案；第四条仅等mutation离开pending（success或error），不强迫过时A读回被确认。其核心空态/权限/owner断言不变。原未禁用实现仍走同一访问/返回分支，原第二条实际Query error及第四条success分支仍在同一业务断言失败，原日志继续有效；不为此改写生产或做routine mutation gate。

## 修复读回与最终独立检查

作者初次App 7文件freeze与13项检查未覆盖上述反例；Root解除App冻结后完成四项修复。最终清单 `tmp/r20-notification-evaluation-app-repair-freeze.json` 含10份App/client/正式测试，独立首尾SHA均匹配，原件 `source-freeze-start.json` / `source-freeze-end.json`。本review没有修改它们。

- 顶部动作与原规则编辑owner共用同步编辑锁，保护未保存输入；取消后释放，真实Tools可正常打开设置。没有为夹具新增router或另一个表单writer。
- 空Inbox仅在有资格、实际读取成功时声明；owner未取得或明确被拒绝时有可恢复说明。临时503保留独立有效历史，与401/403权限拒绝分别处理。
- Rules与Inbox默认/实际注入消费者配对同一Inbox client的当前authority观察；明确拒绝会撤销消息、详情和规则的私有投影，原持久pending不被清掉。读取失败不是新owner授权，原输入仍可明确取消而不删除待确认命令。
- controls保原读代次/当前owner与revision的发布资格，mutation取消Query前后均检查。旧A读回即使可确认A的原效果，也不能覆盖已经取得的B观察；Rules实际读/保存结果也经同一当前authority限制发布。

| 本审阅者实际运行 | 结果 |
| --- | --- |
| 固定四条独立真实Tools/HTTP/SQLite反例（上述仅等待边界按Root确认调整） | **4/4，0skip**，`fixed-probes-final.log`；旧失败仍保留。task配置有一条Vite提示esbuild JSX选项由oxc覆盖，未影响实际测试执行，不作生产问题或Native证明。 |
| 三个受影响现有正式文件：RulesPanel、InboxPanel、notification-rules-client | **3文件17/17，0skip**，`affected-final.log`。实际非空80→10%/目标/归因、原key/输入、显式启用、反转、临时失败保历史/恢复、前台过期，以及Root加入的权限/迟到/编辑修复检查均执行。 |
| Mobile工作区typecheck | **exit0**，`types-final.log`。 |
| 10份冻结源限定diff检查及首尾SHA | 通过，Git既有CRLF提示保留。 |

上述原件统一位于 `tmp/notification-app-independent-20261024/`。不同批次不相加冒一次全App套件；没有运行构建/远端CI或Native设备。API作者后续backend资格修复及其最终freeze由API reviewer和root持有，最终整合不能用本App结果替代其责任效果。

本次检查足以关闭这四项已证源码问题，不继续派生相邻时序/主题/对象矩阵。真实设备显示、交互/系统Back/键盘/进程重启、生产身份/供应、旧rule pending跨owner/缺资格恢复、通知深链、OS排程/取消及外部通道仍按原owner未验或未完成；内部Inbox不是系统送达或安全保证。

本 reviewer 未改生产、正式测试、Context、PLAN/HANDOFF/INDEX、依赖或Git；没有构建、操作IDE/手机/共享服务、VPN/网络、冻结代、用户数据库或上传。独立测试只用新隔离SQLite/随机loopback，afterEach已关闭自建监听/连接并验证临时目录归属后清理。
