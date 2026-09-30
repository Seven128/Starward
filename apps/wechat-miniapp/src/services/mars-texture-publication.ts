import type {MarsTextureManifestData} from "@starward/miniapp-contracts";

const sha=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/u.test(v);
const file="mars-mdim21-color-usgs-wms-1024x512.jpg";
const record="https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m";
const wms="https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MDIM21_color&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE";

export function assertMarsTextureManifest(value:unknown):asserts value is MarsTextureManifestData{
  const root=value as MarsTextureManifestData;
  if(root?.schemaVersion!=="starward-viking-mars-v1"||!sha(root.publicationHash)||
    root.source?.provider!=="USGS Astrogeology Science Center"||
    root.source.recordUrl!==record||root.source.rightsUrl!==record||
    root.source.wmsUrl!==wms||!root.source.credit||!root.processing||
    root.projection?.kind!=="simple-cylindrical"||root.projection.latitude!=="planetocentric"||
    root.projection.longitude!=="positive-east"||
    JSON.stringify(root.projection.bboxDeg)!=="[-180,-90,180,90]"||
    root.image?.file!==file||root.image.width!==1024||root.image.height!==512||
    root.image.bytes!==94411||root.image.sha256!=="cd324068ee22f66664d15ff5934ff6cfc195bb0e2ee8becba6092f078442d184"||
    root.image.downloadUrl!==`/v2/sky/mars/${root.publicationHash}/${file}`||
    !Array.isArray(root.limitations)||root.limitations.length<2)
    throw new Error("mars_texture_manifest_invalid");
}
