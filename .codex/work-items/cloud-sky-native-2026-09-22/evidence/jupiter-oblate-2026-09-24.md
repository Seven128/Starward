# C05 木星扁球轮廓：非手机检查点（2026-09-24）

## 决定与输入

- 官方 [NASA NSSDCA Jupiter Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html)给出 1-bar 赤道半径 71,492 km、极半径 66,854 km、体积平均半径 69,911 km。本轮仅把这组静态形状常数接入既有行星几何。
- [NASA/JPL 3D 木星历史图](https://science.nasa.gov/3d-resources/jupiter/)已有任务内权利/字节候选，但尚无足以确定其本初子午线像素、左右经度方向及当下云系位置的证据；见 `../PLANET-TEXTURE-SOURCE-RESEARCH.md`。本轮没有把它加入生产资源或绘制路径。
- 旧设计稿已由用户宣布失效；本轮没有以旧稿判断画面。

## 改动及责任链

- `astronomy-engine-adapter.ts` 为木星提供报告同刻、按光行时在发射时刻求得的本体轴，再转到接收时刻观察者 ENU；`SkyPlanetGeometry` 允许木星的可选 `bodyFrame`。报告时间轴缓存版本升到 v13，避免旧行复用。Mini 校验器只降级无效可选轴，不丢失仍有效的位置/相位。
- `sky-planet-disc.ts` 复用土星的扁球投影：按木星 1-bar 赤道/极半径形成随极轴方向变化的椭圆，使用已有相位 shader 和同一轮廓的点选命中；临地平线候选按赤道边缘计算。没有调用固定影像加载器，也没有为木星产生表面 UV。
- 报告来源和木星资料页分别附 NASA 尺寸引用。资料页清楚说明无配准云图，不表示当前大红斑经度或自然真彩。产品/架构 Context owner 记录此边界。

## 检查

- 修复前新增针对无效木星轴/扁球外形的定向测试失败；修复后 `sky-planet-disc.test.ts` 10/10（含旋转后短轴、极轴正对、轮廓边缘点选及几何地平线）、`sky-report-planets.test.ts`、`astronomy-golden.test.ts` 定向通过。
- BFF 全量：365 通过、11 跳过、0 失败；合同全量 29/29；Mini 全量 826/826（最终仅再加一组木星地平线断言，相关测试随后 10/10）。三包 typecheck、SDK 生成检查、Context validate、`git diff --check` 均退出 0。
- `../jupiter-oblate-composition-probe.mts` 使用实际 Astronomy Engine 样本进入 Mini 正式几何、scene 绘制调用及点选路径。广州 23.1291°N/113.2644°E、20 m、2026-09-22 20:30 UTC：木星方位 79.421955°、高度 16.758361°、角直径 0.00890894°；390×844、0.15° FOV 下平均半径 25.0638 px、长半轴 25.6306 px、短半轴 23.9679 px，scene 提交木星且中心点可选。该 probe 是 Node 组合，未观察微信原生 GPU 像素。

## 开放边界

历史云图仍须证明图像经纬配准、标示其代表性年代和时变限制；本轮不承诺木星大红斑精确位置。微信原生球面像素、控件合成、Android 真机性能/点选、图像完整性、产品最终独立审查未完成。用户当前仍使用 Android 和其微信开发者工具窗口；本轮未占用该设备、窗口、共享 8787 或活动 WEAPP 构建目录。Goal active。
