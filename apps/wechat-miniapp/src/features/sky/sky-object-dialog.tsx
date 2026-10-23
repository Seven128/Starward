import { ScrollView, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import type { ReactNode } from "react";
import { SemanticIcon } from "@/components/semantic-asset";
import { SkyDisclosureSurface } from "./sky-overlay-motion";

/** One stable native reading viewport for catalogue objects and report targets.
 * A normal View owns the remaining height; the native ScrollView fills that
 * viewport rather than combining flex sizing with a measured percentage calc.
 * Header changes therefore stay in layout, including during entry/return. */
export function SkyObjectDialog({ title, subtitle, reference, onClose, onBack, priority, children }: {
  title: string; subtitle: string; reference?: string; onClose: () => void;
  onBack?: (() => void) | undefined; priority?: ReactNode; children: ReactNode;
}) {
  return <SkyDisclosureSurface kind="object" onClose={onClose} id="sky-object-dialog"
    className="sky-object-modal__panel" label={`${title}天体说明`}>
    <View className="sky-object-modal" data-control="sky-object-modal" data-object-reference={reference}>
      <View className="sky-object-modal__header">
        <View className="sky-object-modal__identity">
          {onBack ? <Button pressVariant="icon" className="sky-object-modal__back" ariaLabel="返回搜索" onClick={onBack}>
            <SemanticIcon name="sky-chevronBack" /></Button> : <View className="sky-object-modal__back-spacer" />}
          <View><Text className="sky-object-modal__title">{title}</Text><Text className="sky-object-modal__kind">{subtitle}</Text></View>
          <View className="sky-object-modal__back-spacer" />
        </View>
        {priority}
      </View>
      <View className="sky-object-modal__viewport">
        <ScrollView scrollY enhanced type="custom" showScrollbar className="sky-object-modal__body">
          <View className="sky-object-modal__content">{children}</View>
        </ScrollView>
      </View>
    </View>
  </SkyDisclosureSurface>;
}
