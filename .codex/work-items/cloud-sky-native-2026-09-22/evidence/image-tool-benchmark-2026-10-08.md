# 图像工具效率实测：结论、证据与唯一恢复索引

更新时间：2026-10-08。状态：本次独立测评完成，最终独立复核无新增阻塞；成果已保存，结束本次 Goal 后停下。**这是独立测评；云观星主 Goal 继续暂停。** 本轮无提交/推送、部署/发布、付费、外联、本地素材上传、全库生产或正式资源采用。

## 1. 明确选型

本轮保留现有来源/权利、原图缓存、名义坐标、完整覆盖、分档和资源交付责任；建立一个参数化测评入口，停止逐对象复制脚本。像素步骤按输入需要选择：

- **默认“不额外加工”**：已有合格出版 RGB/HiPS 直接复用；必要的完整幅面 LANCZOS 分档保留。不是所有素材都要先去背景、去星、再调色。
- **Photutils 背景估计只作为条件候选**：NGC253 的矩形底色明显减轻，M81/M82 也能复用同一算法；但弱外围会被减暗，星点密度边界仍在，NGC5128 因无足够未遮罩背景网格而失败。不能把“保护区”理解成该区像素不会改变，更不能全库默认开启。
- **Siril 1.4.4 本次一阶自动背景 recipe 不取代当前路径**：运行快，但两个代表输入均无足以抵偿新增步骤的画面收益，NGC253 部分高亮星点有颜色变化。此结论仅针对所测 recipe；不等于 Siril 全部功能无效。
- **nox 1.1.0 不进入当前常规素材生产**：每张约30秒 CPU；能去掉大量星点，却留下暗洞/光晕/斑驳，矩形底色也未解决。NGC5128 尤其明显。模型商业/分发许可也未独立确立。停止扩批，不串联另一去星模型碰运气。
- **Photoshop、StarXTerminator、StarNet2 未实测，不列画质胜负**。本机无已确认可运行的 PS/SXT 授权；StarNet 当前具体模型用途许可未确立。未来已有合规环境并有能改变决定的样本，才重开同责任对照。

没有一种候选通过本轮证据成为“自动处理一切”的成熟替代。已经实际证明的效率收益是按需跳过像素加工、统一批次、输出去重、缓存复用和保留失败分流；没有测出端到端人工效率倍数，不能用机器缓存加速代替该结论。

## 2. 范围、需求与恢复索引

完整合同：[IMAGE-TOOLS-BENCHMARK-START](../IMAGE-TOOLS-BENCHMARK-START-2026-10-08.md)，背景全文：[IMAGE-PIPELINE-PROBLEM](../IMAGE-PIPELINE-PROBLEM-2026-10-08.md)。两份已全文读取，原十节要求仍有效。用户追加要求已执行：新建本测评 Goal，目标文本索引本文件，方案、依赖、变化、命令、证据集中维护。主 PLAN 的恢复队列未执行。

固定工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，分支 `codex/remote-main-20260908`；开工 HEAD `b73523f1c76bf50a3811fcff65f3e2d2f791373d`，开工工作区干净。开工 get_goal 返回 null 后按用户新授权建立独立测评 Goal，无预算。旧 e2136ebf 是历史，不能据此重复提交。产物仅本地保存，ignored output 不是远端备份。

