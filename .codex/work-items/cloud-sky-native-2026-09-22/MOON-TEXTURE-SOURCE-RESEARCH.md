# 月面纹理来源与实现边界（2026-09-23）

当前 C05 月球已有观测者视直径、照明分数及朝太阳的相位球面。商业版只采用无需逐项新授权、公开条款已覆盖实际商用加工/分发方式的来源。2026-09-23 起，另有 USGS Clementine 灰阶月面图在普通模式下可选加载；资料缺失、下载或 GPU 失败时仍绘原纯色月相盘。

## 来源决定

- [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720)提供2025年LROC WAC来源的2048×1024 JPEG（447.2 KB），看似适合WebGL；其页面明确从ASU相机团队WAC Hapke拼图加工，并列NASA SVS/USRA贡献。NASA[一般媒体指引](https://www.nasa.gov/nasa-brand-center/images-and-media/)允许不暗示NASA背书的事实性使用，但不能覆盖上游更具体的限制。
- [ASU LROC使用条款](https://lroc.im-ldi.com/about/terms)明确：通过LROC PDS档案提供的数据产品为public domain；非PDS档案下载的LROC影像商业使用须事先许可。CGI Moon Kit JPEG不是PDS档案原件，故**不收入商业包或自托管发布**，不把NASA页面免费JPEG视为已获权。需要另选PDS原数据/其他明确公开来源。
- [USGS Clementine UVVIS 750 nm全月拼图](https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m)标明 public domain、无访问限制，另见[USGS 公有领域与署名说明](https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted)。完整 v2.1 GeoTIFF `https://planetarymaps.usgs.gov/mosaic/Lunar_Clementine_UVVIS_750nm_Global_Mosaic_118m_v2.1.tif` 的 HEAD 返回 HTTP 200、Content-Length **4,247,470,871 bytes**、Accept-Ranges bytes；未下载这份大文件。[USGS WMS 图层目录](https://astrowebmaps.wr.usgs.gov/webmapatlas/Layers/maps.html)还列有 `uv_v2` 的服务，GetCapabilities 将其描述为 `Clementine uv750 Global Basemap v2 Mosaic`，BBOX `[-180,-90,180,90]`、EPSG:4326、JPEG 可用。v2 WMS 不等同于 v2.1 TIFF，不混称版本。

## 已采用的固定小幅出版物

- 从上述 USGS WMS `uv_v2` 按 EPSG:4326、全经纬 BBOX、2048×1024、JPEG 导出一个**固定拷贝**，完整 GetMap URL、经纬方向、SHA-256、处理说明和限制见 `workers/miniapp-api/assets/moon/manifest.json`；源副本在本任务 `sources/moon-clementine-uv750-usgs-wms-2048x1024.jpg`。成品 **372,399 bytes**，SHA-256 `e071f796a1ec1f7c9f4d87660aabb1bb40adbfacc0ecb253919bee6c711efefb`。普通模式仅同源发布此哈希绑定文件，不在运行时代理 WMS，也没有采用 NASA SVS/ASU LROC 现成 JPEG。
- 影像是 1994 年单波段 750 nm 的灰阶镶嵌，包含源极区空洞、WMS 重采样与 JPEG 伪影；不是自然彩、实时图、实测可见光亮度或高精度地形。客户端保留 USGS 署名、产品/条款 URL、机器可读清单和视觉限制；容器也带独立 NOTICE。
- 生产 BFF 以天文报告的**同一观察者和时刻**输出 IAU 月球北极及零经线的 ENU 轴。客户端按当前相机在月心反投影得到屏幕切向，将可见月球球面换到本体经纬，再采样 WMS 等经纬图；太阳方向及照明分数仍沿现有相位模型。服务端用 Astronomy Engine `Libration` 作独立地心方向核查，两地 topocentric 轴不相同。旧报告无轴或错误轴回退纯色月相盘。
- 已通过完整 Mini/BFF 单测、类型检查、隔离 WEAPP 构建、BFF 同源 HTTP 与生产镜像内的 SHA/模块读取。开发者工具原生 WEAPP 模拟器在示例点 2026-09-22 21:00、手动 2.6° 视场看到可辨月海和正确盈凸暗侧；网络面板里 manifest/JPEG 都为 200。此为桌面/fixture 证据，不证明 Android/iOS Canvas 与普通控件合成、实际纹理方向的独立实测精度、GPU 峰值、帧耗时或云账单；手机仍未占用。

## 实现入口与尚需验证

`workers/miniapp-api/src/astronomy-engine-adapter.ts`对同一时刻/观察者计算月球几何。锁定的 Astronomy Engine `RotationAxis(Body.Moon, at)`给 IAU J2000 北极及自转角，`Libration(at)`给经纬天平动。2026-09-22T13:00Z 初始探针推得地心次地经度约 -3.5909°，与 `Libration.elon=-3.5905°`吻合；当前定向测试还检查两个观察地点和不同时刻，不能把地心探针当成完整表面精度证据。

`sky-moon-disc.ts`、`sky-phase-disc.ts`、`sky-gpu-renderer.ts`共享角尺寸和相位；`sky-gpu-textures.ts`统一管理 native WebGL 纹理，默认缓存预算 16 MiB。2048×1024 解码 RGBA 约 8 MiB；完整 W3 层约 12 MiB，缓存可逐帧淘汰但上传峰值、设备帧耗时和实际流量仍要量测。DevTools 像素已可见，Android/iOS 与独立精度/性能审查保持开放。
