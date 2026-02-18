import { IsNotEmpty, IsNumber } from 'class-validator';
import { $Enums } from 'database/generated/client';

export class CreateChatMessagesDto {
  @IsNotEmpty()
  message: string;
  @IsNotEmpty()
  role: $Enums.MessageRole;
  @IsNotEmpty()
  @IsNumber()
  chatSessionId: number;
}
