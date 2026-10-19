# 正常实例跨日预览、恢复与时间尺失配

本轮仍为 `development_feedback`，候选身份和限制沿 [既有正常实例观察](NORMAL-EXISTING-PHONE-OBSERVATION.md)。结构化结果见 [CROSS-DAY-PHONE-OBSERVATION.json](CROSS-DAY-PHONE-OBSERVATION.json)。未重发预览或绑定 gen26，未 Apply。

## Candidate identity

仍在 G2RzCu 新观察会话中操作手机上可见的“正常Sky基线 v3”。项目候选是 gen25 review-r2；可见标签不证明手机整包/runtime AppID。预期字节、原完整语义和历史负载由原 owner 保留。本轮不关闭响应性 A、分配/持续使用/退出 B 或最终 R17。

## Invocation result

Sky 通过菜单返回 Map。原公开搜索因任务 bridge 未放行 `/v2/places/search` 返回403；确认实际 controller 是无账号只读搜索后，仅补精确公开入口。HTTP200、账号与分享403、搜索POST403实际读回。手机重试从错误变为真实空结果，再通过地址中已有的公开字符 A 搜得原隔离站位并重新进入 Sky；没有改地点数据或账号。

桥暂加只保32项的公开 HTTP 边界 ring：仅静态路由类别、方法、状态、耗时、返回时刻，无URL、查询、Context/站位身份、headers或body。其时间不是原生绘制时间，也不是输入到可见延迟。

## Observed product behavior

- 返回 Map、搜索选点、重新进入 Sky 均实际可见。Map 同时出现地形、图层、空气质量/近期天气、计划等错误；尚未归因，不因重新入 Sky 成功而记这些能力通过。
- 日期加至次日被“不能晚于当前时间”拒绝，19日04:30保持。这符合现有现实当前时刻上限，不是跨日供给失败。
- 日期19→18→17，04:30不变，实际星图随之改变；期间出现“正在更新天空，当前星图时间见下方”，随后恢复预览状态。第二次跨日对应 ring 中唯一 `sky-geometry GET200`，HTTP114ms，返回于 `2026-10-19T00:09:54.808Z`。未抓原body，不能据HTTP200单独认证完整供给/权限或精确呈现时刻。
- 取消后独立截图恢复19日04:30及原天空，预览提示消失；该观察窗 ring 没有 Context PUT。取消录像采样尾部仍见17日/更新中，恢复事实来自后续 capture，不把录像未覆盖的间隔说成已逐帧看见。
- **失败：** 跨日与取消后时间尺刻度位置未始终跟随恢复后的时刻，19日04:30上方值对应的尺下方仍显示12–16时。此为真实可见失配；软件原因/修复归后续修复 owner，不能把本批记作时间模块验收通过。

## Verified

新增42文件/11,761,817B逐项SHA复制至原外部owner的 `device-session-continuation-archive`，保留原44文件快照，不覆盖。包含7段新原片、17张截图及其metadata和当前session metadata。原片元数据和7张2次/秒联系表均已由 root 实际查看；尾部黑格是未填充联系表，不是产品空白。原片帧数/时长不当物理FPS。

## Unverified

本次未独立读回手机Context/完整几何body、权限拒绝分支、Apply持久事务、跨日精确科学位置、Map错误原因、物理连续双指、修后手机时间尺、完整流畅性或分配稳定性。114ms仅是相关HTTP范围。真实天气、资料/分享/文件/iOS及全部其它 R/H/A/N 未撤销义务继续保留。

## Invalidated

这些已归档截图均不再提供输入授权。gen26实际官方终态仍UNKNOWN，新候选尚未送达。原生失配的这次实际输入链与软件夹具能复现的机制须分别说明，不能以软件通过宣称旧手机问题已修。

## Cleanup

未清手机、账号、草稿、缓存、配对或VPN；未发分享或提醒。只修任务桥公开搜索、增加有界无身份HTTP观察及外部档案。原服务与精确清理责任由 HANDOFF 拥有；下一次现场操作和归档均由root负责。
