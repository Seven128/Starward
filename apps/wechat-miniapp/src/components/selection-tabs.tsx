import { Button, Text, View } from "@tarojs/components";
import type { CSSProperties } from "react";

export interface SelectionTabItem<Id extends string> {
  id: Id;
  label: string;
  controlId?: string;
}

export function SelectionTabs<Id extends string>({
  items, activeId, onSelect, label, semantics = "document", className = "",
  itemClassName = "", activeItemClassName = "", indicatorClassName, controlId,
}: {
  items: readonly SelectionTabItem<Id>[];
  activeId: Id;
  onSelect: (id: Id) => void;
  label: string;
  semantics?: "tabs" | "document";
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  indicatorClassName?: string;
  controlId?: string;
}) {
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  return <View className={`selection-tabs ${className}`} data-control={controlId}
    role={semantics === "tabs" ? "tablist" : "group"} ariaLabel={label}>
    {items.map((item) => {
      const active = item.id === activeId;
      return <Button key={item.id}
        data-control={item.controlId}
        className={`selection-tabs__item${active ? " selection-tabs__item--active" : ""}${itemClassName ? ` ${itemClassName}` : ""}${active && activeItemClassName ? ` ${activeItemClassName}` : ""}`}
        {...(semantics === "tabs" ? { role: "tab", "aria-selected": active } : { "aria-current": active ? "location" : undefined })}
        onClick={() => onSelect(item.id)}>
        <Text className="selection-tabs__label">{item.label}</Text>
      </Button>;
    })}
    {indicatorClassName ? <View className={indicatorClassName}
      style={{ left: `${activeIndex * (100 / Math.max(1, items.length))}%`, width: `${100 / Math.max(1, items.length)}%` } as CSSProperties}
      aria-hidden /> : null}
  </View>;
}
