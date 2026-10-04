# 2026-09-24 主包重复图标复制收敛

前一独立正式构建的主包原始文件和为 2,093,960 B，距 2 MiB 仅 3,192 B。沿 `apps/wechat-miniapp/config/index.ts` 的分包复制清单、`SemanticIcon` 的运行时路径、`my-avatar.tsx` 及 `app.config.ts`／`native-chrome.ts` 检查：我的头像只请求 `account-user` 的运行时默认态；日间 My TabBar 选中态从专用 `assets/b-icons/weapp-tabbar/account-user--day--selected.png` 读取。主包额外复制的 `assets/b-icons/account-user--day--selected.png` 没有当前消费者，且与专用 TabBar 路径不是同一文件。

仅移除该主包复制清单项，保留源设计资产、默认态运行时图标及专用 TabBar 选中图标。以新的 `MINIAPP_ISOLATED_CHECK_BUILD_SLOT=sky-20260924b` 执行正式 `npm run build:weapp --workspace @starward/wechat-miniapp`，Taro/webpack 退出 0、原有 3 个 warning。与上一隔离构建按每个相对路径/长度/SHA-256 比较，**唯一差异**是旧主包中 26,109 B 的重复 PNG 不再出现；所有其余文件逐字节相同。新主包原始文件和为 2,067,851 B，距 2 MiB 余 29,301 B；不是微信实际上传包大小。新包仍含默认态运行时 PNG 与专用 TabBar 选中 PNG。

`native-chrome.test.ts` 7/7、Mini typecheck、`git diff --check` 通过。没有修改用户当前活动输出、Android、微信开发者工具或共享服务。真实微信打包大小、主包以后增长及真机视觉/性能仍需验证；本轮仅解决已确认重复复制，不宣称主包容量问题最终闭合。
