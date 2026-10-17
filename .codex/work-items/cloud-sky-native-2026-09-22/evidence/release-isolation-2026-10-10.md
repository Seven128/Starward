# F：独立发布候选与实际CI类产物

既有Goal继续active、无预算，全部33项保留；仅在指定worktree/分支实现必要共享发布边界。未下载或加工图像，未采购、部署、预览/上传、提交推送或外联。

## 改动与意义

原`buildReleaseBundle`先递归删除默认`apps/wechat-miniapp/dist/weapp`再构建，发布消费者也固定读取该目录。当前默认开发包和忽略成果必须保留，因此沿原builder/manifest/平台消费owner修此具体行为，不创建另一套发布或产品状态。

每次builder独占创建`artifacts/miniapp/release/bundles/<UUID>/weapp`，现Taro config和平台消费者共用`release-bundle-location.cjs`路径规则。构建前后的目录边界拒reparse points；有效旧目标及悬空目录项也不能被Taro重用。源项目AppID保持原规则，构建前后核相同源配置hash；新产物绑定其自己的AppID/URL check与编译API/resource/缓存环境，不改源配置。整个candidate再核fingerprint与仓库包预算后才`wx`写v3 manifest并sync。现有manifest拒覆盖，使用原`--output-manifest`参数选择新的owner范围路径；失败/半成品保留，不写成功记录或更新采用指针。

v3声明`bundleDirectory`与`packageBudget`，平台owner重新解析真实目录、核文件/地址角色/预算，给driver及操作后readback同一个目录。v1/v2仍沿旧根消费并拒注入目录字段；v2及v3仍重新核资源origin，v1同源规则保原。v3成功平台回执沿已支持的v2形状追加目录/预算，旧消费字段保持。候选验证先于读取上传key；CI类candidate本来不能进入preview/upload。真实平台外发未发生。

`built-candidate.test.mjs`由manifest选定真实bundle，不再误读开发`dist/weapp`；默认CI manifest，`MINIAPP_BUILT_CANDIDATE_MANIFEST`可选择owner范围内具体manifest。protected WeChat工作流在现preview/upload之前输入自己的lane manifest并运行检查。常规`test:miniapp:release`纳入初始化/编译绑定与发布隔离回归，没有改触发器、权限或实际运行工作流。

## 验证与原失败

最终[owner回归](../../../../output/cloud-sky-release-isolation-2026-10-10-r1/final-owner-tests-r2.log)45/45通过；[常规release入口](../../../../output/cloud-sky-release-isolation-2026-10-10-r1/standard-release-tests-r1.log)42/42通过。覆盖新鲜/旧根并存、重建manifest拒绝、构建失败/源配置改变/超预算保半成品、链接目录拒绝、v1/v2注入拒绝、v3真实消费函数给fake driver准确目录、错目录/错预算/缺预算/编译记录注入在driver前拒绝，以及常规CI/workflow入口。

限定mutation只在核范围临时fixture复制builder中重引旧默认目录删除：新的manifest仍可写成成功，但开发输出消失，直接证实“发布成功”不能替代输出保留回归；生产源文件前后相同。其删除仅发生于独占可再生os.tmpdir fixture，未触及实际workspace。首轮29检查中28过、1个原mutation副本漏新import路径，见[原失败](../../../../output/cloud-sky-release-isolation-2026-10-10-r1/existing-tests-r1.log)；已改为解析该副本的全部相对import到原模块，不削弱地址逃逸断言。App TS5.9.3、Context校验及diff检查通过；非独审。

实际CLI按明确CI lane、独立`.invalid`双origin、`cloud-sky-native-20261010-dirty`源标签和新manifest路径完成r1/r2/r3三个必要输入epoch，全部保留。最终当前[r3 manifest](../../../../artifacts/miniapp/release/cloud-sky-isolated-ci-20261010-r3.manifest.json)绑定`bundles/f8186d52-177b-421e-bb1e-58d0c770f36f/weapp`，274文件/4644226B，fingerprint`cb79f9d3a4b2efd11b0163b2914f090eaeb8296082b4be5a23cefd74ce470c3f`；三个独立目录完整字节相同。r3是本地dirty工作树生成的CI类结构候选，**不是GitHub/protected CI认证或可部署候选**，没有生产域名、request-domain批准或平台凭证。

实际[r3包检查](../../../../output/cloud-sky-release-isolation-2026-10-10-r1/actual-built-candidate-r3.log)3/3通过；现inspect owner11 predicate全true、编译纯地址owner5角色全true。主包2096426B，相比仓库2097152B预算余**726B**；总包仍按仓库20MiB规则，无新增/扩大数值，官方单包原文仍MISSING。实例化新目录不是平台实际上传包测量，余量须随未来实际输入重核。

[最终真实绑定](../../../../output/cloud-sky-release-isolation-2026-10-10-r1/current-binding.json)核默认开发目录300文件/13293535B及两份旧普通产物的完整fingerprint全部与before相同，源project.config及v8/r17冻结控制也未变；所有新候选的212份assets/WXML/WXSS与保留普通产物逐文件一致。实际Taro重用r1目录正确拒`miniapp_release_output_exists`，随后全部274文件仍匹配。用真实r3 manifest在现平台消费函数中核CI类拒绝，根本不存在的测试key尚未读取，fake driver调用0，无真实平台连接。

## 未闭与继续入口

本轮源、实际候选、检查结果与全部33项标识的最终pin见[封存绑定](release-isolation-final-binding-2026-10-10.json)；历史pin保持各自输入epoch，不更新为当前成功。

当前只完成本地CI类builder/manifest/消费与保留边界。正式staging/production、qualified OCI、公网OSS/ESA/请求域名、old/current/rollback/off-host实际恢复、10/20并发/物理峰、正常Canvas控件FAILED、Android/iOS及独审各保失败或未验。既有固定图像采用/质量和追加覆盖延期不变，当前Prepared普通采用仍0。下轮回到完整原生交互的软件义务及真实运行端的有效证据；有新决定性信息才重开Canvas合成排查，不重复旧SDK/GPU/z-index/无端口试验。不能用本次有限CI产物替代任一33项最终验收。
