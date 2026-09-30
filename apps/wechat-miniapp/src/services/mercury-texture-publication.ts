import type {MercuryTextureManifestData} from "@starward/miniapp-contracts";

const sha=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/u.test(v);
const file="mercury-messenger-2013-usgs-wms-1024x512.jpg";
const record="https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m";
const wms="https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mercury/mercury_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MESSENGER_May2013&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE";

export function assertMercuryTextureManifest(value:unknown):asserts value is MercuryTextureManifestData{
  const root=value as MercuryTextureManifestData;
  if(root?.schemaVersion!=="starward-messenger-mercury-v1"||!sha(root.publicationHash)||
    root.source?.provider!=="USGS Astrogeology Science Center"||
    root.source.recordUrl!==record||root.source.rightsUrl!==record||
    root.source.wmsUrl!==wms||!root.source.credit||!root.processing||
    root.projection?.kind!=="simple-cylindrical"||root.projection.latitude!=="planetocentric"||
    root.projection.longitude!=="positive-east"||
    JSON.stringify(root.projection.bboxDeg)!=="[-180,-90,180,90]"||
    root.image?.file!==file||root.image.width!==1024||root.image.height!==512||
    root.image.bytes!==89984||root.image.sha256!=="b782316d7458df90198d8e9664abb3902841c0709085bd20f03e46706a252d81"||
    root.image.downloadUrl!==`/v2/sky/mercury/${root.publicationHash}/${file}`||
    !Array.isArray(root.limitations)||root.limitations.length<2)
    throw new Error("mercury_texture_manifest_invalid");
}
