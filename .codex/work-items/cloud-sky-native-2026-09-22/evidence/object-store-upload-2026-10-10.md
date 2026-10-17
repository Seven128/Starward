# 固定云观星资源：官方OSS执行器与失败恢复（2026-10-10）

本轮续用active、无预算Goal，限定remote-main-20260908工作区和codex/remote-main-20260908分支。沿唯一PLAN的A/F实现可审代码与本机受控验证，未执行真实云写入、发布、采购、推送或新增图像获取/像素加工；完整33项义务和原FAILED/UNKNOWN/MISSING保持。原生正常Canvas控件遮挡仍FAILED，手机/真实云/容量/独审未验。

## 已实现的同一责任链

- `tools/deployment/sky-object-store-upload.mjs`提供显式写入命令及同进程调用；复用现有环境校验、OCI/static准备和原始租约。`sky-static-release.mjs`仅抽出轻量租约核查，完整入口/收尾仍核读managed union、原始来源artifact、descriptor及overlay。复制/已释放/外来delivery和变化descriptor不能发OSS请求。避免每对象反复全量hash造成平方级本机I/O。
- 同一个sealed index派生package、key、physical source、MD5和标准/OSS metadata。操作前和结束重核包/来源；每次PUT前验证原租约及实际待发文件字节。目标bucket/地域由显式输入绑定，源码不嵌凭证，不自签或另建出版库。上传不改current/adopted、不部署业务、不配置ESA、不删除/覆盖历史。
- `sky-oss-client.mjs`适配官方`ali-oss@6.23.0`，隔离锁在`tools/deployment/oss-runtime/`，显式`xml2js@0.6.2`沿用SDK成熟XML解析器。固定地域HTTPS、V4签名、自动重试0、专属单连接agents；每请求沿既有15秒期限，包含周期送字节的整段body。取消/期限销毁实际自有连接并等待SDK结束，不以Promise竞速冒请求已取消；stream有字节界限并在错误/完成时释放。DEBUG/NODE_DEBUG凭证诊断拒绝；SDK错误message/params/raw response不写结果。
- 查询真实桶版本响应：HTTP/SDK状态均200、正确XML根且合法配置才解释缺Status为从未开启。Enabled、Suspended、空/未知/坏XML拒绝。每次缺失key的PUT前后及最终再核版本状态。该查询与PUT并非原子操作；真实使用仍须限制凭证bucket/prefix权限并排除同时的外部version-policy管理。本机模型不证明此条件，代码从不关闭版本历史来绕过。
- 已有对象逐个HEAD+GET核真实长度、完整SHA、标准头及全部metadata，额外/遗漏metadata、编码、版本ID或实际GET头差异拒绝。缺失key最多一次禁止覆盖＋Content-MD5 PUT；成功、冲突、超时/丢响应均核实际结果，若缺失或核读失败停止而不盲目重试。串行运行保有效独立结果；续跑全量重新核读，不相信先前成功行。
- `STARWARD_RECEIPT_DIRECTORY`新增独立0600追加JSONL，每对象开始/核读结果及最终状态落盘sync。崩溃可留下不完整尾行；完整旧行仅诊断，不是资格或远端结果。进入上传journal后SIGINT/SIGTERM关闭自有SDK I/O并留ABORTED，前置image preflight仍沿原process界限。操作帮助在`infrastructure/deployment/README.md#cloud-sky-oss-upload-and-recovery`，普通release路径不自动调用。
- Product/staging/production的现有deployment tests前安装隔离锁依赖；控制tar排除该`node_modules`，没有增加工作流云写入/权限/触发。本机真实`npm ci --ignore-scripts --prefix tools/deployment/oss-runtime`重装与后续32项新检查通过。npm audit当前锁依赖0项已知漏洞；此读数不证明未来依赖或云权限安全。

## 机制与固定批次的证据

