import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EuserStatus } from './utils/enum';

@Injectable()
export class UsersService {

  constructor(private prisma: PrismaService) { }

  create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({ data: { ...createUserDto, status: EuserStatus.ACTIVE } });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.prisma.user.update({ where: { id }, data: updateUserDto });
  }

  async remove(id: number) {
    await this.prisma.user.delete({ where: { id } });
    return `user removed`;
  }
}
