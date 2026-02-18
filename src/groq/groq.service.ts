import { Injectable } from '@nestjs/common';

import { Messages } from 'database/generated/client';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat.mjs';
import { MINDPRIDE_SYSTEM_PROMPT } from 'src/utils/constants';
import { GroqRepository } from './groq.repository';
import { CreateChatMessagesDto } from './dto/in/create-chat-messages.dto';

@Injectable()
export class GroqService {
  // TODO: add email unique validation

  constructor(private readonly groqRepository: GroqRepository) {}

  async getGroqChatIntro(userId: number): Promise<string> {
    const chatResponse = await this.groqRepository.callGrokApi([
      {
        role: 'system',
        content: MINDPRIDE_SYSTEM_PROMPT,
      },
    ]);

    const chatSession = await this.groqRepository.createChatSession(userId);

    const assistantMessage =
      this.groqRepository.validateChatResponse(chatResponse);

    await this.groqRepository.createMessages([
      {
        message: assistantMessage,
        role: 'assistant',
        chatSessionId: chatSession.id,
      },
    ]);

    return assistantMessage;
  }

  async newUserChat(userMessage: string, userId: number): Promise<string> {
    const chatResponse = await this.groqRepository.callGrokApi([
      {
        role: 'system',
        content: MINDPRIDE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ]);

    const assistantMessage =
      this.groqRepository.validateChatResponse(chatResponse);

    const chatSession = await this.groqRepository.createChatSession(userId);

    const messages: CreateChatMessagesDto[] = [
      { message: userMessage, role: 'user', chatSessionId: chatSession.id },
      {
        message: assistantMessage,
        role: 'assistant',
        chatSessionId: chatSession.id,
      },
    ];

    await this.groqRepository.createMessages(messages);

    return assistantMessage;
  }

  async continueUserChat(
    userMessage: string,
    chatSessionId: number,
    userId: number,
  ): Promise<string> {
    await this.groqRepository.findChatSessionById(chatSessionId, userId);

    const chatSessionMessageHistory: Messages[] =
      await this.groqRepository.findMessagesBySessionId(chatSessionId);

    const historyMessages: ChatCompletionMessageParam[] =
      chatSessionMessageHistory.map((element) => ({
        role: element.role as 'user' | 'assistant' | 'system',
        content: element.message,
      }));

    const chatResponse = await this.groqRepository.callGrokApi([
      {
        role: 'system',
        content: MINDPRIDE_SYSTEM_PROMPT,
      },
      ...historyMessages,
      {
        role: 'user',
        content: userMessage,
      },
    ]);

    const assistantMessage =
      this.groqRepository.validateChatResponse(chatResponse);

    await this.groqRepository.updateChatSessionTimestamp(chatSessionId, userId);

    await this.groqRepository.createMessages([
      { message: userMessage, role: 'user', chatSessionId },
      { message: assistantMessage, role: 'assistant', chatSessionId },
    ]);

    return assistantMessage;
  }

  deleteUserChat(chatSessionId: number, userId: number): Promise<string> {
    return this.groqRepository.deleteUserChat(chatSessionId, userId);
  }
}
