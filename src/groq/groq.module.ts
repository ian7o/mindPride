import { Module } from '@nestjs/common';
import { GroqService } from './groq.service';
import Groq from 'groq-sdk';
import { GroqController } from './groq.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroqController],
  providers: [
    GroqService,
    {
      provide: Groq,
      useFactory: () => new Groq({ apiKey: process.env.GROQ_API_KEY }),
    },
  ],
})
export class GroqModule {}
