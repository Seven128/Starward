# B2 金星外观与共享相位模型核对

## 实际依据与决定

2026-09-28读取NASA官方 [金星可见光与紫外差异](https://www.nasa.gov/technology/nasa-studies-cubesat-mission-to-solve-venusian-mystery/)（2017-08-15）及[Venus Facts](https://science.nasa.gov/venus/venus-facts/)。可见光云层通常缺少明显纹理；紫外云纹、雷达地表不是当前普通可见光观测外观。这支持继续采用已有低细节几何相位盘，不构成任意显示RGB或暗侧亮度的测光依据，也不证明当前云况。没有下载或分发这两页图像，无新增纹理、外部收费或引擎。

现有sky-planet-disc→共享GPU phase路径已经从报告获取位置、视直径、照明分数和朝日方向。金星显示色EADFC7、共享0.045暗侧底亮和渐变都是显示选择，非实测自然真彩、绝对光度、大气散射或已知“灰光”。资料消费者新增NASA来源与这些局限，planet editorial修订到@7；其它行星的资料/来源规则不变。这是准确披露，不以文字代替尚缺的外观或目标验证。

## 同一机制的有界像素检查

新增可复跑任务脚本phase-disc-webgl-probe.mts，用实际imageVertex/moonFragment及实际环常数展开生产shader，环影关闭；56组合覆盖7个亮面比例（0/.05/.175/.25/.5/.9/1）、4个朝日方向和普通/暖红两种调色。独立按圆盘有效像素统计亮面面积和亮面质心朝向，不把单一中心像素当相位正确。GL无错误；面积绝对误差最大0.0031854（0.319个百分点），在r=200px一个像素周长约1%面积的离散/抗锯齿预算内，所有非满/新相质心朝向正确。

启动第一次因tsx evaluate的__name注入失败，第二次发现测试harness误用没有uv的artworkVertex；改为生产实际imageVertex和相同交错position/uv后全部通过。两次是探针错误，没有据此修改产品shader。结果与实际截图在ignored artifacts/miniapp/cloud-sky-native/phase-disc-0928/，已目视0.175亮面月牙；这是Chromium WebGL1检查，不是微信目标像素、光度模型验收或金星实时观测。

BFF现有资料与日月真实HTTP10项回归通过。客户端源码未因这次有界核对改变；weapp-check-sky-luminary-0928指纹继续有效，BFF资料须随下一真实验证服务候选更新。目标Android应按已有批次窗口约10:00及0.05°观察金星差异；不重复重建其它行星，也不继续无证据地细修土星。日月/金星与其它对象的源数据方向、光度/大气精度、手机手势/像素/资源、独立审查仍按原范围保留，不能凭这项检查关闭C05。


## 02:24 P1BATCH28C Android目标反馈
同代普通目录→资料PLANET:VENUS→定位；上下文为9月21日12:00，136.2°/35.0°。用户放大后受保护真屏见0.05°、end0/取消0和上右亮的弯月形盘面，低细节可见云面没有替换为雷达/紫外图。点击上部亮面打开同一金星资料，Android Back后仍0.05°及相位。此为Android单样本development_feedback，不是自然真彩、测光、精确相位面积/朝向或全平台验收。
B4差异：旧orientationTarget的“金星/136°·35°”标签仍覆盖已解析盘面，虽然locatedObject标记已隐藏。已定位真实消费者为visibleOrientationTargets；它只等待当前Canvas帧但未根据该帧实际绘成的planet hitDisc退让。修复须以同一已提交帧的实际盘面成功为依据，失败/缺图/未解析点状仍保留适用入口，列表不撤；不能仅按当前请求FOV或预测半径隐藏所有目标。与C离屏来源显示归同一批共享呈现修复，不逐颗改引擎/逐按钮重发。
