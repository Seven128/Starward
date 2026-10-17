import {useState} from "react";
import {Text,View} from "@tarojs/components";
import {SkySourceDisclosure} from "./sky-menu";
import {Provenance} from "@/components/provenance";
import {bodyImageManifestPath} from "@starward/miniapp-contracts";
import {bodyImageUrl} from "@/services/body-image-client";
import {skyBodyImageProfile,type SkyBodyImageReference} from "@/services/sky-body-image-profile";
import {skyBodyImageSource,type SkyBodyImagePublications} from "@/services/sky-body-image-publication";
import type {SkyBodyImageBinding} from "./sky-body-image-completion";

/** Both the in-scene disclosure and independent route show the same selected metadata. */
export function SkyBodyImageDetails({reference,publication}:{reference:SkyBodyImageReference;publication:SkyBodyImagePublications[SkyBodyImageReference]}){
  const profile=skyBodyImageProfile(reference)!;
  return <>
    <Provenance source={skyBodyImageSource(reference,publication)} showKind={false}
      downloadUrl={bodyImageUrl(publication.image.downloadUrl,profile.kind)}/>
    <Text className="type-caption" selectable>当前图片：{bodyImageUrl(publication.image.downloadUrl,profile.kind)}</Text>
    <Text className="type-caption" selectable>数据清单：{bodyImageUrl(bodyImageManifestPath(profile.kind,publication.publicationHash),profile.kind)}</Text>
  </>;
}
export function SkyBodyImageSource({binding}:{binding:SkyBodyImageBinding}){
  return <SkyBodyImageDisclosure reference={binding.reference} publication={binding.publication}/>;
}
export function SkyBodyImageDisclosure({reference,publication}:Parameters<typeof SkyBodyImageDetails>[0]){
  const [open,setOpen]=useState(false),profile=skyBodyImageProfile(reference)!;
  return <View>
    <SkySourceDisclosure label="影像来源" credit={`${profile.label} · ${publication.source.provider}`}
      expanded={open} onClick={()=>setOpen(value=>!value)} />
    {open?<SkyBodyImageDetails reference={reference} publication={publication}/>:null}
  </View>;
}
