# 本地OCI候选及运行镜像实际消费者

## 当前同v79资料的新代码包r2（2026-10-16）

r285共享测光/不确定旁注修复已通过26个受影响软件检查、实际HTTP及普通Android和本批独审，r295将其沿现Dockerfile装入新本地OCI；没有新增/逐篇核对文章。原14个选定输入仅celestial-object-information.ts SHA变化，536行正文/规范索引/其余选定输入字节与r1相同，原文章/检索/8条历史增量证据复用。新tag starward-miniapp-api:cloud-sky-local-v79-20261016-r2，imageId sha256:dd04f90622f2d43f22d878e9459e10a16d0c41ad0775d6bd48ec21187fa798d3，metadata逻辑Size231708059B，非物理盘/峰值/成本；base revision仍b73523f1，dirty checkout不是该commit源码等同或qualified CI。

[当前结果](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/v79-20261016-r2/result.json)及同目录intent/state/执行脚本副本/build log绑定本轮。实际image内两支持BSC基版×三种共享事实机制（raw H、色值不确定、普通）共6个service调用，facts与已经核实的r286公共结果精确相同，v3 contentRevision一致；536行/索引和4份资产实际hash不变，Gaia排除保持。实际默认main在LOCAL/MEMORY_TEST/LOCAL_TEST、read-only/network-none/512MiB/1CPU隔离下健康就绪，三个HTTP info均200，raw H条件请求304/0body，ETag与r286相同。范围分别归image-probe.log/http-probe.log，不冒真实PG/provider/云或手机验收。

构建/镜像准入/默认main HTTP均exit0，两自有容器原owner退休complete，旧镜像和无关容器保留；host28832服务与手机未切换。启动stdout中的addedRows8是原v77→v79历史差异，当前实际publicationRowsAddedThisRun=0。没有push/部署，不补qualified CI、真实OSS/CDN/IAM/TLS/域名、全机/容量或off-host恢复条件。未经变化的旧大矩阵不重跑。

## v79 r1历史候选（2026-10-15）

按唯一PLAN F补当前已采用数据的本地打包缺口，未重开来源、正文或图像加工。v79正文536行保留v77全部528行，新增8引用；当前正文1,323,326B/SHAec640a1a5297edac7f8070474aa116d66aef75684b2d2c5ca605e9658703c059，索引8230B，沿现Dockerfile完整build exit0。当前本地tag为starward-miniapp-api:cloud-sky-local-v79-20261015-r1，imageId为sha256:e842e814e77765e730ab58f181efda015a8fff70687045a2af456c19db4d7590；[实际结果](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/v79-20261015-r1/result.json)与intent/14个选定输入pin/实际执行副本/build log保同一artifact子目录。checkout仍dirty，b73523f1是base revision，不能当镜像源等于该Git树或qualified CI；metadata Size231,707,772仅逻辑image值，不冒物理分配/去重/费用。旧镜像全留，无push/部署。

实际容器在只读、network none、512MiB/1CPU隔离条件下读出完整正文/规范索引和精确资产hash，Gaia两文件确实不在；8条增量在两支持BSC基版的16个实际information/search消费者均READY、正文hash正确、facts与无介绍baseline相同、编辑来源为CC-BY-SA-4.0。[image-probe](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/v79-20261015-r1/image-probe.log)不靠宿主assets，不逐星重审文章/重复旧消费者，原468有名星463 READY/5 BASIC_ONLY计数按相同v79字节复用10月12日读回；五项身份缺口保持。

同image的真实默认CMD main在显式LOCAL/MEMORY_TEST/LOCAL_TEST开发fixture下启动，内部loopback实际健康就绪；一个HR8417新增条目的公开search/info/CC-BY-SA来源正确，information14341B，条件请求304/0body。[http-probe](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/v79-20261015-r1/http-probe.log)保固定状态/字节/ETag而不输出正文。两自有临时容器均已退休，当前label列表为空，14个选定source pin前后相同；raw main启动log仅private。资源限制是隔离条件，非吞吐/峰值/目标容量，不证明真实PG/provider/生产云端或原生验收。phone/WEAPP/host API未重建或切换，既有44项/全量/负载/物理与未受影响结果直接复用。

