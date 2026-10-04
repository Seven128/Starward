import {MOON_COVERAGE_PUBLICATION,isMoonCoverageMetadata,type MoonTextureManifestData,type MoonCoverageManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

const DEFAULT_MANIFEST=new URL("../assets/moon/manifest.json",import.meta.url);
export const LEGACY_MOON_TEXTURE_PUBLICATION_HASH="ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6";
const WMS="https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=uv_v2&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg&TRANSPARENT=FALSE";

export class MoonTexturePublicationService extends FixedBodyTexturePublicationService<MoonTextureManifestData>{
  private readonly coverage:FixedBodyTexturePublicationService<MoonCoverageManifestData>;
  constructor(manifestUrl:URL=DEFAULT_MANIFEST,coverageUrl:URL=new URL("../assets/moon/coverage-manifest.json",import.meta.url)){
    super(manifestUrl,{schemaVersion:"starward-clementine-moon-v1",
      file:"clementine-uv750-v2-wms-2048x1024.jpg",width:2048,height:1024,bytes:372399,
      sha256:"e071f796a1ec1f7c9f4d87660aabb1bb40adbfacc0ecb253919bee6c711efefb",
      recordUrl:"https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m",
      rightsUrl:"https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted",
      wmsUrl:WMS,route:"/v2/sky/moon"});
    this.coverage=new FixedBodyTexturePublicationService(coverageUrl,{
      ...MOON_COVERAGE_PUBLICATION,format:"png",validateMetadata:isMoonCoverageMetadata});
  }

  coverageManifest(){return this.coverage.manifest();}
  coverageImage(publicationHash:string){return this.coverage.image(publicationHash);}

  override async image(publicationHash:string){
    // The metadata-only correction retains exactly the original JPEG bytes.
    // Cached manifests must keep resolving their immutable image URL. Never
    // reuse this alias for a future image change; the base owner verifies bytes.
    return super.image(publicationHash===LEGACY_MOON_TEXTURE_PUBLICATION_HASH?this.manifest().publicationHash:publicationHash);
  }
}
