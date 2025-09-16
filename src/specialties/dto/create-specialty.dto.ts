import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @Length(5, 50)
  @IsNotEmpty()
  name: string;
}
