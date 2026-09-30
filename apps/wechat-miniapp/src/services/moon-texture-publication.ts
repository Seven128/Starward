import type { MoonTextureManifestData } from "@starward/miniapp-contracts";

const sha=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/u.test(v);
const file="clementine-uv750-v2-wms-2048x1024.jpg";
const wms="https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=uv_v2&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg&TRANSPARENT=FALSE";

export function assertMoonTextureManifest(value:unknown):asserts value is MoonTextureManifestData{
  const root=value as MoonTextureManifestData;
  if(root?.schemaVersion!=="starward-clementine-moon-v1"||!sha(root.publicationHash)||
    root.source?.provider!=="USGS Astrogeology Science Center"||
    root.source.recordUrl!=="https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m"||
    root.source.rightsUrl!=="https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted"||
    root.source.wmsUrl!==wms||!root.source.credit||!root.processing||
    root.projection?.kind!=="simple-cylindrical"||root.projection.latitude!=="planetocentric"||
    root.projection.longitude!=="positive-east"||
    JSON.stringify(root.projection.bboxDeg)!=="[-180,-90,180,90]"||
    root.image?.file!==file||root.image.width!==2048||root.image.height!==1024||
    root.image.bytes!==372399||root.image.sha256!=="e071f796a1ec1f7c9f4d87660aabb1bb40adbfacc0ecb253919bee6c711efefb"||
    root.image.downloadUrl!==`/v2/sky/moon/${root.publicationHash}/${file}`||
    !Array.isArray(root.limitations)||root.limitations.length<2)
    throw new Error("moon_texture_manifest_invalid");
}
