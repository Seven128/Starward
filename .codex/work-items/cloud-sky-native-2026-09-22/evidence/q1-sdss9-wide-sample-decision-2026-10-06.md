# SDSS9有限广角原成品：原样粗阶配置退出

9张order1原JPEG共429,709B，全部HTTP200、完整RGB 512×512解码；全图逐一查看。当前原样低阶配置因重复彩条和扫描痕在出版前退出。没有新出版、page/Scene、构建或产品源码变化，实际45°光栅仍UNVERIFIED，不把原图检查冒页面失败。此决定不否定所有SDSS区域、层阶或旧SkyServer目标成品。

## 空间覆盖与实际相机

CDS具体产品为CDS/P/SDSS9/color，g/r/i对数显示及特定cuts，不同于原SkyServer颜色。复用已封存的公共M51定位已绘相机（2026-10-04T13:00:00Z、390×844），以当前Astronomy Engine frame owner和已绑定同版本正式地点fixture重建变换。中心[202.46962499987913,47.19516666602423]度与产品M51初始方向一致。改变FOV仅为需求规划，未称本轮实际页面运行。现选择器45°取order1 [3,5,7,8,9,10,11,15,27]；8°取order3 [166,167,169,171,172,173,174,178]。

原Moc.fits一次读取2,998,080B、747,497项，HEALPIX/NUNIQ/C/order12；文件DATE=2016-05-31T16:15，只有空间UNIQ，没有时间坐标。注册记录另标ST-MOC及历史时间，不能把当前模拟时钟按这份空间文件过滤。实际空间面积fraction=0.35617051521937054，记录约0.3562、properties=0.3625及日期差异分别保留；不能据此承诺影像精确同版科学支持。45°视口名义MOC内325,096/329,160（98.765342%），4,064在外；8°名义内329,160/329,160。MOC只证明名义空间覆盖，不是实际mesh/像素mask、完整图质、绝对配准或科学支持。

## 原像素决定

5/7/10/15存在明显重复彩色条组；8/27有平行扫描尾迹；3/7/9/11/15有广阔黑区域/锐利边界。9格均按原字节保存，无颜色修改、补洞、生成、alpha或逐图PSF。每格编码黑/白数量只记编码，JPEG没有alpha，不能推断黑必为missing或科学零值。45°投影会呈现多少条带/边界尚未测；原样产品格已有足够准入反例，因此不为这套失败配置新增消费者或缓存。

原文件、headers、单次请求与SHA：output/sdss9-wide-source-1006-q1-r1；空间文件：output/sdss9-moc-source-1006-q1-r1；历史相机/现选择器/高阶视口cells/空间MOC结果：output/sdss9-supported-m51-plan-1006-q1-r2；完整解码/逐图观察：output/sdss9-wide-inspection-1006-q1-r1。旧错误的相机规划r1（从formal context错误读取fixture及错误frame参数）和日志保留，r2明确修正来源，未掩盖失败。

下一唯一依赖：Q1 SDSS9/M51有限8°区域原成品小样：当前9张order1原JPEG共429,709B有彩条/扫描痕及黑边界，原样45°配置在出版前退出，实际45°光栅未运行，不能冒页面失败或全SDSS否决。下一复用已封存实际公共M51相机、现选择器的order3格[166,167,169,171,172,173,174,178]与原MOC读回，先核已有缓存再取必要原图，快速判断8°区域用途；不重取9粗图/MOC、修像素、把黑作missing或扩大阶/方向。适用才用现合同精确rights/标准出版/page/Scene，粗阶退出不能拿8°成功替代广角义务；不建通用框架或重启PSF。SDSS公开数据/图片与CDS派生ODbL分开，普通Prepared空/HiPS关，不以六/51或该区域封顶。PS1条件结果/静态冲突修复及既有Mellinger银河DISPLAY保；Legacy粗阶、ESO旧直接UV、受保护Risinger及排除源不重开。P1独立，无新控制面原因不循环SDK；暖回/Back缺口、科学UNKNOWN、完整图质/Android-iOS/月面/容量/公開合规/独审与33项开放。Goal active无预算，不提交推送采购部署外联。

下一8°仅检验真实区域用途，不替代广角覆盖和完整体验；不用当前科学UNKNOWN来生成支持mask。此前PS1原44图条件效果和静态prefix修复保持；既有Mellinger只守银河DISPLAY。普通Prepared仍空、HiPS仍关闭；原服务/watch不重启、现WEAPP不重建，六项设置/outbox及原33项验收行保留。Android/iOS、新月面、DevTools、全部图质、物理资源/200DAU、公开交付及独审尚未完成。

[CDS具体记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSDSS9%2Fcolor&fmt=html&get=record)与[SDSS公开数据/图片政策](https://www.sdss.org/collaboration/image-use-policy/)原响应沿用output/sdss-wide-next-primary-1006-q1-r1；数据公开政策、图片署名与CDS派生库ODbL分别承担。此轮无公开发布采用，不凭机构泛化承诺完整合规。Goal active无预算，未提交推送、采购、部署或外联。
