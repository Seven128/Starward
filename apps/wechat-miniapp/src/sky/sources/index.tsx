import { Text, View } from "@tarojs/components";
import { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { useState } from "react";
import { preparedNativeOpticalSource,
  isPreparedPlaneOpticalPublication, preparedDerivedRegionOpticalSources,parseSkySourceSelection } from "@starward/miniapp-contracts";
import { SourcePage } from "@/components/source-page";
import { Provenance, isProductSource } from "@/components/provenance";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import { useCelestialInformation } from "@/hooks/use-celestial-information";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getPreparedOpticalResource } from "@/services/prepared-optical-resource";
import { deepSkyManifestUrl } from "@/services/sky-catalog-api";
import { celestialInformationPartialDetail } from "@/services/celestial-information-presentation";
import "./index.scss";
import {SkyHipsSourcesPage} from "./hips-sources";
import {isSkyBodyImageReference,isDefaultSkyBodyImageSource} from "@/services/sky-body-image-publication";
import {SkyBodyImageSources} from "./body-image-sources";
import {useSkySourceRecovery} from "./use-sky-source-recovery";
import { SkyTargetSourcesPage } from "./target-sources";

export default function CelestialSourcesPage() {
  const { params } = useRouter();
  return params.targetSources !== undefined ? <SkyTargetSourcesPage params={params} /> : <CelestialObjectSourcesPage />;
}

function CelestialObjectSourcesPage() {
  const { params } = useRouter();
  const selected=parseSkySourceSelection(params),valid=selected!==null;
  const hipsRoute=selected?.kind==='hips',bodyRoute=selected?.kind==='body',nativeRoute=selected?.kind==='prepared';
  const reference=selected&&'reference' in selected?selected.reference:'';
  const imagePublicationHash=selected?.kind==='object'?selected.imagePublicationHash:undefined;
  const opticalPublicationHash=selected?.kind==='object'?selected.opticalPublicationHash:undefined;
  const preparedPublicationHash=selected?.kind==='prepared'?selected.publicationHash:undefined;
  const bodyImagePublicationHash=selected?.kind==='body'?selected.publicationHash:undefined;
  const [visible, setVisible] = useState(true);
  useDidHide(() => setVisible(false));
  useDidShow(() => setVisible(true));
  const information = useCelestialInformation(reference, visible && valid && !nativeRoute&&!hipsRoute, imagePublicationHash, opticalPublicationHash);
  const prepared = useResourceQuery({ queryKey: ["prepared-optical-source", reference, preparedPublicationHash],
    queryFn: async signal => {
      const resource = await getPreparedOpticalResource(reference, preparedPublicationHash!, signal);
      if (!isPreparedPlaneOpticalPublication(resource.publication)) throw new Error("prepared_optical_source_version_invalid");
      return resource;
    }, enabled: visible && valid && nativeRoute&&!hipsRoute, staleTime: 60_000, structuralSharing: false });
  const native = prepared.data?.publication;
  const nativeCurrent = prepared.data?.isCurrent() === true && native !== undefined && isPreparedPlaneOpticalPublication(native);
  const data = !valid ? undefined : nativeRoute ? nativeCurrent && native && isPreparedPlaneOpticalPublication(native)
    ? { displayName: native.subject.label, sources: native.imageVersion === "prepared-derived-region-optical-v1"
      ? preparedDerivedRegionOpticalSources(native) : [preparedNativeOpticalSource(native)] } : undefined : information.data?.data;
  const partialDetail = data && !nativeRoute ? celestialInformationPartialDetail(information.data) : null;
  const sources = data?.sources.filter(source=>isProductSource(source)&&(!bodyRoute||!isDefaultSkyBodyImageSource(source))) ?? [];
  const catalogueNotes = !nativeRoute ? (information.data?.data?.limitations ?? [])
    .filter(note => !sources.some(source => source.limitations?.includes(note))) : [];
  const resource = nativeRoute ? prepared : information;
  const retrySource = useSkySourceRecovery(JSON.stringify(selected),visible&&valid&&!hipsRoute,resource.refetch);
  const unavailable = nativeRoute ? prepared.isError || Boolean(prepared.data && !nativeCurrent) :
    information.isError || information.data?.dataState === "UNAVAILABLE";
  if(hipsRoute&&!bodyRoute)return <SkyHipsSourcesPage params={params}/>;
  return <SourcePage subtitle={data?.displayName ?? (valid ? reference.replace(":", " ") : undefined)}>
        {valid&&bodyRoute&&isSkyBodyImageReference(reference)?<SkyBodyImageSources reference={reference}
          publicationHash={bodyImagePublicationHash!} visible={visible}/>:null}
        {!valid ? <StatusPanel state="EMPTY" detail="请从天体说明中的来源入口打开" />
          : unavailable ? <StatusPanel state="ERROR" detail="来源暂时无法加载。" recoveryLabel="重试" onRecover={retrySource} />
          : resource.isPending ? <StatusPanel state="LOADING" detail="正在加载来源…" />
          : <>
            {resource.refreshError || !nativeRoute && information.data?.dataState === "STALE_USABLE"
              ? <StatusPanel state="STALE" detail="更新失败，显示上次来源" recoveryLabel="重试" onRecover={retrySource} /> : null}
            {partialDetail
              ? <StatusPanel state="PARTIAL" detail={partialDetail} recoveryLabel="重试资料" onRecover={retrySource} /> : null}
            {sources.length ? sources.map((source, index) => {
              const downloadUrl = deepSkyManifestUrl(source.id.endsWith(":database") ? source.id.slice(0, -9) : source.id,
                preparedPublicationHash ?? opticalPublicationHash);
              return <Provenance key={`${source.id}:${index}`} source={source.id.startsWith("imagery:") ? { ...source, limitations: [...source.limitations,
                "星图对红外影像另作亮度透明过渡和边缘淡化，不据此判断是否缺测。带源缺测标记的PNG还会把非有限样本留空；对应范围见此版本说明。未经星图淡化的切图可从下载清单取得。"] } : source}
                showKind={false} presentation="reading" downloadUrl={downloadUrl} />;
            })
              : <StatusPanel state="EMPTY" detail="暂无来源资料。" />}
            {catalogueNotes.length ? <View className="celestial-sources-notes">
              <Text className="type-section">资料说明</Text>
              {catalogueNotes.map(note => <Text className="type-secondary" key={note}>{note}</Text>)}
            </View> : null}
          </>}
  </SourcePage>;
}
