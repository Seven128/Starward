# Q1/Q2：缓存细区域的真实覆盖界限

当前细Legacy区域不能用来填M87/NGC253/M82的完整照片外围。复用原JPEG/g FITS、OpenNGC扩展目录和普通M87 SDSS manifest，只读取header/元数据，未新下载、加工、修改像素、发布或注册。实际脚本与前后7个输入pins见 `scripts/audit-cached-region-footprint-2026-10-05.py` 和 `output/cached-region-footprint-1005-q1-q2-r1/result.json`。

Legacy区域名义中心RA187.3°/Dec12.3°、512×512/.8arcsec/pixel，宽6.8266667′。Astropy以原TAN header按默认ICRS解释；原header没有RADESYS/EQUINOX，绝对配准与science有效性仍未验。名义WCS把实际目录中心映回该矩形：M87相隔24.4117703′，M82相隔3733.7476833′，NGC253相隔9978.5284520′，三个中心都在区域外。远离TAN适用半球的非有限坐标保null，不编位置。

M87当前普通SDSS OV中心为RA187.7059166667°/Dec12.3911111111°、512/1.6arcsec/pixel，名义宽13.6533333′。用其公开display几何的四角和中心作有界覆盖检查，五个点都不在缓存细Legacy区域。这个检查是名义显示足迹，既不是JPEG科学WCS/曝光mask、整片图质，也不把D25或当前13.653′当真实弱外围上限。此前1.195°粗Legacy配置已因拖带退出；.8″小区域图质较好不能冒原大区覆盖已经修复。

决定保留原细区域作为自己的独立region，沿E1原TAN/region/缓存/Scene消费者复用，不借M87天体身份或把region当可点选目标。不重跑E1暖回/source矩阵、不扩大通用巡天框架。

下一有新输入假设：以实际M87目录/照片中心取得一个**真实覆盖该目标及其现OV范围的观测区域小样**，先核具体Legacy产品、返回header/footprint、全幅/外围/饱和/颜色与最小处理决定，再考虑条件出版/同源LOD。试验视域由实际需求足迹驱动，接口尺寸和旧.8/1.6/8.4配置不是需求上限。新Legacy区域不能直接充现SDSS/Hubble同母父层，跨源意义/颜色/过渡须单独决定；没有新的合格coverage不能以银河图或生成细节补洞。

这一输入假设只归唯一[PLAN](../PLAN.md)。普通Prepared registry仍空，一般背景/完整外围FAILED、science/绝对配准UNKNOWN/未验、DevTools/Android/iOS/独审/资源/生产仍保。此缓存覆盖检查不认证全天或其它目标覆盖，不重启PSF、ESO6k直接UV或旧粗配置加工。
