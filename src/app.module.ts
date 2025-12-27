import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [
      `.env.${process.env.NODE_ENV || 'development'}`,
    ],
  }), UsersModule],
})



export class AppModule { }
