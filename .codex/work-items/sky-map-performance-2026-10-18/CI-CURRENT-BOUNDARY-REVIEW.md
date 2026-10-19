# CI 页面局部观察与终态更正

2026-10-19初步核对，2026-10-20由root按实际API/完成日志更正。本文件只拥有此次调查的证据边界，不要求改产品或CI配置。

初步独立核对确认18c2cac1与8d55e50e的miniapp-contracts、coordinate-system、run-node.cjs、package-lock和product-ci workflow对象相同；前轮contracts84项约3.47秒。页面展开后可见最后一条formal-feedback文字及相关同步实现不包含长生命周期资源。因此最后显示的用例不能定位阻塞owner。

初步将页面计时和可见首批日志解释为“contracts约25分钟异常执行”的判断**已撤回**。后续[精确终态读回](CI-8D55-TERMINAL-20261020.json)确认run39277233795/head8d55完整success：job15:21:54Z至15:31:16Z，Check release code15:22:59Z至15:29:26Z，OCI构建success。完成日志在内存定向核对：contracts15:23:21.0529094Z至下一workspace15:23:23.5366372Z，84项输出，仅约2.48秒。没有保存或回显原始日志。

页面仅呈现一段日志，先前读取的非终态也未可靠代表实际最新进展；本次未定位具体缓存、流式更新或呈现原因，不把它归为产品死锁、平台故障或特定runner问题。实际完成结果否定该停顿推断，也否定“8d55缺完整CI成功”的中间记录。必要的新0a855654源码CI仍按自己的revision单独验证，没有额外并行重跑、改变test concurrency或timeout。

先前独立审查对源码相同、同步函数和前轮时序的事实继续保留；当前终态、源码绑定、必要发布控制与空间实读由[HANDOFF](HANDOFF.md)及[交付JSON](DELIVERY-RUN-20261019.json)拥有。后续记录不得再把页面最后可见行称为真实执行尾部。

## 当前平台排队边界

2026-10-20北京时间零点后，官方[状态API](https://www.githubstatus.com/api/v2/summary.json)报告Actions degraded_performance，incident `8tzbpcnl75jp`自2026-10-19 15:49:25Z起investigating；15:56:34Z更新说明workflow处理可能延迟。这与本仓库新CI和旧自动release queued一致，但不单凭公共incident确定每个run的内部原因。

8d55自动release39280890796在qualify queued、无步骤时一次normal cancel返回409/not-in-progress，没有成功取消。root设置仅限此run/精确head的20分钟有界等待：状态变化才记录，queued时退避至120秒；转in_progress后只发一次cancel并等实际终态。它不改CD/guard、不重派发布或触碰主机。当前观察文件为[控制读回](CI-QUEUED-RELEASE-CONTROL-20261020.json)，后续现场仍由HANDOFF拥有。

后续终态：8自动release已completed/success，qualify success、publish-and-deploy实际skipped（页面及job118165724092）。有界observer正常退出，未发出成功cancel，不存在待复用PID/session。queued/列表中间状态不用于覆盖终态；没有运行镜像push或主机步骤。新0两CI仍queued，主机新mode尚未dispatch。
