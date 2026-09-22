import { Controller,Get,Inject,Param } from '@nestjs/common';
import { SaoPublicationService } from './sao-publication.ts';

@Controller('v2/sky/supplements/sao')
export class SaoPublicationController {
  constructor(@Inject(SaoPublicationService) private readonly publication:SaoPublicationService){}
  @Get()get(){return this.publication.get();}
  @Get(':publicationHash/tiles/:tileId')tile(@Param('publicationHash')publicationHash:string,@Param('tileId')tileId:string){
    return this.publication.tile(publicationHash,tileId);
  }
}
