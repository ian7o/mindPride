import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import { PrismaService } from 'src/prisma/prisma.service';
import { $Enums, Messages } from 'database/generated/client';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat.mjs';
import { ChatSessionDto } from './dto/in/chat-session.dto';

@Injectable()
export class GroqService {
  constructor(
    private groq: Groq,
    private prisma: PrismaService,
  ) {}

  private content: string = `You are an empathetic psychology chat bot called mindPride support assistant.

COMMUNICATION RULES:
- Keep responses SHORT (2-3 sentences maximum)
- Use warm, professional tone
- Validate emotions, don't give direct advice
- Ask ONE open question per response
- ALWAYS respond in the user's language automatically

TECHNIQUES:
- Active listening (rephrase what they said)
- Emotional validation ("It's understandable to feel this way")
- Open questions ("How does that make you feel?")
- Normalization ("Many people experience this")

SENSITIVE TOPICS:
- Suicide mentions: express concern, suggest professional help
- Self-harm: validate without judgment, encourage support
- Trauma: go slowly, respect their pace

USER CONTEXT:

Remember: Ask the person name, and write something like fell free to speak its all confidential,ask the person language and, respond in whatever language the user writes in.`;

  async createChatSession(userId: number): Promise<ChatSessionDto> {
    return this.prisma.chatSession.create({
      data: {
        userId: userId,
      },
    });
  }

  async createMessages(
    message: string,
    role: $Enums.MessageRole,
    chatSessionId: number,
  ) {
    return this.prisma.messages.create({
      data: {
        message: message,
        role: role,
        updatedAt: new Date(Date.now()),
        chatSession: { connect: { id: chatSessionId } },
      },
    });
  }

  async getGroqChatIntro(userId: number): Promise<string | null> {
    const chatResponse = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: this.content,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_completion_tokens: 100,
      top_p: 0.9,
      stop: null,
    });

    await this.createChatSession(userId);

    return chatResponse.choices[0].message.content;
  }

  async newUserChat(
    userMessage: string,
    userId: number,
  ): Promise<string | null> {
    const chatResponse = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_completion_tokens: 150,
      top_p: 0.9,
      stop: null,
    });

    const assistantMessage: string | null =
      chatResponse.choices[0].message.content;

    if (assistantMessage == null) {
      console.error('error no chat response provided');
      throw new InternalServerErrorException(
        'error no chat response provided. Try again.',
      );
    }

    const chatSession = await this.createChatSession(userId);

    await this.createMessages(userMessage, 'user', chatSession.id);

    await this.createMessages(assistantMessage, 'assistant', chatSession.id);

    return assistantMessage;
  }

  async convertedChatSessionMessageHistory(
    chatSessionMessageHistory: Messages[],
  ): Promise<ChatCompletionMessageParam[]> {
    const converted: ChatCompletionMessageParam[] = [];
    for (let i = 0; i < chatSessionMessageHistory.length; i++) {
      const element = chatSessionMessageHistory[i];

      converted.push({
        role: element.role as 'user' | 'assistant' | 'system',
        content: element.message,
      });
    }

    return converted;
  }

  async continueUserChat(
    userMessage: string,
    chatSessionId: number,
    userId: number,
  ) {
    const chatSessionMessageHistory: Messages[] =
      await this.prisma.messages.findMany({
        where: { chatSessionID: chatSessionId },
        orderBy: { createdAt: 'asc' },
      });

    const historyMessages: ChatCompletionMessageParam[] =
      await this.convertedChatSessionMessageHistory(chatSessionMessageHistory);

    const chatResponse = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: this.content,
        },
        ...historyMessages,
        {
          role: 'user',
          content: userMessage,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_completion_tokens: 150,
      top_p: 0.9,
      stop: null,
    });

    const assistantMessage = chatResponse.choices[0].message.content;

    if (assistantMessage == null) {
      console.error('error no chat response provided');
      throw new InternalServerErrorException(
        'error no chat response provided. Try again.',
      );
    }

    await this.prisma.chatSession.update({
      where: { id: chatSessionId, userId: userId },
      data: { updatedAt: new Date(Date.now()) },
    });

    await this.createMessages(userMessage, 'user', chatSessionId);

    await this.createMessages(assistantMessage, 'assistant', chatSessionId);

    return assistantMessage;
  }
}
