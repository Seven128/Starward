# PS1同源LOD修复与逐帧失败（2026-10-06）

同源父图污染已在原Scene/mesh开发层修复，候选尚不采用。Hook保明确sourceId；现成熟HEALPix NESTED子单元提供原父图UV范围，Scene只针对current且有当前mesh的同源细图请求替代。GPU沿原纹理lease先确认细图上传成功才裁父贡献，失败细区保父；未推断黑/alpha/科学mask，不改优先级/W3、原源像素、缓存预算或引入FBO/巡天框架。固定8个vec4容纳既有有界ready工作集的最多16个子矩形，不能把当前512或order8当未来需求上限。

25影响检查通过，类型首轮两个失败保原，修后类型检查通过。旧0.15°fine-only与新完成帧相机/basis/FOV/对象/report/三实际fine SHA相同，0像素差；旧同相机加parent反例304,918/max40仍保FAILED历史。负控不是旧counterexample完全重放：暖retirement后仅剩较小父footprint，空替代参数使65像素/max7变化、恢复0。任务r1同FOV手势未绘新帧且用一项快照数组长度判断完成，诊断无效保原；r2用快照身份、公开地平网格on/off触发新完成帧。GPU读取array[0]仅返回首vec4；实际count≤2可直接完整确认，count>2均等于所有requested矩形、无subset歧义，不把4个float误称整个array读回。

完整实际Map→Sky page/Hook/HTTP/Canvas/Scene在原受控软件端口：515前端输入中5个本轮责任变更、173后端不变，156真实loopback请求、115完成Scene；当前有限≤1°候选71帧按真实相机/report逐像素中心核名义cell与实际GPU接受的替代。未发现“父已裁但细未提交”的名义mask歧义；这不证明raster边界、科学支持或绝对配准。

新FAILED：71个完成帧有15全层null、28局部cell未齐，含正常冷载入及hide后的重新取得（不将这些等同暖回退）。暖0.15→0.8的4个局部缺口合计约238.3ms软件完成间隔：先还带fine，再按新order6 candidate过滤fine、剩单coarse，最后逐项重新取得coarse。当前source16MiB压力淘汰与candidate阶段切换须共同核实；any-source null0不证明全画面连续。GPU上传失败时实际完成像素与HTTP503帧相同、名义粗coverage保留；公开GPU重试返回true后原retryNativeImage调用Canvas resize，当前有效整层亦退休，7个不齐帧约426ms（其中5全null）。最终wide-return另5个不齐约283ms。冷进入7个约393.2ms/show5个约548.2ms分别记载入时序，不冒native compositor可见时长或设备SLA。

实际查看0.15/0.8/0.45°正常图及失败图：正常有限同源区域未见先前矩形照片边；细tile失败仍有可见粗细分辨率边界，并出现细线，完整图质/raster边界FAILED。新父UV discard与细mesh边界不完全一致是待验证原因，不能据名义cell0缺口改为raster通过。暖前后5像素/max2位于左下边缘(1,777)/(6,779)/(11,781)/(13,782)/(16,783)，相机FOV亦有浮点末位差；原因未闭合，不改严格结果为0或先增加容差。暖新增5本机body，不盲扩缓存。

整场模型纹理峰12,582,912B、source RGBA等值17,367,040B、FS逻辑4,749,805B，峰值时刻不同、不相加、不与旧不同故障时序作性能A/B。无新下载加工（20原JPEG2,691,868B）、无主动WEAPP构建/服务重启/SDK/auth/DevTools截图，原watch源变动自动更新detail/index.js及map两文件，旧输出hash保历史、新epoch另核。hide/show/Map Back/最终全owner退休成立，不能替代换档连续和源route Back。

下一先修现loader/Hook/mesh交接与共享边界贡献，不重做已闭合Prepared R1，不抠黑/feather/PSF、不建巡天框架；再补HiPS同帧身份、完整权利/record链接、独立来源route/Back及标准出口。普通Prepared空/HiPS关、商业发布/科学支持/绝对配准/物理资源/DevTools/Android-iOS/新版月面/独审及33项未完成。

证据：[实际page](../../../../output/playwright/ps1-hips-lod-native-page-1006-q1-r2/result.json)、[逐帧与像素读回](../../../../output/ps1-hips-lod-page-readback-1006-q1-r1/result.json)、[替代负控](../../../../output/ps1-hips-lod-page-readback-1006-q1-r1/ready-parent-fine-pixels.json)、[r1诊断纠正](ps1-hips-lod-diagnostic-correction-2026-10-06.json)、[唯一PLAN](../PLAN.md)。
