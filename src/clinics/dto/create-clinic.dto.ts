import { IsString } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  ubigeoDept: string;

  @IsString()
  ubigeoProv: string;

  @IsString()
  ubigeoDist: string;

  @IsString()
  phone: string;
}
