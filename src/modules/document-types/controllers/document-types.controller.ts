import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DocumentTypesService } from '../services/document-types.service';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../dto/document-type.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get('public')
  findAllPublic() {
    return this.documentTypesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'admin')
  create(@Body() createDocumentTypeDto: CreateDocumentTypeDto) {
    return this.documentTypesService.create(createDocumentTypeDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'admin')
  findAll() {
    return this.documentTypesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'admin')
  findOne(@Param('id') id: string) {
    return this.documentTypesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'admin')
  update(@Param('id') id: string, @Body() updateDocumentTypeDto: UpdateDocumentTypeDto) {
    return this.documentTypesService.update(id, updateDocumentTypeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'admin')
  remove(@Param('id') id: string) {
    return this.documentTypesService.remove(id);
  }
}
