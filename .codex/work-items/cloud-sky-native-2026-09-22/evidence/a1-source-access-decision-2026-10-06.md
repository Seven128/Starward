# A1 Sources返回后的报告资格

Sky已修复cached refresh收到明确服务端拒绝仍保Canvas/旧影像来源的问题。只有本页的报告显示资格变化，共享Query、Map、投稿、计划页业务没有改变。权限/失效范围的开发回归通过；真实账号、微信平台与最终验收未通过。

现原controller对正式spot公开读取，对contribution要求principal；原service核本人提交、状态、同意及MAP_POINT精确坐标，Context owner核存在与过期。具体filter以account_not_active→403 PERMISSION_DENIED、proposal_sky_context_invalid→400 INVALID_INPUT、contribution_not_found→404 NOT_FOUND、observation_context_expired→410 STALE_REJECTED、provider_unavailable→503 PROVIDER_UNAVAILABLE分类。现BFF本人投稿/他账号/坐标不匹配的一项实际service测试通过，它仍是MEMORY_TEST仓库和身份，不冒实际登录/远端权限撤销。

原useResourceQuery有data时isError=false、refreshError=result.error。原Sky多个Canvas/资源资格仅查isError，Sources保ready返回后会继续绘制。修前完整page/BFF/filter/HTTP/client/Query已取得当前7段spot-sky key的hasData=true/status error/403和原Canvas1/DETAIL来源，原GL RGBA明确保照片。见 [修前产物](../../../../output/playwright/source-access-before-1006-r2/source-access-cases.json)。第一次读回误取Map未启用Query，第二次取得反例后重复wx诊断写入EEXIST，两个执行均保原，清理关闭；没有冒修前executor成功。

现原page先读取reportQuery，再由Sky专属skyReportAccessRejection区分明确PERMISSION_DENIED/NOT_FOUND/STALE_REJECTED/INVALID_INPUT，保原error与refetch，以data undefined/isError true让原全部report消费者统一撤销。原恢复Context的有界流程继续。普通provider/transport/预算/冲突不冒权限撤销，独立有效缓存继续供给；不删除共享Query、不新cache/controller、不改其它页面规则或BFF业务。

[当前读回](source-access-readback-r2-2026-10-06.json)：一个新完整page消费者75 Scene/117请求，真实Taro/React/Query、现API/filter/HTTP、原Sources隐藏返回与software GL；五种failure cause注入隔离BFF getSky边界，并不是实际账号撤销。provider503保Canvas1、decode3/GPU5746840B；四硬拒绝cached data仍在，却Canvas0、旧来源caption消失、decode/源RGBA等效/纹理/buffer模型0。有效Back、临时失败及五恢复共七原RGBA和暖图严格差0，最终Map/unload后encoded entries/leased/bytes/reserved/running/pending/retired、decode/GPU和pending requests均0。最终受控FS仍1份26B元数据，不宣称全磁盘抹除/物理内存0。

新NGC5128沿旧机制fixture，无图像下载/加工、普通注册、缓存扩容或图质采用。它的完整照片图质FAILED保持。44受影响检查、Mini Program类型及一BFF权限owner检查通过。两个旧摘取夹具分别更新reportQuery名与Sources show清标记输入；首43/44失败为旧夹具sourceReturnRef未声明，不是源码机制通过的替代。

原watch仅detail JS/map变化；两个产品owner的实际sourcesContent与当前源码相同。其余3变更为两个现夹具和新资格回归。当前build523输入。after-r1漏候选env在新文件夹初始化后退出，保原；after-r2完成唯一修后build。修后executor五情况、退回Map/unload及源码绑定已完成，末段取旧专用sourceBackPixelRows.map字段不存在而失败，原报错/退出1/全产物保留。两只读reader复用同原产物，r2补严格终态模型与caption检查，无runtime重跑。已另存r3 executor去掉该旧阶段专属假设，未执行，不冒exit0。此次首Back实际RGBA未量测，不能拿七settled比对代首画面或微信可见时长。

现拒绝的通用通知仍说“网络恢复后可重试”，StatusPanel也未明确账号/Context含义，这是当前实际logical文本已知不足，下一按PLAN修其恢复语义，不借本项机械撤销认证完整体验。原手机/DevTools/新版月面、权限/物理峰/200DAU、供给/完整图质/发布与修后独审仍开放，所有33原验收行保持。

A1 拒绝后的恢复语义：现Sky报告显示资格已把403/400/404/410硬拒绝从cached refreshError归一成无可用报告；44影响检查/类型及75Scene117请求的五种情况、七终态RGBA差0、硬拒绝/最终decode-GPU-租约模型0有受控开发证据，非真实权限/微信/物理验收。原执行器末段旧首Back诊断FAILED保原，已有case/退休/源绑定以原产物读回闭合，不重跑旧矩阵。下一修现Sky通知和StatusPanel仍把权限/无效Context拒绝说成“网络恢复后可重试”的含义错误：复用现errorMessage/恢复控件、保地点时刻与返回原入口，区分硬拒绝/普通临时失败；只作一个当前拒绝/恢复实际消费者，不重跑五情况或改Map/投稿/计划业务。真实权限与native/可见时长/独审仍缺。ESO6k及当前失败照片退出保持，低分辨率Mellinger DISPLAY不冒高清/外围；仅具体新合格覆盖/几何/权益证据再开独立Q1，普通Prepared空/HiPS关。P1仅新具体动态callback/window/rehydration证据再开，不重发initialize/SDK/日志扫描或重启服务。全部33项、Android/iOS/新版月面、全旅程、物理200DAU/完整发布开放；Goal active无预算，无提交推送采购部署发布外联。
