export default definePageConfig({
  navigationStyle: "custom",
  // The recreated page must match the Sky handoff before React can mount its shield.
  backgroundColor: "#000000",
  disableScroll: true,
  usingComponents: { "packaged-icon": "../../spot/native/packaged-icon/index" },
  componentPlaceholder: { "packaged-icon": "view" },
});
