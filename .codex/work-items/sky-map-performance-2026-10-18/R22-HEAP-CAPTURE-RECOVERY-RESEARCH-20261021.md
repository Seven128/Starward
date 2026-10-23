# r22 堆快照受阻：官方/社区查证与有限恢复方案

2026-10-21。用户授权查官方文档和社区解法；完整 Goal 仍 paused。本轮仅研究与记录，没有安装/切换工具、操作手机、重新取快照、改网络或产品代码。原件只在本机。

## 判断

性能分析方法仍可用，但当前完整堆快照的请求、生成或传回链路受阻，具体失败阶段未分开。两次用户操作已经表明：既有“缩小后先断连”，也有“重入后未再操作，Take snapshot 后 RTT 增大再断连”。不能把缩放、拍快照、VPN、内存泄漏中的任一项直接定为根因。手机仍有画面、消息计数变化、Snapshotting、218 MB 都不是有效导出；不同会话的183/218 MB不能组成增长曲线。

复用已有有效证据：正常 Sky CPU、r7 Allocation sampling 与两级映射，以及 [历史正常宽视野 Sky 初始堆](R17-TARGET-HEAP-DIAGNOSIS.md)。后者为87,166,304字节、1,126,865节点，第二份未成功，且采集扰动明显。Map的分配/CPU资格是另外的历史记录；任何旧样本都不保证当前全堆路径可用。

## 官方与社区结论

| 查证 | 对当前任务的意义 |
| --- | --- |
| [旧真机性能分析工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/performancetool.html)和[微信安卓开发者版](https://developers.weixin.qq.com/miniprogram/dev/devtools/wechatdevedition.html)均已标废弃。旧工具页指向新的真机调试性能工具。 | 不再按旧教程安装开发者版微信或搭旧LAN分析入口。 |
| [新真机调试性能工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/remote-debug-profiler.html)要求Android微信≥8.0.54、工具≥1.06.2412040、基础库≥3.7.4，并说明真机调试2.0的Performance录制。当前已观察的8.0.78/2.02.2610192/3.17.4满足这些版本下限。 | 支持现有CPU/事件分析方向；文档没有承诺每种Memory捕获均能完成，也没有给出本次Heap断连修复。不能把版本合格当新样本有效。 |
| [官方发布配置](https://devtools.wxqcloud.qq.com.cn/WechatWebDev/nightly/versions/config.json)当前列Stable 2.02.2608080、Nightly 2.02.2610202；本机是Nightly 2.02.2610192。所查[Stable日志](https://developers.weixin.qq.com/miniprogram/dev/devtools/log.html#stable-2.02.2608080)和[新Nightly日志](https://developers.weixin.qq.com/miniprogram/dev/devtools/log.html#nightly-2.02.2610202)没有明确的Heap snapshot断连修复项。 | 稳定版可做一次工具版本对照；不是“升级保证解决”，也不轮流装多个版本。最新Nightly只写泛化工具能力完善，不足以声称已修复。 |
| [V8官方快照性能案例](https://v8.dev/blog/speeding-up-v8-heap-snapshots)记录过快照生成本身极慢，并区分生成与序列化阶段。[Chrome分配时间轴说明](https://developer.chrome.com/docs/devtools/memory-problems/allocation-profiler)说明结束时也需要最终快照。 | 采集自身可能扰动目标，尚不能归因本机；Allocation instrumentation不是避开全堆负担的轻量替代。Node/V8启动参数不直接套到微信。 |
| [社区作者的同错误码报告](https://developer.cloud.tencent.com/article/1766048)记录了received error code 1 on sync-0，但没有经过验证的修复。另一个多年旧问答也仅有同症状。 | 同码不能证明同因，更不能证明当前版本存在某个已知修复。未找到可直接照做、适配本次版本与场景的可靠解法。 |

腾讯WeTest的[手机直接导出教程](https://developer.cloud.tencent.com/article/1748480)明确以小游戏为范围，不能仅凭教程推出普通小程序支持；本项目自身历史成功的原生Sky导出是独立适用性证据。该路线第二份同样失败，不能作为一个从未试过的“新解法”再循环。

## 下一步与停止条件

1. 停止当前条件下重连、换视野后反复Take snapshot。保存已有必要原件，不叠加Performance、Timeline、GC或Play。
2. 下一项工具恢复候选是**同一r22源码/完整候选、手机、基础库、实际场景和网络条件下，官方Stable与当前Nightly的一次有限对照**。当前官方installer的最低版本常量为2.02.2607152，所查Stable版本大于该门槛，但实际安装后的CLI/skill兼容性仍须核实。开始前由root处理必要兼容性、配置备份、单窗口和官方skill同步，当前未安装/执行。先确认非空目标和真实导出基线，不施加持续压力；若同样断连便结束该对照，不派生多版本重试。成功才进入同一VM里的短动作和第二份；版本改变不是产品修复。
3. 对照失败时保留“强引用图未取得”缺口。继续工作须由已获证据指向具体owner：复用r7定位分配位置，用有界创建/退休或缓存代际观察回答特定对象生命周期，再以普通预览的真实操作及进程回落核验效果。采样、计数和PSS不能直接替代完整保留图或证明整个产品无泄漏；本记录不授权任意disable变体或恢复已暂停的产品开发。
4. 不关闭/绕过VPN/TUN，不把酒店LAN或USB API转发误称为已修复官方调试传输；不加原始CDP/私有桥、强制GC“修复”或清空微信/项目数据。当前无需用户重复操作。

## 来源保存

官方文档通过本机HTTPS直接读取成功；web检索入口对developers.weixin.qq.com返回不可打开不代表官网不可用。原始HTML、页面脚本中声明的公开版本JSON及本地读回SHA-256索引保存在既有私有owner的`r22-memory-manual-20261021/official-research/manifest.json`。初次部分公开请求出现TLS EOF，同host其他请求成功，一次重试成功；未修改代理、VPN或安装配置。只下载公开文档/JSON，没有下载或执行安装包。
