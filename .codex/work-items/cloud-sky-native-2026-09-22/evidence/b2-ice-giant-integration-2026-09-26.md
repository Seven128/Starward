# B2 冰巨星固定出版与消费者：2026-09-26

本轮遵用户“手机暂不可用，继续非手机开发，强卡点再停”执行。未操作 Android、ADB、二维码、推送或开发者工具，未写活动 dist/weapp、dist/weapp-check；未云部署。原商业排除和正向义务不变。

## 实际交付

- 天王星 OPAL 2025a、海王星 OPAL 2025b 从任务内候选接入 `workers/miniapp-api/assets/{uranus,neptune}` 正式资产与哈希绑定清单／HTTP，复用 FixedBodyTexturePublicationService。增加 contracts、生成 SDK、Mini 精确来源校验／同源请求和共享 useSkyOpalBands 的消费者。
- 现有渲染场景把各自图片送给对应本体；沿现有扁球纬度采样机制扩展两个 body，未新增 GLSL 机制。有效轴、同刻、普通模式且盘面足够分辨才请求；缺轴、无图仍留独立位置／相位。原生图片 owner、Canvas 代次隔离和失败重试继续共用。
- 四颗巨行星复用 SkyOpalBandsSource 披露日期、许可、历史增强色和加工；天王星／海王星对象资料及来源页消费者补对应来源。纬度缺测保持透明并回退基础盘面，不伪造全球纹理或现时天气。Docker 镜像断言和 Caddy 固定图出口类别已覆盖两条新路由。

## 真实来源与重放

2026-09-26 再核 [OPAL 总页](https://archive.stsci.edu/hlsp/opal)明确 HLSP CC BY 4.0、DOI 10.17909/T9G593；具体 [天王星 Cycle 33](https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33)和 [海王星 Cycle 32](https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32)与已存 README 对照。天王星页面标为 Rotation A 的下载链接实际指 B，故没有凭链接标签认定输入：重新读取准确源文件并与既有 SHA 一致，源文件名／日期／SHA 固定在正式 manifest。天王星采用2025-10-23 Rotation A，海王星采用2025-08-24 Rotation B；不是 README 的两日合集。

用捆绑 Python/Pillow 重跑 publish_opal_ice_giant_bands.py，产物与正式 PNG 逐字节一致：天王星207/361源纬度行有效，输出8×512、421B、有效行0–293；海王星302/361源纬度行有效，输出8×512、527B、有效行84–511。两图 alpha 只有0/255。原始 TIFF 的像素坐标约定及颜色均不提供当日云系经度。

## 检查与实际运行层

- 新 BFF HTTP／图片损坏后修复／源许可拒绝，加原木土 HTTP：5项通过。真实哈希／类型／cache-control／错版本／错对象／错后缀均检查。
- Mini 全量 **883/883**通过，见 [日志](b2-ice-mini-tests-2026-09-26.log)。包含新 manifest 错版本、日期、源／成品 SHA、纬度和远程 URL 拒绝；实际场景对象隔离、无图盘面、原生图片请求／解码回调／GPU资源 owner、Canvas旧代撤回；真实 OPAL hook 在广角、缺轴、旧时刻、隐藏／不活跃时不请求，恢复有效输入后再启用。受控回调不是微信真实解码／GPU像素。
- contracts、API、Mini 类型检查及生成 SDK 同步通过；部署 image/compose 合同11项通过。新渲染数据加入后迁移了页面 frame 测试的输入和断言；初次全量因旧测试未提供两项新输入而失败，补齐后重新全量通过。开发测试期间发现的两个新样本构造错误（给不支持的行星加轴、相机朝向朝下）已修正，没有称为产品修复。
- 隔离 WEAPP 普通构建 `dist/weapp-check-sky-ice-0926` 成功，见 [构建日志](b2-ice-build-2026-09-26.log)。257文件，全部原始4,424,885B，主包原始2,070,696B；不是微信官方包体计量。webpack 保留通用资源体积警告，未宣称设备性能通过。未启用诊断标记、未推送。
- 当前 Docker 发布镜像 `starward-miniapp-api:sky-ice-0926` 构建成功，digest `sha256:8d765861438f1fe4eff866f361739c9b3a846608c083f38e5109c235c44bc820`。独立512MiB／128PID容器在127.0.0.1:18926以 LOCAL/MEMORY_TEST/LOCAL_TEST、NODE_ENV=test、fixture关闭启动；木土天海四清单及原图均真实 GET 正常，错出版404后正常资源恢复，字节和SHA与清单一致。见 [HTTP读回](b2-ice-release-http-2026-09-26.json)、[镜像日志](b2-ice-image-build-2026-09-26.log)。专属 --rm 容器已停止，未动共享服务。
- 新两图响应体共948B，清单HTTP响应体合计4,085B；每张RGBA解码理论16KiB，不是实测峰值、请求频率、流量账单或月费。Context校验通过；其只验证声明和路径，不证明产品正确性。

## 仍不闭合的验收

目标微信像素中的纬度方向、缺测边界滤波、历史色彩、红光、土星环影／环缘和实际手势仍依赖 P1；现有手势诊断候选未经本轮投递且比当前代码旧，日后恢复设备须重新准备同代候选。本轮是作者核查，不是独立审查。B2全部外观（包括太阳／金星相关差距）、B3现场站位／数值DEM及完整大气、C广域数据商业获取与质量、D生产费用／官方包体／实际设备资源、Android/iOS综合及独立审查仍按原完整范围开放。不可用固定旧彩图冒充当前太阳活动、金星实时天气或现场大气。
