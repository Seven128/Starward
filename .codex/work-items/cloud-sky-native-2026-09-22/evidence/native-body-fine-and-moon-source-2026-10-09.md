# 原生日月／行星细尺度与新版月面来源（2026-10-09）

范围：现官方 DevTools 2.02.2609232 / trial 3.17.4，system DPR 3，8791 隔离开发 Context；fixture build 仍为 274 文件、4,623,924B、29ff54ea96dc5dc2456ef88bd75abf0020299758d80269965e85fab6e567d2bb。沿已修二进制 owner 和现 OPAL / Moon coverage-v2 资源，不新增产品代码、构建、下载源图、加工、模型、PS 或编码。不是手机、物理资源或完整原生体验验收。

## 土星与历史云带

Context revision 4 / 2026-10-09T16:30:00Z，公开列表→土星资料→定位。真实资料方位204.9°、高度67.4°；三次完整双指手势把45°缩至2.6048796°、0.1488567°、0.05°。公开已绘 view 及居中身份见 automation_evaluate-1791517128494.json / 1791517452175.json；native-body-saturn-fine.png 已查看，球体纬带与连续环/遮挡实际可见，控件和选中标签仍不可见 FAILED。

本机 GET /v2/sky/saturn/manifest 为200：publication 48343c370c49dc616891f207ff81272dd13842d15373d57a840b816b1bd78504，image SHA 68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c，8×512 PNG /1003B。清单摘要 native-body-saturn-manifest.json，原生 v2 库存精确匹配此文件 automation_evaluate-1791517463905.json。公开来源展开读回 automation_element_action-1791517514365.json：2025-08-29、HST OPAL / NASA / ESA / STScI、CC BY4.0、DOI10.17909/T9G593；纬度中位色、移除经度/旧卫星影子、环遮挡/极区回退、增强三滤镜及非自然真彩/实时含义仍明确。

SkyOpalBandsSource 当前取 hook publication，未取得 actual current program u_image/绑定哈希读回；缓存、披露与可见纬带不能单独证明精确 GPU 绑定，也不认证全部环影/科学/图质。

## 月球独立样本与真实来源返回

公开中文搜索“月球”唯一 SOLAR:MOON，资料和定位见1791517518206 /1791517538088 /1791517551200。原午夜样本高度−65.9°；反向双指0.05°→0.8749957624635967°，native-body-moon-current.png 已查看，极细亮缘不用于证明纹理质量。

公开日期控件可用10月2日至24日；选择10月2日00:30，使同 Context revision5 / selectedAtUtc2026-10-01T16:30:00Z / observation-night localDate2026-10-01。真实 GET 保存 native-body-bright-moon-context.json（response.data，非 data.context）。公开月球资料此时方位71.7°、高度35.8°；定位及核心坐标 tap(195.1999969482422,422) 实际打开月球资料。对应回执1791517674527 /1791517678451 /1791517717473。

native-body-moon-bright.png 已查看：真实月海与陨石坑纹理可见，盘面左右有屏外部分；该屏幕结果不认证全月缘、高倍率全部缺测区或科学准确性。当前 GET /v2/sky/moon/coverage/manifest 为200，完整 native-body-moon-manifest.json：coverage-v2 publication89423a036ef5cce0d46e503dd72a1aa075e703c5057e39dd8d13cfee223d9130，2048×1024 PNG /1,595,187B，SHA ba7b9eef33d3e4d25c251f79641c39ea5526c35edb5c262eecffb3dea67b23f6。原生精确缓存匹配1791517594270；RGBA alpha 是实际面积覆盖，原始750nm灰阶与统一中性缺测示意不变。

公开“来源与许可”进入独立sky/sources route（1791517721337），native-body-moon-sources.png 已查看，实际显示 Clementine v2.1 measured-area coverage及45×45面积均值/不补造地貌。完整公开文本1791517738412含USGS public domain/署名/750nm历史局限及来源链接；没有 publication-hash route binding，故只确认当前 coverage-v2 来源内容，不认证已绘具体版本绑定。

公开Back→关闭月球资料，native-body-moon-after-source.png 已查看。沿现批量像素比较脚本增加显式输入配置，仅处理本次新增一对；native-body-pixels.json：排除顶部102系统行后446907天空像素，改变0、最大差0，RGBA SHA9d8dd07cd5933dfd107c718d8dbfaac05e06f290f5b03ea3bd8dbc8039012f1f。完整 before/after basis 成对未取得，仍 UNVERIFIED。原生库存1791517766348为80条/8,248,206B，Moon与Saturn文件名、SHA及尺寸保持；库存增长包含SAO，不冒全库存不变、decoded数量、GPU参与计数、退出退休、物理峰或容量。

## 当前状态与未完成项

公开日期控件恢复10月10日00:30，native-body-restored-context.json实读 revision6 / selectedAtUtc2026-10-09T16:30:00Z / localDate2026-10-09 / Asia/Shanghai，Sky READY见1791517853430。手动方向保持上一月球定位方向，FOV0.8749958°；没有恢复旧土星视角或假称跟随手机。服务8791、canonical8787/watch99080保持。

公开SDK错误/守卫拒绝和诊断失败全部保留：误用text结果路径导致list guard拒绝、首份PS生成像素配置被数组展平导致工具ValueError（native-body-pixel-pairs.json）均无产品效果；修正配置 native-body-pixel-pairs-valid.json 后完成新一对比较。Canvas node query clone失败1791517199957及property width/height null1791517235594/1791517236751不能证明物理backing尺寸，DPR3仅systemInfo事实。

WXML可见组合 FAILED、原因 UNKNOWN，actual program/SHA/全家族生命周期及失败保粗仍未核，独立审查 MISSING，手机/物理/完整图质与33项原义务状态不提高。下一独立依赖为公开时间尺跨午夜拖动预览、取消与共享Context读回；不重复已完成刻度提交或宽角图层矩阵。
