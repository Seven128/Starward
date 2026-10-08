# PS1 同版本通知与完整机器说明消费者

2026-10-06，前轮具体来源条款及本地草稿是输入，仍按[原决定](q1-ps1-publication-rights-decision-2026-10-06.md)的条件商业自托管显示开发解释；没有新授权、生产采用或完整公开合规结论。

## 实现与实际消费者

- 原 `OpticalHipsPublicationService` 接受显式 URL/SHA-256 封存的说明伴随文件。原 root、index、20 JPEG 与已公开的不可变响应字节不改。说明请求失败不禁用独立有效的原 metadata/image。
- 原 `/v2/sky/optical/<publicationHash>/rights` 只发现 `{publicationHash, sha256, bytes, downloadUrl}`，`no-store`；真实说明 URL 是 `/rights/<offerSHA256>`，immutable，避免同 root 的通知修订覆盖旧不可变 URL。旧说明可沿现有标准历史 union 留存，未建立第二套来源数据库或发布框架。
- 说明原内容版权/具体授权、CDS 数据库版权/作者/DOI/ODbL/通知分别记录；完整原 properties 4,181B 也嵌入。`ODbL-1.0 4.6(b)` 文件包含全部20单元选择、原master URL、未改JPEG身份、全部精确 root/index UTF-8及重建方法。仅剥除本地任务路径、草稿状态/父草稿等不属于消费者合同的调查字段；不加工图片、不补科学 mask 或生成细节。
- 原标准静态 writer 输出24项，旧36项 union 与新增文件合为37项，所有旧 URL/字节/headers 保留。`rights` 发现地址禁止进不可变 bundle；静态 record 的说明SHA必须等于URL末段，真实bytes由原writer核实。
- 原来源页沿独立 query 消费说明及确切下载链接，复用 Provenance / SourceAttribution，不改共享组件。说明不可用或迟到的异版本只提示其缺口，原来源保留；有效旧说明在更新失败时保留，说明重试与原manifest重试独立；hide/show 仍沿原 query/lifecycle。

## 本次证据

- [同原图实际 API/标准writer/源数据与前端合同](../../../../output/ps1-rights-consumers-1006-q1-r1/result.json)：原20JPEG共2,691,868B、完整metadata/property字节读回；同源/错版本/漏单元/hash/元数据/property篡改/外来下载链接/缺文件/错误seal检查。六个被拒绝新包的原building阶段保留，不产生completed publication，旧记录保持。
- [真实本地Linux Caddy HTTPS](../../../../output/ps1-rights-https-1006-q1-r1/result.json)：复用既缓存image、原Caddyfile、readonly标准union、原出口分类；9次新说明/旧manifest GET、HEAD、304、mutable发现、未知版本404；`optical_trial`/隐私字段剥除/实际body计量通过。没有重跑原36项图片HTTP矩阵；任务Caddy/API已退出，原服务无重启。
- [来源组件七状态](../../../../output/ps1-rights-source-component-1006-q1-r1/result.json)：完整当前JSX函数在受控query/lifecycle ports下，检查完整版权/通知/acknowledgement、SHA下载链接、缺说明保原、独立重试、异版本迟到、更新失败保有效说明、hide/show及异版本root拒绝。**不是实际Taro/DevTools呈现或clipboard验证**。
- 15项相关原检查及新增1项immutable说明hash回归通过；API/小程序TS5.9类型通过。首次API类型检查指出readonly source数组边界，改共用校验器的输入为只读视图后通过，没有改旧manifest合同或拷贝数组。已有watch仍是PID3432，本轮300文件中7项增量变化；读取旧10-01失败log不代表当前watch失败，当前输出事实单独核实。

## 范围与唯一下一依赖

本次是 LOCAL/TRIAL 开发消费者结果，普通Prepared registry仍空、普通HiPS仍关。原具体版权解释仍为适用性判断；没有采购、外联、部署、公开URL上线或正式公开交付，完整商业公开合规未完成。图质、完整覆盖、科学支持/绝对配准、cold/show/newwide、8°raster、真实DevTools、Android/iOS/月面、物理峰/容量、独立审查及全部33义务仍保原缺口。

**下一仅补原Sources实际page消费者**：复用现有完整Taro/ReactQuery/native逻辑运行入口和本次封存伴随文件，实查完整通知、四类权利/数据链接与说明download、说明缺失/重试/更新失败保旧、hide/show/Back。精确同版本与原JPEG保持，明确区分逻辑native ports与真实DevTools。不要再完整重跑闭合LOD/来源贡献/旧HTTP矩阵，不把本次JSX或编译标记当实际页面通过。P1仍独立，无新根因不循环SDK。Goal active、无预算、未完成。
