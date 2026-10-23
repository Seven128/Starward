import type { ObserverType } from "@starward/domain/preferences";

export const observerTypeLabels: Readonly<Record<ObserverType, string>> = {
  beginner: "新手观星",
  astrophotographer: "星空摄影",
  "visual-observer": "目视观测",
  camping: "露营观星",
  family: "亲子观星",
};
