export function importPreviewRecovery(input: {
  rightsConfirmed: boolean;
  title: string;
  body: string;
}) {
  if (!input.rightsConfirmed) return {
    anchor: "import-rights-section",
    detail: "提交前需要确认本次内容的使用权利；当前编辑会保留。",
    label: "去确认使用权利",
  };
  if (!input.title.trim()) return {
    anchor: "import-title-section",
    detail: "还没有填写标题；补充标题后才能提交审核。",
    label: "去填写标题",
  };
  if (!input.body.trim()) return {
    anchor: "import-body-section",
    detail: "还没有填写正文；请补充你有权使用的内容或自写说明。",
    label: "去填写正文",
  };
  return null;
}
