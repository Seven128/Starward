# 成熟局部 PSF 匹配：未采用，不扩全图

Goal active、无预算、未完成。实时分支/HEAD、r36所绑173项源码/保护身份及原BFF/watch进程已核；新试验没有改生产代码、当前完整候选、科学输入、alpha/recipe、registry、产品依赖或服务。B完整图质仍未过，不能以本地处理成功关闭。

## 方法与真实材料

复用隔离离线Photutils3.0.0，[官方 matching 说明](https://photutils.readthedocs.io/en/stable/user_guide/psf_matching.html)要求同网格/尺度的PSF；[Wiener API](https://photutils.readthedocs.io/en/stable/api/photutils.psf_matching.make_wiener_kernel.html)提供带正则化的Fourier比值，较窄源向较宽目标匹配。使用一次默认scalar regularization=1e-4、penalty/window=None，不做参数搜索/新库安装。官方规则不认证本项目PSF真值或具体参数质量。

两实际位置为原87响应中的10（较孤立紧凑形态）和84（extended/混合RUN）；不认证恒星。保存目标响应中央31²共同完整有限，归一有限模型和，原sum约0.979–0.982而非总通量。原signed PSF不截负；仅正core半径6的r50用于参考宽度诊断，最大者g（并列按g/r/i稳定顺序）。把该模型用明确sigma1 target-pixel/7² Gaussian再展宽，得到共同31²有限目标；这是一次试验的模型分辨率设置，不生成天体/科学影像、不采用产品分辨率，也不证明所有频率/全场都更宽。

实际原科学coadd 91² halo供应61²输出：SciPy真实`valid`卷积，不mirror/wrap/图像零padding。所有31²真实邻域都满足原科学joint有限与已保存native-camera/processing/fpM资格才修改显示试验值；不足全部保原。current非线性estimate只作同recipe对照，没有用原science PSF对它再滤或反卷积。三个比较均用同母图已解析的Lupton stretch/Q/零minimum，局部fit=0、gain/sky/shift=0。

## 实际结果与否决范围

[结果](../../../../output/mature-psf-matching-1003-r1/result.json)6749B，SHA256 `111bf76315875abba36467c34627a2ff50d3a1e79e1f59757dd27c0277f1d5b3`，0.454秒离线（含哈希/保存，本机非生产性能）。单field位置10实际改2734、保原987像素；双RUN位置84改890、保原2831。中心两者均实际修改；半径12共同core分别441/441和224/441被处理。未处理部分不是科学零值；84整个core不能冒一个统一PSF，空间资格边界和constant-model范围须另处理，不能关闭整图机制。

六核L1为1.098–1.351、保signed负系数质量0.049–0.175；物理线性model convolution对共同目标的L1偏差0.00745–0.01110，不冒置信区间或真实PSF误差预算。两实际91²科学材料负值计数均0，不能声称本次真实负science案例已覆盖；额外负/零constant只属数学控制。星点/星系形态/跨RUN、空间变化/fullDCR/绝对配准、模型截尾与native复用noise均未认证。

根已实际查看[完整两cut对照](../../../../output/mature-psf-matching-1003-r1/actual-science-matching-current-comparison.png)：紧凑点明显展宽，但没有解决暖底/颗粒，扩展绿结构仍见。颜色结构不自动等于伪影；官方i/r/g含义与来源说明不变。此设置缺完整品质和一致性，**REJECTED_FOR_FULL_EXPANSION / NOT_ADOPTED**。不再对这两cut循环调regularization/blur/ref width，不继续重跑原响应/检测/fit/整图，以免局部数学成功替代质量。B的完整背景、接缝、coverage/弱结构和图质/来源链仍开放。

## 读回与实际消费者

[独立算术路径](../../../../output/mature-psf-matching-1003-r1/readback/result.json)不导入producer、Photutils、SciPy convolution/filter、fitter或detector：NumPy FFT重建六核，最大差2.221e-16；真实halo sliding-window/direct dot到最终float32样本精确，未处理位置精确保持。转置kernel对实际科学结果差0.5133；省略资格会改变实际应保持的987/2831位置。实际current DETAIL PNG对应两crop的RGB及alpha精确一致，不只是源码标记。负/零constant控制误差6.662e-15，没有造天体。25输入前后原字节同一；root算术自检不是独立review，MISSING。

两原science local试验不是新共同全幅candidate/三级出版，不接默认登记/API/client。四核16GB等仍预期，手机不可用、DevTools原FAILED、Android/iOS/实际page/router Back/new Moon/整场资源与200DAU未验不升级。无source下载、native frame重读、检测/拟合、旧矩阵或整幅加工，所有证据保留。

[新增工作盘分配](../../../../output/mature-psf-matching-1003-r1/readback/owned-output-allocation.json)用FILE_STANDARD_INFO：本任务树9文件/686053B逻辑/708608B本机分配，枚举不含随后写入的ledger。不是全部影像/工具/生产保留或180GB余量；不清理。

## 当前直接执行依赖

唯一执行顺序见PLAN：本局部匹配不足不扩大，不将图质失败改成已交付。可独立推进D的**实际静态mount/operation receipt/release/rollback/backup引用与保留owner连接**：先读当前真实配置/运行态，只声明已核层级；不重做旧库存/HTTP/dry-run、不删除/发布/部署。若实际生产未配置，保持缺口并开发可供现有发布owner消费的有界真实引用核查，而不把声明/reference lists当runtime receipt。所有现行/获准旧URL与未知引用仍保留；180GB物理总盘/全产品资源与10/20普通混合冷进入容量义务不缩减。
