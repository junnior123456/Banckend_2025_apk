import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm';
import { User } from 'src/users/user.entity';

@Entity({ name: 'roles' })
export class Rol {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  route: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
