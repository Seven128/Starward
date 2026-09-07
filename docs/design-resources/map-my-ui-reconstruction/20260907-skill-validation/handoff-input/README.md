# 接手修改输入

我的页面保留这个方向，把“现场反馈与纠错”的说明改长一些，其他地方不要重做。检查手机上的换行和两页一致性。建议说明：“记录现场天气、通行条件与设施变化；补充照片和说明，提交后可以继续查看草稿与审核状态。”保留既有1条草稿/2条待审核。

manifest.json提供实际文件身份、两个实际root、精确fingerprint及真实同轮snapshot/PNG。只允许读取本交付输入及其引用的节点/图片、底层 .agents/skills/starward-design-resource/scripts/figma-helpers.js 和 scripter-export.js、相关当前Context；不得读作者生成脚本/其他方向或原会话。

输出handoff-output/patch.js（标准Plugin API，无全页重新生成）和说明。主任务在Chrome新鲜读URL后执行；脚本需先调用attestBrowserFile，验证两root指纹，仅改必要My节点并保持Map原指纹，真实导出修改后My及未变Map。识别组件实例时先核对编辑策略与实际范围；不能凭自报声明保护。完整保存修改后的同轮snapshot和PNG，用户手势/手机阅读未实际执行则标待测。
