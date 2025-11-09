import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Obtener comentarios de una mascota con paginación
  async getCommentsByPet(petId: number, page: number = 1, limit: number = 10) {
    // Verificar que la mascota existe
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    const skip = (page - 1) * limit;

    // Obtener comentarios principales (sin padre)
    const [comments, total] = await this.commentRepository.findAndCount({
      where: { 
        petId, 
        parentCommentId: null,
        isReported: false, // No mostrar comentarios reportados
      },
      relations: ['user', 'replies', 'replies.user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Para cada comentario, obtener solo las primeras 3 respuestas
    const commentsWithLimitedReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await this.commentRepository.find({
          where: { 
            parentCommentId: comment.id,
            isReported: false,
          },
          relations: ['user'],
          order: { createdAt: 'ASC' },
          take: 3,
        });

        const totalReplies = await this.commentRepository.count({
          where: { 
            parentCommentId: comment.id,
            isReported: false,
          },
        });

        return {
          ...comment,
          replies,
          totalReplies,
          hasMoreReplies: totalReplies > 3,
        };
      })
    );

    return {
      comments: commentsWithLimitedReplies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Crear nuevo comentario
  async createComment(createCommentDto: CreateCommentDto, userId: number): Promise<Comment> {
    const { petId, content, parentCommentId } = createCommentDto;

    // Verificar que la mascota existe
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    // Si es una respuesta, verificar que el comentario padre existe
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentCommentId, petId },
      });
      if (!parentComment) {
        throw new NotFoundException('Comentario padre no encontrado');
      }
    }

    // Crear el comentario
    const comment = this.commentRepository.create({
      content,
      petId,
      userId,
      parentCommentId: parentCommentId || null,
    });

    const savedComment = await this.commentRepository.save(comment);

    // TODO: Enviar notificación al dueño de la mascota
    // if (!parentCommentId) {
    //   await this.notificationService.sendNewCommentNotification(pet.userId, savedComment);
    // } else {
    //   // Notificar al autor del comentario padre
    //   const parentComment = await this.commentRepository.findOne({ where: { id: parentCommentId } });
    //   if (parentComment.userId !== userId) {
    //     await this.notificationService.sendCommentReplyNotification(parentComment.userId, savedComment);
    //   }
    // }

    return await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user', 'pet'],
    });
  }

  // Responder a un comentario (alias para createComment con parentCommentId)
  async replyToComment(createCommentDto: CreateCommentDto, userId: number): Promise<Comment> {
    if (!createCommentDto.parentCommentId) {
      throw new BadRequestException('Se requiere el ID del comentario padre para crear una respuesta');
    }
    return this.createComment(createCommentDto, userId);
  }

  // Obtener respuestas de un comentario
  async getReplies(commentId: number, page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;

    const [replies, total] = await this.commentRepository.findAndCount({
      where: { 
        parentCommentId: commentId,
        isReported: false,
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    return {
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Actualizar comentario
  async updateComment(
    commentId: number,
    updateCommentDto: UpdateCommentDto,
    userId: number,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // Verificar que el usuario es el autor del comentario
    if (comment.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para editar este comentario');
    }

    // Actualizar el comentario
    comment.content = updateCommentDto.content;
    comment.isEdited = true;
    comment.updatedAt = new Date();

    return await this.commentRepository.save(comment);
  }

  // Eliminar comentario
  async deleteComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['replies'],
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // Verificar que el usuario es el autor del comentario
    if (comment.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para eliminar este comentario');
    }

    // Si el comentario tiene respuestas, solo marcar como eliminado
    if (comment.replies && comment.replies.length > 0) {
      comment.content = '[Comentario eliminado]';
      comment.updatedAt = new Date();
      await this.commentRepository.save(comment);
    } else {
      // Si no tiene respuestas, eliminar completamente
      await this.commentRepository.remove(comment);
    }
  }

  // Reportar comentario
  async reportComment(commentId: number, userId: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // No permitir reportar propio comentario
    if (comment.userId === userId) {
      throw new BadRequestException('No puedes reportar tu propio comentario');
    }

    // Incrementar contador de reportes
    comment.reportCount += 1;
    comment.isReported = comment.reportCount >= 3; // Marcar como reportado si tiene 3+ reportes

    // TODO: Crear registro en la tabla de reportes
    // await this.reportsService.createReport({
    //   reportableType: 'comment',
    //   reportableId: commentId,
    //   reporterId: userId,
    //   type: 'inappropriate_content',
    //   reason: 'Contenido inapropiado reportado por usuario',
    // });

    return await this.commentRepository.save(comment);
  }

  // Obtener comentarios del usuario
  async getCommentsByUser(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [comments, total] = await this.commentRepository.findAndCount({
      where: { userId },
      relations: ['pet', 'parentComment'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener estadísticas de comentarios
  async getCommentStats(userId: number) {
    const totalComments = await this.commentRepository.count({
      where: { userId },
    });

    const totalReplies = await this.commentRepository.count({
      where: { userId, parentCommentId: { $ne: null } as any },
    });

    const reportedComments = await this.commentRepository.count({
      where: { userId, isReported: true },
    });

    return {
      totalComments,
      totalReplies,
      reportedComments,
      mainComments: totalComments - totalReplies,
    };
  }
}