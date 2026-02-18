import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/in/create-user.dto';
import { UpdateUserDto } from './dto/in/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  create(createUserDto: CreateUserDto) {
    return this.usersRepository.create(createUserDto);
  }

  findAll() {
    return this.usersRepository.findAll();
  }

  findById(id: number) {
    return this.usersRepository.findById(id);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  async removeById(id: number) {
    await this.usersRepository.delete(id);
    return { message: 'User removed successfully' };
  }
}
