import {ScrollView,Text,View} from "@tarojs/components";
import {useDidHide,useDidShow} from "@tarojs/taro";
import {useState} from "react";
import {CustomNav} from "@/components/custom-nav";
import {Provenance} from "@/components/provenance";
import {StatusPanel} from "@/components/status-panel";
import {useResourceQuery} from "@/hooks/use-resource-query";
import {useThemeClass} from "@/hooks/use-theme";
import {getOpticalHipsManifest,getOpticalHipsRights,opticalHipsTileUrl} from "@/services/optical-hips-client";
import {opticalHipsSourceSelection,opticalHipsSources} from "@/services/optical-hips-source";

/** An independent route captures the completed version/source set. A newer
 * manifest cannot silently replace its credits; missing selected versions retry. */
export function SkyHipsSourcesPage({params}:{params:Record<string,string|undefined>}){
  const selected=opticalHipsSourceSelection(params),[visible,setVisible]=useState(true);
  useDidHide(()=>setVisible(false));useDidShow(()=>setVisible(true));
  const resource=useResourceQuery({queryKey:["optical-hips-source",selected?.hash,selected?.ids.join(",")],
    queryFn:async signal=>{const root=await getOpticalHipsManifest(signal,selected!.hash);
      if(!root||root.scope==="TRIAL"&&!__MINIAPP_DEVELOPMENT_FIXTURE_MODE__)throw new Error("optical_source_unavailable");
      opticalHipsSources(root,selected!.ids);return root;},enabled:visible&&Boolean(selected),staleTime:60_000,structuralSharing:false});
  const theme=useThemeClass(),root=resource.data;
  const bound=Boolean(selected&&root?.publicationHash===selected.hash&&
    (root.scope!=="TRIAL"||__MINIAPP_DEVELOPMENT_FIXTURE_MODE__)&&selected.ids.every(id=>root.sources.some(source=>source.id===id)));
  const rightsResource=useResourceQuery({queryKey:["optical-hips-rights",selected?.hash],
    queryFn:signal=>getOpticalHipsRights(root!,signal),enabled:visible&&bound,staleTime:60_000,structuralSharing:false});
  const rights=rightsResource.data?.rights;
  const rightsBound=Boolean(bound&&rights?.publicationHash===root!.publicationHash&&rights.scope===root!.scope);
  const sources=bound?opticalHipsSources(root!,selected!.ids,rightsBound?rights:undefined):[];
  return <View className={`${theme} celestial-sources-page`}>
    <CustomNav title="来源与许可" subtitle="光学巡天影像" back/>
    <ScrollView scrollY enhanced showScrollbar={false} className="celestial-sources-scroll">
      <View className="celestial-sources-content page-inset safe-bottom">
        {!selected?<StatusPanel state="EMPTY" detail="请从当前星图的影像来源入口打开本页。"/>:
          resource.isError||root&&!bound?<StatusPanel state="ERROR" detail="此影像版本的来源暂不可用。" recoveryLabel="重试" onRecover={()=>void resource.refetch()}/>:
          resource.isPending?<StatusPanel state="LOADING" detail="正在加载此版本的来源与许可。"/>:bound?<>
            {resource.refreshError?<StatusPanel state="STALE" detail="来源更新失败，保留此版本记录。" recoveryLabel="重试" onRecover={()=>void resource.refetch()}/>:null}
            {root!.scope==="TRIAL"?<StatusPanel state="PARTIAL" detail="内部影像试验，尚未采用。"/>:null}
            {rightsResource.isError||rights&&!rightsBound?<StatusPanel state="PARTIAL" detail="此版本的完整通知与变更说明暂不可用，保留原来源记录。"
              recoveryLabel="重试说明" onRecover={()=>void rightsResource.refetch()}/>:
              rightsResource.isPending?<StatusPanel state="LOADING" detail="正在加载此版本的完整通知与变更说明。"/>:null}
            {rightsResource.refreshError&&rightsBound?<StatusPanel state="STALE" detail="说明更新失败，保留此版本记录。"
              recoveryLabel="重试说明" onRecover={()=>void rightsResource.refetch()}/>:null}
            <Text className="type-secondary" selectable>{root!.processing}</Text>
            {root!.limitations.map(value=><Text className="type-caption" selectable key={value}>{value}</Text>)}
            {sources.map(source=><Provenance key={source.id} source={source} showKind={false}
              downloadUrl={source.id.endsWith(":database")?opticalHipsTileUrl(rightsBound?rightsResource.data!.downloadUrl:`/v2/sky/optical/${selected.hash}/manifest`):undefined}/>)}
          </>:<StatusPanel state="EMPTY" detail="此版本暂无来源资料。"/>}
      </View>
    </ScrollView>
  </View>;
}
