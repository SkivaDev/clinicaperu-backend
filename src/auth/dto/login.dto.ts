import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(8)
  dni: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
