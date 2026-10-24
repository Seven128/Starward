# 当前普通主包预算收口

本批沿唯一 PLAN 处理已确认的正式2MiB缺口。原[facade候选](R20-CURRENT-PACKAGE-BUDGET-20261024.md)保持拒绝；没有重做该移位、PNG压缩、Tab资源退休或冻结代。两个新变化分别来自实际仍在主包中的路由元数据，以及只由子包消费却全局加载的共享样式。完整 Goal、UI → 叠层 → Sky、正常账户与原生Picker、真实H4和OOM等结果义务不变。

## 当前实际结果

| 普通完整输出 | main B | 总 B | SHA-256 |
| --- | ---: | ---: | --- |
| Map修复基线 | 2,033,036 | 5,028,121 | `367a703aca2691d4cb97bb38ac17d33084ab1d977f62facc74cca29b7dadac0a` |
| JSON窄投影 | 2,029,151 | 5,034,469 | `542d00f00cc321296156fedb49fa4d55113f50b353bf1610f771fa719c9c7588` |
| 加共享样式归属修复 | **2,025,868** | **5,037,752** | `082ae11d91cbe54ca811c1c043c496eac8f3ed4f4ddfad4acd7e340bae38abfa` |
| 当前手机LAN origin，源码15pins不变 | **2,025,876** | **5,037,760** | `ef6eeee2bb44ef2af5c3ddde69961faa2650a7ce9c27ff6392a6ff39fd9c3cd1` |

四份均339件。082ae相对原Map基线main净减7,168B、总包增加9,631B；切换实际LAN origin又增加8B。content为1,044,814B、spot为615,351B、sky为1,351,719B。计量沿原fingerprint与package owner，本地main测量与下述官方准入分开。

Root先对基线367a的**当前**正常预算作了实际官方调用：源private `setting.bigPackageSizeSupport=false`，新feedback `RvUEM2` / `generation-000001-EqLxYf`，原始结构化返回code10，**main2053KB > 2048KB**，未送达、未bind。旧2051KB属于更早E9，不能覆盖Map修复后源码。wrapper仍为unknown/error，原private process diagnostic完整保留；其base64 stdout已解码核对`ok:false`、`source:mcp_business`、raw `success:false/code10`与明确包体错误，没有手工改wrapper状态或重放该run。

**当前ef6普通候选已通过正常官方准入并送达。** 为新拓扑只换真实API origin后的普通完整build exit0、15pins首尾不变，旧origin零残留。HGyEOG/gen1 AKYc0l的auto_preview终态success，shared/private `bigPackageSizeSupport`均false，完整generation current已核；Root实看实际USB MM Map后绑定嵌套G2HMxB，并于15:06:28.093Z在新session再次捕获/实看（SHA396f48d6…）。旧2053KB失败与unknown wrapper原件保留，不手改旧run。该结果关闭这份普通推送的预算缺口，不是发布或完整UI验收。

**真机调试有额外开发期打包成本。** 独立可变IDE副本补SDK的25B WXSS，SHAa2012e72…；公开SDK remote后UI明确main2062KB>2048KB。仅该副本private启用官方支持的开发大包，shared/普通候选/源码不变；后续RPC仍timeout，但实际手机和独立调试窗口后来已启动并有双向消息、活动VM。手机LAN选错VPN地址失败、回退WAN，尚无新profile/Heap；这是调试期许可与运输/电脑操作问题，不否定ef6普通预算已过，也不冒完整性能通过，细节归[环境记录](R20-PERFORMANCE-ENVIRONMENT-RECOVERY-20261024.md)。

## 同一声明的运输投影

[实现](R20-JSON-OPERATION-PROJECTION-20261024.md)与[独审](R20-JSON-OPERATION-PROJECTION-REVIEW-20261024.md)保留完整134项method/path、旧公开类型和BASE直接导入；同一manifest另外生成独立base/JSON88叶。主请求器只换路径/方法取值表，认证、重认证、原owner、取消、scope、缓存、原key和HTTP body保持原责任。46项raw manifest/discovery/二进制元数据退出main，原完整表进入Sky。没有运行时filter、手写白名单、新codec或全局minifier变化。

生成一致性覆盖全部三输出；两workspace类型、合同14/14、原消费者74/74、原webpack隔离2/2及三输出逐一过期拒绝通过。新独审直接调用生产requester，88项实际派发与声明、编码path/query/key/signal/cache一致；冻结11份首尾相同。实际JSON-only bundle中common仅有88项/6299B，完整134项/10144B在sky/sub-vendors；该层main减3885B、总包增6348B，没有把类型或源码移动当作实际收益。

## 共享地点卡样式归属

`spot-identity-card.scss`仍是唯一共享规则，原3604B源码完全未改。实际生产消费者为spot/search的MapSearchSurface和content/contribution的记录/详情；主包JS无该class family引用。原app.scss全局use使32条编译规则约3283B进入app-origin.wxss。

Root仅将全局use改为两个真实消费者SCSS首部的use，放在原局部覆盖之前：`pages/map/search-page.scss`与`content/contribution/contribution-records.scss`。未改TSX、class、任何声明值、主题、图标/图片、采用资源或未改区域。共享intake editor仍由Map使用，private记录样式没有反向带入它。

第二次普通完整build的15份source pin首尾相同、exit0、10项既有webpack warnings。此层main实际再减3283B，两个消费者各增3283B，总包增3283B。[新独审](R20-SPOT-CARD-STYLE-PACKAGE-REVIEW-20261024.md)已从真实WXSS import链核全声明/级联和实际消费者，范围内无未闭合P1/P2；只三份WXSS变化，其余JS/模板/图片/config逐字不变。这些不是目标像素或正常资料旅程验收。

## 原件与准备边界

原367a完整副本由RvUEM2 owner保留，第一次build前已逐件fingerprint读回。JSON-only542d再由现有snapshot owner保存到`8YIUGU/generation-000001-mH9h8u/project`；此run是**snapshot only / official not_invoked**，没有声称推送或绑定。两个普通fullbuild只写canonical当前输出，未运行旧R17 builder或prepare/build/refresh gen34及其他冻结代。

private root-usb owner保留两次build日志/全manifest、`json-projection-style-before.private.json`；任务tmp保留11份JSON和4份样式source freeze。准备脚本首次把app.wxss壳当全局声明，得到missing后先核真实import链，改读app-origin.wxss才取得32条与成本；这次准备失败没有产生build、快照或样式写入，不是产品失败。

2026-10-24T11:36:06.832Z重新用现有guarded USB session取得并实看Map，1080×2376，SHA`c71e8a4e605cf821b059defdd690f3011a1e27f0e05522091228baf9f96187b9`。这只证明旧367a反馈仍在实际目标上和捕获可用，不冒082ae的新包、runtimeAppId/独立手机源字节或正常资料验收。没有新的phone输入或必要人类动作；下一输入仍需fresh capture。
