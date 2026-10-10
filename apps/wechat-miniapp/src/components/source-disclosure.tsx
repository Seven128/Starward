import { Button, Text, View } from "@tarojs/components";
import { useState, type ReactNode } from "react";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource } from "@/utils/source-presentation";
import { Provenance } from "./provenance";
import "./source-disclosure.scss";

/** Detailed reading only; callers keep required credits beside the displayed data. */
export function SourceDisclosure({ id, label, sources, children }: {
  id: string;
  label: string;
  sources: readonly SourceSummary[];
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const productSources = sources.filter(isProductSource);
  if (!productSources.length && !children) return null;
  return <View className="source-disclosure" data-control={id}>
    <Button className="source-disclosure__summary focus-ring" ariaLabel={label}
      aria-expanded={expanded} aria-controls={`${id}-body`} onClick={() => setExpanded(value => !value)}>
      <Text>{label}</Text>
      <Text className={`source-disclosure__chevron${expanded ? " source-disclosure__chevron--expanded" : ""}`} aria-hidden="true">›</Text>
    </Button>
    {expanded ? <View id={`${id}-body`} className="source-disclosure__body">
      {children ? <View className="source-disclosure__note">{children}</View> : null}
      {productSources.map((source, index) => <Provenance source={source} presentation="disclosure" showKind={false} key={`${source.id}:${index}`} />)}
    </View> : null}
  </View>;
}
