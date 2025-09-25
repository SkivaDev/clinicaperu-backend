import { RoomType } from '@prisma/client';
import { IsEnum, IsInt, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsString()
  roomNumber: string;

  @IsString()
  @IsEnum(RoomType)
  roomType: RoomType;

  @IsInt()
  floor: number;

  @IsInt()
  capacity: number;

  @IsString()
  equipment: string[];
}
