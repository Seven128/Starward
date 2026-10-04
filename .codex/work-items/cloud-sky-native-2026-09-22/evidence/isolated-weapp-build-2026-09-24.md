# 2026-09-24 独立正式 WEAPP 构建与包体边界

后续同日已移除一个未使用的主包重复选中态图标；本页数值是修复前基线，当前新产物与逐字节比较见 [主包重复图标复制收敛](weapp-main-icon-copy-2026-09-24.md)。

本轮不占用用户当前 Android、微信开发者工具窗口、共享 8787，亦不写入活动 `dist/weapp` 或 `dist/weapp-check`。Taro 原配置仅有一个普通隔离检查目录；在既有 `MINIAPP_ISOLATED_CHECK_BUILD=1` 下增加受限的 `MINIAPP_ISOLATED_CHECK_BUILD_SLOT`，只允许小写字母、数字、连字符且最长 31 字符，目录只能落在 `dist/weapp-check-<slot>`。无 slot 的旧行为保持 `dist/weapp-check`，fixture、watch 和诊断模式的既有限制保持。此处用 `sky-20260924`，构建前目标目录不存在。

命令从仓库根执行：

```powershell
$env:MINIAPP_ISOLATED_CHECK_BUILD='1'
$env:MINIAPP_ISOLATED_CHECK_BUILD_SLOT='sky-20260924'
npm run build:weapp --workspace @starward/wechat-miniapp
```

Taro 4.2.1 / webpack 5.91.0 退出 0，产物为 `apps/wechat-miniapp/dist/weapp-check-sky-20260924`，`app.json` 含主包、spot、sky、content 三个分包；正常生产构建模式，不启用开发 fixture/诊断。构建报告 3 个 warning：既有 CSS 顺序冲突，以及 `sky/detail/index.js`（286 KiB）和 `common.js`（320 KiB）超过 webpack 推荐的 244 KiB 单文件阈值；没有编译错误。此构建补上 OPAL 木星条带接入后的 WEAPP 打包层证据，不等于微信开发者工具编译、原生 Canvas 绘制或真机验收。

按独立输出目录全部文件的原始字节求和：总计 4,423,818 B；主包 2,093,960 B（含 `project.config.json` 965 B），sky 894,228 B，spot 423,621 B，content 1,012,009 B。相对 2 MiB（2,097,152 B），主包原始文件只余 3,192 B；不计 `project.config.json` 则余 4,157 B。[腾讯官方云文档](https://intl.cloud.tencent.com/zh/document/product/1219/61748)仍列单个主/分包 2M 的限制，但这里是文件求和，**不是微信实际上传打包大小**，也没有上传或预览确认。主包的大文件包括 `common.js` 327,210 B、`pages/map/index.js` 151,523 B、`taro.js` 133,295 B；本轮没有推定哪一文件可安全移出或压缩，也没有改动其它需求的资源。后续任何主包新增内容均需再次测量并用官方开发者工具的实际包大小确认，发布前应留出容量余量。

本证据只收敛构建输出冲突和目前包体观察；OPAL 木星原生图片加载/画布像素、Canvas 与控件合成、恢复、设备性能及独立审查仍开放。

附加检查：`npm run typecheck --workspace @starward/wechat-miniapp`、`npm run context:validate` 与 `git diff --check` 均退出 0（diff check 仅有 Git 的行尾转换提醒）；恶意 slot `../bad` 在配置阶段以 `miniapp_isolated_check_slot_invalid` 拒绝，未运行编译。没有写入新路径或活动输出。
