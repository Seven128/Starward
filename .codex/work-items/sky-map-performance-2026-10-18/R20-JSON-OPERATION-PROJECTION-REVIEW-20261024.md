# JSON 操作窄投影独立审阅

2026-10-24，独立审阅者 `review_json_operation_projection`。审阅当前冻结源码、唯一操作声明、真实请求器及 root 已完成的普通完整构建；没有修改生产或正式测试、PLAN、HANDOFF、Context、依赖或 Git，没有执行 build/prepare/refresh、IDE、USB、服务、外部网络或冻结代操作。本报告与自有 task tmp 是本审阅者的全部写入。

## 结论

**本次生成／传输边界未发现未闭合的 P1/P2。实际主包净减3,885B，完整134项表已移至 Sky 子包；正式2MiB尚须 root 的普通官方准入，不能由本地体积推通过。** 原当前普通包的官方2053KB>2048KB失败保留；本次没有新的官方或手机结果，不关闭完整包体、UI、叠层、Sky或Goal。

当前本地 main 为2,029,151B，总包比此前增加6,348B。独立叶模块带来的重复静态元数据是实际代价，没有以“剔除46项”冒称总包缩小。当前各子包的本地数字不替代官方编译口径。

## 原声明、兼容性和实际请求器

- 作者的11份冻结输入／源码／测试在本审阅首尾均完全匹配。唯一 `miniapp.operations.json` 与两个既有 raw 消费者控制文件保持原身份。
- 同一生成器产生完整表、JSON表和BASE_PATH三个输出；JSON选择规则仍为原 `responseEnvelope !== false`，不是运行时从完整表筛选。当前134项完整表和88项JSON表逐项method/path、成员及原顺序均与该声明一致。46项raw既不丢失，也没有混入JSON表。
- 旧生成入口仍转发原BASE_PATH；根入口明确转发原完整表、五项公开类型及BASE_PATH，新增JSON表。原五项公开类型定义保持原语义，原raw响应／JSON排除合同保留。新JSON叶对完整类型是type-only依赖；独立base叶无反向依赖。现release tsconfig的 `src/**/*.ts` 覆盖新文件，原扩展重写机制仍适用；本次未执行release构建。
- `authenticated-operation.ts` 的变化只在元数据取值表，账号限制、原键、认证／重认证、取消、scope、缓存和HTTP参数责任未改。`api-client.ts` 仅移除未使用的完整表绑定；已拒facade方案没有恢复。
- 根入口仍为纯转发；本审阅实际调用原 `assertContractReexports` 与 `assertContractInitialization`，全新图通过。没有扩大现有 `sideEffects:false` 范围或绕过初始化审计。

本审阅新增一个仅task tmp中的独立运行时probe，**直接调用生产authenticated requester 88次**，每项按唯一声明推导期望method及完整path，并覆盖路径参数编码、query、原key、AbortSignal和cache／independent参数。全部匹配，返回值原样保留，无意外session修改。这个probe的transport是注入端口、没有网络；它证明实际新取值责任，不是手机或业务API验收。

作者已有且仍适用的检查原件另经读取：三输出分别过期拒绝／恢复接受；两个workspace类型通过；合同2文件14/14、请求器／raw消费者10文件74/74、原webpack转发隔离2/2。没有把这些与本审阅88次派发相加冒一次全套，也没有无变化重跑所有检查。raw消费者仍按实际discovery路径、来源／版本／URL校验和取消责任执行；这些源码未因窄表迁移改写。

## 实际完整输出

root明确完整build终态后才读取生成包。沿现有 `fingerprintBundle` 与 `summarizePackageBytes` 独立读回本次完整339件，和已保留的RvUEM2原339件负向snapshot比较，双方全量SHA与root一致。

| 本地生成口径 | 旧当前367a703a… | 新当前542d00f0… | 差额B |
| --- | ---: | ---: | ---: |
| main | 2,033,036 | 2,029,151 | -3,885 |
| Sky | 1,341,474 | 1,351,719 | +10,245 |
| content | 1,041,539 | 1,041,531 | -8 |
| spot | 612,072 | 612,068 | -4 |
| 总包 | 5,028,121 | 5,034,469 | +6,348 |

新完整SHA为 `542d00f00cc321296156fedb49fa4d55113f50b353bf1610f771fa719c9c7588`；旧完整SHA为 `367a703aca2691d4cb97bb38ac17d33084ab1d977f62facc74cca29b7dadac0a`。两代件数和路径集合相同，15个变化文件全部为JS；app.json、WXML、WXSS、图片及其它非JS文件逐字相同。这个对照保全采用资源和生成页面，不提供实际运行画面／手势验收。

独立JS AST逐包检查得到：

- `common.js` 中是完整88项JSON对象，实际对象6,299B；不存在完整134项对象。
- `sky/sub-vendors.js` 中完整134项对象实际10,144B，每项method/path均与声明一致，全部46项raw也在此保全。
- 其它包未发现另一份完整／部分操作元数据表。真实main／Sky依赖边界和原raw路径保全因而有编译证据，不能只靠文件名或搜索到一个prefix判断；真实资源供应／HTTP效果和目标设备读取仍须相应环境证据。

正式预算仍以root下一次实际普通官方结果为准。原2053KB失败可能尚有余缺，源码／类型／本地main低于2MiB不建立官方准入。开发大包flag、普通推送、目标源码字节、手机内容与最终验收继续分别判断。

## 原件和收尾

独立原件在 `tmp/json-operation-projection-review-20261024/`：`runtime-projection.mjs/json`、`bundle-audit.mjs/json`、`bundle-files-after.json`、`source-before.json`、`source-after.json` 与 `artifact-manifest.json`。两个probe均exit0；11份冻结首尾通过。没有新listener、数据库、服务、外部请求或设备动作，所有检查进程已结束。

原始包体失败、已拒候选、冻结代／私有原件、未提交用户成果及所有未完成义务保留。root接续普通官方准入、必要目标观察和授权交付；本审阅在此结束。
