import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentTypesService } from '@services/document-types.service';
import { DocumentTypesController } from '@controllers/document-types.controller';
import { DocumentType, DocumentTypeSchema } from '@models/document-types/document-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentType.name, schema: DocumentTypeSchema }
    ])
  ],
  controllers: [DocumentTypesController],
  providers: [DocumentTypesService],
  exports: [DocumentTypesService],
})
export class DocumentTypesModule {}
