import type {MercuryTextureManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/mercury/manifest.json",import.meta.url);
const RECORD="https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m";
const WMS="https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mercury/mercury_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MESSENGER_May2013&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE";

export class MercuryTexturePublicationService extends FixedBodyTexturePublicationService<MercuryTextureManifestData>{
  constructor(manifestUrl:URL=DEFAULT_MANIFEST){
    super(manifestUrl,{schemaVersion:"starward-messenger-mercury-v1",
      file:"mercury-messenger-2013-usgs-wms-1024x512.jpg",width:1024,height:512,bytes:89984,
      sha256:"b782316d7458df90198d8e9664abb3902841c0709085bd20f03e46706a252d81",
      recordUrl:RECORD,rightsUrl:RECORD,wmsUrl:WMS,route:"/v2/sky/mercury"});
  }
}
