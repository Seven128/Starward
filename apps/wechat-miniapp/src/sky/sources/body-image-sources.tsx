import {Text,View} from "@tarojs/components";
import {SkyBodyImageDetails} from "@/features/sky/sky-body-image-source";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {getSkyBodyImagePublication,type SkyBodyImageReference} from "@/services/sky-body-image-publication";
import {useSkySourceRecovery} from "./use-sky-source-recovery";

/** Source navigation reads metadata only, retaining Sky's existing paused
 * image owner. Hash mismatch and transport failure do not replace its edition. */
export function SkyBodyImageSources({reference,publicationHash,visible}:{
  reference:SkyBodyImageReference;publicationHash:string;visible:boolean;
}){
  const resource=useResourceQuery({queryKey:["sky-body-image-sources",reference,publicationHash],
    queryFn:signal=>getSkyBodyImagePublication(reference,publicationHash,signal),
    enabled:visible,staleTime:60_000,structuralSharing:false});
  const publication=resource.data?.publicationHash===publicationHash?resource.data:undefined;
  const retrySource=useSkySourceRecovery(JSON.stringify([reference,publicationHash]),visible,resource.refetch);
  return <View className="celestial-body-image-sources">
    <Text className="type-label">影像来源</Text>
    {!publication ? resource.isError||resource.data
      ?<StatusPanel state="PARTIAL" detail="所选影像来源未加载，其余资料保留" recoveryLabel="重试来源" onRecover={retrySource}/>
      :<StatusPanel state="LOADING" detail="正在加载所选影像的来源…"/>
      :<>
        {resource.refreshError?<StatusPanel state="STALE" detail="更新失败，保留此版本来源" recoveryLabel="重试来源" onRecover={retrySource}/>:null}
        <SkyBodyImageDetails reference={reference} publication={publication}/>
      </>}
  </View>;
}
