# Q2：完整外沿所需背景的成品几何复核

当前没有新合格背景可以关闭 NGC253 完整照片矩形/裸背景断层。普通 Prepared registry 保持空；弱外围、绝对配准、历史行星/目录星重复、跨源色彩及昼暮仍未通过。没有重跑冻结 PNG/JPEG、原 page 或加工图片，也没有恢复被排除的数据源。

本轮沿既有 ESO6k 与成熟实例线索，只读取新原始依据。复用原 `output/eso0932a-source-1005-r1/eso0932a.jpg`，未下载更高分辨率、清理图或替代观测。

- [HNSKY 作者的 SKY_TOASTER 工作记录](https://www.hnsky.org/toast_pr.htm)说明其 ESO0932a 实际接入遇到最高约 1° 畸变，曾用另一套天文参考图进行空间校正。因此“成熟产品使用同图”不能证明现图可直接用 Galactic UV；本项目不取得其 DSS/SkyView 参考或未经本项目权利核验的校正派生图。
- [HITS/ESO Supernova 固定 README](https://gitlab.com/HITS_Supernova/1007_milkywaypanorama/-/blob/2e2c35176b74c43634c3d18e3b41b2dd37ae9b4f/README.md)区分 MIT 代码、CC BY4.0 的 Brunier 清理图和展厅受保护的 Risinger 图。直接读取同提交 `LICENSE`、`WebGL/webgl_MilkyWayPanorama.html`、`WebGL/parameters.js` 与 `Dockerfile`：实际 HTML 在平面四边形上混合图片及叠层，未提供可供当前天球消费者复用的 WCS、球面配准参数或校正收据；Dockerfile 的受保护图片替换也不是本项目已获权输入。没有运行其程序或取得任何这类派生图片。清理过程与弱结构保护尚不明确，不能借该实例关闭图质。

原始文本、具体 URL/HTTP200、字节及 SHA256 留在 `output/eso0932a-product-geometry-1005-q2-r1/acquisition.json`。固定 HITS 提交 `2e2c35176b74c43634c3d18e3b41b2dd37ae9b4f`，实际 README SHA `bccd38f8aed9c07ad762b7623ead6bfb9c1d7179e0c9a6ed0c8507460ed0652c`、HTML SHA `4f54187f295de9abf52855cf3351c16fdfb5f164daad6a9da42c0bf4c2c1208a`；HNSKY 页面 SHA `b2bec8d07ee767b21f6c1eeea991ba084b3c640fb49bf5d60dbe7dbdd791670f`。这是来源记录及代码阅读，不是本地畸变实测或当前 WEAPP 输出。

决定：不重开 ESO6k 的直接 UV 接入，不按对象手抠/feather/删黑或造细节。Q2 保留明确输入依赖：适合完整外沿的合法、实际可取得、具有可信几何的广角/区域成品及其真实组合画面。现 Legacy 条带/饱和与 mask UNKNOWN、PS1/SkyMapper 的具体成品获取/交付边界不改判，不开启生产路径或通用巡天工程。该输入依赖不阻塞 E2 已有产物的本地实际静态出口/兼容保留验证；唯一执行顺序由 PLAN 维护。
