export default definePageConfig({
  navigationStyle: "custom",
  disableScroll: true,
  usingComponents: { "weather-icon": "../../spot/native/weather-icon/index" },
  componentPlaceholder: { "weather-icon": "view" },
});
