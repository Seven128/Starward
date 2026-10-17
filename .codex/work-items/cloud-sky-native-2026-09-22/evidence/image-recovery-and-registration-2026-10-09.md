# 当前资源恢复与本地配准可行性

沿PLAN B/D实施；未修订方案，未采用候选或提升设备/质量/容量验收。输出owner为`output/cloud-sky-body-editions-2026-10-09`。

## 当前需求与实际owner围栏

原queued retry在Sources暂停或隐藏的新render之后、effect清理之前仍会手动refetch清单；原native retry直接操作loader.current，可清除已换Canvas/版次的旧owner失败。真实Hook修前`image-recovery-before-2.log`22项/20通过/2失败，分别复现暂停后清单计数2≠1和旧owner retry返回true。`image-recovery-before-1.log`是错误工作目录导致alias未解析，不算行为反例。

`useSkyImageRecovery`现以最新需求和mounted lifetime调度恢复；七类body、Galactic、W3、target optical、HiPS、landscape及页面星座/direct image统一消费。metadata、HiPS index、landscape mask和对应shader reset仍由原消费者负责，不共享域含义或新建缓存。暂停/隐藏/取消需求/unmount的旧按钮不再启动资源；有效当前动作使用当前回调并保原GPU reset布尔含义。native retry另外核当前Canvas/revision/hash及实际effect owner，新render也不能在effect交接前操作旧loader。

原请求/文件/解码/GPU/accepted-frame owner保留。测试使用真实Hook与受控React/native callbacks；简单consumer fixtures用同一真实恢复Hook的隔离React适配器，完整native-owner fixture共享实际Hook slots。检查不证明真实微信tap、Canvas组成、许可撤销或物理资源。

`image-recovery-after-1.log`22通过；`image-recovery-consumers-1.log`保旧fixture缺新依赖，`-2.log`保一处AST scope缺wanted，`-3/-4.log`29通过，`-5.log`31通过。全量`integration-7.log`1037项/1035通过/1失败/1跳过：direct image旧探针只执行内部arrow，漏共享owner的report refresh；已迁到实际retry初始化表达式，并保原Canvas/asset/retry/report及不清painted setter断言。`integration-8.log`1037项/1036通过/0失败/1跳过；同版次需求修后`integration-9.log`1038项/1037通过/0失败/1跳过，`app-types-13.log`exit0。API/contracts本增量未改，复用各自类型6/3的输入证据。有限输入绑定`source-bindings-r4.json`543项，r1–r3保原epoch，不是完整闭包或独审。最终Context结构`context-validate-r6.log`及`diff-check-r5.log`exit0，不代行为或独审。

## 有界本地配准探针

具体问题：现有本地获权SAO是否能为ESO eso0902c原照片提供独立参考位置，而不是用名义TAN自证配准？停止条件：只读已有原图、publisher nominalTan和现SAO内容，检查参考分布/候选像素；不拟合、换源、加工、修改合同或自动批准。

`check-local-registration-references.py`核选中tile的bytes/hash，按SAO声明FK5/J2000经Astropy变换ICRS，使用已有producer receipt中的TAN。`local-registration-references-1.json/log`在全幅8285×7510名义footprint中找到三颗SAO参考（166575/166579/166586，V8.9/8.5/8.7）。它们是catalog-epoch预测，不推断未知拍摄历元；BSC独立亮星集合没有在本探针扫描，不能称完整参考集。

`inspect-local-registration-peaks.py`只读真实原JPEG、每处固定512像素窗口。DAO shape-filter探针先因安装版本列名失败（`local-registration-peaks-1.log`），修列名后输出`local-registration-peaks-1.json/-2.log`；饱和/复杂PSF使最近shape-qualified peak不能直接建立对应。改用原成熟Photutils local-maximum observer的有界诊断输出`local-registration-peaks-2.json/-3.log`，最近峰距离约25.03/32.86/25.52源像素；plateau产生多峰，没有批准correspondence或误差上限。这些数值不是配准通过或确定配准缺陷，不能据此纠正旋转、历元或照片几何。

已有完整原图缩略图已实际查看；无生成式内容、蒙版或边沿参数试探。名义配准仍UNVERIFIED_APPROXIMATE_PUBLISHER_AVM；连续照片边界的既有FAILED、当前决定STALE与普通Prepared 0保留。PyAVM/Astropy owner未发现可据此重写的单位错误；下一质量判断需真实对应/足够外围与当前Scene输出，本探针不启动重复处理。

随后补唯一尚未扫描的本地BSC population：`bind-local-bsc-registration-1.mjs`实际调用loadBsc5pBrightStarCatalog，原owner校验8404行及v2 hash e7f329bf…通过；导出的只读位置输入绑定pack/manifest/owner。`check-local-bsc-registration-1.py`经现Astropy8.0.1向量化FK5/J2000→ICRS、原receipt full-image TAN扫描，`local-bsc-registration-coverage-1.json/log`得到**footprint内0颗**；离名义中心最近HR228约1.2096°。没有新参考，也没有pixel检测、拟合、历元传播、图像加工/源变更。系统默认Python无Astropy，改用已存在prepared-candidate-python-1005-r2环境，未安装依赖。该结果只排除本机BSC v2补足此footprint的路径，不证明所有目录无星、原TAN正确、SAO对应通过或Scene合格；本探针到此结束，旧失败/未知保原。

## 同版次需求与本地静态分配

补充真实Hook反例`current-demand-before-1.log`：同Canvas/版次的新wanted已render但effect未更新时，retry重新获取w3:0:0，所需w3:0:1没有获取。旧loader源码保`image-loader-before-current-demand.ts.txt`。现loader的同一replaceWanted责任供update与retry使用；retry先记原GPU-reset需求、替换当前wanted并取消过时请求，再退休失败与pump，避免先请求旧档再取消。Hook传当前wantedRef；不新增缓存、额度或分片owner。`current-demand-after-1.log`42通过，保粗、文件复用、pause/retire和shader reset义务继续检查。全量及类型最终结果见交接。

`inspect-default-static-allocation.py`沿既有Windows FileStandardInfo/FileIdInfo owner只读核最新默认静态包；未执行旧固定bundle扫描。`default-current-static-allocation-1.json/log`及逐文件`default-current-static-file-attributes-1.json`两轮属性稳定、index未变、1740路径与原标准reader长度一致。逻辑文件83,033,939B，API报告allocation按unique file identity为86,533,728B；1740不同identity、max link1。SHA内容唯一63,533,732B不能当物理占用，文件系统metadata/streams/snapshots和exclusive介质未计。默认bundle不是Linux全机/retained-store/backup/暂存/客户端引用或混合负载；deletableBytes保持null，没有清理。

报告/SAO手动重试随后按各自责任核对并修复，当前结果见[报告与SAO恢复](report-and-stellar-recovery-2026-10-09.md)。本记录的image检查不能推断整个请求链或原生体验已验。

独立审查MISSING；现可调用Code Review仅PR/CI diagnostics，无本地独审入口。未创建PR或联系他人；没有提交推送、采购、部署、发布、外联、清理或新原生窗口操作。
