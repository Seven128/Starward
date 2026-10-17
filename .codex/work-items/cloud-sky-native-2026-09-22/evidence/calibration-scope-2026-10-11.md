# 校准事务的页面范围与公开恢复（2026-10-11）

沿唯一PLAN的B/E继续，复用前轮已绑定的公共命令、页面生命周期和正常尺度先绘后冻结。仅指定worktree／分支，HEAD仍b73523f1c76bf50a3811fcff65f3e2d2f791373d。精确源、实际候选、冻结控制和保留输出由[本轮核读](../scripts/check-calibration-scope-2026-10-11.mjs)写入[绑定](../../../../output/cloud-sky-calibration-scope-2026-10-11-r1/current-binding.json)。本次没有改变方案／图像阶段或33项义务。

实际开始／确认／取消按钮原先能使用上一帧状态：排队开始越过hide-return、卸载、时间绑定／预览／播放、日历、模式和Canvas失效；旧确认／取消会结束同一传感器session内后一次编辑；Canvas失败遗留编辑锁，公共恢复被该锁阻断。现在开始沿当前显示范围核公共时间、实时面板／日历、实际已绘帧及原方向owner的revision；准备与编辑仅记录Context、公共时间、可见周期、模式、Canvas及方向owner版本的命令范围。冻结、最新raw姿态、完整旋转与校正只由原方向owner持有，没有另造几何／校准owner。

确认和取消核当前命令范围及按钮所属的原presentation revision，不能结束新事务。提交锁阻止确认，当前取消仍能释放自己的编辑。确认必须由原owner接受最新原始姿态；过期姿态导致确认失败时保编辑／面板，当前取消仍可用。Canvas failure统一退休准备与自己冻结的编辑，已绘帧清空后旧开始不能再冻结失效画面。Context／时间／模式／Canvas等变化的effect只按live owner退休失效范围，旧effect不得取消有效替代事务。等待正常尺度的accept还核方向revision，前一方向frame不能完成新的准备；实际有效paint仍能完成。

| 有限证据 | 结果与实际范围 |
| --- | --- |
| 最终修前 | `calibration-before-final-r4.log`实际上一绑定page、48项中21项行为断言失败／27项原行为通过，无ReferenceError／SyntaxError。 |
| 逃逸反例 | 本轮r1源仍以捕获的`isPreviewing`取消已撤回预览的有效准备；单项`live-preview-before-r1.log`到达失败断言，源快照保留。移除该残留后统一读公共时间，最终通过。 |
| 实际集成 | 复用同一既有dome夹具，升级为真实Context session、方向／时间／浏览owner、实际page accepted paint与公开JSX按钮；48/48。当前raw确认完整旋转、无新raw取消、锁定／失败恢复及替代scope均有实效断言。Canvas／传感器端口仍受控，不是native或物理精度验收。 |
| 相关范围 | 32个实际文件311/311，App自有TS5.9.3 exit0。没有用根TS6、空入口或源marker冒行为。 |
| 构建 | 两个新的隔离CLI实际包，明确`built-candidate.test.mjs`各3/3；最终r2全fingerprint、预算、编译纯origin五角色及生产predicate读回。 |
| 保全／审查 | 原十三目录完整fingerprint保持，19源控制／源配置／冻结输入和212资源／WXML／WXSS保持；33行原义务文字相同。自检不等于独审，MISSING保持。 |

当前r2 manifest `artifacts/miniapp/release/cloud-sky-calibration-scope-ci-20261011-r2.manifest.json`，UUID 56aa0e3e-212b-4e75-997c-64f86774d830，274文件4,652,187B，SHA256 d9b04525f0c39c6b078f5ed42124760d125fdebd0ef4f138b3163297b36cb365。主包2,096,426B／2,097,152B余726B。r1 UUID 3a9f8eba-f38e-4495-8f85-ffe11e1bf3d3，274文件4,652,192B、SHA89abc338a2412028d8e11d30f79ed5712004d4cfae3ef403cfe10a6c9b3cabc9；两者均保既有3条CSS／性能warning。两包是dirty本地CI类`ci-structural-nondeployable`，非可部署／qualified protected CI或当前原生运行证据。

中间失败原样保留：初版fixture把原来共享VM的dock迁到捕获render时漏接`cancelSkyCalibration`，2条ReferenceError不作修前产品结论；补实际命令后最终修前为到达断言。首次修后37/38，隐藏fixture中的待定请求未退休，改为先按live scope安全退休、再拒旧render，不误清新scope。首次类型错误是fixture Context ID未使用既有brand，修真实类型；311最终和TS类型通过。中间38／47项、旧日志与两个包未删除／覆盖。

图像43延期、三份公共接入待定及原质量结论保持；原生控件合成仍FAILED／UNKNOWN_PRODUCT_VS_DEVTOOLS，完整物理校准／Android-iOS、资源峰、真实store/CDN、容量／回滚、qualified OCI和独审均未闭。没有新增下载、像素处理、云写、扫码／投递、部署或外联。Goal active、无预算、未完成；下一步沿PLAN核当前完整Taro／React公开事件组合，用当前绑定源与既有真实消费者入口，不复用旧图形运行结果冒当前native或重播无新输入IDE试验。
