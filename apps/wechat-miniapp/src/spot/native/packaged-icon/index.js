Component({
  properties: {
    kind: {
      type: String,
      value: "",
      observer(kind) {
        const valid = kind === "temperature" || kind === "wind" || kind === "droplet" || kind === "warning" || kind === "low-cloud" || kind === "images" || kind === "plan-suv" || kind === "clock" || kind === "sun" || kind === "telescope" || kind === "share";
        this.setData({ src: valid ? `/spot/assets/b-icons/${kind}--day--default.png` : "" });
      },
    },
  },
  data: { src: "" },
});
