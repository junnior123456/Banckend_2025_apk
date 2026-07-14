import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { OpenConversationDto, SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Abre (o recupera) la conversación 1‑a‑1 entre `meId` y `withUserId`. */
  async openConversation(meId: number, dto: OpenConversationDto) {
    if (dto.withUserId === meId) {
      throw new ForbiddenException('No puedes chatear contigo mismo');
    }
    const otro = await this.userRepo.findOne({ where: { id: dto.withUserId } });
    if (!otro) throw new NotFoundException('El usuario no existe');

    // Participantes normalizados: userAId siempre el menor.
    const userAId = Math.min(meId, dto.withUserId);
    const userBId = Math.max(meId, dto.withUserId);
    const type = dto.type ?? ConversationType.DIRECT;

    let conv = await this.conversationRepo.findOne({
      where: {
        userAId,
        userBId,
        type,
        petId: dto.petId ?? IsNull(),
        veterinariaId: dto.veterinariaId ?? IsNull(),
      },
    });
    if (!conv) {
      conv = await this.conversationRepo.save(
        this.conversationRepo.create({
          type,
          userAId,
          userBId,
          petId: dto.petId ?? null,
          veterinariaId: dto.veterinariaId ?? null,
        }),
      );
    }
    return this.decorarConversacion(conv, meId);
  }

  /** Lista mis conversaciones, con el otro participante y nº de no leídos. */
  async listConversations(meId: number) {
    const convs = await this.conversationRepo.find({
      where: [{ userAId: meId }, { userBId: meId }],
      order: { lastMessageAt: 'DESC', id: 'DESC' },
    });
    return Promise.all(convs.map((c) => this.decorarConversacion(c, meId)));
  }

  /** Mensajes de una conversación. `afterId` permite sondear solo lo nuevo. */
  async getMessages(meId: number, conversationId: number, afterId?: number) {
    await this.getConversacionSiParticipa(meId, conversationId);
    return this.messageRepo.find({
      where: afterId
        ? { conversationId, id: MoreThan(afterId) }
        : { conversationId },
      order: { id: 'ASC' },
      take: afterId ? 200 : 100,
    });
  }

  /** Envía un mensaje y avisa al otro participante. */
  async sendMessage(meId: number, conversationId: number, dto: SendMessageDto) {
    const conv = await this.getConversacionSiParticipa(meId, conversationId);

    const saved = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderId: meId,
        body: dto.body.trim(),
      }),
    );

    conv.lastMessage = dto.body.trim().slice(0, 200);
    conv.lastMessageAt = saved.createdAt;
    await this.conversationRepo.save(conv);

    // Avisar al OTRO participante (createNotification ya corre como sistema).
    const otroId = conv.userAId === meId ? conv.userBId : conv.userAId;
    const yo = await this.userRepo.findOne({ where: { id: meId } });
    try {
      await this.notifications.createNotification(
        otroId,
        '💬 Nuevo mensaje',
        `${yo?.name || 'Alguien'}: ${dto.body.trim().slice(0, 80)}`,
        NotificationType.NEW_MESSAGE,
        { conversationId },
        conv.petId ?? undefined,
        undefined,
        meId,
      );
    } catch {
      /* la notificación no debe tumbar el envío del mensaje */
    }
    return saved;
  }

  /** Marca como leídos los mensajes que me envió el otro. */
  async markRead(meId: number, conversationId: number) {
    await this.getConversacionSiParticipa(meId, conversationId);
    await this.messageRepo.update(
      { conversationId, senderId: Not(meId), readAt: IsNull() },
      { readAt: new Date() },
    );
    return { ok: true };
  }

  // ── privados ────────────────────────────────────────────────────────────
  private async getConversacionSiParticipa(meId: number, conversationId: number) {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    if (conv.userAId !== meId && conv.userBId !== meId) {
      throw new ForbiddenException('No participas en esta conversación');
    }
    return conv;
  }

  private async decorarConversacion(conv: Conversation, meId: number) {
    const otroId = conv.userAId === meId ? conv.userBId : conv.userAId;
    const otro = await this.userRepo.findOne({
      where: { id: otroId },
      select: ['id', 'name', 'lastname', 'image'],
    });
    const noLeidos = await this.messageRepo.count({
      where: { conversationId: conv.id, senderId: Not(meId), readAt: IsNull() },
    });
    return {
      id: conv.id,
      type: conv.type,
      petId: conv.petId,
      veterinariaId: conv.veterinariaId,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unread: noLeidos,
      other: otro ?? { id: otroId },
    };
  }
}
