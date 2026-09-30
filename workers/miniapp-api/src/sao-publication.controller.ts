import { Controller,Get,Inject,Param } from '@nestjs/common';
import { SaoPublicationService } from './sao-publication.ts';

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
}