参考 Codex 聊天 `local/01a11996-b324-7382-85d5-c29273f4ebd7` 已通过 read_thread 读取；Chrome [图像流程方案比较](https://chatgpt.com/g/g-p-6a58948368b881919bf7b4a9bcdd4571-jin-wan-qu-guan-xing/c/6ac75e1a-cda4-83e9-8a45-512787fadb75) 已通过 browser-client 读取。最终纠偏是现有函数与成熟工具按责任实测，不能预定 Python 胜出或 PS 只做异常。聊天只作背景，不增加授权。

已读 AGENTS、global、context.toml 默认项、resources-and-artifacts、architecture/maintenance 相关边界、spot-and-sky/external-capabilities 相关责任、主 PLAN 顶部暂停/恢复规则、q1-mature-hips-batch 暂停证据、q1-ngc253 编码决定。没有遍历全部历史或旧源码副本。

实际代码索引：

| 责任 | 所有者/本轮使用 |
|---|---|
| 原图/坐标准入 | `data-pipelines/deep-sky/prepared_rgb_observation.py`、`optical_publication_io.py`，复用原字节身份/文件边界；完整原图而非截图入模 |
| 无额外处理基线 | `publish_prepared_native.py::publish_native_recipe` 的全幅 LANCZOS 责任；测评重用同公式产生1024单档，**计时不是整个三档publisher成本** |
| 重投影与出版 | `prepared_rgb_tan.py`、`publish_prepared_optical.py`/README 已读；本轮无几何重投影需求，不制造替换实验 |
| 既有背景路径 | `publish_prepared_display.py::verify_display_pixels` 与旧 M82 source-masked-background trial；Photutils 已存在于历史试验，不能称首次引入 |
| 批量来源 | 现有 `scripts/inspect-legacy-regions.py`；不重跑旧52对象矩阵 |
| 实际消费者 | `sky-artwork-level-composition.ts`、`sky-gpu-renderer.ts`、`sky-scene-render.ts`、`sky-sdss-optical-frame.ts`、`sky-target-optical-identity.ts`、`sky-tan-optical-registration.ts`；Scene 顺序含后续目录星 |
| 出口/来源 | `workers/miniapp-api/src/sky-public-asset-export.ts`；未另建交付平台或变更注册/默认预算 |

当前计划只有本表；阶段已落实，无待执行主任务：

| 阶段 | 完成证据 | 状态 |
|---|---|---|
| A 归因/准入/工具核查 | 第3、4、7节；真实缓存、硬件、官方及许可区别 | 完成 |
| B 代表对照 | 原样/Photutils/Siril/nox，18张实际Scene，完整图与1:1细节 | 完成 |
| C 小批次/复跑 | 三张素材、8项实际记录+1policy skip；缓存与6项回归 | 完成 |
| D 选择/保存/停止 | 本报告、机器索引、脚本；首次独审3项已修，最终复核确认关闭 | 完成 |

## 3. 输入与公平约定

全部复用已有合规缓存，无新天区下载。主样本NGC253针对已有矩形底色和星点；第二NGC5128包含稠密前景星、宽弱晕与偏心细丝；第三M81/M82包含双目标和弱盘，验证背景规则迁移。这不是随机抽样或全库通过率。

| 样本 | 完整输入/来源 | 尺寸、字节、SHA256 |
|---|---|---|
| NGC253 | `output/prepared-candidate-samples-1005-r1/eso0902c.jpg`；[ESO](https://www.eso.org/public/images/eso0902c/)，CC BY4、credit ESO | 8285×7510；8,339,408 B；`76bd6fd768c6503e7b1c2092dad6efbb295f7725d5bdff54447443bf4dfd6fe6` |
| NGC5128 | `output/eso-ngc5128-finished-1006-q1-r1/eso1221a-publication.jpg`；[ESO](https://www.eso.org/public/images/eso1221a/)，CC BY4、credit ESO | 4000×3912；3,404,178 B；`6c0e4465655cc2524871270fc9d7d323f4c2544cd776bca836d32100c45c8023` |
| M81/M82 | `output/noirlab-m82-large-source-1004-r1/noao-m81m82-large.jpg`；[NOIRLab](https://noirlab.edu/public/images/noao-m81m82/)，CC BY4、credit T.A. Rector (University of Alaska Anchorage) and NOIRLab/NSF/AURA/ | 8315×4642；9,250,383 B；`71a539df75c8af574e98d3da13c1381e525093dd2e8814d9588f35b73b4e3479` |

统一完整幅面缩至宽1024，输出分别1024×928、1024×1001、1024×572，Pillow LANCZOS，不裁图/扩覆盖/重投影。原始8位sRGB，嵌入ICC为 sRGB IEC61966-2.1（3144 B）；所有最终候选RGB8 PNG附同ICC，不改变曝光显示。Siril/nox内部16位PNG经Pillow转RGB8；格式转换/读回计入时间，16位中间件保留。原素材已经是多波段出版色图，不是线性通量、肉眼色或可靠科学测量。

每样本 manifest 保留来源、credit、许可、metadata路径、完整输入hash及保护椭圆；metadata、方法、代码、依赖、输出规则进入缓存身份。名义AVM/TAN从旧准入模板保留，原sourceWidth/Height不会错误替换为1024；绝对配准 UNVERIFIED、科学有效性 UNKNOWN。估计用保护区只拒绝背景采样，**减背景仍作用全图**；它不是科学mask或显示alpha。最终几何alpha完整不透明，未把软蒙版塞给会检查几何alpha的shader。

Photutils沿历史recipe缩放到1024：SigmaClip3/maxiters10，检测2σ/至少10像素，星mask膨胀半径5，Background2D 128×128/filter3/MedianBackground；编码RGB估背景→转线性作差→负值截0→sRGB，复用现有公式验证。三个保护区域配置随manifest保存，不逐候选手工修图。Siril为 `set32bits; subsky 1 -samples=20 -tolerance=1.0; savepng … 16`，是自动取样不同估计器，并未手工加入同样保护区；这是自动流程能力对照，不是严格同一数学算法速度赛。

nox固定 `-p 512 -s 128 -b 1`，非线性RGB、不加 `-l`，使用发行版color模型、12 CPU线程日志。没有改目录星权重，没有图像生成补足观测，nox的局部生成替换明确列为候选风险。

## 4. 实际结果与成本

环境：Windows、Python3.12.14；i5-11400F（6核12线程），RAM34,126,815,232 B；RTX3060 12,288MiB driver610.60。nox本次实际CPU路径，不称GPU测评。隔离依赖在 `output/image-tool-benchmark-2026-10-08/.venv`，版本锁见 `scripts/image-tool-benchmark-requirements.txt`。未升级历史Python环境。

下表为**每样本整条测评调用墙钟秒**，包含读入/身份、全幅decode/resize、必要格式转换、处理、编码、差异/蒙版诊断与收据。不是纯算法、三档出版或全生产流程时间。nox使用首次代表试验；其余以最终隔离配置批次为准。

| 方法 | NGC253 | NGC5128 | M81/M82 | 对本轮画质与选择的意义 |
|---|---:|---:|---:|---|
| 原样分档 | 1.028 | 0.588 | 0.750 | 原出版颜色/星系结构保留，已有矩形问题不会自动解决；默认基线 |
| 既有Photutils recipe | 4.349 | FAILED（0.639） | 2.247 | NGC253底色改善；M81/M82弱盘仍可见但减暗；不证明所有弱结构保真；条件候选 |
| Siril1阶自动背景 | 2.394 | 1.899 | 按规则跳过 | 少量底色/颜色变化，没有明显边界收益；此recipe不增加为常规步骤 |
| nox CPU去星 | 30.224 | 29.806 | 因伪影停止扩批 | 星点减少，暗洞/光晕/斑驳，矩形仍在；当前退出 |

代表首轮7/8调用产生文件，NGC5128 Photutils失败；这不是7/8画质通过。最终3输入×3请求方法=9行：原样3成功、Photutils2成功1失败、Siril2成功1policy skip，即实际8项中7产生输出。原样不等于照片已适于无缝天空，成功率不能外推。

首轮8项74.955秒（两个nox占主要耗时）；背景小批次6项10.305秒→暖跑0.287秒。最终修正代码/隔离Siril后的8实际项13.970秒→暖跑0.848秒，8/8均命中（含失败，另1skip），约16.5倍只是**这一缓存复跑墙钟比**，不是新图处理加速或人工效率倍数。失败缓存保留原原因，未冒成功；M81/M82在NGC5128失败后照常完成。

分阶段首轮证据在逐项receipt和机器索引，举例：NGC253原样读/hash0.041、decode0.463、resize0.516、工具输入PNG0.134、诊断编码0.205秒；Photutils首载processing6.433秒，最终同recipe3.210附近（首次import/文件系统热度不同，不当作算法优化）；nox两张processing约28.43/28.41秒，未分离模型加载与推理，**纯推理时长 UNKNOWN**。后续图片仍独立启动exe，不能称常驻模型吞吐。

首轮Siril child峰67.7/69.2MB；nox约3.37/3.34GB，测法为50ms RSS轮询加Windows peak working set（单child）。Python父进程累计高水位约0.62–0.70GB，不能标为每方法独立内存。VRAM峰 UNKNOWN；没有把GPU逻辑预算冒物理峰。输出PNG：NGC253原样949,252 B、Photutils868,159 B、Siril950,019 B、nox937,510 B；NGC5128原样1,631,622 B、Siril1,631,613 B、nox1,510,163 B；M81/M82原样662,895 B、Photutils615,221 B。压缩大小不当质量分。

一次性成本单列：隔离Python安装69.33秒；Siril portable下载33.80秒（解压/首次配置时间未单测）；nox exe24.36秒、color权重58.43秒、TF DLL36.40秒，另libwinpthread下载TLS失败5.05秒。保留该失败；本机nox在未补此DLL下真实运行成功，不静默改为“全部下载成功”。原图网络下载0次。

人工：手工像素修补0次/0秒；代理为3输入各写1组保护区域配置，共3组，首次选择/画质复核/接线调试耗时未独立计时，均 UNKNOWN。这是明确的逐输入人工依赖，不能声称零干预或全自动。批次运行后不需要模型逐图发处理命令；错误/复核仍由人或代理按组处理。

## 5. 可查看的图像和实际消费者

全量路径根为 `output/image-tool-benchmark-2026-10-08/`。机器索引 [image-tool-benchmark-2026-10-08.json](image-tool-benchmark-2026-10-08.json) 保存选中receipt、输入输出hash、分阶段计时、硬件安装记录、Scene帧及代码绑定；cache每项保存 original/processed/difference-x8/removed-layer/protection-region/comparison，Photutils另有 estimation-mask/background.npz，外部工具中间PNG、script/log/私有ini保留。

![NGC253完整宽视图同条件对照](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/scene-final/ngc253-wide-comparison.png)

![NGC5128完整宽视图同条件对照](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/scene-final/ngc5128-wide-comparison.png)

另外必看的细节：

- [NGC253实际Scene细节](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/scene-final/ngc253-detail-comparison.png)、[NGC5128实际Scene细节](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/scene-final/ngc5128-detail-comparison.png)。
- [NGC253原比例像素](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/ngc253-one-to-one-crop.png)：固定ROI(350,310)-(650,610)，缩放结果1:1，nox有星点孔洞与局部细节改变；没有用差异图断言所有HII被去掉。
- [NGC5128弱外围/细丝原比例](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/ngc5128-one-to-one-crop.png)：ROI(130,130)-(450,450)，原样/Siril/nox；细丝仍可见但nox残洞/纹理风险清楚，不能判科学保真。
- [M81/M82全幅原样/背景/差异](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/cache/e5884200e3396767807c5f1fa0df487755eb4ca8e3a4523c3de7efb365d2048f/comparison.jpg)。该第三输入验证像素批处理迁移，未新增对应Scene，不能称其消费者验收。

实际Scene：共享 `benchmark-image-scene.mjs` 直接bundle当前 createSkyGpuRenderer/drawSkyScene/注册/精确frame，无替换shader、无覆盖绘图模拟。390×844、DPR1、同一报告/时刻、相同FOV与camera/目录/颜色，wide含完整四边、detail放大。照片off也保留，7个候选×2视图+两个目标×2off=18帧。每个候选都校验实际可见差异（52,900–270,270像素）、finePrepared+submitted、精确publication completion、GL=0、无image failed、无贡献故障；Texture/Framebuffer/Renderbuffer/Program/Buffer释放均0存活。最终结果 `scene-final/result.json` 绑定110项bundle输入和真实输出hash。

PNG browser decode及Scene draw+finish+readPixels分别计时；最终Scene后者约0.148–0.309秒/含照片帧（软件WebGL诊断，不能冒真机帧时或原生容量）。无截图显示不等于无提交：早期scene-r1/r2误用了另一小时的观察矩阵，像素差异断言捕获全空；改为匹配frameAt精确矩阵后有效。scene-r3输出齐但写bundle虚拟入口hash失败；scene-r4用于初审、仍有旧元数据描述；全部保留，不作最终PASS。scene-final修正描述且持有完整result，是唯一最终消费者证据。

**目录限制**：报告挂载8404行BSC，但窄视野当前NGC253只有1目标pick、NGC5128为0，无可见目录恒星样本，未传supplement。没有声称星点重复、目录密度衔接、补星或点选完成。当前照片星点边界/底色在实图可见；更深目录、绝对配准及发布后体验仍属主目标，不在本次偷渡完成。

已有控制已实际看图：NGC6752 `output/playwright/prepared-ngc6752-composition-1006-q2-r2/encoded-current.png` 密星矩形仍明显，禁通用去星；Rubin `.../quality/refined/current-scene/M-8-complete-1x.png` 弥漫结构几乎填满且宽域边界存在，不盲估空背景；`M-61-complete-1x.png` 旋臂/外围已见，直接复用选档收益；PS1 `output/ps1-region-batch-2026-10-08/original-tiles/Norder4-Npix1805.jpg` 原始即有绿紫异常，退出此具体输入而非宣判整个PS1失败。这些是复看历史控制，未伪记新加工或重复全矩阵。

## 6. 可重复处理路径、异常与代码质量

脚本是任务内共享工具，不是生产发布器：

- `scripts/benchmark-image-tools.py`：一个manifest驱动所有样本/方法，逐项异常隔离，输出hash收据，内容对象池+NTFS硬链接避免每方法重复存原样PNG。
- `scripts/image-tool-benchmark-samples.json`：输入/权利/保护区域/允许方法；`image-tool-benchmark-requirements.txt`：本次隔离Python锁定版本。
- `scripts/benchmark-image-scene.mjs`：同消费者对照，明确成功status筛选/失败skip记录，生成Scene/横向图/实际贡献/代码与输出身份。
- `scripts/test-image-tool-benchmark.py`：6个风险回归，见下文，不含模型推理或全项目测试。

PowerShell 7，在固定工作区运行；run名必须新且唯一，旧证据不覆盖：

```powershell
$bench = '.codex/work-items/cloud-sky-native-2026-09-22/scripts'
$py = 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe'
$runName = 'replay-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
& $py "$bench/benchmark-image-tools.py" --manifest "$bench/image-tool-benchmark-samples.json" --output 'output/image-tool-benchmark-2026-10-08' --run $runName --methods original photutils siril
# 预期 exit 1：NGC5128背景失败仍要保留；读该run JSON，其他输入仍完成。
& $py "$bench/test-image-tool-benchmark.py"
node "$bench/benchmark-image-scene.mjs" ('scene-' + (Get-Date -Format 'yyyyMMdd-HHmmss')) 'output/image-tool-benchmark-2026-10-08/scene-input.json'
```

上述本机复跑无需下载。只测默认推荐批次可用 `--methods original photutils`；只原样可 `--methods original`，选子集 `--samples ngc253 m81-m82`。nox回放只有明确要重新比较时选 `--methods nox --samples ngc253 ngc5128`，不默认推理失败候选。现脚本代码身份改变后首次会新建缓存，不承诺命中旧版本。

新建隔离环境仅在旧环境不可用时：`uv venv --python 3.12.14 output/image-tool-benchmark-2026-10-08/.venv` 后 `uv pip install --python <该python路径> -r <bench>/image-tool-benchmark-requirements.txt`；不要覆盖已有环境。Siril/nox来自第7节官方发行包，manifest给出本机具体路径；Scene依赖现有项目esbuild及Codex bundled sharp/playwright（脚本明确绝对模块路径），未提供跨机零配置保证。原图、历史report/template要随本地证据一起保留，缺失时明确失败，不联网偷偷替代。

缓存身份：raw输入及metadata身份、完整sample/保护区/参数、方法、runner、verify_display_pixels所有者、Python依赖、输出规范；nox额外exe/model/TF DLL SHA；Siril exe/同目录DLL和显式私有ini文本SHA。每次复用验证所有产物，不只看目录。Siril `-o -i <本项私有ini>`，不再读取用户prefs；首轮默认配置留作历史，隔离后两图最终PNG与首轮逐字节一致，故结论保持。源无sRGB ICC、非RGB、错hash、错误宽度、星团去星均拒绝，不推断色彩空间。

同identity失败不盲重试。若明确是外部瞬时故障/上次中断，先保留原失败，再使用新的输出子目录（必须仍在 `output/image-tool-benchmark-2026-10-08/` 下，如 `retry-reviewed-01`）执行有界重试；这会重新处理所选条目，不能叫缓存命中。半成品目录无收据会显式失败，不擦除覆盖。新参数/工具证据才能合理重新比较，不放宽保护区只求通过。

原脚本失败留下目录但无失败收据的问题已修正，正常失败有failure.json；修复前失败保留。输入和旧试验未改。没有产品renderer、注册表、默认GPU预算或主 PLAN改动。`.gitignore`仅允许本轮共享脚本、版本清单和小型机器报告可被Git看见；未stage/commit/push，图像/模型/log留ignored output。

6项回归全部通过（`regressions.txt`）：失败复用且不调用处理；参数改变使旧失败失效；产物损坏不得命中且原样硬链接一致；错输入hash在处理前拒绝；cluster在加载去星模型前拒绝；Siril配置或DLL变化使缓存失效。实际批次另证明失败后继续下一样本。回归日志1.470秒，只覆盖本轮适配风险，不冒整个项目验收。

首次独立审查由benchmark_review完成，实际看Scene/nox并核代码/收据，指出3项P2：Siril用户配置未绑定、Scene旧coverage声明不实、只按receipt过滤会纳入失败。已全部修正并真实重跑：配置和DLL回归通过；隔离输出逐字节相同；scene-final生成完整准确元数据并skip原失败。最终独立复核 benchmark_final_review 已确认3项P2关闭，无新增阻塞；核验最终批次全部产物hash、当前代码身份、18张Scene及110项bundle输入中的真实文件身份，并实际查看两张最终宽视图。审查支持本报告的有限结论，未认证未验范围。两个审查子任务均已结束。

## 7. 官方能力、许可与未测候选

核查日期2026-10-08；以下“许可”是本轮官方资料记录，不从“能下载”推定模型或App再分发权利。

| 工具/责任 | 当前核到能力及本机状态 | 本轮采用/许可边界 |
|---|---|---|
| NumPy/Pillow/Astropy/既有pipeline | 已有完整RGB处理、TAN/分档/字节准入；实际复用 | 保留清晰责任；未重写成新素材平台 |
| [Photutils3.0.0](https://photutils.readthedocs.io/en/stable/user_guide/background.html) | Python批量 Background2D；已隔离运行并对照旧recipe | [BSD3条款](https://raw.githubusercontent.com/astropy/photutils/main/LICENSE.rst)，无单独模型；素材版权仍按来源；可做有可靠背景区的候选 |
| [Siril1.4.4](https://siril.org/download/) | Windows portable、CLI脚本，[subsky](https://siril.readthedocs.io/en/stable/processing/background.html)/[命令](https://siril.readthedocs.io/en/stable/Commands.html)；本机已实际运行 | GPL3+程序；本轮没调用第三方去星模型，不能把Siril包装StarNet当另一算法。保留本地能力，但此自动1阶recipe不常规追加 |
| [nox1.1.0](https://github.com/charvey2718/nox) | Windows exe+.pb+TF DLL，CPU实测成功；GPU仅文档/用户报告未证 | [LICENSE](https://raw.githubusercontent.com/charvey2718/nox/main/LICENSE)明确其代码MIT；README鼓励用所给模型处理图片，但模型商业/分发范围无单独明确授予记录。仅本地评测，质量不通过且不正式采用 |
| [Photoshop批量/Image Processor](https://helpx.adobe.com/photoshop/desktop/automate-tasks/process-a-batch-of-files/convert-files-with-the-image-processor.html) | 官方支持批处理/动作等；本机PATH、Program Files顶层、常见卸载清单有限盘点未确认安装/授权 | 仅文档。另一台电脑有PS不等于本机可用；未采购/上传/远控另一台，不能宣称PS输给Python |
| [StarXTerminator](https://www.rc-astro.com/software/sxt/) | 官方有standalone/CLI与试用申请，当前标价59.95美元；本机未确认合法可用授权 | [使用协议](https://www.rc-astro.com/rc-astro-software-license-agreement/)限制服务他人、模型/二进制分发等；未申请试用/购买，不对图质排名 |
| [StarNet2 CLI](https://starnetastro.com/cli-tools/starnet/) | 当前2.6.2-0242、ORT/Windows DirectML，文档支持CLI；未安装运行 | 当前具体模型商业/App资源用途 NOT_ESTABLISHED；不沿用过时二手许可说法。保留未测 |
| GraXpert | 未选为本次少量实测候选 | 模型用途仍需单独核，本轮没有使用；不作质量判断 |
| reproject/Montage | 责任是重投影/匹配/必要拼接；本轮3幅全幅TAN不要求该操作 | 因无实际几何瓶颈不引入/不测速；无结论认为现有采样一定优于成熟库 |

本机没找到的意思仅是本轮有限盘点未确认可用，不声称全机/其他电脑不存在。官方网页/咨询能力与本机真实处理严格分开。

## 8. 按素材类型的后续路径及停止条件

| 对象/问题 | 路径 | 重评条件/未解决 |
|---|---|---|
| 合格星系成品/HiPS（如M61） | 源权利/元数据准入→直接复用或完整分档→现有清单/实际Scene | 只有明确底色/gradient缺陷才进入像素分支；选档收益不冒处理收益 |
| 稀疏背景中的星系（NGC253/M81） | 原样控制→Photutils候选→看弱外围、残星、边界和Scene→合格才进一步采用 | 仍需每图保护区；没有可靠背景网格就退出；弱结构被减暗无法证实合理时保留原样 |
| 宽弱晕/稠密星场（NGC5128） | 原样；此Background2D失败分流，nox退出 | 需要可靠背景参考/不同有根据recipe或合规成熟工具，不能缩保护区硬过 |
| 弥漫星云（M8） | 成熟成品覆盖/正确选档优先，保留暗纹与低频结构 | 无可靠空背景不自动拟合；没有外部观测不能生成外围 |
| 星团（NGC6752） | 保留真实成员星；检查来源覆盖与显示密度边界 | 通用去星禁用；当前图像工具不能解决照片外没观测的事实 |
| 具体原始源异常（PS1样本） | 标失败/更换合格输入 | 不无限调色救原图；失败只适用于本次产品/配置 |

四类瓶颈区分：输入供给不足/异常要在来源端解决；本次nox像素计算约28.4秒且图质不合格，不能为速度采用；坐标/选档/合成有独立已知约束，像素去星不会产生外围观测或补目录；人工编排通过共享manifest、异常分流与缓存减少重复命令，但实际人工总耗时尚未测量。下一批不需要新增同形脚本，只更新合规输入manifest、先小样本核风险再批量。

照片外缺测、宽域连续性 FAILED、科学有效性 UNKNOWN、绝对配准 UNVERIFIED、手机/原生/物理容量验收 UNVERIFIED、正式注册未打开全部保留。电脑端实验不认证主目标完成。本次交付并不依赖修复主Goal backlog，也不自动授权扩批或发布。

## 9. 六项交付核对与停止

1. 瓶颈：第4/8节分机器/人工/来源/消费者，未知没有填数字。
2. 工具选型：第1/4/7节，实测、未测、不可用及重评条件明确。
3. 画面：第5节原样/处理/差异、mask、1:1、18实际消费者帧；第三样本Scene未验明确。
4. 重复路径：第6节命令、manifest、版本、hash缓存、恢复和回归；不是纸面清单。
5. 组合/代码：第8节按类型、保留owner和最小共享适配；没有未经证据采纳成熟工具或锁死Python。
6. 保存并停下：本索引、小型机器事实、共享脚本、ignored本地原图/模型/完整证据已保存。最终复核已完成，本次独立Goal标记complete后停止，等待用户明确授权才可恢复云观星主目标。
