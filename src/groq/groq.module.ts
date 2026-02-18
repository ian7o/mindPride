import { Module } from '@nestjs/common';
import { GroqService } from './groq.service';
import Groq from 'groq-sdk';
import { GroqController } from './groq.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GroqRepository } from './groq.repository';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [GroqController],
  providers: [
    GroqService,
    GroqRepository,
    {
      provide: Groq,
      useFactory: () => new Groq({ apiKey: process.env.GROQ_API_KEY }),
    },
  ],
})
export class GroqModule {}
