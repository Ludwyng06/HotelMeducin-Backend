import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DocumentTypesService } from '@services/document-types.service';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '@models/document-types/dto/document-type.dto';
import { Public } from '@common/decorators/public.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@Controller('document-types')
export class DocumentTypesController {
	constructor(private readonly documentTypesService: DocumentTypesService) {}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('admin', 'superadmin')
	create(@Body() createDocumentTypeDto: CreateDocumentTypeDto) {
		return this.documentTypesService.create(createDocumentTypeDto);
	}

	@Public()
	@Get()
	findAll() {
		return this.documentTypesService.findAll();
	}

	// Endpoint público para evitar colisión con ':id'
	@Public()
	@Get('public')
	getPublic() {
		return this.documentTypesService.findAll();
	}

	@Public()
	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.documentTypesService.findOne(id);
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('admin', 'superadmin')
	update(@Param('id') id: string, @Body() updateDocumentTypeDto: UpdateDocumentTypeDto) {
		return this.documentTypesService.update(id, updateDocumentTypeDto);
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('admin', 'superadmin')
	remove(@Param('id') id: string) {
		return this.documentTypesService.remove(id);
	}
}
