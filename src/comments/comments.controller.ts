import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // Obtener comentarios de una mascota
  @Get('pet/:petId')
  async getCommentsByPet(
    @Param('petId') petId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const result = await this.commentsService.getCommentsByPet(
        parseInt(petId),
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener comentarios',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Crear nuevo comentario
  @Post()
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.commentsService.createComment(
        createCommentDto,
        userId,
      );
      
      return {
        ok: true,
        message: 'Comentario creado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al crear comentario',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Responder a un comentario
  @Post('reply')
  @UseGuards(JwtAuthGuard)
  async replyToComment(
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.commentsService.replyToComment(
        createCommentDto,
        userId,
      );
      
      return {
        ok: true,
        message: 'Respuesta creada exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al crear respuesta',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener respuestas de un comentario
  @Get(':commentId/replies')
  async getReplies(
    @Param('commentId') commentId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '5',
  ) {
    try {
      const result = await this.commentsService.getReplies(
        parseInt(commentId),
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener respuestas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Actualizar comentario
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.commentsService.updateComment(
        parseInt(id),
        updateCommentDto,
        userId,
      );
      
      return {
        ok: true,
        message: 'Comentario actualizado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar comentario',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Eliminar comentario
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      await this.commentsService.deleteComment(parseInt(id), userId);
      
      return {
        ok: true,
        message: 'Comentario eliminado exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al eliminar comentario',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Reportar comentario
  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportComment(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.commentsService.reportComment(
        parseInt(id),
        userId,
      );
      
      return {
        ok: true,
        message: 'Comentario reportado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al reportar comentario',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener comentarios del usuario
  @Get('my-comments')
  @UseGuards(JwtAuthGuard)
  async getMyComments(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.commentsService.getCommentsByUser(
        userId,
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener mis comentarios',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}