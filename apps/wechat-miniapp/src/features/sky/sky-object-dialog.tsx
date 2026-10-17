import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidHide, useDidShow, useResize } from "@tarojs/taro";
import { createContext, useContext, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SemanticIcon } from "@/components/semantic-asset";
import { SkyDisclosureSurface } from "./sky-overlay-motion";

const SkyObjectPriorityLayout = createContext<() => void>(() => {});
export const useSkyObjectPriorityLayout = () => useContext(SkyObjectPriorityLayout);

/** One stable native reading viewport for catalogue objects and report targets.
 * WEAPP ScrollView needs its own bounded viewport; flex shrinking the outer
 * layer can clip a full-height native scroll area instead of making it scroll. */
export function SkyObjectDialog({ title, subtitle, reference, onClose, onBack, priority, children }: {
  title: string; subtitle: string; reference?: string; onClose: () => void;
  onBack?: (() => void) | undefined; priority?: ReactNode; children: ReactNode;
}) {
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const mounted = useRef(true), visible = useRef(true), revision = useRef(0);
  const measureHeader = useCallback(() => {
    if (!mounted.current || !visible.current) return;
    const expected = ++revision.current;
    Taro.nextTick(() => {
      if (!mounted.current || !visible.current || revision.current !== expected) return;
      Taro.createSelectorQuery().select("#sky-object-dialog .sky-object-modal__header").boundingClientRect()
        .exec(results => {
          if (!mounted.current || !visible.current || revision.current !== expected) return;
          const header = results[0] as { height?: number } | null;
          if (header && Number.isFinite(header.height) && header.height! > 0)
            setHeaderHeight(header.height! + 2); // The shared material has two 1px borders.
        });
    });
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; revision.current++; }; }, []);
  useEffect(measureHeader, [measureHeader, title, subtitle, Boolean(priority)]);
  useDidHide(() => { visible.current = false; revision.current++; });
  useDidShow(() => { visible.current = true; measureHeader(); });
  useResize(measureHeader);
  const style = (headerHeight === null ? {} : { "--sky-modal-header-height": `${headerHeight}px` }) as CSSProperties;
  return <SkyObjectPriorityLayout.Provider value={measureHeader}><SkyDisclosureSurface kind="object" onClose={onClose} id="sky-object-dialog"
    className="sky-object-modal__panel" style={style} label={`${title}天体说明`}>
    <View className="sky-object-modal" data-control="sky-object-modal" data-object-reference={reference}>
      <View className="sky-object-modal__header">
        <View className="sky-object-modal__identity">
          {onBack ? <Button className="sky-object-modal__back" ariaLabel="返回搜索" onClick={onBack}>
            <SemanticIcon name="sky-chevronBack" /></Button> : <View className="sky-object-modal__back-spacer" />}
          <View><Text className="sky-object-modal__title">{title}</Text><Text className="sky-object-modal__kind">{subtitle}</Text></View>
          <View className="sky-object-modal__back-spacer" />
        </View>
        {priority}
      </View>
      <ScrollView scrollY enhanced type="custom" showScrollbar className="sky-object-modal__body">{children}</ScrollView>
    </View>
  </SkyDisclosureSurface></SkyObjectPriorityLayout.Provider>;
}
