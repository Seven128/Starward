# C06 光学阶0宽视场链（2026-09-23）

生产光学出版仍关闭；本次只推进公开许可待核的本地 TRIAL 路径。原出版物只接受阶1–11，宽视场 90° 以上参考选片返回 `ZOOM_IN`；即便以后有十二面阶0合法出版物，HTTP、客户端验证与实际选片也无法显示。另一个共享绘制问题是过去用 `order===0` 判定 W3 背景，会把光学阶0错误地压到深空对象后方并使用 0.48 透明度。页面的绘制失败回调也用同一条件，把阶0光学失败误交给W3状态与重试。

现在服务端/客户端严格验证阶0像素0–11、路径和 SHA；选片仅使用实际来源 shard/index 中列出的阶0面，不凭 MOC 或目录提示补造空白，完整参考覆盖要求十二面都存在。绘制及页面失败分派改用显式 `OPTICAL`/`WIDE_FIELD_W3` 层身份，阶0光学仍按光学 0.8 透明度绘制在注册对象图之后，失败进入光学自身重试；阶0两层均用16分格球面网格。原有12张解码图预算与缓存身份不变。

修复前新增三项定向回归实际失败：阶0两来源各半面时宽视场选片为空；阶0光学被按W3绘制且透明度为0.48；阶0光学失败被错误交给W3。最终服务端阶0 HTTP/发布测试4/4、BFF类型检查、小程序全量814/814、Mini类型检查、隔离WEAPP构建均退出0。完整Mini日志在 `optical-order0-full-mini-tests-2026-09-23.log`，隔离构建日志在 `optical-order0-isolated-build-2026-09-23.log`；构建有现有 CSS 顺序、asset size 和 webpack performance 三类警告。Context 校验与 `git diff --check` 在最终代码改动后复核。

`../hips-wide-mesh-probe.mts` 与 `optical-order0-mesh-probe-2026-09-23.jsonl`记录有界屏幕误差及十二面身份试验。390.4×844、267.8°正顶相机的768个可见三角中心错配0，16分格样本中点屏幕最大偏差约0.915px；其它视场样本可达约3.27px。它不验证真实瓦片的图像像素、边缘接缝、当前设备帧耗时或内存。实际 CDS 主站服务状态/ODbL 与 PS1、SkyMapper 原始图像权益分层见 `../OPTICAL-DATA-RESEARCH.md`；没有完成生产镜像权利、资产或云成本，故正常商业发布继续不含光学影像。本次未占用 Android、ADB、扫码、预览或共享8787。

`../optical-order0-real-tile-probe.mts`另将已取的真实 CDS PS1 阶0 `Npix0.jpg`（101,515字节，SHA-256 `89bf2ec867ebf3d53a610b62eecadf2ef80db74810fd49fa53ea577d0aa9c8d4`）复制到 ignored 本地 TRIAL 出版目录，经过隔离内存服务的同源 HTTP manifest→index→tile 返回200；Mini正式校验器接受元数据与索引，真实响应字节SHA与源相等，未出版的相邻面返回404。当前267.8°全天参考含0–11共十二面，按**实际索引**只选面0且`coverageComplete=false`，输出 `optical-order0-real-tile-probe-2026-09-23.json`。这条证据关闭真实样瓦片的出版/选择链，不证明原生Canvas已采样它，也不使单张图片成为完整天空或合法生产资产。试验运行需 `TSX_TSCONFIG_PATH=workers/miniapp-api/tsconfig.json` 以加载Nest装饰器；首轮未设该环境变量而编译失败，修正后退出0。

随后在 `127.0.0.1:18788` 启动同一 ignored TRIAL 的独立 `LOCAL/MEMORY_TEST` Nest 服务，真实网络 GET 根清单200、scope TRIAL、阶0单分片，hash与上述探针一致。将最新隔离WEAPP构建复制到既有 ignored `optical-devtools-project-20260923`，微信开发者工具打开独立 lite 窗口`s3`成功；但 `automation_runtime_info(currentPage)`长期无响应，限时终止，**未取得阶0原生像素或页面请求证据**。随即关闭该独立窗口、停止18788；复核仅共享8787继续监听，未向源项目窗口注入请求转发，也未碰手机。下一次原生验证应先解决该独立窗口的运行时连接，或在不干扰用户其它工作时另选可控窗口；不要把窗口打开当画面通过。
