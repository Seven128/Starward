import Taro from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import "./sky-subnav.scss";

export type SkySubnavKey = "TONIGHT" | "DATA" | "TARGETS" | "MAP";

const ITEMS = [
  ["TONIGHT", "今晚", "spot/sky/index"],
  ["DATA", "专业数据", "sky/detail/index"],
  ["TARGETS", "目标", "sky/targets/index"],
  ["MAP", "简化天图", "sky/map/index"],
] as const;

export function SkySubnav({
  active,
  spotId,
}: {
  active: SkySubnavKey;
  spotId: string;
}) {
  return (
    <View
      className="sky-subnav compact-inset"
      role="tablist"
      aria-label="点位夜空视图"
    >
      {ITEMS.map(([key, label, route]) => {
        const selected = key === active;
        return (
          <Button
            className={`sky-subnav__tab${selected ? " sky-subnav__tab--active" : ""}`}
            key={key}
            aria-selected={selected}
            aria-label={`查看夜空${label}`}
            onClick={() => {
              if (!selected)
                void Taro.redirectTo({
                  url: `/${route}?spotId=${encodeURIComponent(spotId)}`,
                });
            }}
          >
            <Text>{label}</Text>
          </Button>
        );
      })}
    </View>
  );
}
