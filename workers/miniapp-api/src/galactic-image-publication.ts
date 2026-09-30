import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {NotFoundException} from "@nestjs/common";
import type {GalacticImageManifestData} from "@starward/miniapp-contracts";

const FILE="2mass-galactic-2048x1024.jpg";
const IMAGE_SHA="e3a70f835197c6a6965871fc4224635aa5d04a4874d2fa1c177a9a1470d1e2a0";
const SOURCE_SHA="c3a2ea0bebfe79eab5213480e3766c5437369a6da3d6f5ddec46860dfbf6a26c";
const SOURCE_URL="https://coolcosmos.ipac.caltech.edu/system/avm_image_sqls/binaries/142/original/allsky-2mass.jpg?1373926530=";
const CREDIT="2MASS/J. Carpenter, T. H. Jarrett, & R. Hurt; UMass/IPAC-Caltech/NASA/NSF";
const DEFAULT_MANIFEST=new URL("../assets/deep-sky/galactic-2mass/manifest.json",import.meta.url);
const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
type Stored=Omit<GalacticImageManifestData,"publicationHash"|"image"> &
  {image:Omit<GalacticImageManifestData["image"],"downloadUrl">};

/** A fixed, reviewed gallery derivative; do not accept arbitrary survey URLs. */
export class GalacticImagePublicationService {
  private cached:{root:Stored;publicationHash:string}|null=null;
  constructor(private readonly manifestUrl:URL=DEFAULT_MANIFEST){}
  private publication(){
    if(this.cached)return this.cached;
    const bytes=readFileSync(this.manifestUrl);
    const root=JSON.parse(bytes.toString("utf8")) as Stored;
    if(root?.schemaVersion!=="starward-2mass-galactic-v1"||
      root.source?.provider!=="IPAC / Cool Cosmos"||
      root.source.recordUrl!=="https://coolcosmos.ipac.caltech.edu/images/142"||
      root.source.rightsUrl!=="https://coolcosmos.ipac.caltech.edu/page/image_use_policy"||
      root.source.galleryRightsUrl!=="https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html"||
      root.source.sourceSha256!==SOURCE_SHA||root.source.sourceUrl!==SOURCE_URL||
      root.source.credit!==CREDIT||
      root.projection?.kind!=="equirectangular"||root.projection.frame!=="galactic"||
      root.projection.centerLongitudeDeg!==0||root.projection.longitudeIncreases!=="left"||
      root.projection.north!=="up"||root.image?.file!==FILE||
      root.image.sha256!==IMAGE_SHA||root.image.bytes!==703555||
      root.image.width!==2048||root.image.height!==1024||
      !root.processing||!Array.isArray(root.limitations)||root.limitations.length<2)
      throw new Error("galactic_image_publication_invalid");
    this.cached={root,publicationHash:hash(bytes)};
    return this.cached;
  }
  manifest():GalacticImageManifestData {
    const {root,publicationHash}=this.publication();
    return {...root,publicationHash,image:{...root.image,
      downloadUrl:`/v2/sky/galactic/${publicationHash}/${FILE}`}};
  }
  async image(publicationHash:string){
    if(publicationHash!==this.publication().publicationHash)
      throw new NotFoundException("galactic_image_version_unavailable");
    const bytes=await readFile(new URL(FILE,this.manifestUrl));
    if(bytes.length!==703555||hash(bytes)!==IMAGE_SHA||bytes[0]!==0xff||bytes[1]!==0xd8||
      bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9)throw new Error("galactic_image_corrupt");
    return bytes;
  }
}
