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
import { celestialInformationPartialDetail } from "@/services/celestial-information-presentation";
import "./index.scss";

export default function CelestialSourcesPage() {
  const { params } = useRouter();
  let reference = "";
  try { reference = decodeURIComponent(params.reference ?? ""); } catch { /* Invalid route below. */ }
  const imagePublicationHash = params.imagePublicationHash;
  const valid = isCelestialObjectReference(reference) && (imagePublicationHash === undefined || /^[a-f0-9]{64}$/u.test(imagePublicationHash));
  const [visible, setVisible] = useState(true);
  useDidHide(() => setVisible(false));
  useDidShow(() => setVisible(true));
  const information = useCelestialInformation(reference, visible && valid, imagePublicationHash);
  const themeClass = useThemeClass();
  const data = valid ? information.data?.data : undefined;
  const partialDetail = data ? celestialInformationPartialDetail(information.data) : null;
  const sources = data?.sources.filter(isProductSource) ?? [];
  const unavailable = information.isError || information.data?.dataState === "UNAVAILABLE";
  return <View className={`${themeClass} celestial-sources-page`}>
    <CustomNav title="来源与许可" subtitle={data?.displayName ?? (valid ? reference.replace(":", " ") : undefined)} back />
    <ScrollView scrollY enhanced showScrollbar={false} className="celestial-sources-scroll">
      <View className="celestial-sources-content page-inset safe-bottom">
        {!valid ? <StatusPanel state="EMPTY" detail="请从天体信息中的来源与许可入口打开本页。" />
          : unavailable ? <StatusPanel state="ERROR" detail="来源暂时无法加载。" recoveryLabel="重试" onRecover={() => void information.refetch()} />
          : information.isPending ? <StatusPanel state="LOADING" detail="正在加载来源与许可。" />
          : <>
            {information.refreshError || information.data?.dataState === "STALE_USABLE"
              ? <StatusPanel state="STALE" detail="来源更新失败，暂时显示上次记录。" recoveryLabel="重试" onRecover={() => void information.refetch()} /> : null}
            {partialDetail
              ? <StatusPanel state="PARTIAL" detail={partialDetail} recoveryLabel="重试资料" onRecover={() => void information.refetch()} /> : null}
            {sources.length ? sources.map(source => {
              const downloadUrl = deepSkyManifestUrl(source.id);
              return <Provenance key={source.id} source={source.id.startsWith("imagery:") ? { ...source, limitations: [...source.limitations,
                "星图对红外影像另作亮度透明过渡和边缘淡化，不据此判断是否缺测。带源缺测标记的PNG还会把非有限样本留空；对应范围见此版本说明。未经星图淡化的切图可从下载清单取得。"] } : source}
                showKind={false} downloadUrl={downloadUrl} />;
            })
              : <StatusPanel state="EMPTY" detail="暂无来源资料。" />}
          </>}
      </View>
    </ScrollView>
  </View>;
}
