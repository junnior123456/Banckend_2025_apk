/**
 * DOMAIN LAYER - Interfaz del repositorio de IA
 * Define el contrato que debe cumplir cualquier implementación del repositorio
 * Principio de inversión de dependencias (Clean Architecture)
 */
import { AiChat, AiChatType } from '../entities/ai-chat.entity';

export interface IAiRepository {
  /**
   * Guarda un chat en la base de datos
   */
  saveChat(chat: AiChat): Promise<AiChat>;

  /**
   * Obtiene el historial de chats de un usuario
   */
  getChatHistory(userId: number, limit?: number): Promise<AiChat[]>;

  /**
   * Obtiene chats por tipo
   */
  getChatsByType(userId: number, type: AiChatType): Promise<AiChat[]>;
}
