import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import Groq from 'groq-sdk';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'database/generated/client';
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
    try {
      return await this.prisma.chatSession.create({
        data: {
          userId: userId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          this.logger.error(e);

          throw new NotFoundException('User not found');
        }
      }
      throw e;
    }
  }

  async createMessages(createChatMessagesDtos: CreateChatMessagesDto[]) {
    try {
      return await this.prisma.messages.createMany({
        data: createChatMessagesDtos.map((dto) => ({
          message: dto.message,
          role: dto.role,
          chatSessionID: dto.chatSessionId,
        })),
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          this.logger.error(e);

          throw new NotFoundException('this chatSession Id doesnt exist');
        }
      }
      throw e;
    }
  }

  async callGrokApi(
    messages: Array<ChatCompletionMessageParam>,
  ): Promise<ChatCompletion> {
    try {
      return await this.groq.chat.completions.create({
        messages: messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_completion_tokens: 150,
        stop: null,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('AI service unavailable');
    }
  }

  async deleteUserChat(chatSessionId: number, userId: number): Promise<string> {
    await this.usersRepository.findById(userId);

    await this.prisma.chatSession
      .delete({
        where: { id: chatSessionId, userId: userId },
      })
      .catch((e) => {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2025'
        ) {
          this.logger.error(e);
          throw new NotFoundException('Chat session not found');
        }
        throw e;
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
    try {
      return await this.prisma.chatSession.findFirstOrThrow({
        where: { id: chatSessionId, userId: userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Chat session not found');
        }
      }
      this.logger.error(
        `Failed to find chat session with id ${chatSessionId}`,
        error,
      );
      throw new InternalServerErrorException('Failed to find chat session');
    }
  }

  async findMessagesBySessionId(
    chatSessionId: number,
  ): Promise<MessagesResDTO[]> {
    try {
      return await this.prisma.messages.findMany({
        where: { chatSessionID: chatSessionId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find messages for chat session ${chatSessionId}`,
        error,
      );
      throw new InternalServerErrorException('Failed to find messages');
    }
  }

  async updateChatSessionTimestamp(
    chatSessionId: number,
    userId: number,
  ): Promise<ChatSessionResDTO> {
    try {
      return await this.prisma.chatSession.update({
        where: { id: chatSessionId, userId: userId },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Chat session not found');
        }
      }
      this.logger.error(
        `Failed to update chat session ${chatSessionId}`,
        error,
      );
      throw new InternalServerErrorException('Failed to update chat session');
    }
  }
}
