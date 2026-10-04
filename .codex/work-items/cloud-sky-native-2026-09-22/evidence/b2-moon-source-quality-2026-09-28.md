# B2 月面源质量：先区分原始缺测与WMS输出

当前生产资产 `workers/miniapp-api/assets/moon/clementine-uv750-v2-wms-2048x1024.jpg` 的近侧中低纬黑色矩形/短条已实际查看，B代月球0.99°手机也可见。仅称“polar gaps”不足；不能将矩形当真实月面，亦不能涂抹补出虚构地貌。当前尚未改原始资产、月面着色或图像出版版本。

这不是重开月面全部选型。先核已采用USGS/Clementine同来源产品及缺测语义；NASA CGI Moon Kit/ASU非PDS授权的已拒绝原因仍保持，未启用任何新付费来源。

## 2026-09-28有界获取结果

[USGS产品入口](https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m)在web直接读取返回403，官方搜索索引仍给出v2.1文件；这不是v2.1质量已通过。随后直接对该[正式GeoTIFF](https://planetarymaps.usgs.gov/mosaic/Lunar_Clementine_UVVIS_750nm_Global_Mosaic_118m_v2.1.tif)作HEAD：200，Content-Length 4,247,470,871 B，Accept-Ranges bytes，image/tiff。没有下载整幅4.25GB文件。

任务探针 `moon-source-tiff-metadata.py` 限制单个Range≤16KiB、总元数据≤128KiB、单请求15秒，强制206及精确Content-Range。初次Python默认User-Agent被403；普通User-Agent后成功，但文件为BigTIFF，初始classic-only探针拒绝，补充BigTIFF字段读取后取得结果。它是任务元数据检查，不进入产品或充当图像加工库。

本次实际元数据响应共372 B；一个IFD、无SubIFDs或后继IFD：

- 尺寸92160×46080，单通道8bit无符号。
- Compression=1（无压缩），Photometric=1（BlackIsZero）。
- RowsPerStrip=1；GDAL_NODATA明确为字符串`0`。

这些字段证明v2.1存在明确零值缺测语义，**尚不能证明当前WMS黑块全部对应v2.1缺测**，亦不能将JPEG压缩后的近黑像素一律删去（真实低反照率区域需保留）。未测实际v2.1像素、投影与当前WMS差异，未把更大文件等同更高质量。

## 03:01 原始像素与透明导出核对

`moon-source-tiff-metadata.py --sample`已完成；完整数据在`b2-moon-tiff-samples-2026-09-28.json`。累计响应体3735 B，其中元数据791 B；已读取地理变换和8个黑块/相邻对照点的逐行原始像素。四处JPEG黑块中心(866,492)、(1038,461)、(1183,646)、(1883,682)映射至原GeoTIFF后，各45个水平像素全为明确NoData=0；相邻有效对照每处45像素均非零。这证明这四处缺口源于原始缺测，不代表全图掩码或所有黑色地貌。取样是一维短线，不是假称45×45区域完整验证。JPEG压缩后的黑块可能为0–15，不能统一阈值删除。

同一WMS请求只改PNG与TRANSPARENT=TRUE，得到2048×1024、2,083,099 B、SHA256 `18ad9a0fceed3299958f02e2631c7ff35ec950901cc0bad9dbd791b7151b11b1`候选；`moon-wms-alpha-probe.py`限制一次请求45秒/4MiB，响应验证后保存。实际查看并用`moon-jpeg-samples.cjs`读取像素：全部2,097,152个像素alpha=255，四个缺口仍在，因此**拒绝作为缺测修复直接采用**。原始PNG及`b2-moon-wms-alpha-2026-09-28.json`、`b2-moon-png-samples-2026-09-28.json`留任务证据；生产JPEG未替换。

共享`bodyTextureFragment`已支持透明像素回退基础盘面，可复用；缺的是可信的空间有效性掩码，而不是新球面引擎。不得用AI补洞、近黑阈值或相邻纹理制造月面。

## 已实现的说明修正与兼容

生产manifest的publicationId改为20260928-metadata，限制明确中低纬/极区原始缺测及黑矩形非地貌/当前阴影；NOTICE、对象资料、页面来源面板同步。图片文件/哈希/尺寸/编码及原生贴图仍不变。旧manifest hash `ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6`的不可变图片URL在Moon owner作精确兼容，仍经相同字节校验；任意未知hash不放行，未来换图不得复用此别名。未修改其它图像owner或宣布月面质量完成。

Moon真实HTTP新旧地址同字节、未知hash拒绝、损坏图片在两个地址均拒绝等3项通过；Mini真实生产清单兼容与原有约束2项通过，BFF资料7项及真实日月搜索/资料来源失败恢复/HTTP消费者3项通过；Mini/BFF类型检查通过。首次从根目录合并跑BFF测试因未加载workspace装饰器设置失败，切回BFF workspace原命令后通过，不是产品修复。隔离WEAPP构建`sky-moon-metadata-0928`通过（16.406秒、3项既有警告，日志`b2-moon-metadata-build-2026-09-28.log`）；此本地检查使用默认loopback API，不投递给手机。Context校验与git diff --check通过（仅已有换行提示）。新文案仍待下一集中手机候选，D代保持现有金星证据，不冒称已含本次源码。运行中15053服务未重启，其缓存不作为新清单证据；实际新旧HTTP检查使用测试内独立服务。

## 下一项与成本边界

下一步评估同一原始源以成熟栅格工具进行NoData-aware缩小/有效性掩码出版的本地获取与加工预算；无内建overview且4.25GB未压缩，先核已有工具和可控获取途径，再决定完整下载或精确区域读取。取样/透明WMS捷径已完成，不重复研究。未来成品需保留有数据区域、明确无数据基础盘面，完成版本兼容、Mini解码和实际GPU输出检查；这仍不能虚构缺区地貌。月面质量保持开放。

本次尚无新增商业授权费或外部部署。HEAD/Range只是本机获取成本的一个样本，不等于加工、云存储/流量或Agent现金为零。P1BATCH28D保留当前已验证金星批次，月面后续改动集中进入下一候选。

工具入口补记：PATH没有gdal_translate/gdalinfo，普通Python为3.10；已有`data-pipelines/terrain/publish_copernicus_dem.py`及任务`terrain-horizon-probe.py`可继续核其已配置栅格运行环境，不因PATH缺命令就宣布无成熟工具。未安装任何新依赖或开始全图下载。

## 03:13 真实源加工推进（下载仍运行）

已在ignored `output/moon-source-cache/venv`装Rasterio1.4.4/GDAL3.10.3、Pillow12.3.0、NumPy2.2.6；没有改bundled/global Python。1MiB探针7.476秒，16MiB探针5.509秒，后者约3.045MB/s；E盘可用约1.44TB。决定获取已采用同源4.25GB原图，不重启数据选型。`curl`从已取得16MiB续传到`output/moon-source-cache/clementine-v21.tif.part`，进程exec session **84986**，max-time1800秒，45秒低于1KiB/s会停止；当前需继续poll同一handle，文件增长不等同下载已完成。完整后先核终态、4,247,470,871 B及SHA，再以成熟GDAL解码加工；不把.part当完整源。

新增生产工具位置`data-pipelines/planet-textures/{clementine_moon.py,publish_clementine_moon.py,requirements-moon.txt,test_clementine_moon.py}`，当前只产生候选，未更改正式纹理/合同。单块45行约4.15MB、输出RGBA8MiB、GDAL缓存上限32MiB；总进程峰值尚未实测。地理校验为Moon R1737400等距圆柱、零旋转、正东经、±180/±90范围；不将地球坐标套用月球。精确45×45非零样本均值、源测量面积比例alpha、无拉伸/补洞；完整无测量输出拒绝。已有5项测试通过，内存有界变异把NoData也判有效后真实缺测检查失败（日志b2-moon-coverage-mutation-2026-09-28.log），没有临时改共享源码。

真实WebGL复用探针`moon-coverage-webgl-probe.cjs`已准备，尚未执行，等待真实PNG。它将对实际renderer输出与同源像素/明确几何公式比较，并要求全缺测处与普通球面相同、有测量处仍有纹理。浏览器层不能代替Android。03:09设备doctor仍0无线设备，无待答手势，继续此独立数据项。

## 03:19 已取得完整源与真实候选

下载session84986已退出0（HTTP206，续传4,230,693,655 B，489.139秒，平均8,649,263 B/s），最终完整大小4,247,470,871 B，与官方一致。已将本任务.part重命名为`output/moon-source-cache/clementine-v21.tif`，不再重启或继续该下载。完整源SHA256 `51b2367ecbcc939c03a92297ecff7e35c592b17c12141e4ff152dd7e30459120`已固定在出版脚本。仅头部手写元数据探针未用于图像加工；全部像素由Rasterio/GDAL读取。真实加工session12662已退出0，无遗留下载/加工进程。

候选`evidence/moon-clementine-v21-coverage-candidate.png`：2048×1024 RGBA，1,595,187 B，SHA256 `ba7b9eef33d3e4d25c251f79641c39ea5526c35edb5c262eecffb3dea67b23f6`。原始有效像素4,191,866,867；输出11,540像素全缺测、57,499部分覆盖，其余完整。源尺度每输出像素45×45，无重新投影、插补或亮度拉伸。加工19.656秒（含完整源哈希核对），Windows GetProcessMemoryInfo测PeakWorkingSet 111,398,912 B。这是本地加工资源，不是手机或云用量。源/候选/参数在`b2-moon-coverage-candidate-2026-09-28.json`。

共享WebGL的首个真实候选数值正确但目视出现白色缺口，未直接准入。Moon调用现有bodyTexture绘制时将透明缺测的fallbackTint设为均匀半亮度`#6F7175`，接近实际完整覆盖像素中位灰42对应的显示水平（.3+1.2*42/255≈.498），不是推断当地地貌/反照率。相位照明仍计算；普通无图盘面和旧opaque JPEG、其它行星不受该参数变化影响。缺区仍能见平色标记，没有制造月面细节。

实际renderer/PNG独立CPU采样对照461,352通道：p99误差0.495/255、最大2.658/255；42个全缺测采样与统一灰阶几何基底最大误差0.500/255；140,875个全有效像素与无纹理盘面明显不同。截图已实际查看：`artifacts/miniapp/cloud-sky-native/moon-coverage-0928/moon-coverage.png`；旧白块对照同目录`moon-coverage-white-fallback.png`。内存中将灰色参数恢复旧白色后缺测断言失败，日志`b2-moon-white-fallback-mutation-2026-09-28.log`，未改共享源码。首次探针相机左右手性无效导致renderer拒绘，已改为产品有效basis后验证；没有通过改产品放松相机检查。23项实际月球/行星场景测试及Mini类型通过；本轮WEAPP隔离构建sky-moon-coverage-0928通过（18.402秒、3项既有警告），日志b2-moon-coverage-build-2026-09-28.log；未投递手机。5项加工测试在锁定真实源SHA后复跑通过，git diff --check通过（已有换行提示）。

**当前唯一下一项：** 将已核候选接版本化Moon出版/合同/Mini解码及来源消费者，保留旧JPEG客户端和原哈希路径；清单须明确原始GeoTIFF、coverage alpha、固定灰色缺测示意与历史单波段属性。沿用现有图片生命周期/预算/失败恢复，完成真实HTTP新旧合同及GPU/消费者检查后集中投递，不让旧客户端误收PNG合同。不能先替换现有JPEG文件或沿用旧schema掩盖编码改变。Android仍待连接，最近doctor为0；D代金星证据保持，M51来源目标验证仍待。Goal其它范围不变。
