import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, MAX_DOC_BYTES } from './dto/create-document.dto';

/**
 * Módulo 3 — Documentos y galería del expediente.
 * Todo el controlador exige JWT; la propiedad la valida el servicio.
 * Usar SIEMPRE `req.user.userId` (la estrategia JWT no expone `id`).
 */
@Controller('pets/:petId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(@Param('petId', ParseIntPipe) petId: number, @Req() req: any) {
    return this.service.list(petId, req.user.userId, req.user.roles);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DOC_BYTES } }),
  )
  create(
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.create(petId, dto, file, req.user.userId, req.user.roles);
  }

  @Get(':id/file')
  async file(
    @Param('petId', ParseIntPipe) petId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { abs, doc } = await this.service.getFile(
      petId,
      id,
      req.user.userId,
      req.user.roles,
    );
    // Documento médico: nunca cachear en proxies compartidos.
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Length': String(doc.sizeBytes),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename="documento-${doc.id}"`,
    });
    return new StreamableFile(createReadStream(abs));
  }

  @Delete(':id')
  remove(
    @Param('petId', ParseIntPipe) petId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.remove(petId, id, req.user.userId, req.user.roles);
  }
}
