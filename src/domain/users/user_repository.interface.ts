import { User } from '../../users/user.entity';

export interface UserRepository {
  create(data: any): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User>;
  update(id: number, data: any): Promise<User>;
  updateWithImage(file: Express.Multer.File, id: number, data: any): Promise<User>;
  delete(id: number): Promise<{ message: string }>;
  findByEmail(email: string): Promise<User>;
  findByEmailWithPassword(email: string): Promise<User>;
  assignRoleToUser(userId: number, roleId: string): Promise<void>;
}

export const USER_REPOSITORY = 'UserRepository';
