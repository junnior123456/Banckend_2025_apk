import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../comments/comment.entity';
import { CommentRepository, COMMENT_REPOSITORY } from '../../domain/comments/comment_repository.interface';

@Injectable()
export class TypeOrmCommentRepository implements CommentRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async findAll(): Promise<Comment[]> {
    return this.commentRepository.find({ relations: ['pet', 'user'] });
  }

  async findById(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { id }, relations: ['pet', 'user'] });
    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }
    return comment;
  }

  async findByPetId(petId: number): Promise<Comment[]> {
    return this.commentRepository.find({ where: { petId }, relations: ['user'] });
  }

  async create(data: any): Promise<Comment> {
    const comment = this.commentRepository.create(data) as unknown as Comment;
    const saved = await this.commentRepository.save(comment);
    return saved as Comment;
  }

  async update(id: number, data: any): Promise<Comment> {
    await this.commentRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<{ message: string }> {
    const comment = await this.findById(id);
    await this.commentRepository.remove(comment);
    return { message: 'Comentario eliminado exitosamente' };
  }
}

export const TypeOrmCommentRepositoryProvider = {
  provide: COMMENT_REPOSITORY,
  useClass: TypeOrmCommentRepository,
};
