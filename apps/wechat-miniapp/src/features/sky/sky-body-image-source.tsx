import {SkySourceSummary} from "./sky-menu";
import {Provenance} from "@/components/provenance";
import {SourceDocumentContent} from "@/components/source-document-content";
import {bodyImageManifestPath} from "@starward/miniapp-contracts";
import {bodyImageUrl} from "@/services/body-image-client";
import {skyBodyImageProfile,type SkyBodyImageReference} from "@/services/sky-body-image-profile";
import {skyBodyImageSource,type SkyBodyImagePublications} from "@/services/sky-body-image-publication";
import type {SkyBodyImageBinding} from "./sky-body-image-completion";

/** The independent route retains the original selected-publication source owner. */
export function SkyBodyImageDetails({reference,publication}:{reference:SkyBodyImageReference;publication:SkyBodyImagePublications[SkyBodyImageReference]}){
  const profile=skyBodyImageProfile(reference)!;
  return <>
    <Provenance source={skyBodyImageSource(reference,publication)} showKind={false} presentation="reading"
      downloadUrl={bodyImageUrl(publication.image.downloadUrl,profile.kind)}/>
    <SourceDocumentContent document={{title:"来源",sources:[],sections:[{kind:"links",items:[
      {label:"当前图片",url:bodyImageUrl(publication.image.downloadUrl,profile.kind),download:true},
      {label:"数据清单",url:bodyImageUrl(bodyImageManifestPath(profile.kind,publication.publicationHash),profile.kind),download:true},
    ]}]}} />
  </>;
}
export function SkyBodyImageSource({binding,disabled=false,onOpenSources}:{binding:SkyBodyImageBinding;
  disabled?:boolean;onOpenSources:(binding:SkyBodyImageBinding)=>void|Promise<unknown>}){
  const profile=skyBodyImageProfile(binding.reference)!;
  return <SkySourceSummary label="影像来源" credit={`${profile.label} · ${binding.publication.source.credit}`}
    disabled={disabled} onOpen={()=>onOpenSources(binding)} />;
}
