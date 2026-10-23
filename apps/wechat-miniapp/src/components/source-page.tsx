import { ScrollView, View } from "@tarojs/components";
import type { ReactNode } from "react";
import { useMotionThemeClass } from "@/hooks/use-theme";
import { CustomNav } from "./custom-nav";
import { FloatingNotificationHost } from "./notification";
import { SystemMotionProbe } from "./system-motion-probe";
import "./source-page.scss";

/** Shared native reading page; domain loaders own data, validity, retries and rights. */
export function SourcePage({ title = "来源", subtitle, children, footer }: {
  title?: string | undefined; subtitle?: string | undefined; children: ReactNode; footer?: ReactNode;
}) {
  const theme = useMotionThemeClass();
  return <><SystemMotionProbe /><View className={`${theme} source-page`}>
    <FloatingNotificationHost /><CustomNav title={title} {...(subtitle === undefined ? {} : { subtitle })} back />
    <ScrollView scrollY enhanced showScrollbar={false} className="source-page__scroll">
      <View className="source-page__content page-inset safe-bottom">{children}</View>
    </ScrollView>
    {footer ? <View className="source-page__footer">{footer}</View> : null}
  </View></>;
}
