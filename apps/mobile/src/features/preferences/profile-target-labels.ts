import type { ObservingTarget } from "@starward/domain/preferences";

export const preferenceTargetLabels: Record<ObservingTarget, string> = {
  stars: "普通星空", "milky-way": "银河", moon: "月亮", planets: "行星",
  "meteor-shower": "流星雨", comet: "彗星", "space-station": "空间站",
  "deep-sky": "深空目标", "sunrise-sunset-composite": "日出/日落联合摄影",
};
