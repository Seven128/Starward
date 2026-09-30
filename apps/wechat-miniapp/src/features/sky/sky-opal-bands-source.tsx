import {useState} from "react";
import {Button,Text,View} from "@tarojs/components";
import type {OpalLatitudeBandsManifestData} from "@starward/miniapp-contracts";

/** One disclosure for the same historical, longitude-neutral OPAL adaptation. */
export function SkyOpalBandsSource({body,name,publication,description}:{
  body:"jupiter"|"saturn"|"uranus"|"neptune";name:string;
  publication:OpalLatitudeBandsManifestData<string,number>|undefined;description:string;
}){
  const [open,setOpen]=useState(false);
  if(!publication)return null;
  return <View>
    <Button className="sky-catalog-row__more" aria-label={`展开或收起${name}历史云带来源`}
      aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{name}历史云带来源 · HST OPAL</Button>
    {open?<View>
      <Text className="type-caption">{description} 哈勃增强三滤镜图的纬度中位色，不是自然真彩或实时天气；不表示当前云系经度，相位按同刻几何计算。</Text>
      <Text className="type-caption">{publication.source.credit} · {publication.processing}</Text>
      <Text className="type-caption" selectable>观测日期：{publication.source.observationDate} · 原始产品：{publication.source.recordUrl} · 许可：{publication.source.license} {publication.source.licenseUrl} · DOI：{publication.source.doi}</Text>
      <Text className="type-caption" selectable>机器可读清单：{__MINIAPP_API_BASE__.replace(/\/+$/u,"")}/v2/sky/{body}/manifest</Text>
    </View>:null}
  </View>;
}
