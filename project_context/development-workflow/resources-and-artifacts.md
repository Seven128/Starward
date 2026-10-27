# Resource storage and task artifacts

This node owns repository storage boundaries and developer resource preparation. Publication identity, source rights, coverage, serving and retention remain with their existing data-pipeline and deployment owners. The executable selection is [lfs-policy.json](../../tools/resources/lfs-policy.json); do not copy its file inventory into Context.

## Storage boundaries

| Content | Owner and storage |
| --- | --- |
| Source, reusable pipelines, tests, current editable prose, manifests, licenses and provenance | Ordinary Git; review meaningful changes directly. |
| Selected immutable images, generated star catalogues and compatible old text publications | Git LFS: Git stores pointers, local LFS cache stores bytes, GitHub LFS stores uploaded objects after an authorized push. Working paths and content hashes stay unchanged. |
| Acquisition caches, intermediate images, build outputs, raw logs, screenshots and cumulative inspection snapshots | Ignored local `output/<task-or-run>/` or task scratch; never automatically promote into Git/LFS or a Docker build context. |
| Task goals, the one current plan, acceptance ledger, concise conclusions and current finite review bindings | Task-local documents under `.codex/work-items/`; preserve FAILED / UNKNOWN / MISSING. Durable decisions belong to the relevant Context owner. |

An ignored directory is not a backup. Before retiring existing tracking, archive the exact affected files, verify every archived member against its source, retain a small receipt with archive hash and restore instructions, and retain original paths until cleanup is separately safe. `tools/resources/archive-task-artifacts.py` archives Git-visible files before ignore changes; it does not capture previously ignored inputs. Restore standard tar/gzip into an empty recovery directory, verify identities, then selectively recover. A same-disk archive is local recovery only; off-host backup requires an explicitly selected destination and verified readback. Never claim an upload or backup from the presence of a Git pointer.

The existing Cloud Sky task has narrow ignore exceptions for current review evidence and fixed test/publication inputs. These are required dependencies, not a precedent for tracking all scratch. Keep them until their consumers and provenance are safely migrated together. Historical scripts are archived investigations; the retained current batch scripts and `data-pipelines/` own further work. Archive location and migration evidence live in the governance work item, not in this durable Context.

Portable test consumers keep their inputs with their test owners. [Reviewed introduction expectations](../../workers/miniapp-api/src/test-fixtures/celestial-introduction-reviewed-batches.json) retain independent reviewed prose fingerprints and source-retrieval expectations; historical work-item paths are provenance rather than required reads. [Sky time consumer support](../../apps/wechat-miniapp/src/features/sky/sky-time-test-support.ts) uses the actual report producer in an isolated fixed-clock test process, with the existing public spot and deterministic weather fixtures. These inputs establish software behavior, not original production-data restoration, real-provider quality or device acceptance. Explicit real-publication verification still needs its declared external inputs.

### Mini Program candidate retention and cleanup

Review candidate retention before each new import and finish retirement after the replacement's source/build binding and relevant startup are verified. [Project source, snapshots and windows](development-feedback.md#project-source-snapshots-and-windows) owns entry/window reuse and official removal; this section owns which generated files still need to exist. An old imported entry can be removed while its diagnostic files remain archived outside DevTools.

| Candidate use | File disposition |
| --- | --- |
| Current development, test/capture, pending delivery or active recovery | Keep the exact files in use; do not overwrite or remove another session's candidate. |
| Unresolved crash/OOM/performance attribution or an actual before/after comparison | Retain the evidence-bound version until that dependency ends; keep its reason and release condition with the existing task evidence owner. |
| Superseded intermediate build with no remaining consumer or evidence/recovery need | Delete the run-owned generated output through its existing owner after confirming reproducibility, no unique edits and no active process/tool use. No full-product acceptance is required merely to retire such an intermediate build. |
| Unknown ownership, unique local inputs/edits or a still-applicable explicit preservation requirement | Preserve the affected files until that specific uncertainty or requirement is resolved; it does not justify retaining every other obsolete copy. |

