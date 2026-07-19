export const colors = {
  planning: {
    canvas: "#F4F7FB",
    surface: "#FFFFFF",
    surfaceMuted: "#EAF0F7",
    text: "#111B2E",
    textSecondary: "#58677C",
    border: "#D7E0EA",
    primary: "#2D7FF9",
    primaryActive: "#1261C9",
    onPrimary: "#FFFFFF",
    success: "#178A58",
    warning: "#B46A00",
    danger: "#C13B3B",
  },
  night: {
    canvas: "#071321",
    surface: "#0E2034",
    surfaceMuted: "#162A40",
    text: "#F2F6FB",
    textSecondary: "#AAB8C8",
    border: "#294057",
    primary: "#5B9CFF",
    primaryActive: "#2D7FF9",
    onPrimary: "#FFFFFF",
    success: "#4ED29A",
    warning: "#E5A84E",
    danger: "#F07C7C",
  },
  redLight: {
    canvas: "#100302",
    surface: "#1B0705",
    surfaceMuted: "#2A0B08",
    text: "#FFB2A2",
    textSecondary: "#C76C5D",
    border: "#5A1C15",
    primary: "#C73B28",
    primaryActive: "#9E291B",
    onPrimary: "#FFF0EC",
    success: "#D46A52",
    warning: "#E28655",
    danger: "#FF8A73",
  },
} as const;

export const spacing = { x1: 8, x2: 16, x3: 24, x4: 32, x5: 40 } as const;
export const radii = { control: 8, layer: 16, pill: 999 } as const;
export const minimumTouchTarget = 44;
export const type = {
  family: "Inter",
  mono: "SFMono-Regular",
  title: 24,
  section: 18,
  body: 15,
  label: 13,
  caption: 12,
} as const;
