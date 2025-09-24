import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @Length(5, 50)
  @IsNotEmpty()
  name: string;

  @IsString()
  @Length(5, 250)
  @IsOptional()
  description: string;

  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}
