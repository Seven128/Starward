import { ScrollView, View } from "@tarojs/components";
import { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { useState } from "react";
import { isCelestialObjectReference } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { Provenance, isProductSource } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { useCelestialInformation } from "@/hooks/use-celestial-information";
import { useThemeClass } from "@/hooks/use-theme";
import { deepSkyManifestUrl } from "@/services/api-client";
import "./index.scss";

export default function CelestialSourcesPage() {
  const { params } = useRouter();
  let reference = "";
  try { reference = decodeURIComponent(params.reference ?? ""); } catch { /* Invalid route below. */ }
  const valid = isCelestialObjectReference(reference);
  const [visible, setVisible] = useState(true);
  useDidHide(() => setVisible(false));
  useDidShow(() => setVisible(true));
  const information = useCelestialInformation(reference, visible);
  const themeClass = useThemeClass();
  const data = valid ? information.data?.data : undefined;
  const sources = data?.sources.filter(isProductSource) ?? [];
  const unavailable = information.isError || information.data?.dataState === "UNAVAILABLE";
  return <View className={`${themeClass} celestial-sources-page`}>
    <CustomNav title="来源与许可" subtitle={data?.displayName ?? (valid ? reference.replace(":", " ") : undefined)} back />
    <ScrollView scrollY enhanced showScrollbar={false} className="celestial-sources-scroll">
      <View className="celestial-sources-content page-inset safe-bottom">
        {!valid ? <StatusPanel state="EMPTY" detail="请从天体信息中的来源与许可入口打开本页。" />
          : unavailable ? <StatusPanel state="EMPTY" detail="来源暂时无法加载。" recoveryLabel="重试" onRecover={() => void information.refetch()} />
          : information.isPending ? <StatusPanel state="LOADING" detail="正在加载来源与许可。" />
          : <>
            {information.refreshError || information.data?.dataState === "STALE_USABLE"
              ? <StatusPanel state="STALE" detail="来源更新失败，暂时显示上次记录。" recoveryLabel="重试" onRecover={() => void information.refetch()} /> : null}
            {sources.length ? sources.map(source => <Provenance key={source.id} source={source} showKind={false}
              downloadUrl={deepSkyManifestUrl(source.id)} />)
              : <StatusPanel state="EMPTY" detail="暂无来源资料。" />}
          </>}
      </View>
    </ScrollView>
  </View>;
}
