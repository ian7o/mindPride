import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/in/create-user.dto';
import { UpdateUserDto } from './dto/in/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return await this.prisma.user.create({
      data: { ...createUserDto, status: 'ACTIVE' },
    });
  }
  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findById(id);
    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
