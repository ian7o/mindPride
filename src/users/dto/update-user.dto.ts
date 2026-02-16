import { IsEmail, IsNotEmpty, Max, Min } from 'class-validator';
import { EuserStatus } from '../utils/enum';

export class UpdateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  @Min(12)
  @Max(100)
  age: number;
  @IsNotEmpty()
  sex: string;
  status?: EuserStatus;
}
