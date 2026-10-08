# Legacy有限广角原成品小样：当前配置退出

当前NGC891/45°配置在原图准入阶段退出，尚无新出版、actual page/Scene运行或普通采用。不是否定所有Legacy产品/更细区域。Goal active、无预算，完整体验仍未完成。

复用前轮三份原metadata及实际相机/现选择器的12个order1格：[0,1,2,3,7,11,13,15,17,19,22,23]。缓存核查未找到此前Legacy同格，实际从指定CDS主站取得12原RGBA PNG共1,401,148B和一份Moc.fits，各HTTP200；无旧图重传、颜色加工/补黑/生成。512是本产品tile大小，不是需求上限。

已查看Npix0/1/2/3/17/19/22原完整512图。0/2/22大面积透明外沿和锯齿彩带，1/3近全透明；19明显绿斑及边沿，17虽无透明仍有底色变化。当前直接低阶广角显示图质FAILED，缺测不能拿200或PNG矩形冒连续背景。12图均RGBA、alpha仅0/255；alpha0像素与编码黑数量在该样本相同，opaque black为0。它只描述该样本显示编码，不能推断其他输入有效黑必为缺测，或把显示alpha冒科学mask。

原MOC共71,179 UNIQ项，ORDERING=NUNIQ、COORDSYS=C、MOCORDER=11；解到order11有界区间并合，名义全天面积fraction 0.6733927329381307。复用实际390×844相机和原projection/unproject、healpix-ts对45°每个视口像素中心查询：20,903/329,160在MOC内（6.350407%），308,257在外。此为名义覆盖，不是实际mesh/source-alpha、绝对配准、完整科学支持或原生输出。原PNG透明范围另记，未拿MOC给alpha造mask。不同低阶样本视场不能从全库67%面积猜“应有覆盖”。

输入/原响应：output/legacy-wide-source-1006-q1-r1；每图原URL/headers/请求退出码/字节SHA保留，原MOC也在内。measure-legacy-wide-moc-2026-10-06.mts复用当前projection/成熟HEALPix，readback-legacy-wide-moc-2026-10-06.py复用原Astropy/Pillow，不安装新库；output/legacy-wide-camera-moc-1006-q1-r1保精确相机、高阶cells、结果/输入pins。普通Prepared空/HiPS关；产品源码、旧图片、current WEAPP及原服务没有变化，未为此失败输入扩缓存或构建/发布消费者，未重跑旧HTTP/SDK/矩阵。

下一唯一依赖：Q1 SDSS9加工HiPS已覆盖方向小样：Legacy当前NGC891/45°原PNG配置因大片透明缺测/色块退出，12图1,401,148B；名义MOC仅20,903/329,160视口像素中心，非科学支持。下一复用现HiPS选择器/合同/page/Scene，以CDS产品声明的M51方向及实际公共M51定位相机先核缓存和MOC/ST-MOC含义，再取必要粗阶原JPEG作图质决定；原像素不修补、有效黑不作missing，适用才精确rights/标准出版/实际消费者，不先扩大阶/方向或建框架。SDSS原公开数据/图片与CDS派生ODbL分开，非全天或生产采用，不把当前六/51样本封顶。PS1原44图条件结果及静态冲突修复保；旧粗Legacy cutout、ESO直接UV/受保护Risinger和排除源不重开。普通Prepared空/HiPS关；P1独立，无新控制面原因不循环SDK；现暖回/Back缺口、科学UNKNOWN、完整图质/设备月面/容量/公开合规/独审及33项开放。Goal active无预算，不提交推送采购部署外联。

[CDS SDSS9具体记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSDSS9%2Fcolor&fmt=html&get=record)提供2019版equatorial、512 JPEG/order10、约35.6%名义面积及M51初始方向；这份CDS g/r/i对数显示不同于原SkyServer成品，不能继承旧JPEG图质通过。其metadata标ST-MOC，需要明确空间/时间语义，不能将其当本轮UNIQ MOC盲读。原record/properties及[SDSS图片/公开数据政策](https://www.sdss.org/collaboration/image-use-policy/)保存output/sdss-wide-next-primary-1006-q1-r1，候选图像下载0。原图与派生库权利分别履行，不凭机构泛化或使用受保护/排除源。一次额外公开检索未找到可直接取得且权利/几何均合格的Risinger独立成品，不获取含DSS视频、受保护展厅图或重跑ESO旧畸变输入；既有Mellinger只守银河DISPLAY角色，不冒一般外沿底图。

PS1已知暖回45°及Source Back空窗保FAILED/软件时态，其他斜边归因UNKNOWN；DevTools、Android/iOS、新月面、完整图质/绝对配准/公开发布/真实引用/物理资源和全小程序200DAU仍未验。修后独审MISSING，全部33项验收行保持，六项Settings/outbox不动，无提交推送采购部署外联。
