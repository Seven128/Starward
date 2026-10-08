# C05 实体天体前景大气合成与自发光边界

当前晨/昼未受光月盘近黑覆盖原solarLight亮底反例已修。原同相机Rayleigh/Mie/晨昏/曝光显示函数抽到sky-solar-light-shader.ts；背景沿原调用输出，实际白昼underlay与旧bundle逐字节一致。真实Moon/行星纹理、解析相位回退及土星环只合成RGB，保持本体轴/实际片元坐标/phase/oblate/ring影几何、edge/环opacity及原PNG科学coverage/有效黑/中性缺测。成功同帧solarLight才供前景，begin及失败/无效调用先清，暖红显式禁用，Sun≤-18°沿旧路径。

先复用原renderer bundle、三保存月面参数/原PNG做有界变体，2诊断运行含1接口名错误退出；未新增构建/源图。候选晨/昼暗侧均值从约5RGB变为124/156/177与147/194/230，接近同方向大气底126/159/183与149/196/232。该screen显示是现参数复用，不是当地天气/校准辐射；原dark chart base和illustrative earthshine仍影响残余对比，完整图质不由8RGB小样门槛认证。夜间字节保持，真实后方绿色星点在opaque盘内差0；抠透明的故障变体漏星max231，被回归检出。

采用后原renderer实际GPU（无注入前景uniform或颜色）复现同结果；纹理缺失解析回退亦有前景，原body几何/源alpha不改。下一begin、无效Sun、强制solarLight绘制失败、暖红保持原路径，旧/新underlay字节一致。保存真实晨间完整星历经原skyPlanetDiscsAt/createSkyViewBasis驱动土星globe/ring，Sun-4.3104°、Saturn1.7826°，24258通道颜色变化；将两者只作白色几何mask的有界变体后RGBA差0，证明band/oblate/遮挡/opacity未随颜色改变。此项是保存真实输入的隔离GL，不冒实际page动作或精密测光。

实际普通页面首先补三月面时刻/来源Back/一暖红恢复，再复用同一bundle补白天Sun和Saturn（后者真实地下-65.5226°，前景按原horizonDisplay为0）。审图发现将同一screen出口套到自发光Sun不成立：原Sun是显示tint×limb profile，没有共同辐射/曝光单位；底约250/254/255时Sun最大对比130→5，几乎融入白底。保留中间source快照、页面/GL原图与反例。修正仅移除Sun新增前景出口和uniform，恢复原独立shader；反射body及ring源码全部字节不变。最终Sun隔离GL与旧完整RGBA差0，追加一个当前普通Sun页面/暖红恢复，实际核心5140像素与原renderer差0、对比130恢复。不以造HDR/太阳flux、增天气模型或删除亮底换取局部通过。

最终3实际page运行、14保存视图、224Scene/322请求；2page bundle构建（修正Sun后必要第二次），第一bundle用于其额外消费者无重复build。6隔离GPU运行（2prototype/1adopted/1ring/1Sun反例/1最终Sun），2renderer bundle构建，其它复用。三月面opaque区域actual与当前未变反射owner各差0；四暖红→普通恢复RGBA差0；实际核心拾取、Moon资料缺测/来源measured-area coverage/Back同Context，公共时刻恢复。普通入口无props/fixture关闭，Prepared空/HiPS关；backend真实默认图像服务/当前controller与测试weather/repository分清，不冒真实账号。

3既有产品文件(renderer/ring fragment/surface说明)+1新共享GLSL；精选源码120含1此前漏列的既有ring源及1新代码，不是新增两模块。WEAPP只原watch的detail JS/map两文件；无新纹理/FBO/buffer/cache政策或资产下载/加工，新增shader算术/实际GPU程序资源与物理帧时未量测。40相关检查/类型先通过；最终独立Sun修正后3Solar owner检查与类型通过，反射owner在修正前后源码逐字节相同，原37与实际Moon/环回归仍有源资格。不是重复全套矩阵或native验收。

准备清单漏既有ring、修复命令漏stdin dash、prototype错误point方法、几何mask优化掉未用uniform导致readback断言错误，均保原脚本/快照/失败回执；原服务未重启，3page browser/API与6诊断browser全部关闭，最终逻辑资源退休0，不冒物理峰/持久全盘0。原月面FAIL/中间Sun FAIL有历史证明，当前范围已开发修复；照片FAILED、旧10pxmax1 UNKNOWN、三暖54341B未全归因、DevTools/WXML/手机/完整33/全图质/权限/200DAU/独审MISSING继续保留。

见[最终读回](body-atmosphere-final-readback-2026-10-06.json)、[原GPU回归](../../../../output/playwright/body-atmosphere-product-1006-r1/result.json)、[太阳范围修正](body-atmosphere-solar-scope-correction-2026-10-06.json)。

唯一下一依赖：A1 C03/C09 普通图层组合与同帧消费者：C05晨/昼暗月盘覆盖大气的确认缺口已沿原solarLight显示计算修复，实体alpha/原PNG/科学缺测不变，真实纹理和解析回退/环共用同刻成功帧；夜间/暖红/无效失败/下一帧无残留，behind-star遮挡差0且alpha变体检出。实际普通525输入三运行14保存视图224Scene322请求，月面来源Back、月/日/环模式owner恢复严格RGBA差0；自发光Sun不适用反射体screen合成，近白对比反例已保原并恢复原独立出口，当前实际核心差0。3既有产品文件+1新共享GLSL、仅detail JS/map，2page build/2renderer build，40前修正检查及3最终Solar检查/当前类型通过；完整图质/native/独审不因此通过。唯一下一直接读现星座线名插画/网格地平辅助层的实际owner、采用资源和必要证据，复用当前普通bundle，补原公开图层按钮在两个有依据尺度/普通与暖红下的实际显示、图/名称/已绘拾取/来源与关闭恢复；先小样查当前缺口，不重播已闭天体时刻/全地景/校准/保粗矩阵，不先扩全部88视觉批次或重建控件。模式owner动作不冒完整设置手势；真实DevTools/WXML、Android-iOS新版月面、完整33项/其它日期精度与图质/真实账号/物理200DAU/独审仍开放。旧10像素max1 UNKNOWN、三暖54341B未全归因及FAILED照片保原，普通Prepared空/HiPS关、Mellinger仅低分辨率DISPLAY。Q1仅新合格覆盖几何权益再开/ESO6k退出，P1仅新具体callback/window/rehydration证据再开，不重复初始化/SDK/log或重启服务。Goal active无预算，无提交推送采购部署发布外联。
