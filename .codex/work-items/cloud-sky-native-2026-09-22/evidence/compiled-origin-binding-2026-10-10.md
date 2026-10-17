# 发布消费者的实际编译地址绑定（2026-10-10）

本轮沿A/F继续当前active、无预算Goal，指定工作区/分支及33项保持。未改变PLAN、采用清单、影像来源/像素或云端/平台状态。上轮OSS执行/恢复和1785固定资源SDK模型仍是其原范围的证据，不扩大为真实发布。

## 发现与修复

原`verifyCompiledOrigin`只搜索预期域名在所有文本文件中是否出现，注释或无关文件也能满足；编译时实际地址、缓存身份或预览凭证错误仍可能通过。因此不先增另一份“成功资格”JSON，而直接修现有build/平台真实消费边界。

`tools/miniapp/compiled-sky-origin.mjs`读取fingerprint指定的真实runtime/common字节并核pin，在无native/network/Node API的有界VM中用该bundle自带webpack加载器注册/解析唯一纯`sky-resource-origin`模块。先注册common并拒绝entry callback，随后载runtime；通过两个现存公开错误码定位owner，禁用其余模块的factory，不重写webpack解析器或改App地址owner。模块/export名可为minify ID；按公开行为验证5项：资源origin、API＋资源cache环境、发现/固定资源/SAO/历史W3地址政策、带path的真实URL与坏path拒绝、正式API与资源请求无预览credential。执行只记录角色布尔和两个byte pins，不记录实际header/credential/异常源码。

现有builder记录`compiledSkyOrigin`，v2平台消费者重新执行检查并拒绝注入的不同pin/owner，receipt保新推导的值。旧v2无该额外字段仍重新验证实际纯owner；v1同源语义不变，不要求旧包有新记录。没有运行真实微信preview/upload，也未给保护runner加云身份。该边界证明编译后的地址规则，不能证明微信联网、域名审批、CDN、物理设备、原生交互或影像采用。

成熟替代与边界：复用已安装Taro webpack/TypeScript及该候选自身runtime，未新加JS解析/解释依赖、副本生产配置或新出版库。webpack的[runtime/manifest说明](https://webpack.js.org/concepts/manifest/)说明其加载和模块ID关联责任；这里的wx JSONP/`.m`适配由实际WEAPP bytes的有限试验支持，属于项目推断而非通用稳定API保证。compiler/common结构、依赖或纯owner错误合同改变时重新核支持，不能回退成字符串存在即通过。

## 实际输出和回归

[当前实际编译核读](../../../../output/cloud-sky-object-store-2026-10-10-r1/compiled-origin-current-binding.json)：保留普通隔离生产优化输出`weapp-check-resource-origin-1010-r2`的274文件/4642395B fingerprint仍为`e3d362ea67db9e59cec57a2b8090de8e7f9180583ae3c8adf97688bf07c84a09`，未重新构建/改写。唯一模块1672、5个mangled导出，5项角色全部成立；原runtime/common pins分别639d204c…/bc6ea475…。这份输出有源AppID，属于普通隔离编译，不是CI release候选，不能上传或据此获得生产资格。

最初probe-r1用了另一个夹具的域名，原布尔false保留；读同批声明后r2精确输入下成功。首次把普通隔离产物当CI调用整个artifact verifier，正确被`release_bundle_ci_app_id_compiled`拒绝；原错误文件保留，随后只验证该实际编译纯owner。没有通过删除AppID或改lane逃过资格规则。

新consumer回归使用实际生产TS地址owner，经现有Taro webpack真实编译出shared common/runtime，避免靠两句未执行字符串冒绑定。最终[受影响检查](../../../../output/cloud-sky-object-store-2026-10-10-r1/compiled-origin-final-affected-tests-r2.log) **33/33通过**，覆盖新编译行为、既有build请求、真实平台消费函数/fake driver和workflow；无真实外发。案例包含相同/不同origin、错实际资源/API且无关文件含正确字符串、cache只绑API、编译残留preview凭证、entry/重复owner、fingerprint后字节变化和注入绑定记录。有限mutation仅在核范围临时副本中去掉新增语义检查：实际地址错误而无关文本正确的候选立刻变为字符串检查可放行，原生产文件核前后相同，证明修复阻止具体逃逸。

## 新发布包失败和下一责任

首次扩查36项中35通过、1失败，保[原日志](../../../../output/cloud-sky-object-store-2026-10-10-r1/compiled-origin-final-tests-r1.log)。`built-candidate.test.mjs`原要求在真实release构建后读默认weapp；当前默认输出是开发版本，main6584489B/含2193969B maps、sky4226223B/含1634298B maps，package predicate不通过。没有篡改此测试或把该失败隐藏成最终正式候选通过。

随后用现有`inspectCandidate({bundleDirectory})`只读两个实际目录，[核读](../../../../output/cloud-sky-object-store-2026-10-10-r1/compiled-origin-existing-package-observation.jsonl)证实保留的生产优化普通隔离输出也有**main2183381B，相比仓库现2MiB预算2097152B超86229B**，其余content1009118B/spot354055B/sky1095841B；11项predicate中仅package_budget false。这是F发布准备的实际未闭项，不能仅解释成默认开发包的harness误用。仓库预算并非本轮重新认证的微信官方单包规则；原单包官方原文MISSING仍保留，未抬高数值获得PASS。

下一步沿现有主/子包图核main的共享依赖和资源归属，完成合法消费者及必要分包调整后用新的普通隔离产物核package predicate与本编译绑定。实际qualified OCI/OSS/ESA、公网HTTP、旧版/current/rollback/off-host、容量、Android/iOS、Canvas控件及独审保持各自失败或未验。既有固定图像冻结和33义务不变，Goal继续active。
