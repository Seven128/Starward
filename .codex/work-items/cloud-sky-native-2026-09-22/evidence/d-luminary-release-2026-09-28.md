# D 日月新消费者的本地发布镜像核对

## 层次与身份

当前共享脏工作区（不是已签收Git发布候选），沿现有infrastructure/deployment/miniapp-api.Dockerfile构建本地starward-miniapp-api:sky-luminary-0928。官方固定Node基础镜像、四工作区production-condition编译、仅生产依赖和现有资产COPY；未改变构建体系、云环境、活动开发API或手机预览。构建退出0，见[d-luminary-image-build-2026-09-28.log](d-luminary-image-build-2026-09-28.log)。镜像/运行容器确认digest sha256:01963cc3ef0e2f76e839a0b6a29aebedffff8db22cf97a340bb71938f2e10751。

专属--rm容器绑定127.0.0.1:18928、512MiB、128PID；NODE_ENV=test，LOCAL/MEMORY_TEST/LOCAL_TEST，development fixture关闭。仍执行实际编译JS和production包导出，不是生产数据库/账号/正式远端部署。

## 实际HTTP与清理

可复跑脚本luminary-release-http-probe.mjs取得并校验8组真实结果：[读回JSON](d-luminary-release-http-2026-09-28.json)。新旧Sun/太阳/Moon/月亮查询交替，旧请求不泄漏SOLAR新身份，新请求得到正确科学kind；非法目录版本400。日月及金星资料为FRESH，包含太阳论文、真实Clementine清单或NASA金星可见光说明，重复请求保持内容修订。真实月面清单与图片逐字节长度/SHA一致、immutable，错误出版404后正常资源200恢复。此层补足新增日月导出/静态来源进入实际发布镜像的证据，不替代上轮授权观测位置HTTP测试或目标手机验收。

检查后docker stats单次216.5MiB/512MiB、11PID，OOMKilled=false；它不是峰值、生产并发容量或月费。专属容器已经stop，--rm自动移除，docker ps同名为空。镜像及构建证据保留；未动共享Postgres/Redis、其它项目容器或P1反馈API。

## 当前外部条件核实

01:30后受保护手机capture失败：device_test_single_authorized_wireless_required。doctor发现1个offline项，无当前可用无线目标；mDNS没有连接端点，复用已有目标端点的一次有界connect未成功。旧00:46截图不作新观察/输入凭据。本轮没有手机输入、刷新或推送，已请求当前连接端口；已有M51 0.2°动作请求未获答复。

P4另检查已连接Chrome的腾讯云控制台登录态；官方控制台跳转登录页，未取得账单，不提交凭据、不改外部设置。代理新建的临时页已关闭，用户原标签保持。实际云计费继续未知，不能把公开0.8元/GB或本机字节写成账号费用。

P5已有具体代码/证据可审，已异步请求用户明确授权只读独立审查Agent（当前工具规则禁止无明确授权启动）。没有得到授权或审查结果之前，独立审查继续是缺口，不把作者检查算独立。
