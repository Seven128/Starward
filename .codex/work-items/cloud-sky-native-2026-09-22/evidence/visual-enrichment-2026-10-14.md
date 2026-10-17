# 固定银河显示与现有星点外观

## r83：现有Mellinger显示强度

已实看用户原图1/2及固定2048×1024原PNG。光学原图的银河尘带/颜色结构足够供当前显示调整；没有换源或生成高清。`withOpticalAxes`在内部frame显式声明optical display，原GPU pass只对它由0.24调至0.40显示alpha；历史红外保0.24及原平滑语义，坐标、太阳强度、texture-window/预算、原像素和已绘来源回调不变。

`output/playwright/cloud-sky-galactic-display-1014-r83`保真实原图SHA `95ca887ae2fd6811a202f83bccb1376819957d074eed92e4df17f9cbea83df97`、保存报告的真实night/observer frame、实际projection/GPU/脚本及10原PNG。120°银河核心均值20.75→23.11/255、12°40.13→55.32、185°19.51→21.02；远离银河60°17.33396→17.33588，差仅1,513通道/最大2，没有高光截断。相同test bitmap的原transfer before/current全差0，仅证旧显示规则未变，不冒重新验证旧红外出版。已看wide before/current、local/current、whole/current及off-band/current原PNG。

两个相关已有consumer检查初次1过1个新增display字段的精确结构期望失败，补显式optical角色后该项通过；r83类型actual0。局部源码/GL结果成立，不认证同参考的完整画面、原生、物理开销或绝对配准；近景仍有原低分辨率模糊，图片学/原图质未升级。前像 `r83-galactic-before-*` 与失败日志保原output。

## r84：既有程序化亮星

已实看用户原图5。继续原GPU pointVertex/Fragment，由原真实星等/FOV半径驱动连续core/halo/axis wing：亮点更早进入有界光晕，适度提高halo/wing、亮核向白色靠近而外缘保原B-V色。暗点、符号、CPU准入/星等阈值/半径/身份/拾取、DPR与driver point-size上限不变，无逐星模板、全屏bloom、额外图像/Canvas/缓存/下载。不是实测眼睛或仪器PSF。

`output/playwright/cloud-sky-star-display-1014-r84`用真实BSC v3星等/B-V经实际appearance/GPU，受控网格位置与185/45/12°、DPR1/3；四原PNG/源码hash/脚本保原，已看DPR1 before/current及DPR3 current。范围包括Sirius、Deneb、Delta Piscium（HR224/V4.43）、V3/V5/V6.5；三个请求更暗的展示格最终都取BSC已供上限6.5的HR149，所以只有6个独立身份，不宣称覆盖V7.5/8或补充目录。各DPR有9/10个格非零差异，其余15/14保持；所有半径≤1.7的格与独立ring marker全像素不变，没有高光截断。代码仍单POINTS pass，但物理fill/FPS未测，不能用这些格或逻辑大小代替实际星数/整场性能。

自审发现第一版白核调校会连同原observation模式生效，与红光暂缓/保旧输出不符；r85已构建但未推送，不能作为最终候选。r86由实际Scene.begin把模式交给同一renderer每帧uniform，新的profile只进正常显示；不按星点RGB猜模式、不改CPU身份/appearance或增加vertex格式。实际Scene模式边界检查通过；`cloud-sky-star-display-1014-r86-mode`复用同一GL脚本，在DPR1/3补旧observation transfer before/current全RGBA差0、回到正常模式也差0，暗点/marker与正常调校检查保持。已看最终DPR3 current原PNG。该有界反向检查只是保旧输出，未重开或认证红光功能。

两项合批普通r86/richer-sky-ordinary已构建、检查预算并由官方auto_preview推送，各实际exit0；SHA `76d78b7f0b588babed39e5e7dce00cf9c70f543fc4181925b39471955091627e`，284文件/4,883,807B，main2,097,108（余44B）/Sky1,419,945B。root按fresh capture实看手机普通手动入口、原保留15点及普通swipe后10月13日21点提交，关闭时间panel后实见仙王座方向银河纹理、白亮核及较暗有色点。原PNG `r86-ordinary-night-21.png`、`r86-ordinary-cepheus.png`保private runtime；只是这一普通天区的有限显示证据，没有同条件native before/after、手机字节/AppID、全部FOV/天区或物理fill/FPS认证。已bind并退休旧r82与本次bootstrap会话。

独审MISSING。UX13真实同条件星数比较尚未完成；本次未改变或扩增目录，不拿全库数量或摄影点源当已绘/可检索数量。图像冻结、红光暂缓、旧FAILED与原33保持。
