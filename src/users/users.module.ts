import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersRepository } from './users.repository';

@Module({
  imports: [PrismaModule],
  exports: [UsersRepository],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
