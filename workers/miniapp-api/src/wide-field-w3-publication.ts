import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NotFoundException } from "@nestjs/common";
import type { WideFieldW3ManifestData } from "@starward/miniapp-contracts";

type StoredManifest = Omit<WideFieldW3ManifestData,"publicationHash"|"propertiesUrl"|"tiles"> & {
  propertiesSha256:string;
  tiles:Array<Omit<WideFieldW3ManifestData["tiles"][number],"downloadUrl">>;
};
const DEFAULT_MANIFEST = new URL("../assets/deep-sky/wide-field-w3/manifest.json",import.meta.url);
const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const digest=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);
const sourceRoot="https://alasky.cds.unistra.fr/AllWISE/W3";

/** Immutable, rights-labelled partial copy of the CDS master. Runtime never
 * proxies CDS or infers coverage beyond the twelve hash-bound JPEGs. */
export class WideFieldW3PublicationService {
  private stored:{root:StoredManifest;hash:string}|null=null;
  constructor(private readonly manifestUrl:URL=DEFAULT_MANIFEST){}

  private publication(){
    if(this.stored)return this.stored;
    const bytes=readFileSync(this.manifestUrl);
    const root=JSON.parse(bytes.toString("utf8")) as StoredManifest;
    if(root?.schemaVersion!=="starward-allwise-w3-wide-v1"||
      root.source?.masterUrl!==sourceRoot||
      root.source?.originalRightsUrl!=="https://irsa.ipac.caltech.edu/data_use_terms.html"||
      root.source?.originalCopyright!=="IPAC/NASA"||
      root.source?.hipsCopyright!=="CNRS/Unistra"||
      root.source?.hipsLicense!=="ODbL-1.0"||
      root.source?.hipsDoi!=="10.26093/cds/aladin/na1n-03"||
      !root.source.acknowledgment||!root.source.acknowledgmentUrl||
      root.hips?.frame!=="equatorial"||root.hips.order!==0||
      root.hips.tileWidth!==512||root.hips.tileFormat!=="jpeg"||
      root.hips.status!=="public partial unclonable"||
      !digest(root.propertiesSha256)||!root.processing||
      !Array.isArray(root.limitations)||root.limitations.length<2||
      !Array.isArray(root.tiles)||root.tiles.length!==12)
      throw new Error("wide_field_w3_publication_invalid");
    const seen=new Set<number>();
    for(const tile of root.tiles){
      if(!Number.isInteger(tile.pixel)||tile.pixel<0||tile.pixel>11||seen.has(tile.pixel)||
        tile.file!==`Norder0/Dir0/Npix${tile.pixel}.jpg`||
        tile.sourceUrl!==`${sourceRoot}/${tile.file}`||!digest(tile.sha256)||
        !Number.isInteger(tile.bytes)||tile.bytes<100||tile.bytes>1_000_000)
        throw new Error("wide_field_w3_publication_invalid");
      seen.add(tile.pixel);
    }
    this.stored={root,hash:hash(bytes)};
    return this.stored;
  }

  manifest():WideFieldW3ManifestData{
    const {root,hash:publicationHash}=this.publication();
    return {...root,publicationHash,
      propertiesUrl:`/v2/sky/wide-field/${publicationHash}/properties`,
      tiles:root.tiles.map(tile=>({...tile,
        downloadUrl:`/v2/sky/wide-field/${publicationHash}/${tile.file}`}))};
  }

  private assertHash(publicationHash:string){
    if(publicationHash!==this.publication().hash)throw new NotFoundException("wide_field_w3_version_unavailable");
  }

  async properties(publicationHash:string){
    this.assertHash(publicationHash);
    const bytes=await readFile(new URL("properties",this.manifestUrl));
    if(hash(bytes)!==this.publication().root.propertiesSha256)throw new Error("wide_field_w3_properties_invalid");
    return bytes.toString("utf8");
  }

  async tile(publicationHash:string,pixel:number){
    this.assertHash(publicationHash);
    const tile=this.publication().root.tiles.find(candidate=>candidate.pixel===pixel);
    if(!tile)throw new NotFoundException("wide_field_w3_tile_unavailable");
    const root=fileURLToPath(new URL("./",this.manifestUrl));
    const path=fileURLToPath(new URL(tile.file,this.manifestUrl));
    if(!path.startsWith(resolve(root)+"\\")&&!path.startsWith(resolve(root)+"/"))
      throw new Error("wide_field_w3_path_invalid");
    const bytes=await readFile(path);
    if(bytes.length!==tile.bytes||hash(bytes)!==tile.sha256||
      bytes[0]!==0xff||bytes[1]!==0xd8||bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9)
      throw new Error("wide_field_w3_tile_invalid");
    return bytes;
  }
}
