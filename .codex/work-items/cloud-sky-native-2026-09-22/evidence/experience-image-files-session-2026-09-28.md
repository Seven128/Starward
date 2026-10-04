# 共享图片文件归属与启动清理

本轮依唯一PLAN核实跨JS运行时编码文件归属，复用现有原生请求/解码/GPU责任；未重开技术选型、下载研究或修改出版。Goal保持active、无预算，手机仍不可用。此记录不是整体质量、设备性能或独立审查验收。

## 实现与依据

此前两条请求链各用Date.now会话和局部序号。活跃Hook/请求owner会释放各自文件；App启动只有native chrome同步，没有退休会话文件清理。原clean-v11最后读到34份40,861,833B编码文件，包含上一轮25份35,766,274B历史文件。这是编码文件列表，不是native/GPU内存。

新增纯服务`apps/wechat-miniapp/src/services/sky-image-file-session.ts`，让共享星空图片Hook和选中深空图片请求使用同一个JS运行时命名空间和递增序号。日期加随机盐降低同毫秒重建碰撞；它不是鉴权标识。各请求仍处理原有唯一写入、迟到取消和释放，注册尺度、来源、球面/相位、解码、粗图回退和GPU代次责任未变。

App useLaunch通过原生FileSystemManager读取USER_DATA_PATH。一次、可合并、顺序删除仅匹配已知两类旧会话生成文件；保留当前会话文件、未知名字、目录和其他模块文件。兼容旧无请求后缀的Messier图片缓存。失败区分unavailable/partial，安全计数日志，不阻塞独立天空或native chrome，不进入渲染/姿态循环。没有清账户偏好、HTTP缓存或整个用户目录。增加新命名格式时须同时核更新此owner的识别/迁移边界。

生产App启动函数的修前回归实际失败：4份旧文件仍在；修后移除，当前会话和无关文件保留。有关请求、文件、解码、Hook/Canvas/发布代次、粗图回退检查通过，见[开发检查](experience-image-files-checks-2026-09-28.json)。最终补充未知文件名含换行的检查也通过，见[最终边界检查](experience-image-files-boundary-checks-2026-09-28.json)。原JavaScript正则在未启用multiline时已经拒绝尾部换行；尝试移除冗余完整匹配检查不能产生反例，故已撤回这次多余生产改动，未把它称作已修缺陷。文件owner生产逻辑与clean-v12构建一致；后续A日期守卫另入未打开的v13，不升级此证据。类型检查、构建通过；构建保留既有CSS顺序和webpack资产建议告警。

## 本代原生观察

[干净候选](experience-combined-clean-v12-candidate-2026-09-28.json)：SHA256 `bf179db231d3a73314ac552b4eb8010babcc3cf6e359e232e447c13b7d7cebea`，257文件/4,472,475 rawB，raw main2,084,432B、content1,012,055B、spot423,617B、sky952,371B。无诊断、fixture客户端、vConsole或source maps；loopback8791不推手机。raw字节不是官方包体。

原v11窗口已关闭，9444已无监听；本轮只保留v12目标，不维持多代窗口。新版初始列表0编码文件不能单独归因删除原v11的34份，跨候选/入口变化不构成同项目因果证据。

公开Map→搜索示例点→云观星→方向不可用时手动入口→00:00→M31搜索定位→双指1.5°实际成功。来源是`NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像`，不是2MASS背景来源。已绘图片、来源和两类请求文件均读回同会话前缀；4份4,241,290B包括M31 DETAIL 41,153B与三份共享PNG。见[实际加载](experience-image-files-native-enter-2026-09-28.json)。该次当前提交16Z/revision2保其时点，不覆盖重启后的活动Context。

为了在同一项目验证启动行为，复制实际已加载的29,180B PNG和41,153B JPEG为没有现存owner的旧会话名字，并写入4B独立测试文件。这些复制文件仅是清理夹具，不是新出版或新天体数据。原6份4,311,623B及独立测试文件读回见[重启前](experience-image-files-native-seed-2026-09-28.json)。两个192×413实际截图已看，前后SHA相同；不与上一轮488×1057跨尺度认证清晰度。

同项目官方CLI close/auto后，SDK仍报告9445，测试脚本原先错误地要求9446而失败。已纠正请求端口与实际端口的区别，没有以端口变化作为重建证明。实际[启动后读回](experience-image-files-native-readback-2026-09-28.json)是Map页、编码文件0、独立4B文件原字节`91,92,93,94`仍在。旧会话副本没有React释放回调，其删除证明此候选的原生启动清理；原活跃四份可能同时有close/hide释放，不把总量都归因启动扫除。

## 未闭合与当前恢复点

重新进入后再解码/绘制、完整来源Back和当前Frame/Context绑定尚未取得：SDK9445/PID10156随后原生RPC连续到达有界deadline。官方项目控制接口未返回；CLI close/auto复用了旧server，Tool.close也超时。没有以工具成功、缓存空或重启前截图替代这段结果。

只针对9445监听owner、已绑定本任务窗口父PID22572的10156尝试恢复：普通Stop-Process拒绝访问；本机原生Windows sudo实际禁用；gsudo等待后返回`The operation was canceled by the user`。未完成提权，也未杀该进程，不重复该提权动作，不修改系统安全设置。待恢复可用原生会话；本轮无其它需要保留的新增常驻服务或多代窗口。

独立4B夹具的后续释放也遇evaluate deadline，结果未知；没有释放确认JSON，不能声称已删除。下次先只读核它是否存在；若存在且仍是原4字节，仅释放该受控测试文件。实际图片旧会话副本已经确认删除。

当前SDK端口还在不表示页面可用。最后成功原生读回是Map/编码0/独立夹具保留；最新Sky重绘和活动Context未核，不写当前00:00/Vega/revision8。8791 PID21852/exec37410、8789 PID22124/exec54820保持，context/resource均pass、held/active0；共享8787 PID2408/8788 PID15508未动。分支/HEAD不变，无提交/推送、外部部署、手机操作或新版月面手机验收。

剩余依赖：恢复本候选可用原生会话，核实际重新解码/Frame及受控夹具释放；随后回B3/C同条件整页构成、辨认和复杂影像质量。若原生工具仍不可用，按唯一PLAN继续独立B3/C生产输出/参考对照，保留原生恢复缺口。M42源黑条、复杂配准、整体质量、真实姿态/校准/后台、Android/iOS、目标性能、官方包体、费用和独立审查均未由本轮清理取代。

SDK不可用期间，已继续独立A入口日期恢复，见[入口日期失败恢复](experience-route-date-recovery-2026-09-28.md)；当前下一依赖仍看唯一PLAN。