本机Docker初始不可用，恢复及六个旧feedback临时目录退休见[当前实施证据](resume-implementation-2026-10-14.md)；只保留改名后的少量IPC目录，不删镜像/卷/设置，不Factory Reset/WSL unregister。当前6个无关容器保留，不停全局engine。qualified CI/正式OCI发布、真实OSS/CDN/IAM/TLS/域名、off-host/live恢复与200DAU/12Mbps容量仍未验，未授权提交推送或云部署。原33/全部FAILED/UNKNOWN/MISSING保持，完整Goal未完成。

## v77历史输入与结果

当前后端编译输入/准入资产改变后，沿原infrastructure/deployment/miniapp-api.Dockerfile构建一次本地候选。Docker daemon实际29.5.3；开始时node:24.19.0-bookworm-slim标签未在本地，并未据此改降版本或替代Dockerfile。既有生产构建链、根资产前置、依赖构建、标准静态出口及容器文件边界均由本次Docker build执行；build exit0。没有重建WEAPP、下载天文素材或加工像素，也没有运行全量测试/负载矩阵。

[实际镜像与输入回执](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/result.json)的imageId为sha256:a5bdebd494d28ed96ccde0bca7684355e2b726a5eff0a286be0996dd28d9152b，tag为starward-miniapp-api:cloud-sky-local-v77-20261011-r1。checkout dirty，b73523f1c76bf50a3811fcff65f3e2d2f791373d是base revision，不表示镜像源等于该Git树，不能变成qualified CI/正式发布身份。metadata的Image Size只表示逻辑展开大小，不冒物理独占分配/去重或云费用。新镜像及全部既有镜像保留，未push/部署。

[一个共享镜像内读回](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/image-probe.log)在Linux/Node24.19.0、production条件下执行。容器read-only、network none、512MiB/1CPU；只挂载只读检查脚本，未挂载宿主assets。实际镜像v77正文及规范索引/订正v3字节与意图pins相符，索引528行；两种支持基版的HR3852/HR8762系统介绍及HR6812订正名称由真实service/search返回READY并命中。Gaia数据和manifest在运行镜像确实不存在。没有把逻辑文件存在当实际数据采用，也没有用宿主文件掩盖漏COPY。

上述资源限制是隔离检查条件，不是生产内存/峰值/并发容量结果；此检查没有启动完整HTTP/真实PG/Redis/provider或云端，更没有证明原生页面。当前44项公共HTTP等软件结果仍保此前输入与作用域。镜像内容正常读回后停止扩测，不追加80/200查询、主题/设备/时序矩阵或全库存重放。

[收尾读回](../../../../output/cloud-sky-api-oci-candidate-2026-10-11-r1/cleanup-result.json)确认唯一自有临时probe容器已退休，新镜像保留，无旧镜像/未知容器/宿主文件清理。exec85231已终态exit0，不再据旧handle/日志当运行中。

C07关联数据链在约27分钟安静间隔及独立构建后又一次新14节点只读请求，实际仍HTTP200 maxlag，实体0/retries0，原返回保[真实回执](../../../../output/cloud-sky-text-linked-source-research-2026-10-11-r1/result.json)。新两节点来自已有Gamma Arietis固定实体明确P527，原缓存无其数据；没有重写旧请求或绕过maxlag。关联源方法仍未准入/采用，13资料缺口继续开放，不冒所有替代源不可用。

本地候选补强A/F当前打包责任；qualified CI/正式OCI发布、真实OSS/CDN/IAM/TLS、live/offhost恢复与目标容量仍未验。Canvas菜单仍FAILED，Android/iOS/物理资源/适用独审仍缺；图像冻结/延期及全部33项保原，完整Goal未完成。
