import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { GroqService } from './groq.service';

@Controller('groq')
export class GroqController {
  constructor(private readonly groqService: GroqService) {}

  @Get('intro/:userId')
  getGroqChatIntro(@Param('userId') userId: string) {
    return this.groqService.getGroqChatIntro(+userId);
  }

  @Post('newUserChat/:userId')
  newUserChat(
    @Param('userId') userId: string,
    @Body('message') message: string,
  ) {
    return this.groqService.newUserChat(message, +userId);
  }

  @Put('/:chatSessionId/:userId')
  continueUserChat(
    @Param('chatSessionId') chatSessionId: string,
    @Param('userId') userId: string,
    @Body('message') message: string,
  ) {
    return this.groqService.continueUserChat(message, +chatSessionId, +userId);
  }

  @Delete('/:chatSessionId/:userId')
  deleteUserChat(
    @Param('chatSessionId') chatSessionId: string,
    @Param('userId') userId: string,
  ) {
    return this.groqService.deleteUserChat(+chatSessionId, +userId);
  }
}
