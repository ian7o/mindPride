import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import Groq from 'groq-sdk';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat.mjs';
import { ChatSessionDto } from './dto/in/chat-session.dto';
import { ChatCompletion } from 'groq-sdk/src/resources/chat.js';
import { UsersRepository } from 'src/users/users.repository';
import { CreateChatMessagesDto } from './dto/in/create-chat-messages.dto';
import { ChatSessionResDTO } from './dto/out/chat-session-Res-DTO';
import { MessagesResDTO } from './dto/out/messages-Res-DTO';

@Injectable()
export class GroqRepository {
  constructor(
    private groq: Groq,
    private prisma: PrismaService,
    private usersRepository: UsersRepository,
  ) {}

  private readonly logger = new Logger(GroqRepository.name, {});

  async createChatSession(userId: number): Promise<ChatSessionDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.chatSession.create({ data: { userId } });
  }

  async createMessages(createChatMessagesDtos: CreateChatMessagesDto[]) {
    const chatSessionId = createChatMessagesDtos[0]?.chatSessionId;
    const session = await this.prisma.chatSession.findUnique({
      where: { id: chatSessionId },
    });
    if (!session)
      throw new NotFoundException('this chatSession Id doesnt exist');

    return this.prisma.messages.createMany({
      data: createChatMessagesDtos.map((dto) => ({
        message: dto.message,
        role: dto.role,
        chatSessionID: dto.chatSessionId,
      })),
    });
  }

  async callGrokApi(
    messages: Array<ChatCompletionMessageParam>,
  ): Promise<ChatCompletion> {
    const response = await this.groq.chat.completions
      .create({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_completion_tokens: 150,
        stop: null,
      })
      .catch((error) => {
        this.logger.error(error);
        throw new InternalServerErrorException('AI service unavailable');
      });

    return response;
  }

  async deleteUserChat(chatSessionId: number, userId: number): Promise<string> {
    await this.usersRepository.findById(userId);

    const session = await this.prisma.chatSession.findFirst({
      where: { id: chatSessionId, userId },
    });
    if (!session) throw new NotFoundException('Chat session not found');

    await this.prisma.chatSession.delete({
      where: { id: chatSessionId, userId },
    });

    return 'Chat session deleted successfully';
  }

  validateChatResponse(response: ChatCompletion): string {
    const message = response.choices[0].message.content;
    if (!message) {
      this.logger.error('error no chat response provided');
      throw new InternalServerErrorException('No chat response provided');
    }
    return message;
  }

  async findChatSessionById(chatSessionId: number, userId: number) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: chatSessionId, userId },
    });
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async findMessagesBySessionId(
    chatSessionId: number,
  ): Promise<MessagesResDTO[]> {
    return this.prisma.messages.findMany({
      where: { chatSessionID: chatSessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateChatSessionTimestamp(
    chatSessionId: number,
    userId: number,
  ): Promise<ChatSessionResDTO> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: chatSessionId, userId },
    });
    if (!session) throw new NotFoundException('Chat session not found');

    return this.prisma.chatSession.update({
      where: { id: chatSessionId, userId },
      data: { updatedAt: new Date() },
    });
  }
}
