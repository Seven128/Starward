Component({
  properties: {
    kind: {
      type: String,
      value: "",
      observer(kind) {
        const valid = kind === "temperature" || kind === "wind" || kind === "droplet";
        this.setData({ src: valid ? `/spot/assets/b-icons/${kind}--day--default.png` : "" });
      },
    },
  },
  data: { src: "" },
});
