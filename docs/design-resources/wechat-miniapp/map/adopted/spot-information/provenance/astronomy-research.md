# 月相与时间覆盖核对

2026-09-08。本轮读现有代码与官方文档，不使用账号付费额度，不修改服务配置。

## 月相

[NASA](https://science.nasa.gov/moon/moon-phases/) 将连续变化概括为8类：新月、娥眉月、上弦月、盈凸月、满月、亏凸月、下弦月、残月。图形编码形状，名称说明阶段，照明比例说明具体时刻；升落时刻是地点相关事件，应另标。

当前代码：packages/astronomy-core 与 workers/miniapp-api/src/astronomy-engine-adapter.ts 已固定 astronomy-engine 2.1.19；内部已有 SearchRiseSet、月亮高度、照明比例，public SkyReport/HourlySkyRow 还没暴露结构化相位角与升落事件。[官方JS文档](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md) 的 MoonPhase 可区分盈亏。只用照明比例无法区分两个方向。

资源 build-moon-data.mjs 复用已安装库，计算虚构示意位置22.6N/114.1E/128m，Asia/Shanghai，每夜18点到次日6点的25个半小时样本，23夜；未将这些结果当成正式点位预报。8个SVG对应最近45度相位扇区，连续照明独立显示，象征形状不表示现场旋转方向。月出/月落搜索严格限定所选观测夜当地正午至次日正午，完整日期保留。实际生产需要来源、误差/地平线限制与无事件/失败区分。

## 日期范围

项目主天气是和风，不是彩云。runtime-config.ts qweatherForecastHours目前仅24/72，TRIAL默认24；当前部署覆盖不能据此推断，未读取或改写密钥/付费配置。[和风现行小时API](https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/)公开支持1–240小时，扩大现有配置需另行实现并检查实际账号权限与预算。

项目已接入的 Open-Meteo 是证据/备用来源，weather-provider.ts请求localDate至nextLocalDate。[官方文档](https://open-meteo.com/en/docs)的past_days为0–92、forecast_days最多16，默认仅今天起7天；含今天的16天最多到未来第15个日历日，最后观测夜跨午夜的天气可能不覆盖；不能把默认7天当成扩展范围。不同模型、变量、有效期和区域的实际覆盖不同。

因此产品目标可定当地今天−7至+15夜（23日期），但现在尚未交付完整生产范围：需要既有BFF规范化可用日期、逐项来源和部分缺失，扩展公开月相事件合同及日期入口。历史返回是相应模型/历史天气产品，并非天然现场观测或当时发布的预报。正式界面遵循实际能力，不宣称每日期每字段齐全，不为较好数值切换模型。

## 参考图提炼

收到8张截图：3张高德地点、5张大众点评商户，图9未提供。结合用户描述推导导航/标题/卡片各自职责；不是竞品内部规范或实时审计。通用规则写入 information-design.md，不把截图和本次参数塞入Context。
