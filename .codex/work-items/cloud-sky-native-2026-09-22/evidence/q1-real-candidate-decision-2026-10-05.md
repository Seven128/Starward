# Q1真实非Messier与区域小样决定

本次只为可决定的来源/处理/最小合同输入，全部未采用、未发布，普通Prepared registry空。没有下载月面、重加工M82、逐图PSF或巡天框架。复用已缓存ESO6k，另外每个新URL只取得一次；源/请求回执/SHA全部保在output。原六目标、旧M51/M104/M82图质失败不改判。

## NGC 253：可进入有界直接TAN消费者试验

真实非Messier输入为[ESO eso0902c](https://www.eso.org/public/images/eso0902c/)公开large JPEG（8285×7510，8,339,408B，SHA76bd6fd768c6503e7b1c2092dad6efbb295f7725d5bdff54447443bf4dfd6fe6）。已查看原全图及全幅1024×928缩图，保完整斜置星系/弱外围与原照片恒星，没有照片裁框/抠黑/补细节。

嵌入AVM是ICRS/J2000、TAN、旋转-1.57086658389°；参考1280×1160，原尺寸两轴比例不同。复用现`prepared_rgb_observation`和已固定PyAVM0.9.9/Astropy8.0.1/Pillow12.3.0/NumPy2.5.3，完整解码、字节/原XMP/具体身份准入及既有empty-note适配均通过，没有改生产adapter。common-x CRPIX/scale约定原样保留，不能悄悄修成各轴比例，publisher绝对配准仍UNVERIFIED_APPROXIMATE_PUBLISHER_AVM。

`output/prepared-candidate-inspection-1005-r2/`绑定源码/库版本和真实输入。49方向的简单原TAN平面对成熟WCS逆变换最大3.62e-10源像素；再由现原生`registerSkyArtworkPlane`/UV owner消费同方向，最大3.03e-13 UV误差。这验证名义线性TAN责任，可避免为此类成品先重投影到新正北方形；没有验证实际GPU/全page/绝对astrometry或图质。

全幅同源缩图只各保存一次PNG与JPEG q92、4:4:4并保ICC。PNG949,252B，JPEG112,411B；decoded encoded-colour差均值.849、99分位6、最大45。JPEG字节小不是自动采用理由，亮星/弱结构、target decode/色彩/Scene边界还须Q2比较。两者不作测光/真实PSF产品。原RGB是H-alpha/R/V/OIII历史复合，波段/处理必须披露。

旧合同仅M:1–110、正北方形与三固定中心层，不能保本输入的非Messier身份、完整矩形/旋转/原像素中心。E1应最小扩身份/原几何/来源/有效性、迁真实发布/HTTP/file/Hook/Scene/source消费者，保旧合同/hash/URL；不能只改正则或先造通用WCS/巡天系统。

权利：[ESO政策](https://www.eso.org/public/outreach/copyright/)允许该具体图按CC BY4.0条件使用，原credit为ESO；后续需可见credit、source/license链接及改动说明、不暗示背书。Logo/受限800MP原作不在此输入内。本次未外联或索取更高源。

## Legacy区域：退出粗配置，保一份更细真实区域

观测层固定DR10，与当前viewer默认版本分开；`ls-dr10` griz和`ls-dr10-grz`控制各一份512×512、8.4arcsec/pixel、RA187.3/Dec12.3、约1.195°区域，均已查看，明显横向彩色拖带，当前显示配置REJECTED。没有建mask/PSF工程来藏缺口。

有新假设后只补一份同中心.8arcsec/pixel的`ls-dr10-grz`及其g FITS：`output/prepared-region-finer-control-1005-r1/`。JPEG39,426B，SHAc80ed9c0d3e31b78dc891ef10305f96a8a872b2761689d8fe019bbe816cccedf；FITS1,054,080B，SHA73f77cfdb3edfd2358917758f5ade9f99b4f2441e46e257564b6f0c4e32f2dc3。这只是约6.827角分小区域，不能用它声称修复原1.195°覆盖。查看结果无同类整排拖带，保实际饱和星伪影/彩色点噪声，仅适合下一消费者小样。

`output/prepared-region-inspection-1005-r1/`保原FITS header和输入/hash。CTYPE TAN、512、CRPIX256.5、CD为±.8arcsec/pixel；header没有显式RADESYS/EQUINOX，Astropy按FITS默认ICRS解释，不能冒独立绝对配准验证。g对JPEG blue的有界四轴翻转高通相关正确南北翻转.8564，其他约-.0047/.0051/.0033；现原生平面49方向UV误差1.93e-12。有限/零值不建立有效科学coverage；没有曝光/质量mask，availability仍UNKNOWN。

区域合同需要独立region identity/footprint/适用档/关联目标，不能强塞一个Messier对象或把g mask当RGB有效性。光学观测layer与model/resid含义分开。[DR10具体产品](https://www.legacysurvey.org/dr10/description/)和[图像授权](https://www.legacysurvey.org/acknowledgment/)限定这些Legacy制作层；可见credit应是“Legacy Surveys / D. Lang (Perimeter Institute)”，保活跃链接，不能泛化到所有viewer叠层。512服务限制不是需求上限，未建tile网格/全库下载。

## ESO6k：当前直接UV接入不采用

原`eso0932a.jpg`6000×3000、8,228,817B已复用。其XMP无可直接采用的WCS/投影/anchor，公共[来源说明](https://www.eso.org/public/images/eso0932a/)含历史Venus/Jupiter。合规候选不等于当前动态星空背景合格。

`eso6k-galactic-anchor-hypothesis.png`用既有目录M16/M31/M42和成熟Astropy Galactic坐标作最小方向试验。查看可辨M31/M42均偏离假定中心，现2MASS的Galactic equirect UV约定不能原样用于该照片。接缝均绝对差8.010、相邻列7.686，仅为统计，不能认证接缝/极区或校准。该直接接入候选NO_DIRECT_ADOPTION；保原公开6k文件，若取得明确publisher几何或有依据的成熟配准小样才重开。当前不扩分辨率、全6k常驻或用生成抹除历史行星。

因此Q1已有三个具体决定：NGC253进入名义直接TAN消费者试验；粗Legacy显示退出，更细小区域保条件输入；ESO6k当前直接背景接入退出。后两类的全天/外围/完整背景义务仍开放，不因小样成功关闭。Python3.10不兼容既有Astropy8固定依赖的尝试、首轮XMP Credit跨namespace诊断均保失败目录；后用本机Python3.12隔离环境执行现依赖，没有改月面环境或生产部署。
