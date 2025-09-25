import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  address: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  ubigeoDept: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  ubigeoProv: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  ubigeoDist: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}
