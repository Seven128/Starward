import { ScrollView, View } from "@tarojs/components";
import { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { useState } from "react";
import { isCelestialObjectReference, isDeepSkyObjectReference, isPreparedOpticalReference, preparedNativeOpticalSource } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { Provenance, isProductSource } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { useCelestialInformation } from "@/hooks/use-celestial-information";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getPreparedOpticalResource } from "@/services/prepared-optical-resource";
import { useThemeClass } from "@/hooks/use-theme";
import { deepSkyManifestUrl } from "@/services/api-client";
import { celestialInformationPartialDetail } from "@/services/celestial-information-presentation";
import "./index.scss";
import {SkyHipsSourcesPage} from "./hips-sources";

export default function CelestialSourcesPage() {
  const { params } = useRouter();
  const hipsRoute=params.hipsPublicationHash!==undefined;
  let reference = "";
  try { reference = decodeURIComponent(params.reference ?? ""); } catch { /* Invalid route below. */ }
  const imagePublicationHash = params.imagePublicationHash;
  const opticalPublicationHash = params.opticalPublicationHash;
  const preparedPublicationHash = params.preparedPublicationHash;
  const nativeRoute = preparedPublicationHash !== undefined;
  const valid = nativeRoute ? isPreparedOpticalReference(reference) && /^[a-f0-9]{64}$/u.test(preparedPublicationHash) &&
    imagePublicationHash === undefined && opticalPublicationHash === undefined :
    isCelestialObjectReference(reference) && (imagePublicationHash === undefined || /^[a-f0-9]{64}$/u.test(imagePublicationHash)) &&
    (opticalPublicationHash === undefined || isDeepSkyObjectReference(reference) && /^[a-f0-9]{64}$/u.test(opticalPublicationHash));
  const [visible, setVisible] = useState(true);
  useDidHide(() => setVisible(false));
  useDidShow(() => setVisible(true));
  const information = useCelestialInformation(reference, visible && valid && !nativeRoute&&!hipsRoute, imagePublicationHash, opticalPublicationHash);
  const prepared = useResourceQuery({ queryKey: ["prepared-optical-source", reference, preparedPublicationHash],
    queryFn: async signal => {
      const resource = await getPreparedOpticalResource(reference, preparedPublicationHash!, signal);
      if (resource.publication.imageVersion !== "prepared-native-optical-v1") throw new Error("prepared_optical_source_version_invalid");
      return resource;
    }, enabled: visible && valid && nativeRoute&&!hipsRoute, staleTime: 60_000, structuralSharing: false });
  const themeClass = useThemeClass();
  const native = prepared.data?.publication;
  const nativeCurrent = prepared.data?.isCurrent() === true && native?.imageVersion === "prepared-native-optical-v1";
  const data = !valid ? undefined : nativeRoute ? nativeCurrent && native?.imageVersion === "prepared-native-optical-v1"
    ? { displayName: native.subject.label, sources: [preparedNativeOpticalSource(native)] } : undefined : information.data?.data;
  const partialDetail = data && !nativeRoute ? celestialInformationPartialDetail(information.data) : null;
  const sources = data?.sources.filter(isProductSource) ?? [];
  const resource = nativeRoute ? prepared : information;
  const unavailable = nativeRoute ? prepared.isError || Boolean(prepared.data && !nativeCurrent) :
    information.isError || information.data?.dataState === "UNAVAILABLE";
  if(hipsRoute)return <SkyHipsSourcesPage params={params}/>;
  return <View className={`${themeClass} celestial-sources-page`}>
    <CustomNav title="来源与许可" subtitle={data?.displayName ?? (valid ? reference.replace(":", " ") : undefined)} back />
    <ScrollView scrollY enhanced showScrollbar={false} className="celestial-sources-scroll">
      <View className="celestial-sources-content page-inset safe-bottom">
        {!valid ? <StatusPanel state="EMPTY" detail="请从天体信息中的来源与许可入口打开本页。" />
          : unavailable ? <StatusPanel state="ERROR" detail="来源暂时无法加载。" recoveryLabel="重试" onRecover={() => void resource.refetch()} />
          : resource.isPending ? <StatusPanel state="LOADING" detail="正在加载来源与许可。" />
          : <>
            {resource.refreshError || !nativeRoute && information.data?.dataState === "STALE_USABLE"
              ? <StatusPanel state="STALE" detail="来源更新失败，暂时显示上次记录。" recoveryLabel="重试" onRecover={() => void resource.refetch()} /> : null}
            {partialDetail
              ? <StatusPanel state="PARTIAL" detail={partialDetail} recoveryLabel="重试资料" onRecover={() => void information.refetch()} /> : null}
            {sources.length ? sources.map(source => {
              const downloadUrl = deepSkyManifestUrl(source.id, preparedPublicationHash ?? opticalPublicationHash);
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
