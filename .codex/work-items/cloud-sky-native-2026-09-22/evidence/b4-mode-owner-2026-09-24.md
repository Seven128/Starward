# B4 模式入口与跨模式消费（非手机层）

2026-09-24。`shared-state-and-recovery.md` 的 `display-mode-switcher` 是 Settings 中 day/night/observation 的唯一入口；Sky 朝向页消费全局模式，不另设入口或模式存储。旧 Sky 设计稿失效，不作为画面依据；`DESIGN.md` §5B/§7.7A 仍约束三站动作：点其他站直接选择，点当前站在有下一站时前进，末站不能 wrap 回日间。

本次从生产代码发现原 `tappedMode` 在 OBSERVATION 当前站再次点按时循环至 DAY；夜间使用者可能意外离开红光模式。已有手势测试原先把该循环写成预期。本次把末站钳在 OBSERVATION、修正无障碍名称，并在 Settings 页面选择同一状态时提前返回，避免多余持久化/偏好同步。没有建立第二入口或另一个模式状态 owner。原函数和旧测试均明确断言末站变 DAY；新回归对该版本会失败。

生产消费者核对：`spot-sky-page.tsx` 从 app store 读模式，变更时使 Canvas 请求新帧并要求 `presentedSkyFrame.mode === mode` 才显示当前标记/标签/拾取；星座开关独立于模式。红光下页面停用固定影像请求，scene renderer 再次抑制巡天/银河影像，保留合规星点及有意点选。`app-transitions.ts`/store 保留观测前 day/night，退出观测恢复；搜索/定位/跟踪仍依同一报告身份/时刻，校准开始受已绘当前帧约束。此为代码与局部组合层，不能推出原生触控、亮色闪帧或手机 Canvas 合成已经通过。

开发检查：`display-mode-gesture`、app transitions、Sky Canvas/time、定位标记、星名标签及跟踪相关 Node 检查共 34/34；Mini typecheck 成功。正式隔离 WEAPP 构建 `MINIAPP_ISOLATED_CHECK_BUILD=1`、slot `sky-b4-mode-0924` 退出 0，产物 `apps/wechat-miniapp/dist/weapp-check-sky-b4-mode-0924/app.json` 已读回；3 条 webpack warning 为现有 CSS 顺序/资产体积提示，完整输出见 [构建日志](b4-mode-isolated-build-2026-09-24.log)。未使用 Android、现用 IDE、共享 8787 或活动输出。

仍待 P1：微信目标运行时三模式切换过程及系统 Back/焦点/键盘辅助选择、星图 Canvas 与普通控件合成、观测红光无亮色过渡、姿态/触摸/性能；Android 旧包来源返回 Canvas 失败未重新验证。B4 其它已识别非手机链见当前 PLAN，最终跨模块组合与独立审查仍开放。
