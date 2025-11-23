import { Comment } from '../../comments/comment.entity';

export interface CommentRepository {
  findAll(): Promise<Comment[]>;
  findById(id: number): Promise<Comment>;
  findByPetId(petId: number): Promise<Comment[]>;
  create(data: any): Promise<Comment>;
  update(id: number, data: any): Promise<Comment>;
  delete(id: number): Promise<{ message: string }>;
}

export const COMMENT_REPOSITORY = 'CommentRepository';
