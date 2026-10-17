# 菜单采用、单一设计源与规则修订（2026-10-17）

用户直接采用最新十二项及控制/长内容细修，并授权准确删除废案与本地重复稿、原位优化严格还原规则、修改唯一PLAN和换对话交接。后续澄清：云观星以外以Stitch上另一分支更新为准，本分支不得反向覆盖。本轮没有生产源码、构建、手机、云端部署、提交推送或新子代理操作。

## 已完成与真实范围

- 原严格规则在project_context/context-maintenance.md的Mini Program Page Design Resources原位补强，AGENTS、DESIGN、uiux_design和开发流程仍引用同一个owner。包括UI源值/平台映射、UX触发/轨迹/反向/清理、可比实际输出和正常速度代表验证；不逐帧验收。
- 唯一PLAN保UI01–UI06、原PF成果及完整33/有效UX。生产源码未变，普通本地仍r370未推手机，最后手机版r322。资源采用/同步不冒生产迁移或目标验收。
- 当前完整采用稿：[云观星菜单与弹窗｜已采用·完整交互·2026-10-17](https://stitch.google.com/projects/7144519510537620825?node-id=5385664345158066168)，项目7144519510537620825。远端HTML响应解码后166459字节、SHA256 4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79，与最终采用源逐字节一致；十一种状态、两份脚本及样式完整保留。已实际查看提供方渲染的默认底部时间状态。临时QA图仅在系统TEMP，不回存为仓库设计源。
- 本地顺序：先回收909个已被当前Stitch替代的旧/重复文件；非云观星以另一分支当前远端稿为准，没有把本分支旧稿上传覆盖。唯一包含最新全部细修的170个Sky文件保留到完整HTML上传成功并精确读回后才回收。两批合计1079文件、68,734,704字节，均为Windows回收站且路径核已不存在。源码、运行资产、天文图片、ignored output及原始产品证据不动；许可/真实验证结果和用户功能示意图另按原owner保留，旧9416预览服务已退休。4份根目录导航/历史工程文档保留，不是当前小程序设计副本。
- 远端范围以清理前无缓存82实例为准（此前77是旧时态，另一分支新增内容已纳入保护）。只对已核的18个云观星旧稿执行网页原生Delete，按实际选中ID分组确认。Stitch用hidden:true保存可撤销历史，18个均退出活动画布；这是Delete实际语义，不是永久抹除底层资源。64个受保护实例全部字段前后一致，包括04｜日月食与云观星和08共享Info；没有上传、改名或删除其他分支页面。最终83条含历史记录、15个活动画板＝14个其他页面＋1个当前云观星稿。
- 初次完整上传4885880402088002267成功、内容一致，但后续读回发现其画布成员不在、原因UNKNOWN，具体源仍可读。没有把该源丢失或未知生成当理由盲重发；官方能力没有复挂旧实例入口，已用同一完整文件有界恢复导入一次，当前节点5385664345158066168再次核内容、画布成员和64个保护实例。旧导入仅属提供方历史，当前owner只指向新节点。
- 官方OAuth读取成功但HTML上传403的失败仍保留。用户随后明确授权创建API key并仅本机保存，官方CLI配置成功，HTML上传恢复；没有把凭证写入日志、仓库或Context。CLI在服务成功之后的Windows UV退出异常按服务结果/无缓存读回分别处理，没有重复生成。旧edit超时已用实际Agent log和具体screen恢复身份a729b4eb833c4190b3d26f1962c007bf，随本批废案Delete；原超时状态不改写。
- 项目Skill补充本次已验证的OAuth/API key能力差别、官方下载JSON解码、原生Delete/历史语义、成员与完整源分别读回、并行分支保护及恢复导入边界。没有新增长期镜像、常驻服务、设计登记系统或逐帧检查；浏览器连接/页面加载失败与未支持的直接DELETE 404只作本次工具证据。

准确身份、前后实例和读回见[Stitch同步与清理](stitch-sky-sync-2026-10-17.json)；逐文件本地范围见[回收清单](design-resource-cleanup-2026-10-17.json)。
## 有限参考与取舍

- [Google Labs Stitch-to-React workflow](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-build/skills/react-components/SKILL.md)：取实际读取设计源/样式值和视觉检查的思路；不采其全项目每屏下载、本地镜像、强制AST格式或重复审批门槛。
- [Google Labs code-to-design](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/plugins/stitch-design/skills/code-to-design/SKILL.md)：完整自包含HTML能减少相对资产断链；上传成功与完整行为保留仍须实际读回，不把静态抽取等同交互同步。
- [Storybook interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing)：通过代表用户动作核DOM和回调结果，并在生命周期清理状态。用于已有测试的验证思路，不安装新平台或产生全组合套件。
- [Playwright screenshot assertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1-option-animations)：截图断言默认停止动画，有限动画快进完成、无限动画退回起始；故静态构图可以这样比，运动和锁/取消不能据此通过。沿本项目正常速度实际观察与状态证据，拒绝逐帧验收。

上述是取舍依据，项目现有规则为执行owner，不引入另一套harness。软件/Context结构/资源采用不冒当前WEAPP/手机、绝对校准、全局红光或真实性能验收。新独审未取得，旧PF代理审查不覆盖本次设计/计划。

## 本轮必要检查

最终结果见[本批文件与源码验证](menu-design-final-validation-2026-10-17.json)：context:validate通过；26份当前文档的本地链接无缺失（两项thread://为对话引用，已纠正检查器分类）；限定改动git diff --check通过。原33行仍33项且SHA d26d632c317699321250bed6ea91611b06ab6dfbb28575eca0200512cf6973d9；r370的16个生产输入逐字节/hash未变。1079个回收清单路径均已不存在，回收站可恢复。项目Skill frontmatter由已安装yaml解析通过；早前官方Python校验缺PyYAML的失败保留，未为此安装依赖或重跑相同失败。

远端完整源、活动画板、18次原生Delete与64个受保护实例的读回另归同步证据。文件/资源检查不认证当前WEAPP、手机、完整性能或独审；本轮未构建产品、未推手机、未提交推送。此前宽目录检查的未改动settled-candidate.md末尾空行不属于本次修改。
