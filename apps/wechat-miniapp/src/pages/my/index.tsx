import Taro, { useDidShow } from "@tarojs/taro";
import { useRef } from "react";
import { SystemMotionProbe } from "@/components/system-motion-probe";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { MyLibraryPage } from "@/features/my/my-library-page";
import { PagePresentationProvider, createPresentedPageBack, usePagePresentation } from "@/navigation/page-presentation";
import { openPrimaryPage, showPrimaryNativePage } from "@/navigation/primary-page-navigation";
import type { PrimaryNativePage } from "@/navigation/primary-navigation-controller";

/** Direct My entry retains its native Page; its children return to this same wrapper. */
export default function Page() {
  const presentation = usePagePresentation();
  const backRef = useRef<ReturnType<typeof createPresentedPageBack>>();
  if (!backRef.current) backRef.current = createPresentedPageBack();
  const back = backRef.current;
  const page = useRef(Taro.getCurrentInstance().page as PrimaryNativePage | undefined).current;
  useDidShow(() => { if (page) showPrimaryNativePage(page); });
  return <><SystemMotionProbe />
    <NativeBackBoundary active={presentation.visible} nativeMapContent={<></>} onBack={async () => {
      if (presentation.isCurrent() && !(await back.handle())) await openPrimaryPage("/pages/map/index");
    }} />
    <PagePresentationProvider value={{ ...presentation, back }}><MyLibraryPage /></PagePresentationProvider>
  </>;
}
