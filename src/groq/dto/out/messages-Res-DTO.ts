import { MessageRole } from 'database/generated/enums';

export class MessagesResDTO {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  chatSessionID: number;
  message: string;
  role: MessageRole;
}