最终受影响检查[日志](../../../../output/cloud-sky-object-store-2026-10-10-r1/upload-final-affected-tests-r1.log) **99/99通过**：新增SDK/upload、既有package/公网HTTP、实际source-release、promotion/release及workflow责任。锁重装后的新增[32项](../../../../output/cloud-sky-object-store-2026-10-10-r1/locked-runtime-tests.log)再次通过；不把重跑数累加冒新义务覆盖。新检查使用实际锁SDK的HTTP/XML/signing及自有loopback oracle，全部凭证是明确fixture，占位鉴权仅保布尔事实，不落header值。

参数化机制覆盖冷上传/暖续跑、复制或释放资格、桶状态/坏XML、相同长度错字节、存储metadata/GET头差异、并发创建冲突、PUT响应丢失、结果缺失不重试、部分失败续跑、descriptor/来源字节/租约中途变化、取消、周期body整段期限及过大/非法SDK stream资源释放。有限mutation只在已核范围的临时夹具复制客户端中移除XML根校验：同一坏200 XML由零PUT拒绝变为3PUT放行，证明该守卫确实防住逃逸；生产文件核前后相同。

[固定全批SDK结果](../../../../output/cloud-sky-object-store-upload-2026-10-10-r1/result.json)复用封装hash `7c00d901785918c5d038f594bd1e63f8adf12dded8cfea245e35ad6950143fb8`、原package hash `2517eba21e6a1e509d9e77fa45200b20835732120490744092ba40431238b8ac`，**1785文件/104613871B**。Docker ingress模拟、真实源码租约/union/payload判断执行；官方SDK只连接任务自有loopback服务，使用假的OSS身份，不是实际OCI资格或云端上传。冷批1785次PUT及全量核读，暖批全部HEAD/GET核读、PUT0；HTTP14284次（冷10712、暖3572）。源index/fragment/body封装核后相同，8个实现/依赖/脚本pin在结果；最长4218B metadata随实际SDK传输后符合原计划。`.tile`公共key/物理路径区分由三对象机制夹具覆盖，固定1785集合当前无该碰撞。

全批只在新任务output内为controlled managed producer复制既有封装，未修改或重新编码原图。冷/暖两个完整日志在其receipts目录；服务、SDK自有连接与source租约finally释放，exec90326已exit0，没有遗留该批次服务器。批次本机时间只描述模型，不作为云端/设备吞吐、内存或200DAU容量。图像新增获取0、像素加工0、真实云写入0。

## 失败与真实未验边界

首次新测试r1因夹具先清理managed目录后释放租约而清理失败，之后Node测试子进程未退出；只核对并停止本次自建子进程PID34448（父2060），session67287 exit1。修为先释放租约再核绝对范围清理临时夹具；r2/r3五项机制通过，原失败文件保留。r4为23/25，失败的metadata夹具误删按排序第一行并不存在的可选源字段；改为先确认存在再删除强制digest metadata，r5为31/31，后加有限mutation及受影响全链最终99/99。没有用忽略产品失败或弱化合同获得通过。

真实OSS账号/桶/权限、独占version-policy条件、实际可信OCI生成、ESA私有源/规则编译/配额/缓存设置、公网全量字节/头/Range、Linux整机/并发10/20冷进入/混合业务、off-host/current/rollback/旧App、原生组合与Android/iOS，以及覆盖本轮源码/输出的独立审查仍未验。SDK本地通过、对象核读和上传journal均不提供缺失权益/采用、ESA或完整产品资格。

SDK采用依据为官方[Node.js入口](https://help.aliyun.com/en/oss/developer-reference/nodejs-sdk/)、[桶版本查询](https://help.aliyun.com/en/oss/developer-reference/versioning-9)、[metadata/HEAD](https://help.aliyun.com/en/oss/developer-reference/manage-object-metadata-4)、[流式读取](https://help.aliyun.com/en/oss/developer-reference/streaming-download-2)及[PutObject禁止覆盖含义](https://help.aliyun.com/en/oss/developer-reference/putobject)，当前公开npm包及锁版本MIT。未采用已安装的S3客户端猜测OSS特有语义；公共CDN核读仍沿既有`sky-object-store-verification`，本轮没有新的CDN能力选型。
