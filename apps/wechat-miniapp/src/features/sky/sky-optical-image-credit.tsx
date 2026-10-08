import { Button, Text, View } from "@tarojs/components";
import type { SkyOpticalSourceCredit } from "./sky-optical-source-credit";

/** Full attribution stays beside the painted sky. Its action captures the same
 * immutable caption; focus/query changes cannot substitute another publication. */
export function SkyOpticalImageCredit<Credit extends Pick<SkyOpticalSourceCredit,"credit"|"license"|"description">>({ credit, disabled = false, onOpenSources }: {
  credit: Credit | null;
  disabled?: boolean;
  onOpenSources: (credit: Credit) => void;
}) {
  if (!credit) return null;
  return <View className="sky-optical-image-credit">
    <Text className="sky-optical-image-credit__attribution">{credit.credit}</Text>
    <Text className="sky-optical-image-credit__meaning">{credit.license} · {credit.description}</Text>
    <Button disabled={disabled} aria-label="查看当前所绘光学影像的来源与处理说明"
      onClick={() => { if (!disabled) onOpenSources(credit); }}>影像来源与处理说明</Button>
  </View>;
}
