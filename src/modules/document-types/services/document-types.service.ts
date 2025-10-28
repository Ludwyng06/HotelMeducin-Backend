import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentType, DocumentTypeDocument } from '../schemas/document-type.schema';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dto/document-type.dto';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectModel(DocumentType.name) private documentTypeModel: Model<DocumentTypeDocument>,
  ) {}

  async create(createDocumentTypeDto: CreateDocumentTypeDto): Promise<DocumentType> {
    const createdDocumentType = new this.documentTypeModel(createDocumentTypeDto);
    return createdDocumentType.save();
  }

  async findAll(): Promise<DocumentType[]> {
    return this.documentTypeModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findById(id).exec();
  }

  async findByCode(code: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findOne({ code, isActive: true }).exec();
  }

  async update(id: string, updateDocumentTypeDto: UpdateDocumentTypeDto): Promise<DocumentType | null> {
    return this.documentTypeModel.findByIdAndUpdate(id, updateDocumentTypeDto, { new: true }).exec();
  }

  async remove(id: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
  }
}
