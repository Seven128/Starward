import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {NotFoundException} from "@nestjs/common";
import type {JupiterBandsManifestData,MarsTextureManifestData,MercuryTextureManifestData,MoonTextureManifestData,MoonCoverageManifestData,SaturnBandsManifestData,UranusBandsManifestData,NeptuneBandsManifestData} from "@starward/miniapp-contracts";

type Manifest=JupiterBandsManifestData|SaturnBandsManifestData|UranusBandsManifestData|NeptuneBandsManifestData|MarsTextureManifestData|MercuryTextureManifestData|MoonTextureManifestData|MoonCoverageManifestData;
type Stored<T extends Manifest>=Omit<T,"publicationHash"|"image"> & {image:Omit<T["image"],"downloadUrl">};
type FixedSource={schemaVersion:Manifest["schemaVersion"];file:string;width:number;height:number;
  bytes:number;sha256:string;recordUrl:string;rightsUrl:string;wmsUrl?:string;route:string;
  format?:"jpeg"|"png";validateMetadata?:(root:Record<string,unknown>)=>boolean};
const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

/** Fixed local publication: rights metadata and exact bytes are checked before delivery. */
export class FixedBodyTexturePublicationService<T extends Manifest>{
  private stored:{root:Stored<T>;hash:string}|null=null;
  constructor(private readonly manifestUrl:URL,private readonly fixed:FixedSource){}

  private publication(){
    if(this.stored)return this.stored;
    const bytes=readFileSync(this.manifestUrl);
    const root=JSON.parse(bytes.toString("utf8")) as Stored<T>;
    const usgsSource=root.source as MoonTextureManifestData["source"];
    const usgsProjection=root.projection as MoonTextureManifestData["projection"];
    if(root?.schemaVersion!==this.fixed.schemaVersion||
      root.source?.recordUrl!==this.fixed.recordUrl||root.source?.rightsUrl!==this.fixed.rightsUrl||
      !root.source?.credit||!root.processing||
      (this.fixed.validateMetadata
        ?!this.fixed.validateMetadata(root as Record<string,unknown>)
        :usgsSource.provider!=="USGS Astrogeology Science Center"||
          usgsSource.wmsUrl!==this.fixed.wmsUrl||
          usgsProjection?.kind!=="simple-cylindrical"||usgsProjection.latitude!=="planetocentric"||
          usgsProjection.longitude!=="positive-east"||
          JSON.stringify(usgsProjection.bboxDeg)!=="[-180,-90,180,90]")||
      root.image?.file!==this.fixed.file||root.image.width!==this.fixed.width||
      root.image.height!==this.fixed.height||root.image.bytes!==this.fixed.bytes||
      root.image.sha256!==this.fixed.sha256||
      !Array.isArray(root.limitations)||root.limitations.length<2)
      throw new Error("body_texture_publication_invalid");
    this.stored={root,hash:hash(bytes)};
    return this.stored;
  }

  manifest():T{
    const {root,hash:publicationHash}=this.publication();
    return {...root,publicationHash,image:{...root.image,
      downloadUrl:`${this.fixed.route}/${publicationHash}/${this.fixed.file}`}} as T;
  }

  async image(publicationHash:string){
    if(publicationHash!==this.publication().hash)throw new NotFoundException("body_texture_version_unavailable");
    const bytes=await readFile(new URL(this.fixed.file,this.manifestUrl));
    const stored=this.publication().root.image;
    const signature=this.fixed.format==="png"
      ?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      :bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9;
    if(bytes.length!==stored.bytes||hash(bytes)!==stored.sha256||!signature)
      throw new Error("body_texture_image_invalid");
    return bytes;
  }
}