Diagnostic retention is selective, not a permanent exemption for every numbered or frozen build. Keep the exact compiled bytes, available matching source maps, effective build/configuration identity and necessary recoverable source/input version that the retained trace or failure needs. A current HEAD or hash alone cannot reconstruct an older dirty build. Raw captures, private originals and user/account data remain independently protected; deleting a redundant generated directory does not authorize deleting them. Reuse existing task bindings rather than creating another inventory or copying complete projects solely for archival bookkeeping.

Once analysis, comparison or recovery no longer needs a retained version, reassess it and remove disposable outputs. Do not use age or a fixed generation-count rule as the decision. Resolve exact task-owned paths and check active use before deletion; preserve unrelated directories, independent source copies and required recovery material. Report actual entry removal, window closure and file cleanup separately, including retained exceptions. Updating these rules alone does not execute a cleanup of existing candidates.

## Efficient development

Install Git LFS on each development machine. Before the first authorized push, run `git lfs install` and verify the pre-push hook; preserve and integrate any existing hook rather than overwriting it. Linked worktrees may share hooks/configuration, so inspect that scope first. Merely adding `.gitattributes` does not upload objects or rewrite history.

- `npm run assets:prepare` prepares selected current resource versions. An already materialized working copy works offline. For limited work, append `-- images`, `-- catalogs` or `-- text-history`; use `all` before the full build.
- `npm run assets:verify` rejects indexed missing files, empty payloads and unhydrated LFS pointers before normal development/release consumers. It does not replace publication hash, format, rights or coverage checks.
- `npm run assets:audit` reports local bytes and unique object bytes; account storage and remaining monthly download allowance stay UNKNOWN until checked remotely.
- Edit `lfs-policy.json` and run `npm run assets:rules` when adopting a new resource class or moving the editable text version. Review the resulting attributes, stage only the intended paths and verify pointer SHA-256 against working bytes. Do not generate a new publication version for each object or routine verification.

CI skips checkout smudging, restores the LFS object cache and prepares resources before their consumers. Cache keys follow resource inputs, so ordinary code changes reuse the same data. Context-only work does not fetch resources. Docker excludes `output/` and task directories and verifies materialized resources before the release build. GitHub source ZIPs containing pointers are not ready-to-run resource bundles.

