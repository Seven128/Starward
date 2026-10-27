# Native 功能验证环境实际准备（2026-10-25）

本次只为原生 App 的定位、初始化、偏好、持久化及功能消费者准备目标运行条件。用户后置的层叠／Sky Play 性能、相关内存／OOM保持未完成；没有恢复其 Windows／LAN／Profiler 环境，gen34／其它冻结代不动。

## 已实证的准备结果

- 沿既有 `findAdb` 复用本机 StarwardTools 的 platform-tools，不重新下载或升级原 ADB。通过原 HGyEOG/G2HMxB session 的盐化绑定核对同一授权 USB 目标；只读确认 **Android API 34、arm64-v8a**。精确包过滤查询确认 `app.starward.mobile` 未安装。第一次直接 `pm path` 返回通用失败时未赋予安装结论；后续过滤查询与逐步回执才用于这个结论，没有逆推首次失败原因。未启动 App、安装、清数据、授／撤权限或输入。
- 本机默认、PATH、User/Machine 环境、Android Studio JBR fallback及已查常见路径没有可用 JDK／完整 SDK。新任务工具目录为 `D:/StarwardTools/android-native-20261025/`，原目录不存在后才创建；未更改全局 JAVA_HOME／SDK／PATH、包管理器、VPN、代理或防火墙。
- [Adoptium 官方元数据](https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse)对应 Temurin **17.0.20.1+1** Windows x64 JDK ZIP，实际 **190,817,615B**，SHA256 `e53a79c3c3d86865bd7e787903884331068e71321714ffd44f145785affc7cb0`。完整下载校验后解包，实际 java／javac版本运行成功。选择与当前 React Native Java 17 源配置相容的工具链，没有升级项目依赖。
- [Android 官方下载表](https://developer.android.com/studio#command-tools)对应 `commandlinetools-win-15859902_latest.zip`，实际 **155,655,386B**，SHA256 `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`。完整校验后安装为指定 version 目录，实际 sdkmanager **22.0**。其 deprecated 提示保留；本轮复用官方仍提供的安装能力，没有迁移项目工具栈。
- 根据现 `app.json`、已安装 React Native／Expo Gradle catalog，仅安装并核对 **platforms;android-36、build-tools;36.0.0、ndk;27.1.12297006**。必要 SDK license按开发用途接受；实际 android.jar、aapt2.exe、NDK source.properties和安装清单读回通过。原 ADB只在新 SDK目录独立复制，前后 SHA一致；未改变原 server／认证或原二进制。没有因暂存 ZIP显示零字节或静默日志判断下载卡死；实际包输出继续形成并最终 exit 0，没有调整网络。
- 原生投影只用已安装 pinned Expo 的 bundled `template.tgz`，`prebuild --platform android --no-install --no-clean`及版本保留参数，实际 exit 0。六项源码控制文件、bundled template原字节／SHA不变，Gradle wrapper生成成功；没有 npm安装或脚本／锁文件改写。生成前原件在 private owner保全。canonical此前没有忽略该投影，现只在已保全原件的 `.git/info/exclude` 增加精确 `/apps/mobile/android/`；全部生成文件保留，不改 tracked `.gitignore`。

## 原生候选当前状态

手工阶段编辑 source freeze `1f185853c8285f4c81c02a122eed4060770e265e88d4bbaa83f2fc348d5db4a4` 的24项已Root核并在C-private原样保全；时间／命令两份新独审均通过，没有新P1/P2。Native构建复用现verifier公开的完整input fingerprint、Gradle参数、CMake staging与内容寻址APK owner；当前minify/resource shrink、arm64、两个worker保持。

首轮input `d83502aa…` 实际25m41s失败：Ninja mkdir目录完整长度262，未到JS bundle、无APK。该轮沿用模拟器API默认值，构建前API资格顺序有遗漏，结果只保留作编译失败证据，没有推到手机。第二轮改用本轮已确认自有PC API目标与短TEMP/TMP，input `45135b72396d0711788415d5bf2fcf4c489b0669343cfaf719ea6a0c7c89301a`，1m23s在react-native-screens依赖header路径Stat超过260字符失败。

本轮Gradle cache在精确自有daemon停止／退出后，以同D卷移动原样保全到 `D:/swt/g`，原目录留junction；没有清空、重新下载或影响其它缓存。第三轮同45135b72…使用短Gradle home，但1m34s仍由CMake/Ninja保存的旧绝对路径失败。实际元数据／binary依赖记录定位到screens/worklets/reanimated/expo-core四组本轮RelWithDebInfo/arm64配置；Source/variant/ABI/mtime与原长Gradle前缀均核对后，四组全目录原样保全到 `D:/swt/stale-native-cmake-from-long-gradle/`，证据SHA前后不变。第四轮同45135b72…在实际生成缓存刷新后 **10m4s构建成功**（848 tasks，739 executed/109 up-to-date），生成APK **38,346,767B**、SHA256 `b0715f391021ecf4a2559964f781aca1c1d82cd9b15afdeaa418e72207b2e6f6`，标准content-addressed cache位于D:/swt。before/after完整Native输入hash不变、生成app Gradle原件已恢复；原件/三轮失败/CMake旧缓存全部保留。随后实际aapt包名/Activity、apksigner签名、解出的HBC自有API值和当前Source input复核通过。USB安装前同目标/SDK/ABI/当前用户与包原先不存在重新核对；单次install成功后实际base.apk SHA与候选完全相同。首次普通MainActivity启动及两次真实1080×2376图成立，不是开发工具或Web画面。

Native API按实际default-start在本轮全新dataDir启动，仅绑定127.0.0.1:4318，真实health/live200、监听PID/进程祖先资格成立。现默认trusted owner明确只接受回环，调用者header不能授身份；未把它放宽到LAN，也未新建reverse/bridge/代理/防火墙规则。手机候选改为本轮自有PC目标，供独立原生本地定位／偏好／恢复及API不可用反馈；手机私有业务和正常API消费者仍未资格，不能以这些独立结果代替要求。该API/config/进程归 `native-loopback-api/` 子owner。

## 实际Native反馈与当前修复

Root实看 `native-functional-ui/screen-4313d677-5cc1-43da-81f5-cec35e65185b.png` 的首次普通今晚页，以及 `screen-ec0cd7dc-48d6-4ba7-89a7-7871e757cc49.png` 的稍后不可用反馈。默认范围／尚未定位／地点时区未确认均仍明确，未冒真GPS；动态请求失败后显示暂不可用并保静态Context，不能因此宣告实际API、夜报写入或恢复完成。

两帧都显示五入口导航处于Android三键系统区域并受其浅色scrim遮挡；源码PrimaryTabBar确无bottom inset，RuntimeRoot已有SafeAreaProvider。新鲜作者仅按既有Native合同修这个共享边界，保原五入口/颜色/路由/触点，不套WEAPP R19。仍需新APK/实际before-after；尚未输入GPS或偏好、未force-stop验证持久化，完整Native未验。原生头部直接显示raw neutral也已列为后续投影例外。

## 证据与限制

完整机器／工具／源控制原件、下载校验、安装清单、prebuild intent/result与构建回执在：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/`

只读设备回执没有把 Windows ready或旧微信普通推送当 Native API可达。Native独立 API、实际定位许可／精度、App持久／重启／导航／视觉、生产及完整 family尚未验；当前微信普通 Map和原 N05／R6等资料未改。手工阶段的本地消费者结果也不能代替这些目标结果。最新已提交 `b4d26545` 的 Product／Context成功，staging仍因磁盘门槛失败且发布／部署skip，不能外推本轮 WIP或已部署。

## 共享偏好首轮修复与Activity模块追加实编

Root在两个作者均冻结后联合核79项，manifest ffb90a367da0d233f4e5c23a717eb43b397fa4df49c91cb4d826f21976017a0d；在新独审只读期间构建，源码未变。input d11a2712e8e676f6fa9d700d0a76a8e03bd45b2d81833b4924dd5bc199c9417b，实际Release 3m36s成功，884tasks/84executed/800uptodate；包含新starward-permission-handoff的compileReleaseKotlin及自动链接。APK SHA7fcc42188c8d572d1ec70e600d1dd554d26ab0158d4c3884c8649c5132af7882，38,354,379B，实际aapt包/Activity、同证书签名、HBC自有API和input核对通过，generated Gradle已恢复。准备脚本第一次因null LASTEXITCODE提前返回，先核无phase/dispatch后才真正启动一次，原记录保全，没有重复build/安装。

编译期间新偏好独审发现同一Quick未知保存跨完整视图后被resolver规范化换身份，故本APK不安装，作为未安装阴性候选保留；不是手机当前包。Activity26pins限定新独审4机制通过，但该端口尚未被实际permission消费者调用，无module实际快照/normal-Home/freshGPS资格。手机继续53960d39/r2/App停止/前台精确许可保留。Root一次只读旧自有UID事件取回11条Main日志，包含原正常许可pause/resume；没有据此声明完整保留窗口、有效stop负例或P2关闭。全部旧APK/cache/源原字节保留，新的跨视图确认修复沿原editor/attempt在途。
