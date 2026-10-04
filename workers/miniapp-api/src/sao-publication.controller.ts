import { Controller,Get,Headers,Inject,Param,Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { SaoPublicationService } from './sao-publication.ts';
import { skyPublicAssetHeaders } from './sky-public-asset-headers.ts';

@Controller('v2/sky/supplements/sao')
export class SaoPublicationController {
  private readonly revised=new SaoPublicationService(new URL('../assets/sao-v2/',import.meta.url));
  constructor(@Inject(SaoPublicationService) private readonly publication:SaoPublicationService){}
  @Get()get(){return this.publication.get();}
  @Get('v2')revisedGet(){return this.revised.get();}
  @Get(':publicationHash/tiles/:tileId')tile(@Param('publicationHash')publicationHash:string,@Param('tileId')tileId:string){
    return this.publication.tile(publicationHash,tileId);
  }
  @Get('v2/:publicationHash/tiles/:tileId')revisedTile(@Param('publicationHash')publicationHash:string,@Param('tileId')tileId:string){
    return this.revised.tile(publicationHash,tileId);
  }
  @Get('v2/:publicationHash/assets/:tileId')
  async revisedAsset(@Param('publicationHash')publicationHash:string,@Param('tileId')tileId:string,
    @Headers('if-none-match')candidate:string|undefined,@Res()reply:FastifyReply){
    const asset=await this.revised.asset(publicationHash,tileId),etag=`W/"${asset.sha256}"`;
    reply.headers({...skyPublicAssetHeaders('sao',asset.contentType),etag});
    return candidate===etag?reply.status(304).send():reply.send(asset.bytes);
  }
}
