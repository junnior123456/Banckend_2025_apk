import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { OpenConversationDto, SendMessageDto } from './dto/chat.dto';

/**
 * Chat 1‑a‑1 entre usuarios (tratos de adopción y consultas a veterinarios).
 * Todo autenticado; el servicio comprueba que el usuario participa.
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('conversations')
  open(@Req() req: any, @Body() dto: OpenConversationDto) {
    return this.chat.openConversation(req.user.userId, dto);
  }

  @Get('conversations')
  list(@Req() req: any) {
    return this.chat.listConversations(req.user.userId);
  }

  @Get('conversations/:id/messages')
  messages(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('after') after?: string,
  ) {
    return this.chat.getMessages(
      req.user.userId,
      id,
      after ? parseInt(after, 10) : undefined,
    );
  }

  @Post('conversations/:id/messages')
  send(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(req.user.userId, id, dto);
  }

  @Post('conversations/:id/read')
  read(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.chat.markRead(req.user.userId, id);
  }
}