GitHub Free is the selected hosting tier; no paid overage is authorized. Its documented LFS storage/download allowances are account-wide, include retained object versions, and are distinct from GitHub Actions cache quotas. Before the first authorized upload or a material expansion, check actual remaining storage, current billing-cycle downloads and a zero paid-spend limit; local size alone cannot establish them. Never auto-upgrade, buy storage or change billing. Use [GitHub's current LFS billing rules](https://docs.github.com/en/billing/concepts/product-billing/git-lfs) when reassessing. Do not use `git lfs fetch --all`, history migration or repeated unchanged downloads as ordinary setup.

Runtime delivery continues through the existing publication/export and static-service owners; LFS is development storage, not the application image CDN. Reassess external object storage/DVC only when verified volume, collaborators, processing or delivery requirements justify it.

The current Mini API also consumes the `catalogs` and `images` profiles.
Verify those selected groups before starting its real Map/Sky consumers; hydrate
missing groups through `assets:prepare`. The separate backend runtime lock covers
its declared map products, not every API asset or npm dependency. Reuse the
repository lockfile when a required package is missing, without adding a new
dependency or changing unrelated package versions.

## Commit-bound backend data

The user-selected development mechanism is one Git-versioned data index with bounded public products in LFS and large source/recovery objects in private Google Drive. [`current.lock.json`](../../data-pipelines/runtime-data/current.lock.json) owns exact data roles, version identities, file-index hashes, actual remote locations and unavailable inputs. Follow the [executable workflow](../../data-pipelines/runtime-data/README.md); do not add a second inventory in Context or rely on a chat handoff. Reuse the same selected Drive data folder where practical; keys remain in their separate private owner.

### Receive required data with code and recover missing inputs

Agent-assisted development uses the existing data commands and authenticated
transfer tools, directed by this Context and the development skill. Keep the
standard Git LFS hooks; do not add a separate synchronization script or custom
Git/npm lifecycle hook for this workflow. This choice avoids another installed,
platform-dependent trigger and recovery path. Reassess only if unattended
operation becomes an explicit requirement.

After an authorized code pull or synchronization, inspect the selected
commit's lock and the current task's consumers, then actually prepare their
required data. Backend runtime testing normally needs the public runtime
group: run `backend:data:status` and, if missing or still represented by LFS
pointers, `backend:data:prepare`. Reuse valid local bytes. If LFS cannot supply
them, use the lock's exact Drive objects through the existing authorized
connector and verified importer. Include the optional Map distribution group
when that run consumes it; large rebuild sources are needed only for actual
rebuilding. A successful Git operation alone is not completed data synchronization.

If local startup or use later exposes a missing input, identify its exact
consumer, version and failure boundary, acquire that required input through
the same owner, verify it, then retry the affected operation. Do not repeat
unchanged failed downloads or replace missing published data with fixtures.
Check for a compatible existing database first; restore only through the
private recovery owner into a fresh owned target when needed, preserving
existing accounts and drafts. Missing credentials, authorization or remote
objects remain named dependencies while independent work continues.
File preparation, database verification and actual service readiness remain
separate results; Context/skill directs the agent, not an unattended Git hook.

### Each commit binds the required development inputs

Keep code, Context, Harness and required development inputs compatible within a coherent repair batch. The user prefers fewer commits: commit after a material repair outcome or an explicitly requested checkpoint, rather than after each small edit, observation or document update. Preserve local work throughout; commit preparation and unrelated minor findings must not interrupt the user's current priority unless they affect its diagnosis, repair or necessary verification.

Preserve necessary new raw inputs locally first, with their source/build identity and existing task/data owner. Upload data only when the user explicitly requests data upload; continuing development, running checks or committing code does not itself authorize an upload. This includes new Drive objects and new LFS data. Keep unresolved remote preservation explicit while continuing the priority work; do not repeatedly package, transfer or read back intermediate evidence as a development gate. Select only inputs needed to reproduce or continue the work, reusing verified unchanged objects and omitting regenerable frame galleries, caches and superseded candidate copies unless a concrete recovery need requires them.

At a coherent commit, inspect the actual consumers and unfinished work it must support: runtime/distribution products, genuinely needed rebuild inputs, private recovery state and finite raw diagnostic evidence. Keep runtime identities in the existing lock, private recovery in its manifest, and task evidence with its task owner; bind the relevant identity and preservation status with the code. A local-only input or deferred upload must be labelled as such, not presented as a verified remote recovery point.

When the user requests upload, publish the selected new/changed content through the existing LFS/private Drive owner and verify its exact object identity, size/hash and readback before claiming recoverable delivery. Retain the recovery entrypoint with the compatible code/input records; an LFS ref must not be delivered as complete before its required objects are available. Preserve immutable versions and private sharing. Secrets, private database contents and private media never enter Git/LFS. A changed private state needs a new recovery record only when subsequent work depends on it; this does not authorize automatic database restoration, reminder replay or a full personal-data snapshot.

A missing upload, locator, readback or compatible recovery input prevents claiming complete recoverable delivery, but does not block independent development or require an unsolicited upload. A source commit, LFS pointer or green CI alone is insufficient. Current automation verifies declared public runtime files through LFS preparation and `backend:data:verify`; it does not discover arbitrary dependencies or automatically upload/verify Drive objects, private state or ignored diagnostic evidence.

Normal app development prepares the published runtime group. Rebuilding algorithms or checking original pixels uses the separately selected source group, kept outside Git and downloaded only when needed. Large global EOG TIFFs are not interchangeable with bounded PNG/numerical runtime products; neither file size nor a public map result establishes that rebuild sources are backed up. Exact sources may be obtained through the supplier's authorized official route or a verified existing copy; check actual access and locked hashes before admission. Supplier acquisition and our durable Drive backup are separate results. A missing recorded remote location does not require the original computer, nor authorize guessed protected URLs or regenerating a release. Follow the [EOG acquisition owner](../../data-pipelines/dark-sky/README.md) for account access and licensing.

`backend:data:prepare` and `backend:data:verify` verify exact locked public bytes; valid local files work offline. LFS supplies admitted current resources; authenticated Drive transfer plus the common assembler/importer supplies a pinned mirror without overwriting edits. Future Drive-only runtime groups use `EXTERNAL_CACHE` and an absolute `STARWARD_DATA_HOME`; the same API mapping and checks consume them. Source validation streams large-file hashes. Explicit `backend:data:import --profile rebuild` admits downloaded original TIFFs or declared GZIP/ordered byte parts into an external cache: transport and decompressed identities validate before cache admission, expansion stays bounded by locked sizes, and valid cache entries are reused. It does not acquire credentials or fetch globals during app preparation. The connected Drive owner currently supplies authentication: unattended Drive CI/credentials are not provisioned. Record immutable object IDs, complete/part hashes and verified readback; folder links or temporary signed download URLs are insufficient. Never expand sharing or put secrets/private DB contents in Git.

Sealed terrain/night-light files and publication authority remain separate. `backend:data:check-db` verifies current migrations and the exact [nightlight](../../data-pipelines/dark-sky/README.md) PUBLISHED inventory. `dev:miniapp:published` checks files/database, binds the selected roots, disables automatic migration/reminder delivery and starts only a local API. A code pull/prepare never restores a database or erases accounts, accepted writes, phone-local drafts or media. Initial private recovery uses the existing backup/restore owner and a new isolated target; later migrations and dataset activation stay explicit. Source preparation, database restoration, service connection and device/product acceptance are distinct results.

Before expanding LFS, account for retained versions and expected collaborator/CI download use. No paid overage is authorized. A remotely confirmed account without a valid payment method is blocked at its included quota under GitHub's current rules; adding a payment method requires setting a $0 LFS hard-stop budget before further uploads. If the UI prevents creating a budget, record that limitation honestly instead of claiming it was set. Move new large groups to Drive before exhausting LFS, preserving old identities/references. DVC is a reassessment option for recurring multi-dataset pipelines or unattended synchronization; its current Drive setup adds OAuth/cloud-project responsibilities, so the adopted workflow reuses the working connection and existing publishers. LFS/Drive development storage does not replace production static/CDN delivery.

## Cloud Sky image processing

供给和加工规模参考[云端影像库存估算](../deployment/decisions-and-verification.md#cloud-sky-image-inventory-estimate-2026-10-10)，由部署容量owner统一持有数量区间、体积与保留副本假设及重评条件。按合格目标/天区成品计量，原始输入、LOD文件和重复版次分开统计；该估算不替代覆盖与图质要求，实际加工/复核/采用进度留任务交接及库存。

本owner持有云观星图像制作的职责、采用边界与重评条件；[合规来源与选型理由](../external-capabilities.md#云观星合规图像供给)、[工具选择](../external-capabilities.md#云观星图像处理工具)由外部能力owner持有。目标是把真实照片中的星体或连续天区制成可按真实位置/尺度叠加的显示素材，保结构、弱外围、几何、颜色含义和来源。当前采用“来源准入 → 低成本实际Scene预检 → 直接复用或必要加工 → 集中质量复核 → 合格子批次采用”；预检在昂贵SXT/PSD/NXT和多版出版之前，候选不进入普通发现，也不替代最终资格。

该顺序针对先去星、再恢复误删成员、最后才发现融合失败的返工。星系、星团及密星区域优先保整幅观测/连续区域；SXT仅用于确需分离且可保真实结构的分支，NXT和PS不默认施加。照片点源与目录星绘制协调归原Scene，不删除目录身份、搜索、点选或跟踪；不能以孤立矩形/新照片模式代替既有星空要求。背景均值、噪声与显示贡献仍分责，源不足则换源，不能靠删弱外围或无依据阈值扫描补足。文件与Scene的视觉容差统一沿下方[显示质量标准](#cloud-sky-display-quality)，不把统计残差或科研未知自动当显示失败。

公共许可/坐标规则、分档和检查按来源/机制批量复用；内容、适用配准、权益与Scene结论绑定各自素材，消费者恢复按共享机制集中验证。复杂例外有限修复后转换源/待授权/缺口，不冻结独立合格组；操作及止损方法沿技能，当前试点界限沿唯一PLAN。以去重合格成品及实际采用覆盖/有效工时衡量收益，分列一次性适配、返工、机器、复核和外部等待；候选/LOD/截图增长不算交付。只有输入机制、显示消费者、权限或实测收益变化才重评，不将吞吐预测写成能力。

操作方法统一归[天文图像技能](../../.codex/skills/starward-astronomical-imagery/SKILL.md)：[来源/SXT/复用/批量复核](../../.codex/skills/starward-astronomical-imagery/references/batch-processing.md)及[PS/NXT/背景异常与融合](../../.codex/skills/starward-astronomical-imagery/references/exceptions-and-fusion.md)。技能持有未知机制调研、有限试验、止损及有证据的自身维护；优先合并/替换可复用操作，不收对象流水账。项目选择、原因和重评条件留Context，算法/参数与接口归代码/声明，实际运行及进度归任务证据。新增经验不重启前期、不创建第二方案。

| 责任 | 当前owner与不可混用的含义 |
| --- | --- |
| 署名与权益呈现 | 来源级许可资格由准入负责；资产元数据按来源/许可类型映射为现有`SourceSummary`、Prepared/HiPS来源说明及`Provenance`/星图credit消费者。公共文案/渲染按机制验证，字段与版次全批自动检查，人工只处理缺项/冲突/特殊条款；不逐图人工校对或重跑来源页。 |
| 来源与全幅工作图 | 原来源准入提供绑定工作图/依赖；`normalized_rgb_source.py`统一颜色、完整矩形和源几何，实验与native出版共用。普通归一化不补覆盖或新观测细节，任务样本尺寸不是产品上限。 |
| 低成本Scene预检 | 原Scene批次runner沿完整原图、当前背景和真实观察条件集中判粗档可见异常；明确失败可停止细档/高DPR扩跑。预检范围及未跑项必须保留，粗档通过不替代最大支持尺度、配准、原生与最终采用资格。 |
| 去星与文件复核 | `sxt_processing.py`/`sxt_batch.py`共享实际执行、缓存和精确成品导入；`image_quality.py`持有集中复核/异常队列。工具激活、加工完成、文件通过、Scene通过、配准与采用彼此独立。 |
| 连续天区与部分覆盖 | `hips_rgb_region.py`沿Astropy TAN/既有lookup保native alpha、缺瓦片、有效黑；`covered_rgb_display.py`承接显式binary alpha，model canvas不是观察数据。供给mask与显示贡献分开，原whole-photo native合同拒绝covered产品。 |
| 原图局部恢复 | `photoshop_original_restore.py`及共享PS host持有精确原图/base/冻结mask、可编辑PSD及实际重开读回，保核心/外部/羽化像素不变量。无healing/生成/重推理；像素正确不证明纹理/恒星或接缝质量。 |
| 背景与可选NXT | `reviewed_background_display.py`、`reviewed_denoised_display.py`复用`reviewed_restored_display.py`的父资格；背景、背景后NXT、NXT后背景是有限有向阶段，有独立producer/颜色意义/最终细档，不可互换或递归。旧部分coverage NXT队列不借完整RGB资格。 |
| 候选与消费者 | `publish_prepared_native.py`共享批次、source/geometry/hash/出口；精确已审细档加两份整图粗档，待修/换源/缺recipe/失败继续留队列。原生、科学配准、公开交付及采用不能从文件/软件通过推断。 |

可执行字段、producer和覆盖限制沿[深空流水线合同](../../data-pipelines/deep-sky/README.md#sxt-batch-processing-workflow)，具体操作只在技能维护。执行来源与当前validator身份分开；精确缓存读回不能冒充新的模型/PS执行，也不能改写历史回执。PS组合保原SXT失败与后处理复核两个epoch，最终像素被背景/NXT改变时，原恢复核心证明只属于父阶段。`local-residual-median`仍是无准入producer的局部显示诊断；确认新方法有收益且真实消费者适用后才扩共享合同。配方输入、结构类别、工作尺度、模型或显示消费者发生实质变化时重评，不能按同名对象外推。

原照片与派生区域共用的线性TAN矩形数学由`packages/miniapp-contracts/src/optical-tan-plane.ts`及`packages/astronomy-core/src/tan-optical-geometry.ts`持有；该plane只给UV/名义ICRS，不给来源、真实coverage、科学有效性或配准通过。native保来源及AVM/companion FITS accuracy；明确获权的完整成品另以`stellarium-corners`和独立ready-texture producer保留固定版本四角、原像素与上游加工未知，不冒原机构完整原图或独立配准。小场四角转换沿[原publisher适配器](../../data-pipelines/deep-sky/README.md#sxt-batch-processing-workflow)，不建新投影引擎。派生区域不能借共同数学type进入原照片合同；名义cell采样网格不是源有效分辨率。相关开发证据见[坐标边界](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/derived-region-coordinate-2026-10-09.md)。

原照片名义AVM出现可见位置误差时，允许以独立参考样本测得**显示位置**，不改原像素或覆盖原AVM。当前有界路径复用Photutils局部点质心与Astropy TAN拟合，先审对应并固定训练/留出点，不以最近峰、拟合内残差或高阶模型自动放行；未知拍摄历元、自行运动与未采样畸变仍需披露。`prepared_display_registration.py`核精确源、保存样本/头/残差和复核；`publish_prepared_native.py`仅复用已审三LOD，生成独立v2元数据。`preparedOpticalDisplayGeometry`统一运行时、BFF覆盖/尺度及库存，v1禁registration、v2必需，旧hash不改且旧reader可拒新schema。像素producer语义不变；来源说明给目录权益和原图像素单位的残差，不能冒全尺度精度、科学或普通采用。新结构、参考污染/历元或实际误差超适用尺度时重新核验；已测坐标变更不重跑SXT/背景/编码。证据与失败控制见[独立参考接入](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-increment-and-blackpoint-2026-10-10.md#独立参考接入与实际显示)。

派生区域采用独立`prepared-derived-region-optical-v1`和`publish_prepared_derived_region.py`本地审查候选入口，允许显式保留NEEDS_REPAIR而不普通采用。它区分原HiPS UNCHANGED像素与ICRS/TAN工作图的派生provenance；原RGBA、独立供给mask和科学UNKNOWN分别保留，support不作运行时LOD。原HiPS manifest/rights按bytes/hash绑定，加工声明MODIFIED，图片CC BY 4.0与数据库ODbL分别署名/给许可链接并提供4.6(b)完整改动master/support。PS派生组合需要自己的合同，不能冒当前SXT-only区域producer；本地封装不证明公开交付或Scene质量。

原native几何家族用显式producer/颜色意义区分原RGB、SXT、PS组合与背景/NXT显示估计，共用全幅geometry、canonical hash及出口。旧内容hash/URL保留，旧客户端可拒新producer；来源须披露真实工作尺寸、处理链和结构风险。显式注册的`prepared-native-optical-v1`静态出口必须含同哈希裸manifest，客户端先读清单再请求LOD，图片及backup source-index sidecar不能替代该响应。`PreparedOpticalImageryService.publishedMetadata`、`preparedOpticalManifestHeaders`和标准export/writer负责字节及固定attachment头；派生区域旧三头metadata保持兼容，旧固定方形照片仍沿API-only。新attachment限定Prepared manifest和既有固定文件名，依赖更新后的writer/reader；新读者保旧记录，不声称旧二进制支持新header或回滚已验。证据见[静态metadata责任](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/native-static-metadata-2026-10-09.md)。

采用库存的只读关联由`data-pipelines/deep-sky/prepared_inventory.mts`持有，沿原批次、加工/文件复核、Prepared候选、显式Scene/配准/权益决定、实际service registry和标准静态读者核精确内容。Scene决定绑定适用实现，失效保原状态与证据；队列失败、未决定和局部有效分别保留。库存不生成/采用/导出资产，不维护第二采用表；对象/区域、版次、LOD、support、metadata响应和去重payload分开计数。供给范围、科学有效性、物理盘和公开交付不能从候选数推断。输入与CLI沿[只读库存](../../data-pipelines/deep-sky/README.md#read-only-prepared-inventory)。

无需去星的完整原图沿现`prepared-native-full-source-v1`出版，不为进入批次伪造SXT。其`FILE`决定绑定真实原编码源与全部LOD，库存仅在无加工reviewSpec且producer匹配时接受，不能覆盖去星/恢复失败；实际Scene仍独立。图像原有有效黑保留供给，不作缺测或新抠黑。星系光晕里的紧致成员也可能被SXT误当恒星；参考分类先核实际原图对应，未知小点不凭形状/亮度认作前景，有限成员恢复不证明全场分类完整。可复用核验与有界恢复入口见[紧致结构与整幅源证据](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-structure-and-full-source-2026-10-10.md)。

## Cloud Sky display quality

采用标准 `sky-display-quality-v1`：真实、位置正确，在实际支持的显示范围内肉眼无明显问题，不追求逐图像素级完美或科研测光资格。原因是独立叠加纹理与整片观测图层的加工需求不同，过度去星/精修会增加结构损失和返工；直接保留合适原图通常比先删除再逐点恢复可靠。来源与方法选择沿原owner，不改变产品模式。

- **观看条件。** 集中复核真实Scene的全footprint、适用细节与LOD切换，覆盖实际夜间/晨昏背景及代表性屏幕/DPR；目标手机在正常到偏高亮度验收。额外拉曲线、差分、超出产品尺度的放大只用于定位风险，微小残差不单独触发失败或精修。软件Scene不能冒手机证据。
- **允许的容差。** 轻微自然颗粒、压缩损失及正常观看不突兀的底色差异可接受；不要求最暗外围在所有LOD同样明显，也不要求源像素级零配准误差。配准/有效细节须满足实际承诺的最大显示尺度，不用平均误差掩可见错位，不临时缩小验收范围藏缺陷。
- **必须修复或换源。** 正常观看可见的照片矩形/密星断边、明显接缝/重影、脏块/色带/修补斑、过亮或换档跳变，以及错误对象/方向/位置。不得以裁弱外围、抹可辨认光晕/尘带/喷流、生成补全或虚构覆盖消除问题。
- **真实性不降。** 保原图/来源/谱段/处理说明与真实覆盖；原样保留的未知小点不要求先逐点分类。已知加工误删真实成员或结构仍须恢复、改用完整输入或换源，不能因远看不明显放行；科学未知不伪装科学合格，也不成为显示成品的额外科研前置。
- **共享检查与复用。** 身份、许可字段、hash、几何/coverage、颜色和LOD合同全批自动检查，公共署名/恢复按机制验证；内容集中看审，仅明确风险进入有限异常。标准改变可复用精确旧像素/场景证据重新判定，保旧FAILED/UNKNOWN/MISSING及原理由，另绑本标准、观看范围和新结论；不是重跑模型/编码/整页或自动洗掉失败的理由。

重新评估条件是用户质量要求、来源/加工、实际显示尺度/消费者或目标设备证据变化。具体样图、批次决定和耗时留任务证据，不在Context积累逐图结论。

## Astronomical background and display

采用背景估计、降噪、显示贡献准备与最终合成分责的工作方法。Starward旧照片路径使用编码RGB贡献，显式背景variant使用线性sRGB显示相加；两者有效黑都可不贡献，但非零底色仍会改变画面。源coverage决定数据/LOD支持，显示alpha/贡献决定画面影响，有效黑不能被当缺测回退。像素、ICC或PSD编辑合同通过不证明实际融合质量。操作与判定顺序只在[技能异常指南](../../.codex/skills/starward-astronomical-imagery/references/exceptions-and-fusion.md#方框透明与真实融合的诊断)维护。

现背景owner复用Photutils的源排除、稳健网格估计；源排除mask只控制统计样本，不保护目标像素免于扣模型。平滑背景、噪声、显示黑位不同，正残差截断可能保留偏亮噪声。对于已拉伸JPEG/RGB，逆sRGB不恢复科学线性；不能从数值操作推断弱结构完整或底色为零。已否决的固定黑位对照显示：逐通道可偏色，统一RGB比例虽改善色比仍可削弱外围；背景分位数与色比保持都不是目标/背景分离证据。没有新结构或来源依据，不重复同一阈值假设；范围与反例见[图像增量证据](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-increment-and-blackpoint-2026-10-10.md)。

完整float64背景数组的资源准入仍由原batch/保存结果owner持有。显式预算的大图沿私有临时mmap、固定成员/有界头、整幅公式及逐通道统计验证，不改原网格/精度或开放旧通用NPY内存上限；参数与支持范围在[流水线合同](../../data-pipelines/deep-sky/README.md#sxt-batch-processing-workflow)。本机真实加工/读回只验证对应规模，不能代全机、生产或图质。保存执行快照与后来实现分开，旧结果不为统一格式重拟合。

成熟资料支持职责分离，未自动改变项目选型：Stellarium桌面纹理工作流要求纯黑底避免近黑方框，其additive分支及PNG约定不能推广到所有引擎；Siril的RBF/多项式、GraXpert插值/AI仍是背景模型对照候选，没有本机试用/采用结论；GIMP Color to Alpha属于颜色重构，不识别天体语义，提高阈值可能丢近底色的真实结构。具体出处、版本及证据范围见[成熟方法研究](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-processing-mature-methods-2026-10-10.md)，工具采用理由仍由外部能力owner持有。

当实际证据指向模型梯度错误、未覆盖的结构/颜色/尺度或合成变化时重开相关方法；已有模型正确但噪声/贡献仍失败，不足以认定更换估计器能解决。软显示蒙版仍需真实背景/结构依据和实际Scene反例，不是通用抠黑许可。缺外围应补源/换源；PS局部原图恢复可能带回纹理/星密度岛，分辨率变化也可能改变去星误删机制。确认的操作结论更新技能，单次图质结果和当前下一步留任务证据/交接。

## Prevent repeated records and script growth

Batch repeated data/image work through one parameterized owner; validate representative samples, expand the batch, and inspect true exceptions. Reuse unchanged input hashes, image products and diagnostics. Keep bounded run results with input identity, outcome, failed/unknown obligations and links to raw output; never recursively embed prior reports, copy full source trees into evidence, or append every historical hash list to the next report.

Update the one current task state and finite review input set. Historical raw runs remain immutable local artifacts with a small locator/receipt; do not make a new code file, test, version and handoff per star. Promote a recurring check into the existing pipeline/test owner with a meaningful regression; freeze displaced one-off probes instead of maintaining competing executables. Context stores durable boundaries and rationale, not run transcripts or copied inventories.
