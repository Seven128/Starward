import { Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useState, type CSSProperties } from "react";

/** Mounting a new result starts its finite CSS motion. Stable React keys keep
 * earlier rows and their native scroll position through append and return. */
export function SkySearchRow({ name, kind, ordinal, onSelect }: {
  name: string; kind: string; ordinal: number; onSelect: () => void;
}) {
  const [entering, setEntering] = useState(true);
  return <Button className={`sky-catalog-row${entering ? " sky-search-row-enter" : ""}`}
    style={{ "--sky-row-delay": `${ordinal * 24}ms` } as CSSProperties}
    onAnimationEnd={() => setEntering(false)}
    ariaLabel={`查看${name}，${kind}`} onClick={onSelect}>
    <View className="sky-catalog-row__copy"><Text className="sky-catalog-row__name">{name}</Text></View>
    <Text className="sky-catalog-row__meta">{kind}</Text>
  </Button>;
}
