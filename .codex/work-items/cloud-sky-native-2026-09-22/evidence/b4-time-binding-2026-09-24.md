# B4 时间提交与位置动作绑定

公共 Observation Context 的时间/日期提交由 `sky-context-session` 锁保护；原页面在提交期间拒绝 `locateCatalogObject`，但天体资料仍展示可点击的定位与跟踪动作，点击没有反馈，而且旧时刻位置查询仍可继续。现在天体位置动作继承该提交锁：暂停旧绑定查询，显示“正在更新观测地点或时刻”，不提供不可生效的相机命令。提交失败/取消后锁释放、旧提交时刻继续可用；提交成功后报告上下文匹配机制先撤回旧帧，新的位置查询按当前 Context/时刻/目录身份重新绑定。

新测试通过实际页面 JSX 读取 `suspended={contextSession.busy || timeSaving}`，并执行实际组件函数，核对两种锁均暂停查询及按钮、目录缺失时也不露出重试操作、解除锁恢复动作。修复前该测试在查询未暂停处失败，修后通过。与 Context 迟到/隐藏恢复、时间预览、跟踪重试及来源返回边界一起21/21通过；Mini类型检查通过。最终正式 WEAPP 构建写入专属 `sky-b4-timebinding-final-0924` 隔离 slot 并通过，日志 [b4-time-binding-final-build-2026-09-24.log](b4-time-binding-final-build-2026-09-24.log)，仍有已有三条 webpack 提示。前一个构建 slot 属中间快照，不作最终构建证据。

以上是组件/页面组合的开发证据，不等于目标手机上按钮合成、焦点、Back 或来源页 Canvas 返回验收。时间提交之后完整搜索/资料/跟踪与模式/校准的目标组合仍按 PLAN 继续。
